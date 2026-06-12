# Architecture

Team Urbanflow is a client-heavy Next.js inspection dashboard. The AI model runs in the browser, while persistence is handled through server-side API routes connected to Supabase.

## End-to-End Flow

```txt
Drone images
  -> Next.js dashboard
  -> Browser image preview
  -> Browser Teachable Machine / TensorFlow.js model
  -> Image quality checks
  -> Verdict + class confidence
  -> Next.js API routes
  -> Supabase Storage + Postgres
  -> Review queue / dashboard / CSV export
```

## Detailed Flow

```txt
User
  |
  | uploads one image or a batch
  v
Next.js dashboard (`components/GutterClassifier.tsx`)
  |
  | creates/selects optional inspection job
  | previews image locally
  | lazy-loads TensorFlow.js and Teachable Machine
  v
Browser model inference
  |
  | returns class probabilities
  v
Quality and verdict layer
  |
  | checks resolution, brightness, sharpness
  | maps class + confidence + quality to verdict
  v
API routes
  |
  | POST /api/inspection-jobs
  | POST /api/inspections
  | PATCH /api/inspections/[id]
  v
Supabase
  |
  | inspection_jobs
  | inspection_records
  | inspection-images bucket
  v
Dashboard
  |
  | job summaries
  | review queue
  | filters
  | CSV export
```

## Key Design Choice

The app keeps AI inference in the browser for the current MVP.

Benefits:

- No backend ML server required.
- Fast demo setup.
- Uploaded images can be previewed and classified immediately.
- The existing Teachable Machine export works directly with TensorFlow.js.

Trade-offs:

- Model size affects browser load time.
- Browser inference depends on user device performance.
- The current approach produces image-level classifications only.
- Bounding boxes, segmentation, and large-scale processing would require a future architecture.

## Main Files

```txt
pages/index.tsx
  Metadata, icon references, model preloads, and app shell.

components/GutterClassifier.tsx
  Main dashboard: upload, jobs, browser inference, quality checks, review queue, records dashboard, and CSV export.

components/UrbanflowLogo.tsx
  SVG brand mark used beside the page title.

lib/inspections/types.ts
  Shared inspection record and job types.

lib/inspections/mappers.ts
  Supabase row mapping helpers.

lib/supabase/server.ts
  Server-side Supabase admin client.

pages/api/inspection-jobs/*
  Inspection job API routes.

pages/api/inspections/*
  Inspection record API routes.

public/model/*
  Teachable Machine TensorFlow.js model files.
```

## Data Model

```txt
inspection_jobs
  id
  title
  location_name
  notes
  created_at
  updated_at

inspection_records
  id
  job_id -> inspection_jobs.id
  image_url
  file_name
  verdict
  label
  confidence
  status
  correction
  quality
  created_at
```

## Model Layer

The current model is an image classifier exported from Google Teachable Machine:

```txt
public/model/model.json
public/model/metadata.json
public/model/weights.bin
```

The browser loads the model lazily and returns class probabilities. The app then applies confidence and image-quality checks to decide whether a result is approved or routed to review.

The current model does not perform object detection, bounding-box localization, segmentation, or automatic retraining.

## Persistence Layer

Supabase is accessed only from server-side API routes.

```txt
GET    /api/inspection-jobs
POST   /api/inspection-jobs
GET    /api/inspection-jobs/[id]
GET    /api/inspections
POST   /api/inspections
PATCH  /api/inspections/[id]
```

The service role key is never exposed to browser code.

If Supabase is not configured, the app can still run as a local browser session, but records will not persist after refresh.

## Future Architecture Options

The likely future upgrade path is:

```txt
Current MVP
  Browser Teachable Machine classifier

Next model step
  Better Teachable Machine training data and class balance

Later
  YOLOv8 classification evaluation

Advanced
  YOLOv8 object detection with FastAPI/backend inference
  Bounding-box overlays
  Detection records stored with inspection results
```

Backend ML inference is intentionally not part of the current implementation.
