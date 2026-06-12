# Screenshots Guide

Use this checklist to create a portfolio-ready screenshot set for the README, case study, and LinkedIn/GitHub posts.

## Recommended Screenshots

### 1. Dashboard Overview

Capture:

- Team Urbanflow header and logo
- Summary row
- Two-column work area
- Right-column empty states

Purpose:

- Shows the app is polished before any upload.

### 2. Upload State

Capture:

- Inspection job card filled or selected
- Upload area
- Image preview populated
- Fanned batch preview if multiple images are selected

Purpose:

- Shows the inspection workflow starting point.

### 3. Analysis Result

Capture:

- Image preview
- AI verdict
- Confidence score
- Class probabilities
- Image quality check

Purpose:

- Shows browser-side AI classification output.

### 4. Batch Progress

Capture:

- Multiple uploaded images
- Batch progress counts
- Progress bar
- Latest processed prediction

Purpose:

- Shows operational drone survey workflow.

### 5. Inspection Jobs Summary

Capture:

- Job cards
- Total images
- Choked count
- Clean count
- Needs review count

Purpose:

- Shows how batches are grouped into inspection sessions.

### 6. Review Queue

Capture:

- One or more records needing review
- Approve/context/choked correction buttons
- Status badge

Purpose:

- Shows human-in-the-loop review.

### 7. Records Dashboard

Capture:

- Filters
- Records table
- Job column
- Status/correction columns

Purpose:

- Shows persistence and inspection history.

### 8. CSV Export

Capture:

- Export button
- Optional downloaded CSV opened in a spreadsheet or editor

Purpose:

- Shows practical reporting.

## Screenshot Quality Notes

- Use a desktop viewport around 1440px wide.
- Capture one mobile screenshot if possible.
- Avoid showing private Supabase keys, browser extensions, or unrelated tabs.
- Use safe sample images without identifiable people, plates, or private property details.
- Keep screenshots honest: do not imply object detection or municipal production deployment.

## Suggested README Layout

Once screenshots exist, add them to:

```txt
public/screenshots/
  dashboard-overview.png
  upload-state.png
  analysis-result.png
  batch-progress.png
  review-queue.png
  records-dashboard.png
```

Then reference them from `README.md`.
