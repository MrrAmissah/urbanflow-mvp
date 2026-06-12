'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  FileStack,
  Filter,
  FlaskConical,
  ImageOff,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import type {
  CreateInspectionPayload,
  InspectionRecord,
  InspectionStatus,
  InspectionVerdict,
} from '@/lib/inspections/types';

interface Prediction {
  className: string;
  probability: number;
}

interface QualityReport {
  brightness: number;
  sharpness: number;
  width: number;
  height: number;
  issues: string[];
}

interface ReviewItem {
  id: string;
  imageUrl?: string | null;
  fileName: string;
  verdict: Verdict;
  label: string;
  confidence: number;
  status: InspectionStatus;
  correction?: string;
}

interface AnalysisResult {
  file: File;
  imageDataUrl: string;
  predictions: Prediction[];
  quality: QualityReport;
  verdict: Verdict;
  confidence: number;
  label: string;
  status: InspectionStatus;
}

type BatchPreview = {
  name: string;
  url: string;
};

type Verdict = InspectionVerdict;
type VerdictTone = 'safe' | 'warning' | 'danger' | 'review' | 'neutral';
type FilterKey =
  | 'all'
  | 'choked'
  | 'clean'
  | 'needs-review'
  | 'approved'
  | 'out-of-context'
  | 'low-confidence';
type PersistenceStatus = 'checking' | 'connected' | 'local-only';
type WindowWithIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
type GutterModel = {
  predict: (image: HTMLImageElement) => Promise<Prediction[]>;
};

let cachedModel: GutterModel | null = null;
let modelLoadPromise: Promise<GutterModel> | null = null;

const verdictContent: Record<Verdict, { title: string; description: string; tone: VerdictTone }> = {
  ready: {
    title: 'Ready for inspection',
    description: 'Upload and analyze a drone gutter image.',
    tone: 'neutral',
  },
  clean: {
    title: 'Gutter appears clean',
    description: 'The model found a clear/clean gutter with enough confidence.',
    tone: 'safe',
  },
  choked: {
    title: 'Choked gutter detected',
    description: 'The image should be reviewed for blockage or debris.',
    tone: 'warning',
  },
  'out-of-context': {
    title: 'Image may be out of context',
    description: 'The top class suggests the image is not a usable gutter/drone image.',
    tone: 'danger',
  },
  'manual-review': {
    title: 'Manual review needed',
    description: 'Confidence or image quality is not strong enough for an automatic decision.',
    tone: 'review',
  },
};

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'choked', label: 'Choked' },
  { key: 'clean', label: 'Clean' },
  { key: 'needs-review', label: 'Needs Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'out-of-context', label: 'Out of Context' },
  { key: 'low-confidence', label: 'Low Confidence' },
];

function getVerdictToneClasses(tone: VerdictTone) {
  if (tone === 'safe') return 'bg-green-50 border-2 border-green-200 text-green-900';
  if (tone === 'warning') return 'bg-amber-50 border-2 border-amber-200 text-amber-900';
  if (tone === 'danger') return 'bg-red-50 border-2 border-red-200 text-red-900';
  if (tone === 'review') return 'bg-blue-50 border-2 border-blue-200 text-blue-900';
  return 'bg-slate-50 border-2 border-slate-200 text-slate-900';
}

function getProgressColor(tone: VerdictTone) {
  if (tone === 'safe') return 'from-green-500 to-green-600';
  if (tone === 'warning') return 'from-amber-500 to-amber-600';
  if (tone === 'danger') return 'from-red-500 to-red-600';
  return 'from-blue-500 to-blue-600';
}

function getReviewStatusClasses(item: ReviewItem) {
  if (item.status === 'Approved') {
    return {
      card: 'border-green-200 bg-green-50',
      badge: 'bg-green-100 text-green-800 border-green-200',
    };
  }

  if (item.correction === 'Out of context') {
    return {
      card: 'border-red-200 bg-red-50',
      badge: 'bg-red-100 text-red-800 border-red-200',
    };
  }

  if (item.correction === 'Choked gutter') {
    return {
      card: 'border-amber-200 bg-amber-50',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  }

  return {
    card: 'border-slate-200 bg-slate-50',
    badge: 'bg-white text-slate-600 border-slate-200',
  };
}

function getCorrectedVerdict(correction: string, fallback: Verdict): Verdict {
  if (correction === 'Approved') return 'clean';
  if (correction === 'Out of context') return 'out-of-context';
  if (correction === 'Choked gutter') return 'choked';
  return fallback;
}

function inspectionRecordToReviewItem(record: InspectionRecord): ReviewItem {
  return {
    id: record.id,
    imageUrl: record.imageUrl,
    fileName: record.fileName,
    verdict: record.verdict,
    label: record.label,
    confidence: record.confidence,
    status: record.status,
    correction: record.correction ?? undefined,
  };
}

async function createInspectionRecord(payload: CreateInspectionPayload) {
  const response = await fetch('/api/inspections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 503) return null;
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message || 'Could not save inspection record.');
  }

  const data = (await response.json()) as { record?: InspectionRecord };
  return data.record ?? null;
}

async function updateInspectionRecord(
  id: string,
  status: InspectionStatus,
  correction: string,
  verdict: Verdict
) {
  const response = await fetch(`/api/inspections/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, correction, verdict }),
  });

  if (response.status === 503) return null;
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message || 'Could not update inspection record.');
  }

  const data = (await response.json()) as { record?: InspectionRecord };
  return data.record ?? null;
}

function mapPredictionToVerdict(
  prediction: Prediction | undefined,
  quality: QualityReport | null,
  threshold: number
): Verdict {
  if (!prediction) return 'ready';

  const label = prediction.className.toLowerCase().replace(/[_-]/g, ' ');
  const confidence = prediction.probability * 100;
  const hasHardQualityIssue = (quality?.issues.length ?? 0) >= 2;

  if (hasHardQualityIssue || confidence < threshold) return 'manual-review';
  if (
    label.includes('out') ||
    label.includes('context') ||
    label.includes('invalid') ||
    label.includes('random') ||
    label.includes('document') ||
    label.includes('person') ||
    label.includes('car') ||
    label.includes('indoor')
  ) {
    return 'out-of-context';
  }
  if (
    label.includes('choked') ||
    label.includes('blocked') ||
    label.includes('dirty') ||
    label.includes('debris')
  ) {
    return 'choked';
  }
  if (label.includes('clean') || label.includes('clear')) return 'clean';

  return 'manual-review';
}

function getInitialStatus(verdict: Verdict): InspectionStatus {
  return verdict === 'clean' ? 'Approved' : 'Needs review';
}

async function inspectImageQuality(file: File): Promise<QualityReport> {
  const bitmap = await createImageBitmap(file);
  const imageWidth = bitmap.width;
  const imageHeight = bitmap.height;
  const canvas = document.createElement('canvas');
  const sampleWidth = 180;
  const scale = sampleWidth / imageWidth;
  canvas.width = sampleWidth;
  canvas.height = Math.max(1, Math.round(imageHeight * scale));

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image quality scan is unavailable in this browser.');

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

  let brightnessTotal = 0;
  let edgeTotal = 0;
  let edgeCount = 0;
  const gray: number[] = [];

  for (let index = 0; index < pixels.length; index += 4) {
    const value = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    gray.push(value);
    brightnessTotal += value;
  }

  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const current = gray[y * canvas.width + x];
      const right = gray[y * canvas.width + x + 1];
      const down = gray[(y + 1) * canvas.width + x];
      edgeTotal += Math.abs(current - right) + Math.abs(current - down);
      edgeCount += 2;
    }
  }

  bitmap.close();

  const brightness = brightnessTotal / gray.length;
  const sharpness = edgeCount ? edgeTotal / edgeCount : 0;
  const issues: string[] = [];

  if (imageWidth < 480 || imageHeight < 360) issues.push('Low image resolution');
  if (brightness < 45) issues.push('Image is too dark');
  if (brightness > 230) issues.push('Image is overexposed');
  if (sharpness < 5) issues.push('Image may be blurry');

  return {
    brightness,
    sharpness,
    width: imageWidth,
    height: imageHeight,
    issues,
  };
}

async function loadGutterModel(): Promise<GutterModel> {
  if (cachedModel) return cachedModel;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = Promise.all([
    import('@teachablemachine/image'),
    import('@tensorflow/tfjs'),
    fetch('/model/model.json', { cache: 'force-cache' }),
    fetch('/model/metadata.json', { cache: 'force-cache' }),
    fetch('/model/weights.bin', { cache: 'force-cache' }),
  ]).then(async ([tmImage]) => {
    const loadedModel = await tmImage.load('/model/model.json', '/model/metadata.json');
    cachedModel = loadedModel;
    return loadedModel;
  });

  return modelLoadPromise;
}

function readImageDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for analysis.'));
    image.src = src;
  });
}

function filterRecords(records: InspectionRecord[], filter: FilterKey, threshold: number) {
  return records.filter((record) => {
    if (filter === 'all') return true;
    if (filter === 'choked') return record.verdict === 'choked';
    if (filter === 'clean') return record.verdict === 'clean';
    if (filter === 'needs-review') return record.status === 'Needs review';
    if (filter === 'approved') return record.status === 'Approved';
    if (filter === 'out-of-context') {
      return record.verdict === 'out-of-context' || record.correction === 'Out of context';
    }
    if (filter === 'low-confidence') return record.confidence < threshold || record.verdict === 'manual-review';
    return true;
  });
}

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadCsv(records: InspectionRecord[]) {
  const headers = [
    'id',
    'file_name',
    'verdict',
    'label',
    'confidence',
    'status',
    'correction',
    'image_url',
    'created_at',
  ];
  const rows = records.map((record) => [
    record.id,
    record.fileName,
    record.verdict,
    record.label,
    record.confidence,
    record.status,
    record.correction ?? '',
    record.imageUrl ?? '',
    record.createdAt ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `urbanflow-inspections-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function GutterClassifier() {
  const [model, setModel] = useState<GutterModel | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelLoadTime, setModelLoadTime] = useState<number | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchPreviews, setBatchPreviews] = useState<BatchPreview[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [threshold, setThreshold] = useState(70);
  const [analyzing, setAnalyzing] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>('checking');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [batchProgress, setBatchProgress] = useState({
    total: 0,
    processed: 0,
    failed: 0,
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchPreviewUrlsRef = useRef<string[]>([]);

  const reviewQueue = useMemo(
    () =>
      records
        .filter((record) => record.status === 'Needs review')
        .map(inspectionRecordToReviewItem),
    [records]
  );
  const filteredRecords = useMemo(
    () => filterRecords(records, activeFilter, threshold),
    [records, activeFilter, threshold]
  );
  const topPrediction = predictions?.[0];
  const verdict = mapPredictionToVerdict(topPrediction, qualityReport, threshold);
  const verdictInfo = verdictContent[verdict];
  const confidence = topPrediction ? topPrediction.probability * 100 : 0;
  const needsReviewCount = records.filter((item) => item.status === 'Needs review').length;
  const pendingCount = Math.max(batchProgress.total - batchProgress.processed - batchProgress.failed, 0);

  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      try {
        const startTime = performance.now();
        setModelLoading(true);
        setModelError(null);

        const loadedModel = await loadGutterModel();

        if (!isMounted) return;
        setModel(loadedModel);
        setModelLoadTime((performance.now() - startTime) / 1000);
      } catch (error) {
        console.error('Error loading model:', error);
        if (!isMounted) return;
        setModelError(
          'Failed to load the model. Please ensure model.json and metadata.json are in the public/model folder.'
        );
      } finally {
        if (isMounted) setModelLoading(false);
      }
    };

    const browserWindow = window as WindowWithIdleCallback;
    const idleId = browserWindow.requestIdleCallback
      ? browserWindow.requestIdleCallback(loadModel, { timeout: 500 })
      : browserWindow.setTimeout(loadModel, 100);

    return () => {
      isMounted = false;
      if (browserWindow.cancelIdleCallback) {
        browserWindow.cancelIdleCallback(idleId);
      } else {
        browserWindow.clearTimeout(idleId);
      }
    };
  }, []);

  const refreshRecords = useCallback(async () => {
    try {
      const response = await fetch('/api/inspections');
      if (response.status === 503) {
        setPersistenceStatus('local-only');
        return;
      }

      if (!response.ok) throw new Error('Could not load inspections.');

      const data = (await response.json()) as { records?: InspectionRecord[] };
      setPersistenceStatus('connected');
      setRecords(data.records ?? []);
    } catch (error) {
      console.warn('Supabase inspection queue unavailable:', error);
      setPersistenceStatus('local-only');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshRecords();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshRecords]);

  useEffect(() => {
    return () => {
      batchPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const createImagePreview = (file: File) => {
    readImageDataUrl(file)
      .then((dataUrl) => setImagePreview(dataUrl))
      .catch(() => setAnalysisError('Could not preview this image.'));
  };

  const replaceBatchPreviews = (files: File[]) => {
    batchPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));

    const previews = files.slice(0, 10).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    batchPreviewUrlsRef.current = previews.map((preview) => preview.url);
    setBatchPreviews(previews);
  };

  const selectFiles = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      setAnalysisError('Please upload JPG, PNG, or WebP images.');
      return;
    }

    setSelectedFiles(imageFiles);
    replaceBatchPreviews(imageFiles);
    setSelectedFile(imageFiles[0]);
    setAnalysisError(null);
    setSaveError(null);
    setPredictions(null);
    setQualityReport(null);
    createImagePreview(imageFiles[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFiles(Array.from(e.target.files ?? []));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectFiles(Array.from(e.dataTransfer.files ?? []));
  };

  const analyzeFile = async (file: File, activeModel: GutterModel): Promise<AnalysisResult> => {
    const imageDataUrl = await readImageDataUrl(file);
    const image = await loadImageElement(imageDataUrl);
    const quality = await inspectImageQuality(file);
    const results = await activeModel.predict(image);
    const predictionArray = Array.from(results)
      .map((p) => ({
        className: p.className,
        probability: p.probability,
      }))
      .sort((a, b) => b.probability - a.probability);
    const top = predictionArray[0];
    const nextVerdict = mapPredictionToVerdict(top, quality, threshold);
    const nextConfidence = Math.round((top?.probability ?? 0) * 100);

    return {
      file,
      imageDataUrl,
      predictions: predictionArray,
      quality,
      verdict: nextVerdict,
      confidence: nextConfidence,
      label: top?.className ?? 'No prediction',
      status: getInitialStatus(nextVerdict),
    };
  };

  const addOrReplaceRecord = (record: InspectionRecord) => {
    setRecords((items) => [record, ...items.filter((item) => item.id !== record.id)]);
  };

  const saveAnalysisResult = async (result: AnalysisResult) => {
    const localRecord: InspectionRecord = {
      id: crypto.randomUUID(),
      imageUrl: null,
      fileName: result.file.name,
      verdict: result.verdict,
      label: result.label,
      confidence: result.confidence,
      status: result.status,
      correction: result.status === 'Approved' ? 'Approved' : null,
      quality: { ...result.quality },
      createdAt: new Date().toISOString(),
    };

    addOrReplaceRecord(localRecord);

    try {
      const savedItem = await createInspectionRecord({
        imageDataUrl: result.imageDataUrl,
        fileName: result.file.name,
        verdict: result.verdict,
        label: result.label,
        confidence: result.confidence,
        status: result.status,
        correction: result.status === 'Approved' ? 'Approved' : null,
        quality: { ...result.quality },
      });

      if (savedItem) {
        setPersistenceStatus('connected');
        setRecords((items) => [savedItem, ...items.filter((item) => item.id !== localRecord.id)]);
      } else {
        setPersistenceStatus('local-only');
      }
    } catch (error) {
      console.warn('Inspection record was not persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Could not save inspection record.');
      setPersistenceStatus('local-only');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      setSaveError(null);
      setBatchErrors([]);
      const activeModel = model ?? (await loadGutterModel());
      setModel(activeModel);
      setModelLoading(false);

      const result = await analyzeFile(selectedFile, activeModel);
      setImagePreview(result.imageDataUrl);
      setQualityReport(result.quality);
      setPredictions(result.predictions);
      await saveAnalysisResult(result);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze image.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBatchAnalyze = async () => {
    if (!selectedFiles.length) return;

    setBatchProcessing(true);
    setAnalyzing(true);
    setAnalysisError(null);
    setSaveError(null);
    setBatchErrors([]);
    setBatchProgress({ total: selectedFiles.length, processed: 0, failed: 0 });

    try {
      const activeModel = model ?? (await loadGutterModel());
      setModel(activeModel);
      setModelLoading(false);

      for (const file of selectedFiles) {
        try {
          const result = await analyzeFile(file, activeModel);
          setSelectedFile(file);
          setImagePreview(result.imageDataUrl);
          setQualityReport(result.quality);
          setPredictions(result.predictions);
          await saveAnalysisResult(result);
          setBatchProgress((progress) => ({
            ...progress,
            processed: progress.processed + 1,
          }));
        } catch (error) {
          console.error(`Batch analysis failed for ${file.name}:`, error);
          const message = error instanceof Error ? error.message : 'Unknown processing error.';
          setBatchErrors((errors) => [...errors, `${file.name}: ${message}`]);
          setBatchProgress((progress) => ({
            ...progress,
            failed: progress.failed + 1,
          }));
        }
      }
    } finally {
      setBatchProcessing(false);
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setImagePreview(null);
    setPredictions(null);
    setQualityReport(null);
    setAnalysisError(null);
    setSaveError(null);
    setBatchErrors([]);
    setBatchProgress({ total: 0, processed: 0, failed: 0 });
    batchPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    batchPreviewUrlsRef.current = [];
    setBatchPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateReviewItem = async (id: string, correction: string) => {
    const nextStatus = correction === 'Approved' ? 'Approved' : 'Corrected';
    const currentItem = records.find((item) => item.id === id);
    const nextVerdict = getCorrectedVerdict(correction, currentItem?.verdict ?? 'manual-review');

    setRecords((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              verdict: nextVerdict,
              status: nextStatus,
              correction,
            }
          : item
      )
    );

    try {
      const savedItem = await updateInspectionRecord(id, nextStatus, correction, nextVerdict);
      if (savedItem) {
        setPersistenceStatus('connected');
        setRecords((items) => items.map((item) => (item.id === id ? savedItem : item)));
      }
    } catch (error) {
      console.warn('Inspection update was not persisted:', error);
      setSaveError(error instanceof Error ? error.message : 'Could not save reviewer correction.');
      setPersistenceStatus('local-only');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Team Urbanflow</h1>
        <div className="inline-block px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-4">
          AI-powered gutter inspection
        </div>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto">
          Upload one image for a quick check or process a batch of drone gutter photos while the current browser model stays stable.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Model Status</h2>
            {modelLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-slate-600">Loading AI model...</span>
              </div>
            ) : modelError ? (
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-semibold">Model Error</p>
                  <p className="text-sm text-red-600">{modelError}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-700 font-semibold">Model ready for analysis</p>
                  {modelLoadTime !== null && (
                    <p className="text-xs text-slate-500">Prepared in {modelLoadTime.toFixed(1)}s on this device.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Inspection Rules</h2>
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            </div>
            <label className="flex items-center justify-between text-sm font-semibold text-slate-700" htmlFor="threshold">
              Confidence threshold
              <span className="font-mono text-slate-900">{threshold}%</span>
            </label>
            <input
              id="threshold"
              type="range"
              min="50"
              max="95"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="mt-3 w-full accent-blue-600"
            />
            <p className="mt-3 text-xs text-slate-500">
              Low confidence, poor quality, and out-of-context classes are routed to review.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload Images</h2>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Camera className="w-12 h-12 mx-auto mb-2 text-blue-600" />
                <p className="text-slate-700 font-medium mb-1">Drag and drop images here</p>
                <p className="text-sm text-slate-500 mb-4">or click to select one or many files</p>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Selected:</strong> {selectedFiles.length} image{selectedFiles.length === 1 ? '' : 's'}
                </p>
                <p className="text-xs text-slate-500 truncate">{selectedFile?.name}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                Select
              </button>
              <button
                onClick={handleClear}
                disabled={!selectedFiles.length || analyzing}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || analyzing || Boolean(modelError)}
                className="px-5 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {analyzing && !batchProcessing ? 'Analyzing...' : modelLoading ? 'Prepare & Analyze' : 'Analyze Current'}
              </button>
              <button
                onClick={handleBatchAnalyze}
                disabled={!selectedFiles.length || analyzing || Boolean(modelError)}
                className="px-5 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <FileStack className="inline w-4 h-4 mr-2" />
                {batchProcessing ? 'Processing Batch...' : 'Process Batch'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Batch Progress</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-slate-500">Total</p>
                <p className="font-mono text-xl font-bold text-slate-900">{batchProgress.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-green-700">Processed</p>
                <p className="font-mono text-xl font-bold text-green-800">{batchProgress.processed}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-blue-700">Pending</p>
                <p className="font-mono text-xl font-bold text-blue-800">{pendingCount}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-red-700">Failed</p>
                <p className="font-mono text-xl font-bold text-red-800">{batchProgress.failed}</p>
              </div>
            </div>
            {batchProgress.total > 0 && (
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{
                    width: `${Math.round(((batchProgress.processed + batchProgress.failed) / batchProgress.total) * 100)}%`,
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {imagePreview && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Image Preview</h2>
                {selectedFiles.length > 1 && (
                  <span className="text-sm font-semibold text-blue-700">
                    {selectedFiles.length} images in batch
                  </span>
                )}
              </div>
              <div className="bg-slate-100 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Selected gutter"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>

              {batchPreviews.length > 1 && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">Batch preview</p>
                    {selectedFiles.length > batchPreviews.length && (
                      <p className="text-xs font-semibold text-slate-500">
                        +{selectedFiles.length - batchPreviews.length} more
                      </p>
                    )}
                  </div>
                  <div className="overflow-x-auto overflow-y-hidden px-4 pb-5 pt-3">
                    <div className="flex min-w-max items-end justify-center">
                      {batchPreviews.map((preview, index) => {
                        const middle = (batchPreviews.length - 1) / 2;
                        const offset = index - middle;
                        const rotation = offset * 5;
                        const lift = Math.abs(offset) * 4;

                        return (
                          <button
                            key={preview.url}
                            type="button"
                            onClick={() => {
                              setSelectedFile(selectedFiles[index]);
                              createImagePreview(selectedFiles[index]);
                            }}
                            className={`relative -mx-3 h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white shadow-md transition-transform hover:-translate-y-3 hover:shadow-lg ${
                              selectedFile === selectedFiles[index] ? 'border-blue-600' : 'border-white'
                            }`}
                            style={{
                              transform: `rotate(${rotation}deg) translateY(${lift}px)`,
                              zIndex: index + 1,
                            }}
                            title={preview.name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={preview.url}
                              alt={preview.name}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-0 left-0 right-0 bg-slate-950/70 px-1.5 py-1 text-left text-[10px] font-semibold text-white">
                              {index + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {predictions && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Current Analysis</h2>
              <div className={`rounded-lg p-6 mb-6 ${getVerdictToneClasses(verdictInfo.tone)}`}>
                <div className="flex items-start gap-3">
                  {verdict === 'out-of-context' ? (
                    <ImageOff className="w-6 h-6 flex-shrink-0 mt-1" />
                  ) : verdict === 'manual-review' ? (
                    <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-1" />
                  ) : verdict === 'clean' ? (
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
                  ) : (
                    <AlertCircle className="w-6 h-6 flex-shrink-0 mt-1" />
                  )}
                  <div>
                    <p className="text-sm opacity-80 mb-1">Inspection Verdict</p>
                    <p className="text-2xl font-bold">{verdictInfo.title}</p>
                    <p className="mt-2 text-sm opacity-85">{verdictInfo.description}</p>
                  </div>
                </div>
              </div>

              {topPrediction && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-slate-700">{topPrediction.className}</span>
                    <span className="text-sm font-semibold text-slate-900">{confidence.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${getProgressColor(verdictInfo.tone)} h-2 rounded-full transition-all`}
                      style={{ width: `${confidence}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {predictions.map((pred, idx) => (
                  <div key={`${pred.className}-${idx}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-700">{pred.className}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {(pred.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${pred.probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {qualityReport && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Image Quality Check</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500">Resolution</p>
                  <p className="font-mono text-slate-900">{qualityReport.width}x{qualityReport.height}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500">Sharpness</p>
                  <p className="font-mono text-slate-900">{qualityReport.sharpness.toFixed(1)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500">Brightness</p>
                  <p className="font-mono text-slate-900">{Math.round(qualityReport.brightness)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500">Issues</p>
                  <p className="font-mono text-slate-900">{qualityReport.issues.length}</p>
                </div>
              </div>
              {qualityReport.issues.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-amber-800">
                  {qualityReport.issues.map((issue) => (
                    <li key={issue} className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-green-700">No major quality issues detected.</p>
              )}
            </div>
          )}

          {(analysisError || saveError || batchErrors.length > 0) && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                <strong>Error:</strong> {analysisError || saveError || 'Some images failed during batch processing.'}
              </p>
              {batchErrors.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-red-700">
                  {batchErrors.slice(0, 5).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {batchErrors.length > 5 && <li>{batchErrors.length - 5} more failed item(s).</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <section className="mt-12 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Inspection Review Queue</h3>
            <p className="text-sm text-slate-500">{needsReviewCount} image(s) currently need review</p>
            <p className="mt-1 text-xs text-slate-500">
              {persistenceStatus === 'checking'
                ? 'Checking saved inspections...'
                : persistenceStatus === 'connected'
                  ? 'Supabase persistence connected.'
                  : 'Local-only queue until Supabase env vars and tables are ready.'}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshRecords}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">No images currently need review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviewQueue.map((item) => {
              const statusClasses = getReviewStatusClasses(item);

              return (
                <div key={item.id} className={`rounded-lg border p-4 transition-colors ${statusClasses.card}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.fileName}</p>
                      <p className="text-sm text-slate-600">
                        {verdictContent[item.verdict].title} · {item.label} · {item.confidence}%
                      </p>
                      <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses.badge}`}>
                        {item.correction ?? item.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateReviewItem(item.id, 'Approved')}
                        className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewItem(item.id, 'Out of context')}
                        className="px-3 py-2 rounded-lg border bg-white text-red-700 border-red-200 text-sm font-semibold hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="inline w-4 h-4 mr-1" />
                        Context
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewItem(item.id, 'Choked gutter')}
                        className="px-3 py-2 rounded-lg border bg-white text-amber-700 border-amber-200 text-sm font-semibold hover:bg-amber-100 transition-colors"
                      >
                        Choked
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Inspection Records Dashboard</h3>
            <p className="text-sm text-slate-500">{filteredRecords.length} of {records.length} record(s) shown</p>
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(filteredRecords)}
            disabled={!filteredRecords.length}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Filter className="w-5 h-5 text-blue-600 mt-2" />
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                activeFilter === filter.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-4 font-semibold">File</th>
                <th className="py-3 pr-4 font-semibold">Verdict</th>
                <th className="py-3 pr-4 font-semibold">Confidence</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Correction</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No inspection records match this filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {record.imageUrl ? (
                        <a href={record.imageUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                          {record.fileName}
                        </a>
                      ) : (
                        record.fileName
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{verdictContent[record.verdict]?.title ?? record.verdict}</td>
                    <td className="py-3 pr-4 font-mono text-slate-900">{record.confidence}%</td>
                    <td className="py-3 pr-4 text-slate-700">{record.status}</td>
                    <td className="py-3 pr-4 text-slate-500">{record.correction ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-12 bg-slate-50 rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">MVP Scope & Future Improvements</h3>
        <p className="text-slate-700 mb-4">
          <strong>Current capability:</strong> This MVP processes single images or browser-based batches, checks quality,
          saves inspection records, and flags uncertain or out-of-context submissions for review. It does <u>not</u> run backend inference yet.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-slate-900">Planned Features:</p>
            </div>
            <ul className="text-sm text-slate-600 space-y-1 ml-7">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>GPS location tagging</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Persistent inspection history reports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Backend batch processing when the MVP is ready</span>
              </li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              <p className="font-semibold text-slate-900">Advanced Analysis:</p>
            </div>
            <ul className="text-sm text-slate-600 space-y-1 ml-7">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Object detection for blockage location</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Image segmentation mapping</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Admin dashboard with corrected training examples</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
