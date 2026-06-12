# Architecture

## Application Shape

Team Urbanflow is a client-heavy Next.js MVP. The page shell is rendered by Next.js, while image preview, model loading, quality checks, and predictions run in the browser.

```txt
User browser
  ├─ Upload one image or a multi-image batch
  ├─ Preview image locally
  ├─ Optionally create/select an inspection job
  ├─ Lazy-load TensorFlow.js + Teachable Machine
  ├─ Load model from /public/model
  ├─ Run image quality checks per image
  ├─ Run prediction per image
  ├─ Save analyzed records through Next.js API routes with optional job_id
  └─ Display job summaries, verdicts, dashboard filters, CSV export, and review queue
```

## Key Files

```txt
pages/index.tsx
  Page metadata, social preview tags, model preloads, and app shell.

components/GutterClassifier.tsx
  Main interactive upload, inspection job, browser batch analysis, verdict, quality-check, dashboard, and review queue logic.

public/model/*
  Exported Google Teachable Machine TensorFlow.js model.

public/social-preview.png
  Open Graph image used when the link is shared.

next.config.ts
  Next.js config and cache headers for model assets.
```

## Current Data Model

The MVP supports two persistence modes:

- Supabase mode: analyzed inspections are saved through API routes and loaded on page open.
- Local-only mode: if Supabase is not configured, analyzed inspections stay in browser state only.

The UI uses this review item shape:

```ts
type ReviewItem = {
  id: string
  imageUrl?: string | null
  fileName: string
  verdict: Verdict
  label: string
  confidence: number
  status: 'Needs review' | 'Approved' | 'Corrected'
  correction?: string
}
```

In Supabase mode, records live in `inspection_records` and images can be stored in Supabase Storage. In local-only mode, the queue resets on page refresh.

Inspection jobs live in `inspection_jobs`. Each inspection record can optionally include `job_id`, allowing one drone survey session to contain many classified image records.

## Model Loading Strategy

The app avoids putting TensorFlow.js in the initial HTML payload. Instead:

- The interface renders first.
- Model files are preloaded from `/model/*`.
- TensorFlow.js and Teachable Machine are dynamically imported.
- Users can select an image while the model is preparing.
- If the user analyzes before the model is ready, the app prepares and analyzes in one action.

## Quality Checks

Before trusting a prediction, the app samples image pixels in a small canvas and estimates:

- Resolution
- Brightness
- Sharpness

Hard quality issues push the result toward manual review.

## Persistence Architecture

Current implementation:

```txt
Supabase Storage
  Stores inspection images.

Supabase Postgres
  Stores inspection jobs, inspection records, statuses, reviewer corrections, timestamps, and image URLs.

Next.js API routes
  Keep the Supabase service role key on the server.
```

The browser still performs all Teachable Machine inference. Backend ML inference is a future architecture step, not part of the current implementation.

See [SUPABASE.md](SUPABASE.md) for setup details.
