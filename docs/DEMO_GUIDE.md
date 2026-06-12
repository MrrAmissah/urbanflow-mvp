# Demo Guide

## Demo Goal

Show Team Urbanflow as a civic-tech AI inspection dashboard that combines browser-side image classification, batch inspection workflow, human review, Supabase persistence, and clear reporting.

Avoid positioning it as a production municipal system. It is a strong MVP and portfolio case study.

## Recommended Demo Story

Use this story:

> "A drainage team has completed a morning drone survey after rainfall. They need to quickly triage gutter images, identify likely choked locations, review uncertain cases, and export a record of the inspection."

Example inspection job:

```txt
Job title: Kaneshie Drainage Inspection
Location: Kaneshie Market Road
Notes: Morning drone survey after rainfall
```

## What To Click First

1. Open the app.
2. Point out the summary row:
   - model status
   - active job
   - total records
   - needs review
3. Create an inspection job.
4. Upload one image.
5. Run `Analyze Current`.
6. Explain the verdict, class confidence, and image quality check.
7. Upload multiple images.
8. Run `Process Batch`.
9. Show batch progress.
10. Open the review queue.
11. Apply a reviewer correction.
12. Show the records dashboard filters.
13. Export CSV.

## Browser AI Inference Explanation

Suggested explanation:

> "The model runs directly in the browser using TensorFlow.js and a Google Teachable Machine export. That means this MVP does not need a separate ML server for inference. The browser loads the model, processes each image, and produces class probabilities."

Important honesty points:

- The app currently uses image classification, not object detection.
- It does not draw bounding boxes.
- It does not segment debris.
- It does not automatically retrain from corrections.
- Backend inference is a future upgrade, not part of the current MVP.

## Review Corrections Explanation

Suggested explanation:

> "The model is treated as an assistant, not an authority. Low-confidence, poor-quality, or suspicious images are routed into a review queue. A human reviewer can approve or correct the result, and those corrections are saved with the inspection record."

Why this matters:

- Builds trust.
- Creates an audit trail.
- Provides future retraining candidates.
- Keeps the MVP realistic for civic inspection workflows.

## Recommended Test Flow

### Single-image flow

1. Select one gutter/drainage image.
2. Confirm the preview appears.
3. Click `Analyze Current`.
4. Read the top class and confidence.
5. Review the quality metrics.

### Batch flow

1. Select several images.
2. Confirm the fanned batch preview appears.
3. Click `Process Batch`.
4. Watch total, processed, pending, and failed counts.
5. Review the latest processed prediction.

### Persistence flow

1. Refresh records.
2. Select an inspection job card.
3. Show records filtered by job.
4. Export CSV.

## How To Explain Current Limitations

Use concise language:

> "This MVP proves the workflow. The next model improvement is better local Ghana drone gutter data and a retrained Teachable Machine classifier. Object detection and backend inference are planned later if the product needs debris localization."

Current limitations:

- The model quality depends on training data quality.
- No bounding boxes or debris localization.
- No authentication yet.
- No production municipal audit controls.
- External datasets need licence review before training use.

## Demo Prep Checklist

- [ ] Confirm the live app loads.
- [ ] Confirm Supabase environment variables are set in Vercel.
- [ ] Have 5-10 safe sample images ready.
- [ ] Include at least one clean image.
- [ ] Include at least one choked or debris-heavy image.
- [ ] Include one out-of-context or poor-quality image.
- [ ] Create one inspection job before batch upload.
- [ ] Test CSV export.
- [ ] Keep the model limitation explanation ready.
