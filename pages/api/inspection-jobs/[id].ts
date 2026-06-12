import type { NextApiRequest, NextApiResponse } from 'next';
import { toInspectionJob, toInspectionRecord } from '@/lib/inspections/mappers';
import { getSupabaseAdmin, hasSupabaseServerConfig } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  if (!hasSupabaseServerConfig()) {
    return res.status(503).json({
      configured: false,
      message: 'Supabase is not configured yet.',
    });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ message: 'Missing inspection job id.' });

  try {
    const supabase = getSupabaseAdmin();

    const { data: job, error: jobError } = await supabase
      .from('inspection_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (jobError) throw jobError;

    const { data: records, error: recordsError } = await supabase
      .from('inspection_records')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (recordsError) throw recordsError;

    return res.status(200).json({
      configured: true,
      job: toInspectionJob(job),
      records: (records ?? []).map(toInspectionRecord),
    });
  } catch (error) {
    console.error('Inspection job detail API error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Inspection job detail API failed.',
    });
  }
}
