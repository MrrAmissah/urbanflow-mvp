import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, hasSupabaseServerConfig } from '@/lib/supabase/server';
import type { InspectionRecord, UpdateInspectionPayload } from '@/lib/inspections/types';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  if (!hasSupabaseServerConfig()) {
    return res.status(503).json({
      configured: false,
      message: 'Supabase is not configured yet.',
    });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ message: 'Missing inspection id.' });

  try {
    const payload = req.body as UpdateInspectionPayload;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('inspection_records')
      .update({
        status: payload.status,
        correction: payload.correction ?? null,
        verdict: payload.verdict,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return res.status(200).json({
      configured: true,
      record: toInspectionRecord(data),
    });
  } catch (error) {
    console.error('Inspection update API error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Inspection update failed.',
    });
  }
}
