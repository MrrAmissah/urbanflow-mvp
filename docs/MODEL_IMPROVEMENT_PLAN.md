# Model Improvement Plan

## Goal

Improve Team Urbanflow's current browser-based Teachable Machine classifier without changing the MVP architecture. The immediate goal is better classification of drone gutter/drainage images into operational inspection verdicts.

Do not move inference to the backend for this phase.

## 1. Recommended Model Classes

Use five practical image-level classes:

| Class | Meaning |
| --- | --- |
| `clean_gutter` | Gutter/drainage channel is visible and mostly clear. |
| `partially_choked_gutter` | Some debris, leaves, silt, stagnant water, or obstruction is visible, but the channel is not fully blocked. |
| `choked_gutter` | Clear blockage, heavy debris, overflow risk, or drainage path is visibly obstructed. |
| `out_of_context` | Image is not a usable gutter/drainage inspection image. Examples: people, cars, rooms, random objects, sky-only, unrelated streets. |
| `poor_quality_or_unclear` | The image may contain a gutter, but quality is too low for a reliable verdict. Examples: blur, darkness, overexposure, extreme distance, heavy occlusion. |

These map well to the current MVP because the app already expects one class/confidence result per image.

## 2. Minimum Image Targets Per Class

Start with a balanced practical target:

| Class | Minimum | Better Target |
| --- | ---: | ---: |
| `clean_gutter` | 100 images | 300+ images |
| `partially_choked_gutter` | 100 images | 300+ images |
| `choked_gutter` | 100 images | 300+ images |
| `out_of_context` | 100 images | 300+ images |
| `poor_quality_or_unclear` | 75 images | 200+ images |

Minimum usable first retrain: about 475 images total.

Better MVP retrain: 1,400+ images total.

Keep classes as balanced as possible. A model trained with many more `clean_gutter` images than `choked_gutter` images may become biased toward clean predictions.

## 3. Local Ghana Image Collection

Collect local Ghana gutter/drainage images safely and consistently.

### Safety

- Do not fly drones near airports, restricted sites, crowds, or active road hazards.
- Follow local drone rules and property permissions.
- Avoid capturing identifiable faces, house interiors, private compounds, license plates, or sensitive locations where possible.
- Do not step into drains, gutters, floodwater, or unstable areas to capture images.
- Use a spotter when operating near roads or markets.

### Consistency

For each inspection area, capture:

- Top-down or angled drone shots showing the gutter/channel clearly.
- Multiple distances: close, medium, and wider context.
- Different lighting: morning, midday, cloudy, after rainfall.
- Different drain types: roadside gutters, concrete channels, market drains, estate drains, open channels.
- Different conditions: dry, wet, flowing water, stagnant water, leaves, plastic waste, silt, sand, vegetation.

### Metadata to Track

Keep a simple spreadsheet or folder notes with:

- Location name
- Date
- Weather or rainfall condition
- Camera/drone type if known
- Approximate image angle
- Initial human label
- Any uncertainty note

Do not store sensitive personal information unless there is a clear need and permission.

## 4. Careful Use of Kaggle Datasets

### Aerial Beach Garbage Dataset

Use only as reference or limited augmentation.

Potential value:

- Helps expose the model/training team to aerial views of debris.
- Useful for understanding drone-like garbage textures.
- Could provide a small number of negative or debris-reference examples if licensing allows.

Limitations:

- It is not gutter/drainage-specific.
- Classes are material/object classes such as glass, plastic bottles, pouches, containers, and cans.
- Too much beach/general garbage data can make the model confuse any trash photo with a choked gutter.

Recommendation:

- Do not use it as the main training data.
- If used, mix sparingly and label carefully.
- Prefer it for reference, augmentation experiments, or future YOLO research.

### TACO Dataset

Use as future object detection reference only.

Potential value:

- Has bounding-box style trash detection relevance.
- Useful for thinking about future debris localization.

Limitations:

- Mostly general litter images, not drone gutter inspections.
- Uses object detection output, while the current MVP uses image classification.
- Would require a different UI and likely backend inference for practical use.

Recommendation:

- Do not use TACO for the current Teachable Machine retrain unless manually selecting very relevant images.
- Keep it as a reference for a later object detection phase.

Before using any Kaggle data, inspect the dataset licence and attribution requirements.

## 5. Labeling Images

### Labeling Rules

Use one primary label per image.

- If the gutter is clearly visible and mostly clear: `clean_gutter`.
- If debris is present but water/path may still pass: `partially_choked_gutter`.
- If flow is obviously blocked or debris dominates the channel: `choked_gutter`.
- If the image is not a gutter/drainage inspection image: `out_of_context`.
- If the image may be relevant but is too blurry/dark/far/unclear: `poor_quality_or_unclear`.

### Labeling Workflow

1. Put images into class folders.
2. Label uncertain images separately first.
3. Review uncertain images with at least one other person.
4. Remove duplicates or near-identical frames.
5. Avoid training with images where the label is still disputed.

Suggested folder structure:

```txt
training-data/
  clean_gutter/
  partially_choked_gutter/
  choked_gutter/
  out_of_context/
  poor_quality_or_unclear/
```

### Quality Control

- Keep a small validation set that is not used during training.
- Include hard cases in validation: shadows, wet concrete, leaves, partial obstruction, far drone shots.
- Do not overfill one class with very similar frames from the same video.

## 6. Retraining the Teachable Machine Model

1. Open Google Teachable Machine.
2. Create an Image Project.
3. Add the five classes exactly:
   - `clean_gutter`
   - `partially_choked_gutter`
   - `choked_gutter`
   - `out_of_context`
   - `poor_quality_or_unclear`
4. Upload the prepared images into the matching classes.
5. Train the model.
6. Test with images that were not used for training.
7. Check confusion between:
   - `clean_gutter` and `partially_choked_gutter`
   - `partially_choked_gutter` and `choked_gutter`
   - `poor_quality_or_unclear` and real gutter classes
8. Retrain after correcting obvious label/data issues.

Keep notes on:

- Training date
- Number of images per class
- Main confusion patterns
- Accuracy on test images
- Known weaknesses

## 7. Replacing Model Files in `public/model`

After exporting from Teachable Machine as TensorFlow.js:

1. Download the exported model.
2. Extract the files.
3. Replace the current files in:

```txt
public/model/model.json
public/model/metadata.json
public/model/weights.bin
```

4. Keep the same filenames so the existing MVP model loading logic continues to work.
5. Run the app locally.
6. Confirm the model status changes to ready.

Do not change the browser model loading code unless the export format changes.

## 8. Testing the New Model in the Current MVP

Test in this order:

1. Single clean gutter image.
2. Single partially choked gutter image.
3. Single choked gutter image.
4. Poor-quality image.
5. Out-of-context image.
6. Batch upload with mixed classes.
7. Batch upload under an inspection job.
8. Review queue correction flow.
9. Records dashboard filters.
10. CSV export.

Record for each test:

- File name
- Expected class
- Predicted class
- Confidence
- Whether it entered review correctly
- Notes on failure

Use at least 20 images per class for a first manual validation pass.

## 9. Reviewer Corrections as Retraining Candidates

Reviewer corrections are valuable future training data.

When a reviewer changes a result:

- The original model prediction shows what the model got wrong.
- The correction suggests the human-approved label.
- The image can become a candidate for the next training set.

Suggested future workflow:

1. Export corrected records from Supabase or CSV.
2. Download/review the associated images.
3. Move images into the corrected class folder.
4. Exclude images with uncertain or disputed corrections.
5. Retrain the Teachable Machine model with the expanded dataset.

Do not automatically retrain from corrections without human review.

## 10. When to Consider YOLOv8 Later

### YOLOv8 Classification

Consider YOLOv8 classification when:

- Teachable Machine accuracy plateaus.
- There are at least 1,000+ strong local images.
- The team wants a repeatable Python training pipeline.
- The model needs better control over training, validation, and metrics.

YOLOv8 classification could still output one class/confidence per image, so it is closer to the current MVP than object detection.

Likely requirement:

- Backend inference or a carefully planned browser-compatible conversion path.

### YOLOv8 Object Detection

Consider YOLOv8 object detection when Urbanflow needs to identify where the blockage is.

Use cases:

- Draw boxes around debris.
- Count visible waste clusters.
- Estimate blocked gutter sections.
- Produce richer inspection reports.

Requirements:

- Bounding-box annotations.
- New detection labels.
- Backend inference, likely FastAPI or a similar service.
- UI changes for overlays.
- Storage changes for boxes, scores, and detection classes.

This is a future upgrade, not the next MVP step.

## Practical Recommendation

The best next move is:

1. Keep the current MVP and browser inference.
2. Collect local Ghana gutter/drainage images.
3. Retrain Teachable Machine with the five recommended classes.
4. Test the new model inside the existing app.
5. Use reviewer corrections to improve the next training dataset.
6. Treat Kaggle notebooks as reference material, not production code.
7. Revisit YOLOv8 after a stronger local dataset exists.
