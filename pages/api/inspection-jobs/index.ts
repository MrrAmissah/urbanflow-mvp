import type { NextApiRequest, NextApiResponse } from 'next';
import { toInspectionJob } from '@/lib/inspections/mappers';
import type { CreateInspectionJobPayload } from '@/lib/inspections/types';
import { getSupabaseAdmin, hasSupabaseServerConfig } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!hasSupabaseServerConfig()) {
    return res.status(503).json({
      configured: false,
      jobs: [],
      message: 'Supabase is not configured yet.',
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('inspection_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return res.status(200).json({
        configured: true,
        jobs: (data ?? []).map(toInspectionJob),
      });
    }

    if (req.method === 'POST') {
      const payload = req.body as CreateInspectionJobPayload;

      if (!payload.title?.trim() || !payload.locationName?.trim()) {
        return res.status(400).json({ message: 'Job title and location name are required.' });
      }

      const { data, error } = await supabase
        .from('inspection_jobs')
        .insert({
          title: payload.title.trim(),
          location_name: payload.locationName.trim(),
          notes: payload.notes?.trim() || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      return res.status(201).json({
        configured: true,
        job: toInspectionJob(data),
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  } catch (error) {
    console.error('Inspection jobs API error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Inspection jobs API failed.',
    });
  }
}
