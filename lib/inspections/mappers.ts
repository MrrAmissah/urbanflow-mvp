import type { InspectionJob, InspectionRecord } from './types';

export function toInspectionRecord(row: Record<string, unknown>): InspectionRecord {
  return {
    id: String(row.id),
    jobId: typeof row.job_id === 'string' ? row.job_id : null,
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

export function toInspectionJob(row: Record<string, unknown>): InspectionJob {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    locationName: String(row.location_name ?? ''),
    notes: typeof row.notes === 'string' ? row.notes : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}
