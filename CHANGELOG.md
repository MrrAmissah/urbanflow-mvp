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
- Added inspection jobs for grouping batch drone sessions under one job.
- Added inspection job API routes and optional `job_id` support on inspection records.
- Added job summary cards and selected-job CSV export.

### Reliability

- Batch processing now continues without a saved job when Supabase is unavailable, instead of aborting (matching the browser-only fallback already used for single inspections).
- Batch start-up failures (model load or job setup) now surface a clear error instead of rejecting silently.
- CSV export now attaches the download link to the document and defers releasing its temporary object URL, improving cross-browser download reliability.
- Re-selecting the same image file now re-triggers the upload flow.
