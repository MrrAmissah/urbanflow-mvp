# Changelog

## Unreleased

- Added image quality checks for resolution, brightness, and sharpness.
- Added confidence threshold control.
- Added verdict logic for clean, choked, out-of-context, and manual-review outcomes.
- Added browser-only inspection review queue.
- Improved review action feedback for approve, context, and choked states.
- Lazy-loaded TensorFlow.js and Teachable Machine to improve initial page access.
- Added Open Graph and Twitter share preview metadata.
- Added social preview image.
- Added long-lived model asset caching.
- Added project documentation for GitHub readiness.
- Added Supabase-ready API routes and setup guide for persisted inspections.
- Added browser-based batch inspection processing while keeping Teachable Machine inference on the client.
- Added batch progress counts for total, processed, pending, and failed images.
- Added a persistent inspection records dashboard loaded from `GET /api/inspections`.
- Added dashboard filters and CSV export.
- Added reviewer correction persistence through `PATCH /api/inspections/[id]`.
