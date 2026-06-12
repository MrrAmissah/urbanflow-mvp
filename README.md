# Team Urbanflow

AI-powered civic-tech inspection dashboard for drone gutter and drainage images.

Team Urbanflow is a portfolio-grade MVP that helps inspection teams upload drone images, classify gutter condition in the browser, group batches into inspection jobs, persist results to Supabase, and route uncertain results into human review.

Live demo: https://urbanflow-mvp.vercel.app  
Repository: `https://github.com/MrrAmissah/urbanflow-mvp`

## Screenshots

Screenshots should be added before final portfolio publication.

Recommended captures:

- Dashboard overview
- Upload state
- Analysis result
- Batch progress
- Inspection jobs summary
- Review queue
- Records dashboard and CSV export

See [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) for a screenshot checklist.

## Features

- Browser-side AI image classification with Google Teachable Machine and TensorFlow.js
- Single-image upload and preview
- Multi-image batch upload with sequential browser processing
- Inspection jobs for grouping one drone inspection session
- Image quality checks for resolution, brightness, and sharpness
- Confidence threshold control
- Verdict routing for clean, choked, out-of-context, and manual-review cases
- Human review queue with reviewer corrections
- Supabase-backed inspection records and image persistence
- Persistent records dashboard with filters
- CSV export for all records or selected-job records
- Responsive dashboard layout with useful first-load empty states
- Project documentation, model improvement plan, and demo guide

## Tech Stack

- Next.js 16 Pages Router
- React 19
- TypeScript
- Tailwind CSS 4
- TensorFlow.js
- `@teachablemachine/image`
- Supabase Postgres and Storage
- Lucide React icons
- Vercel hosting
- GitHub Actions CI

## Architecture Overview

```txt
Drone gutter images
  -> Next.js inspection dashboard
  -> Browser-side Teachable Machine model
  -> Image quality checks
  -> Verdict/class/confidence result
  -> Next.js API routes
  -> Supabase Storage + Postgres
  -> Review queue, job summaries, dashboard filters, CSV export
```

The app is intentionally client-heavy for the AI workflow. The model runs in the browser, while Supabase writes stay behind server-side API routes so service keys are never exposed to the client.

Read more in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## AI Model

The current model is a Google Teachable Machine image classifier exported as TensorFlow.js files:

```txt
public/model/model.json
public/model/metadata.json
public/model/weights.bin
```

The model returns image-level class probabilities. The MVP maps the top prediction and confidence score into operational verdicts such as clean, choked, out-of-context, or manual review.

Current AI scope:

- Image classification only
- No object detection
- No bounding boxes
- No segmentation masks
- No automatic retraining
- No backend inference

See [docs/MODEL.md](docs/MODEL.md), [docs/KAGGLE_NOTEBOOK_FEASIBILITY.md](docs/KAGGLE_NOTEBOOK_FEASIBILITY.md), and [docs/MODEL_IMPROVEMENT_PLAN.md](docs/MODEL_IMPROVEMENT_PLAN.md).

## Supabase Persistence

Supabase is used for optional persistence:

- `inspection_jobs`: groups a drone inspection session
- `inspection_records`: stores image verdicts, confidence, status, correction, quality report, and optional `job_id`
- Supabase Storage bucket: stores uploaded inspection images

Server-side API routes handle all Supabase writes:

```txt
GET    /api/inspection-jobs
POST   /api/inspection-jobs
GET    /api/inspection-jobs/[id]
GET    /api/inspections
POST   /api/inspections
PATCH  /api/inspections/[id]
```

See [docs/SUPABASE.md](docs/SUPABASE.md) for the database setup.

## Current Limitations

This project is an MVP and portfolio case study, not a production municipal inspection system.

Known limitations:

- The classifier depends on the quality and coverage of the current Teachable Machine training data.
- The app does not localize debris inside the image.
- The app does not generate bounding boxes or segmentation masks.
- The app does not run backend ML inference.
- The app does not include authentication or role-based access.
- Reviewer corrections are stored, but they do not automatically retrain the model.
- Dataset licensing must be checked before using external Kaggle data for training.

## Roadmap

Near-term:

- Collect more local Ghana gutter/drainage drone images
- Retrain the Teachable Machine model with better class balance
- Add a polished screenshot set for the portfolio README
- Improve test coverage around API routes and dashboard state
- Add a reviewer-focused route if the workflow grows

Later:

- Authentication and role-based review permissions
- PDF reports for inspection jobs
- GPS/location metadata
- Training feedback workflow from corrected records
- YOLOv8 classification evaluation
- YOLOv8 object detection with backend inference and bounding-box overlays

## Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Run quality checks:

```bash
npm run check
```

## Environment Variables

Create `.env.local` for local Supabase persistence:

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_INSPECTION_BUCKET=inspection-images
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side.
- Do not expose service keys with a `NEXT_PUBLIC_` prefix.
- The app can still run in local-only mode when Supabase is not configured.

## Documentation

- [Case Study](docs/CASE_STUDY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Demo Guide](docs/DEMO_GUIDE.md)
- [Screenshots Guide](docs/SCREENSHOTS.md)
- [Model Guide](docs/MODEL.md)
- [Model Improvement Plan](docs/MODEL_IMPROVEMENT_PLAN.md)
- [Kaggle Notebook Feasibility](docs/KAGGLE_NOTEBOOK_FEASIBILITY.md)
- [Supabase Setup](docs/SUPABASE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Author / Role

Built by Prince Amissah as a civic-tech AI product MVP.

Project role:

- Product concept and workflow design
- Frontend engineering with Next.js and React
- Browser AI integration with TensorFlow.js and Teachable Machine
- Supabase persistence design
- Human review workflow and inspection job system
- Portfolio documentation and deployment readiness
