# Roadmap

## Current MVP

- Upload a gutter/drainage image
- Create inspection jobs for drone survey sessions
- Upload and process multiple images in a browser batch
- Preview image locally
- Run in-browser Teachable Machine classification
- Display confidence and class probabilities
- Check image quality
- Show batch progress for total, processed, pending, and failed images
- Route flagged cases into a review queue
- Persist inspection records with Supabase Postgres
- Relate inspection records to jobs with `job_id`
- Persist uploaded inspection images with Supabase Storage
- Show job summary cards with record counts
- Load a persistent inspection records dashboard
- Filter records by verdict, status, out-of-context, and low-confidence states
- Export all records or selected-job records as CSV
- Save reviewer corrections with `PATCH /api/inspections/[id]`
- Provide share preview metadata
- Deploy on Vercel

## Near-Term Improvements

- Split the inspection dashboard into a dedicated admin/reviewer page
- Add exportable PDF reports
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
  Supabase Storage for images
  Supabase Postgres for inspection records

Phase 3
  Dedicated admin dashboard, reports, and reviewer workflow

Phase 4
  Better ML model with detection or segmentation

Phase 5
  Backend batch processing when browser inference is no longer enough
```
