export type InspectionStatus = 'Needs review' | 'Approved' | 'Corrected';
export type InspectionVerdict = 'clean' | 'choked' | 'out-of-context' | 'manual-review' | 'ready';

export type InspectionRecord = {
  id: string;
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
