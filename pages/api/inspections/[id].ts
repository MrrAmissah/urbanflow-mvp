import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin, hasSupabaseServerConfig } from '@/lib/supabase/server';
import { toInspectionRecord } from '@/lib/inspections/mappers';
import type { UpdateInspectionPayload } from '@/lib/inspections/types';

const BUCKET_NAME = process.env.SUPABASE_INSPECTION_BUCKET ?? 'inspection-images';

function getStoragePathFromPublicUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const bucketPrefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const bucketIndex = url.pathname.indexOf(bucketPrefix);

    if (bucketIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(bucketIndex + bucketPrefix.length));
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'PATCH, DELETE');
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
    const supabase = getSupabaseAdmin();

    if (req.method === 'DELETE') {
      const { data: record, error: recordError } = await supabase
        .from('inspection_records')
        .select('image_url')
        .eq('id', id)
        .maybeSingle();

      if (recordError) throw recordError;
      if (!record) return res.status(404).json({ message: 'Inspection record not found.' });

      const storagePath = getStoragePathFromPublicUrl(typeof record.image_url === 'string' ? record.image_url : null);

      if (storagePath) {
        const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase.from('inspection_records').delete().eq('id', id);
      if (deleteError) throw deleteError;

      return res.status(200).json({
        configured: true,
        deleted: true,
        id,
      });
    }

    const payload = req.body as UpdateInspectionPayload;
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
