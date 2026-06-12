# Model Guide

## Current Model

The current MVP uses a Google Teachable Machine image model exported in TensorFlow.js format.

Required files:

```txt
public/model/model.json
public/model/metadata.json
public/model/weights.bin
```

The app loads:

```txt
/model/model.json
/model/metadata.json
```

The weights file is referenced by `model.json`.

## Recommended Classes

For the MVP to flag more than clean/choked gutters, train with clear classes such as:

```txt
clean_gutter
choked_gutter
out_of_context
blurry_or_unclear
```

Optional later classes:

```txt
roof_no_visible_gutter
partial_gutter_view
dark_image
indoor_or_document
```

## Dataset Guidance

Use varied examples for each class:

- Different roof angles
- Different lighting conditions
- Different gutter materials
- Clean and choked gutters from multiple distances
- Out-of-context images such as documents, rooms, people, cars, screenshots, and random objects
- Blurry, dark, cropped, or overexposed images

Avoid training with near-duplicate images only. The model needs variety to generalize.

## Exporting from Teachable Machine

1. Open your Teachable Machine image project.
2. Train the model.
3. Click `Export Model`.
4. Choose `TensorFlow.js`.
5. Download the model.
6. Copy the exported files into `public/model/`.
7. Run:

```bash
npm run build
```

## How the App Interprets Classes

The app maps prediction labels using keyword checks:

- Labels containing `clean` or `clear` become clean.
- Labels containing `choked`, `blocked`, `dirty`, or `debris` become choked.
- Labels containing `out`, `context`, `invalid`, `random`, `document`, `person`, `car`, or `indoor` become out of context.
- Low confidence or poor quality becomes manual review.

Keep class names simple and descriptive so the verdict logic remains predictable.

## Limitations

This model classifies the whole image. It does not:

- Draw bounding boxes
- Locate the exact blocked section
- Segment debris pixels
- Measure blockage severity

Those features need object detection or segmentation models.
