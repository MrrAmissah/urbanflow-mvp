# Team Urbanflow

AI-powered drone gutter inspection MVP built with Next.js, TensorFlow.js, and Google Teachable Machine.

Live app: https://urbanflow-mvp.vercel.app

## Overview

Team Urbanflow helps inspection teams upload drone gutter images, run an in-browser AI classification, and route uncertain or poor-quality results into a lightweight review queue.

The current MVP focuses on fast validation:

- Upload and preview gutter/drainage images
- Run a Teachable Machine image model in the browser
- Classify gutters as clean, choked, unclear, or out of context
- Display confidence scores and class probabilities
- Check image quality before trusting the result
- Route flagged cases into an inspection review queue
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
│   └── ROADMAP.md
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
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

1. User uploads a gutter or drainage image.
2. App previews the image locally.
3. App prepares the model if it is not ready yet.
4. User runs analysis.
5. App checks image quality.
6. App displays a verdict and probabilities.
7. Only flagged cases are added to the review queue.

The review queue is currently browser-only state. It is useful for demonstrating workflow behavior, but it does not persist across refreshes yet.

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
- TensorFlow.js is lazy-loaded so the main page can render before the ML bundle is needed.
- Model assets are cached with long-lived headers in `next.config.ts`.
- The app is an MVP and should not be used as a final inspection authority without human review.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Model Guide](docs/MODEL.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
