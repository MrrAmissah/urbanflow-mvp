# Architecture

## Application Shape

Team Urbanflow is a client-heavy Next.js MVP. The page shell is rendered by Next.js, while image preview, model loading, quality checks, and predictions run in the browser.

```txt
User browser
  ├─ Upload image
  ├─ Preview image locally
  ├─ Lazy-load TensorFlow.js + Teachable Machine
  ├─ Load model from /public/model
  ├─ Run image quality checks
  ├─ Run prediction
  └─ Display verdict / route flagged item to review queue
```

## Key Files

```txt
pages/index.tsx
  Page metadata, social preview tags, model preloads, and app shell.

components/GutterClassifier.tsx
  Main interactive upload, analysis, verdict, quality-check, and review queue logic.

public/model/*
  Exported Google Teachable Machine TensorFlow.js model.

public/social-preview.png
  Open Graph image used when the link is shared.

next.config.ts
  Next.js config and cache headers for model assets.
```

## Current Data Model

The MVP currently stores inspection review items in React state only:

```ts
type ReviewItem = {
  id: string
  fileName: string
  verdict: Verdict
  label: string
  confidence: number
  status: 'Needs review' | 'Approved' | 'Corrected'
  correction?: string
}
```

This means the queue resets on page refresh. That is intentional for the current prototype.

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

## Future Persistence Architecture

Recommended production-style shape:

```txt
Vercel Blob
  Stores uploaded inspection images.

Neon Postgres or Upstash Redis
  Stores inspection records, statuses, reviewer corrections, timestamps, and image URLs.

Admin dashboard
  Lists records, filters statuses, and exports corrected examples for model retraining.
```

Blob should store files. A database should store searchable inspection records.
