export type InspectionStatus = 'Needs review' | 'Approved' | 'Corrected';
export type InspectionVerdict = 'clean' | 'choked' | 'out-of-context' | 'manual-review' | 'ready';

export type InspectionRecord = {
  id: string;
  jobId?: string | null;
  imageUrl: string | null;
  fileName: string;
  verdict: InspectionVerdict;
  label: string;
  confidence: number;
  status: InspectionStatus;
  correction?: string | null;
  quality?: Record<string, unknown> | null;
  createdAt?: string;
};

export type CreateInspectionPayload = {
  jobId?: string | null;
  imageDataUrl?: string;
  fileName: string;
  verdict: InspectionVerdict;
  label: string;
  confidence: number;
  status: InspectionStatus;
  correction?: string | null;
  quality?: Record<string, unknown> | null;
};

export type UpdateInspectionPayload = {
  status: InspectionStatus;
  correction?: string | null;
  verdict?: InspectionVerdict;
};

export type InspectionJob = {
  id: string;
  title: string;
  locationName: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateInspectionJobPayload = {
  title: string;
  locationName: string;
  notes?: string | null;
};
