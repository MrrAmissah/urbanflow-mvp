import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin, hasSupabaseServerConfig } from '@/lib/supabase/server';
import type { CreateInspectionPayload, InspectionRecord } from '@/lib/inspections/types';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

const BUCKET_NAME = process.env.SUPABASE_INSPECTION_BUCKET ?? 'inspection-images';

function toInspectionRecord(row: Record<string, unknown>): InspectionRecord {
  return {
    id: String(row.id),
    imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
    fileName: String(row.file_name ?? ''),
    verdict: row.verdict as InspectionRecord['verdict'],
    label: String(row.label ?? ''),
    confidence: Number(row.confidence ?? 0),
    status: row.status as InspectionRecord['status'],
    correction: typeof row.correction === 'string' ? row.correction : null,
    quality: (row.quality as Record<string, unknown> | null) ?? null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

async function uploadInspectionImage(payload: CreateInspectionPayload) {
  if (!payload.imageDataUrl) return null;

  const parsed = parseDataUrl(payload.imageDataUrl);
  if (!parsed) return null;

  const supabase = getSupabaseAdmin();
  const extension = parsed.mimeType.split('/')[1] || 'jpg';
  const safeName = payload.fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `inspections/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName || `image.${extension}`}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, parsed.buffer, {
    contentType: parsed.mimeType,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!hasSupabaseServerConfig()) {
    return res.status(503).json({
      configured: false,
      records: [],
      message: 'Supabase is not configured yet.',
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('inspection_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) throw error;

      return res.status(200).json({
        configured: true,
        records: (data ?? []).map(toInspectionRecord),
      });
    }

    if (req.method === 'POST') {
      const payload = req.body as CreateInspectionPayload;

      if (!payload.fileName || !payload.verdict || !payload.label || !payload.status) {
        return res.status(400).json({ message: 'Missing required inspection fields.' });
      }

      const imageUrl = await uploadInspectionImage(payload);

      const { data, error } = await supabase
        .from('inspection_records')
        .insert({
          image_url: imageUrl,
          file_name: payload.fileName,
          verdict: payload.verdict,
          label: payload.label,
          confidence: payload.confidence,
          status: payload.status,
          correction: payload.correction ?? null,
          quality: payload.quality ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;

      return res.status(201).json({
        configured: true,
        record: toInspectionRecord(data),
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  } catch (error) {
    console.error('Inspection API error:', error);
    const setupMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : null;
    return res.status(500).json({
      message: setupMessage || (error instanceof Error ? error.message : 'Inspection API failed.'),
    });
  }
}
