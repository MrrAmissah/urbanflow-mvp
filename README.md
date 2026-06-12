# Team Urbanflow

AI-powered drone gutter inspection MVP built with Next.js, TensorFlow.js, and Google Teachable Machine.

Live app: https://urbanflow-mvp.vercel.app

## Overview

Team Urbanflow helps inspection teams upload drone gutter images, run an in-browser AI classification, and route uncertain or poor-quality results into a lightweight review queue.

The current MVP focuses on fast validation:

- Upload and preview gutter/drainage images
- Run a Teachable Machine image model in the browser
- Process multiple uploaded images one by one in a browser batch
- Classify gutters as clean, choked, unclear, or out of context
- Display confidence scores and class probabilities
- Check image quality before trusting the result
- Route flagged cases into an inspection review queue with reviewer corrections
- Persist analyzed inspection records with Supabase when configured
- Review saved inspection history with filters and CSV export
- Provide Open Graph preview metadata for link sharing

## Tech Stack

- Next.js 16 with the Pages Router
- React 19
- TypeScript
- Tailwind CSS 4
- TensorFlow.js
- `@teachablemachine/image`
- Lucide React icons
- Vercel hosting
- Supabase for optional inspection persistence

## Quick Start

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Scripts

```bash
npm run dev      # Start local development server
npm run lint     # Run ESLint
npm run build    # Run production build and type checks
npm run start    # Start the production server locally
```

## Project Structure

```txt
urbanflow-mvp/
├── components/
│   └── GutterClassifier.tsx
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── MODEL.md
│   ├── ROADMAP.md
│   └── SUPABASE.md
├── lib/
│   ├── inspections/
│   └── supabase/
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── api/
│   └── index.tsx
├── public/
│   ├── model/
│   │   ├── metadata.json
│   │   ├── model.json
│   │   └── weights.bin
│   └── social-preview.png
├── styles/
│   └── globals.css
├── next.config.ts
├── package.json
└── README.md
```

## Model Files

The model is loaded from:

```txt
public/model/model.json
public/model/metadata.json
public/model/weights.bin
```

Keep those files committed if you want the deployed app to work without external model hosting.

See [docs/MODEL.md](docs/MODEL.md) for model training, export, and class-naming guidance.

## Current UX Flow

1. User uploads one or multiple gutter/drainage images.
2. App previews the selected image locally.
3. App prepares the model if it is not ready yet.
4. User runs one-image analysis or a browser-based batch.
5. App checks image quality for each image.
6. App displays verdicts, probabilities, and batch progress.
7. App saves analyzed inspection records through the API routes.
8. Flagged records stay in the review queue and reviewer corrections are saved with `PATCH /api/inspections/[id]`.

If Supabase is configured, inspection records are saved and loaded through the API routes. If Supabase is not configured yet, the app gracefully falls back to a browser-only queue for the current session.

## Deployment

The project is linked to Vercel and currently deploys to:

```txt
https://urbanflow-mvp.vercel.app
```

Deploy production:

```bash
vercel --prod
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment notes, model caching, and share-preview behavior.

## Important Notes

- The model runs in the browser, so uploaded images are not sent to a backend in the current MVP.
- Images and records are sent to Supabase only through server-side API routes after Supabase environment variables, tables, and storage are configured.
- Backend ML inference is intentionally not part of this MVP yet; batch processing still uses the existing browser model.
- TensorFlow.js is lazy-loaded so the main page can render before the ML bundle is needed.
- Model assets are cached with long-lived headers in `next.config.ts`.
- The app is an MVP and should not be used as a final inspection authority without human review.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Model Guide](docs/MODEL.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Supabase Setup](docs/SUPABASE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
