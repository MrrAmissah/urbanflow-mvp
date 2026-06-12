'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ClipboardList,
  FlaskConical,
  Check,
  ShieldAlert,
  ImageOff,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';

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
  fileName: string;
  verdict: Verdict;
  label: string;
  confidence: number;
  status: 'Needs review' | 'Approved' | 'Corrected';
  correction?: string;
}

type Verdict = 'clean' | 'choked' | 'out-of-context' | 'manual-review' | 'ready';
type VerdictTone = 'safe' | 'warning' | 'danger' | 'review' | 'neutral';
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

const verdictContent: Record<
  Verdict,
  { title: string; description: string; tone: VerdictTone }
> = {
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

export default function GutterClassifier() {
  const [model, setModel] = useState<GutterModel | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelLoadTime, setModelLoadTime] = useState<number | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [threshold, setThreshold] = useState(70);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const topPrediction = predictions?.[0];
  const verdict = mapPredictionToVerdict(topPrediction, qualityReport, threshold);
  const verdictInfo = verdictContent[verdict];
  const confidence = topPrediction ? topPrediction.probability * 100 : 0;
  const needsReviewCount = reviewQueue.filter((item) => item.status === 'Needs review').length;

  const createImagePreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const selectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please upload a JPG, PNG, or WebP image.');
      return;
    }

    setSelectedFile(file);
    setAnalysisError(null);
    setPredictions(null);
    setQualityReport(null);
    createImagePreview(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleAnalyze = async () => {
    if (!imageRef.current || !selectedFile) return;

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      const activeModel = model ?? (await loadGutterModel());
      setModel(activeModel);
      setModelLoading(false);

      await new Promise((resolve, reject) => {
        if (imageRef.current!.complete) {
          resolve(null);
        } else {
          imageRef.current!.onload = () => resolve(null);
          imageRef.current!.onerror = () =>
            reject(new Error('Failed to load image'));
        }
      });

      const quality = await inspectImageQuality(selectedFile);
      setQualityReport(quality);

      const results = await activeModel.predict(imageRef.current);
      const predictionArray = Array.from(results)
        .map((p) => ({
          className: p.className,
          probability: p.probability,
        }))
        .sort((a, b) => b.probability - a.probability);

      setPredictions(predictionArray);

      const top = predictionArray[0];
      const nextVerdict = mapPredictionToVerdict(top, quality, threshold);
      const nextConfidence = Math.round((top?.probability ?? 0) * 100);

      if (nextVerdict !== 'clean') {
        setReviewQueue((items) => [
          {
            id: crypto.randomUUID(),
            fileName: selectedFile.name,
            verdict: nextVerdict,
            label: top?.className ?? 'No prediction',
            confidence: nextConfidence,
            status: 'Needs review',
          },
          ...items.slice(0, 5),
        ]);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAnalysisError('Failed to analyze image. Please try another clear gutter photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setPredictions(null);
    setQualityReport(null);
    setAnalysisError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateReviewItem = (id: string, correction: string) => {
    setReviewQueue((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              verdict: getCorrectedVerdict(correction, item.verdict),
              status: correction === 'Approved' ? 'Approved' : 'Corrected',
              correction,
            }
          : item
      )
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Team Urbanflow</h1>
        <div className="inline-block px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-4">
          AI-powered gutter inspection
        </div>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Upload a drone image of a gutter and let our trained AI model classify whether it appears choked or clean.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
              Results below this threshold, blurry images, or out-of-context classes are routed to manual review.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload Image</h2>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Camera className="w-12 h-12 mx-auto mb-2 text-blue-600" />
                <p className="text-slate-700 font-medium mb-1">Drag and drop your image here</p>
                <p className="text-sm text-slate-500 mb-4">or click to select (JPG, PNG, WebP)</p>
              </label>
            </div>

            {selectedFile && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Selected file:</strong> {selectedFile.name}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                Select Image
              </button>
              <button
                onClick={handleClear}
                disabled={!selectedFile || analyzing}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || analyzing || Boolean(modelError)}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {analyzing ? 'Analyzing...' : modelLoading ? 'Prepare & Analyze Image' : 'Analyze Image'}
          </button>
        </div>

        <div className="space-y-6">
          {imagePreview && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Image Preview</h2>
              <div className="bg-slate-100 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Selected gutter"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            </div>
          )}

          {predictions && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Analysis Results</h2>

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
                    <span className="text-sm font-semibold text-slate-900">
                      {confidence.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${getProgressColor(verdictInfo.tone)} h-2 rounded-full transition-all`}
                      style={{ width: `${confidence}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">All Class Probabilities</p>
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

              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Tip:</strong> Add training classes like out_of_context and blurry_or_unclear to improve this review logic.
                  </span>
                </p>
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

          {analysisError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                <strong>Error:</strong> {analysisError}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Inspection Review Queue</h3>
            <p className="text-sm text-slate-500">{needsReviewCount} image(s) currently need review</p>
          </div>
          <div className="grid grid-cols-3 rounded-lg border border-slate-200 overflow-hidden text-center text-sm">
            <div className="px-3 py-2">
              <p className="font-bold text-slate-900">{reviewQueue.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div className="px-3 py-2 border-x border-slate-200">
              <p className="font-bold text-amber-700">{needsReviewCount}</p>
              <p className="text-xs text-slate-500">Review</p>
            </div>
            <div className="px-3 py-2">
              <p className="font-bold text-green-700">
                {reviewQueue.filter((item) => item.status === 'Approved').length}
              </p>
              <p className="text-xs text-slate-500">Approved</p>
            </div>
          </div>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-600">Analyze an image to add it to the review queue.</p>
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
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          item.status === 'Approved'
                            ? 'bg-green-700 text-white'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewItem(item.id, 'Out of context')}
                        className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                          item.correction === 'Out of context'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <XCircle className="inline w-4 h-4 mr-1" />
                        Context
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewItem(item.id, 'Choked gutter')}
                        className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                          item.correction === 'Choked gutter'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
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
      </div>

      <div className="mt-12 bg-slate-50 rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">MVP Scope & Future Improvements</h3>
        <p className="text-slate-700 mb-4">
          <strong>Current capability:</strong> This MVP classifies the entire uploaded image, checks quality, and flags uncertain
          or out-of-context submissions for review. It does <u>not</u> identify the exact blocked section of the gutter.
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
                <span>Batch upload multiple images</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>GPS location tagging</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Persistent inspection history & reports</span>
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
