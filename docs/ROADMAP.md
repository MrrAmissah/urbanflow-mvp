# Roadmap

## Current MVP

- Upload a gutter/drainage image
- Preview image locally
- Run in-browser Teachable Machine classification
- Display confidence and class probabilities
- Check image quality
- Route flagged cases into a browser-only review queue
- Provide share preview metadata
- Deploy on Vercel

## Near-Term Improvements

- Persist uploaded images with Vercel Blob
- Persist inspection records with Neon Postgres or Upstash Redis
- Add an admin/reviewer page
- Add inspection history filters
- Add exportable CSV/PDF reports
- Add batch upload
- Add GPS metadata capture
- Improve model classes for out-of-context and unclear images

## Production Improvements

- User authentication
- Team/workspace support
- Role-based review permissions
- Audit log for reviewer corrections
- Database-backed training feedback loop
- Object detection for blocked gutter locations
- Image segmentation for visual blockage overlays
- Mobile-first field inspection flow

## Suggested Storage Path

```txt
Phase 1
  Browser-only prototype

Phase 2
  Vercel Blob for images
  Small database for inspection records

Phase 3
  Admin dashboard, reports, and reviewer workflow

Phase 4
  Better ML model with detection or segmentation
```
