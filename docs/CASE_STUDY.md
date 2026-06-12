# Team Urbanflow Case Study

## Problem

Urban drainage and gutter inspection is often slow, manual, and hard to document consistently. Inspectors may need to review many photos from a drone survey and decide which locations are clean, partially blocked, or choked with debris.

The challenge is not only classification. A useful inspection tool also needs:

- Batch processing
- Review and correction workflow
- Persistent inspection history
- Clear reporting/export
- A practical path for model improvement

## Target Users

Primary users:

- Drainage inspection teams
- Civic-tech demonstrators
- Municipal innovation teams
- Drone survey operators
- Field operations teams reviewing infrastructure images

Secondary users:

- Product reviewers evaluating AI workflow design
- Developers reviewing a practical browser AI MVP
- Data teams planning future model training

## Solution

Team Urbanflow is a web dashboard for AI-assisted drone gutter inspection.

Users can:

1. Create or select an inspection job.
2. Upload one image or a batch of drone gutter images.
3. Run browser-side AI classification.
4. Review predicted verdicts and confidence scores.
5. Route uncertain cases into human review.
6. Save image records and reviewer corrections.
7. Filter/export inspection history.

The system supports a human-in-the-loop workflow instead of pretending that the model is always correct.

## Product Workflow

```txt
Create inspection job
  -> Upload drone images
  -> Preview selected image
  -> Run browser classifier
  -> Check image quality
  -> Save result
  -> Review uncertain cases
  -> Filter/export records
```

The workflow is designed for demo clarity:

- A single image demonstrates the AI result flow.
- A batch demonstrates operational inspection volume.
- The review queue demonstrates human oversight.
- The records dashboard demonstrates persistence and reporting.

## Architecture

```txt
Drone images
  -> Next.js dashboard
  -> Browser Teachable Machine model
  -> Image quality checks
  -> API routes
  -> Supabase
  -> Review queue / dashboard / CSV export
```

Core architecture decisions:

- Next.js handles the frontend and API routes.
- TensorFlow.js runs the current classifier in the browser.
- Supabase stores inspection jobs, inspection records, corrections, and uploaded image URLs.
- API routes keep Supabase service credentials server-side.
- Vercel hosts the app.

## AI Approach

The MVP uses Google Teachable Machine exported as TensorFlow.js model files.

Current model behavior:

- Runs inside the browser.
- Produces image-level class probabilities.
- Supports single-image and batch workflows.
- Uses confidence and image-quality checks to route uncertain results into review.

Current AI limits:

- No backend inference.
- No object detection.
- No bounding boxes.
- No segmentation masks.
- No automatic retraining.

The model is intentionally simple so the full product workflow can be demonstrated quickly.

## Key Technical Decisions

### Browser-side inference

Chosen to keep the MVP lightweight and easy to deploy. It avoids maintaining a separate ML server.

### Human review queue

Added because real inspection workflows need correction and accountability. This also creates a path toward future retraining data.

### Inspection jobs

Added to group one drone survey session into a clear unit. This makes batch image processing easier to understand and report.

### Supabase persistence

Used to persist jobs, records, images, statuses, and corrections without building custom infrastructure.

### CSV export

Added because inspection workflows often need a portable reporting format before a full PDF/reporting system exists.

## Trade-offs

| Decision | Benefit | Trade-off |
| --- | --- | --- |
| Browser Teachable Machine model | Simple deployment and fast demo | Limited model control and device-dependent performance |
| Image classification | Easy to integrate with current UI | Cannot locate debris inside the image |
| Supabase API routes | Secure server-side writes | Requires environment setup |
| Human review | More trustworthy workflow | Adds manual step |
| CSV export | Practical reporting | Less polished than generated inspection reports |

## Challenges

- Designing a UI that remains useful before upload.
- Keeping the model workflow stable while adding batch jobs and persistence.
- Avoiding overclaiming model capability.
- Separating current MVP classification from future object detection ideas.
- Ensuring Supabase service keys remain server-side.
- Making a portfolio project feel complete without pretending it is production-ready.

## Future Roadmap

Near-term:

- Collect local Ghana gutter/drainage drone images.
- Retrain the Teachable Machine model with better class balance.
- Add a polished screenshot set.
- Improve reviewer-focused UX.
- Add PDF-style report exports.

Medium-term:

- Authentication and role-based access.
- GPS/location metadata.
- Correction-to-training dataset workflow.
- Better dashboard analytics.

Long-term:

- Evaluate YOLOv8 classification.
- Add backend inference if batch scale grows.
- Evaluate YOLOv8 object detection for blockage localization.
- Add bounding-box overlays and richer detection records.

## What This Project Demonstrates

Team Urbanflow demonstrates:

- Practical AI product thinking
- Browser-side ML integration with TensorFlow.js
- Human-in-the-loop review workflow
- Batch processing UX
- Supabase-backed persistence
- API route design in Next.js
- Civic-tech dashboard design
- Honest model limitation documentation
- A clear upgrade path from MVP to stronger ML architecture

It is positioned as a portfolio-grade civic-tech AI inspection dashboard, not a production-ready municipal deployment.
