# Kaggle Notebook Feasibility for Team Urbanflow

## Scope

This report reviews two Kaggle notebooks added to the project root:

- `garbage-detection-with-tensorflow.ipynb`
- `aerial-beach-garbage-detection-using-yolov8.ipynb`

The notebooks were inspected as notebook JSON only. Training/inference cells were not executed. No Kaggle datasets, model weights, or Kaggle input folders were found locally in this repository.

Team Urbanflow currently uses a browser-side Google Teachable Machine/TensorFlow.js image classification model. The app expects one verdict/class/confidence result per image and does not currently draw bounding boxes or segmentation masks.

## 1. Notebook Summary

### `garbage-detection-with-tensorflow.ipynb`

| Item | Finding |
| --- | --- |
| Notebook title/purpose | `TACO (Garbage) Detection (SSD MobileNet v2) with TensorFlow` |
| Framework used | TensorFlow 1.x compatibility APIs plus TensorFlow Object Detection API |
| Model type | SSD MobileNet v2 frozen graph |
| Task type | Object detection inference demo |
| Dataset referenced | TACO: Trash Annotations in Context |
| Dataset path assumptions | `/kaggle/input/tacotrashdataset/data` |
| Pretrained model path | `../input/trained-models-taco-trash-annotations-in-context/ssd_mobilenet_v2_taco_2018_03_29.pb` |
| Class labels used | 60 TACO categories loaded from `annotations.json`; examples include aluminium foil, battery, plastic bottles, glass bottle, plastic bottle cap, broken glass, food can, drink can, cartons, paper cup, and disposable plastic cup |
| Trains model? | No. It reconstructs a frozen graph and runs inference on sample images |
| Expected output format | Bounding boxes, class IDs/names, scores, and rendered image overlays |
| Kaggle-only paths/secrets | Uses Kaggle `/kaggle/input/...` paths. No W&B/Kaggle secret usage detected |

Important notebook behavior:

- Clones `tensorflow/models`.
- Installs the TensorFlow Object Detection API.
- Builds a label map from TACO `annotations.json`.
- Reconstructs a `.pb` frozen graph.
- Runs `detect(...)` on sample TACO image paths.

### `aerial-beach-garbage-detection-using-yolov8.ipynb`

| Item | Finding |
| --- | --- |
| Notebook title/purpose | Aerial/drone garbage classification using YOLOv8 |
| Framework used | Ultralytics YOLOv8, PyTorch, OpenCV, Matplotlib, W&B |
| Model type | `yolov8l-cls.pt` classification model |
| Task type | Image classification, not object detection despite the filename saying detection |
| Dataset referenced | Kaggle dataset `drone-garbage-detection` |
| Dataset path assumptions | `/kaggle/input/drone-garbage-detection/datasets` |
| Class labels used | `glass`, `plastic_bottle_takeaway_cup`, `retort_pouch`, `take_away_container`, `tin_aluminium_cans` |
| Trains model? | Yes. It trains YOLOv8 classification for 10 epochs |
| Expected output format | Predicted class and confidence probabilities from YOLO classification |
| Kaggle-only paths/secrets | Uses Kaggle input paths and `kaggle_secrets.UserSecretsClient()` to load `wandb_api_key` |

Important notebook behavior:

- Installs `ultralytics` and `transformers`.
- Logs into W&B using a Kaggle secret.
- Sets `DATA_DIR = '/kaggle/input/drone-garbage-detection/datasets'`.
- Runs EDA over `train`, `val`, and `test` folders.
- Trains with:

```bash
yolo task=classify mode=train model=yolov8l-cls.pt data='{DATA_DIR}' epochs=10 imgsz=128
```

- Validates with a trained checkpoint at `/kaggle/working/runs/classify/train/weights/best.pt`.
- Notebook output reports:
  - train: 1,710 images
  - val: 169 images
  - test: 70 images
  - 5 classes
  - validation top-1 accuracy: 0.994
  - validation top-5 accuracy: 1.0

## 2. Practical Relevance to Team Urbanflow

### TensorFlow/TACO notebook

| Question | Assessment |
| --- | --- |
| Helps detect garbage/debris? | Yes, as a general litter detector. It can localize visible trash items such as bottles, cans, cartons, and caps. |
| Aerial/drone-like enough? | Mostly no. TACO is "waste in the wild" across diverse environments, not specifically aerial drone gutter imagery. |
| Gutter/drainage-specific? | No. It does not model gutters, drains, rooflines, roadside channels, sludge, leaves, water, or blocked drainage context. |
| Helps clean vs choked gutter classification? | Indirectly only. It may identify some debris types, but it does not classify gutter state. |
| Best use | Future architecture/reference code for object detection, not current MVP integration. |

This notebook is useful conceptually because Urbanflow may later need to show where debris is inside a gutter. However, the notebook uses an older TensorFlow Object Detection workflow and a frozen graph, which is not a natural fit for the current Next.js + Teachable Machine browser classifier.

### YOLOv8 aerial garbage notebook

| Question | Assessment |
| --- | --- |
| Helps detect garbage/debris? | Somewhat. It classifies aerial garbage material categories. |
| Aerial/drone-like enough? | Yes, more relevant than TACO because the dataset is drone/aerial garbage oriented. |
| Gutter/drainage-specific? | No. It appears focused on garbage items, likely beach/open-area imagery, not gutters or drainage channels. |
| Helps clean vs choked gutter classification? | Indirectly. It could help recognize debris-like visual patterns, but its classes are material/object categories, not gutter condition states. |
| Best use | Useful with adaptation as dataset inspiration or future YOLO classification/object detection reference. |

This notebook is closer to Urbanflow than the TACO notebook because it uses aerial imagery and classification. Still, its classes do not map cleanly to Urbanflow's current classes.

## 3. Compatibility With the Current MVP

### Current Urbanflow stack

- Next.js Pages Router frontend.
- Browser-side Teachable Machine/TensorFlow.js inference.
- One image-level verdict/class/confidence per uploaded image.
- Single-image and batch upload.
- Image quality checks.
- Supabase persistence.
- Inspection jobs, review queue, dashboard, filters, and CSV export.
- No bounding box, segmentation, or backend inference UI.

### TensorFlow/TACO compatibility

| Integration question | Answer |
| --- | --- |
| Can it drop into current browser model? | No. It is TensorFlow Object Detection API with a frozen graph. |
| Would it require retraining Teachable Machine? | Only if TACO images are manually converted into Urbanflow-style image classification classes, which would be weak without gutter images. |
| Would it require TensorFlow.js conversion? | Yes, if trying browser inference. Conversion from old frozen detection graph may be fragile. |
| Would it require backend inference? | Most practical path: yes. |
| Would it require UI changes? | Yes. Object detection output needs bounding boxes and detection confidence visualization. |
| Would it require new labels/classes? | Yes. Urbanflow would need debris/gutter-state labels or object labels mapped to review logic. |

The TACO notebook does not fit the current MVP without major architecture changes.

### YOLOv8 aerial garbage compatibility

| Integration question | Answer |
| --- | --- |
| Can it drop into current browser model? | No. YOLOv8 PyTorch models do not directly run inside the current Teachable Machine/TensorFlow.js path. |
| Would it require retraining Teachable Machine? | If using the images now, yes: the useful path is to add selected images to a Teachable Machine retraining set. |
| Would it require TensorFlow.js conversion? | Yes, if trying to run YOLO-style model in the browser. This is not the easiest next step. |
| Would it require backend inference? | For YOLOv8 production inference, likely yes. FastAPI or another backend would be the natural path later. |
| Would it require UI changes? | For YOLOv8 classification, minimal. For YOLOv8 detection, yes, bounding boxes would be needed. |
| Would it require new labels/classes? | Yes. Its five classes do not match Urbanflow's clean/choked/partial/out-of-context classes. |

The YOLOv8 notebook is more relevant, but it is still not a direct current-MVP integration.

## 4. Dataset Feasibility

### TACO dataset

| Item | Assessment |
| --- | --- |
| Availability | Public dataset referenced at `http://tacodataset.org/`; notebook expects Kaggle input `tacotrashdataset`. |
| Present locally? | No local TACO dataset, annotations, or pretrained `.pb` model were found. |
| Class names | 60 litter categories from `annotations.json`; examples include bottles, cans, cartons, cups, caps, broken glass, batteries, and foil. |
| Image type | General ground-level/wild litter in diverse environments; not specifically drone/aerial or gutter imagery. |
| Licence concerns | The notebook text does not include detailed licensing terms. Licence must be checked from the TACO source/Kaggle dataset page before reuse. |
| Training suitability | Useful as generic debris pretraining/reference data, but weak for direct Urbanflow clean-vs-choked classification. |

TACO is better for a future debris detection system than for the current gutter-state classifier.

### Drone garbage detection dataset

| Item | Assessment |
| --- | --- |
| Availability | Kaggle dataset referenced in notebook metadata and path `/kaggle/input/drone-garbage-detection/datasets`. |
| Present locally? | No local dataset folders, trained `best.pt`, or YOLO runs were found. |
| Class names | `glass`, `plastic_bottle_takeaway_cup`, `retort_pouch`, `take_away_container`, `tin_aluminium_cans`. |
| Image type | Aerial/drone garbage imagery, likely beach/open-area litter. |
| Licence concerns | Licence is not visible from the inspected notebook cells. Check the Kaggle dataset page before downloading or using in training. |
| Training suitability | Useful as augmentation/inspiration for aerial debris recognition, but not enough for gutter condition classification. |

This dataset is the more promising of the two for Urbanflow, but it should not replace actual gutter/drainage images.

## 5. Recommended Use

| Notebook | Recommendation category | Reason |
| --- | --- | --- |
| `garbage-detection-with-tensorflow.ipynb` | Useful later for backend/object detection upgrade | It demonstrates object detection and bounding box visualization for litter, but it is not aerial/gutter-specific and does not fit the current browser classifier. |
| `aerial-beach-garbage-detection-using-yolov8.ipynb` | Useful with adaptation | It uses drone-like imagery and modern YOLOv8 classification, but the labels are garbage material categories rather than gutter condition classes. |

Neither notebook is directly useful now as a drop-in model replacement.

## 6. Suggested Model Upgrade Path

### A. Continue with Teachable Machine but retrain with better classes

Best short-term path.

Recommended classes:

- `clean_gutter`
- `partially_choked_gutter`
- `choked_gutter`
- `out_of_context`
- `poor_quality_or_unclear`

Why:

- Matches the current browser inference stack.
- No backend needed.
- Minimal UI changes.
- Works with existing verdict/class/confidence logic.
- Fastest way to improve the MVP.

### B. Use Kaggle data to augment the training dataset

Useful carefully, but not as the main dataset.

The YOLOv8 drone garbage dataset could help the model see aerial debris textures. TACO could help with general trash/debris examples. However, both should be used mostly for `out_of_context`, `debris-like`, or pretraining inspiration unless images visually resemble gutters.

Risk:

- Too much beach/general garbage data may teach the model "garbage object" instead of "blocked gutter state".
- The deployed model could misclassify any trash photo as a choked gutter, even if it is not a gutter.

### C. Move to YOLOv8 classification

Possible later, but not necessary now.

YOLOv8 classification could classify full images into `clean`, `partial`, `choked`, and `out-of-context`. It may outperform Teachable Machine with enough local data. But it introduces PyTorch/Ultralytics training and deployment complexity.

Browser deployment would require conversion or an ONNX/web runtime path. Backend deployment would be cleaner.

### D. Move to YOLOv8 object detection

Best future advanced path, not current MVP.

This would be useful when Urbanflow needs to answer:

- Where exactly is the blockage?
- How much of the gutter is blocked?
- Can the UI draw a box around debris or stagnant water?

It would require:

- Bounding box annotations.
- New UI overlays.
- Backend inference or a more complex browser inference stack.
- New storage schema for detections.

### E. Keep current MVP model and collect local drone gutter data first

Strongly recommended.

Before adopting external notebooks, Urbanflow needs representative data:

- Ghana gutter/drainage drone images.
- Clean, partially blocked, fully choked, unclear, and out-of-context examples.
- Different lighting, rainfall, road surfaces, roof/drain types, water levels, and camera angles.

This gives the current model the right domain signal.

## 7. Final Recommendation

Do not include either notebook directly in the Urbanflow app right now.

Recommended practical use:

- Keep both notebooks as research/reference only.
- Do not replace the current Teachable Machine model yet.
- Do not add YOLO/FastAPI/backend inference yet.
- Do not run the Kaggle notebooks locally unless datasets and dependencies are intentionally downloaded.
- Use the YOLOv8 aerial garbage notebook as inspiration for a future model training pipeline.
- Use the TACO notebook as inspiration for future object detection and bounding-box UI, not for the current MVP.

Best next model step:

1. Collect local drone gutter/drainage images.
2. Retrain the current Teachable Machine classifier with better Urbanflow classes.
3. Test inside the existing MVP.
4. Only after enough real Urbanflow data exists, evaluate YOLOv8 classification.
5. Prepare YOLOv8 object detection/FastAPI later if Urbanflow needs blockage localization.

## 8. Action Checklist

- [ ] Download the actual Kaggle datasets only if licences allow reuse.
- [ ] Inspect dataset licences on Kaggle/source pages before using images.
- [ ] Collect local Ghana gutter/drainage drone images.
- [ ] Balance classes: clean, partially choked, choked, out-of-context, poor-quality/unclear.
- [ ] Include realistic non-gutter negative examples.
- [ ] Retrain the current Teachable Machine model first.
- [ ] Export the updated TensorFlow.js model into `public/model`.
- [ ] Test against current single-image and batch workflows.
- [ ] Track reviewer corrections as future training candidates.
- [ ] Later evaluate YOLOv8 classification if Teachable Machine accuracy plateaus.
- [ ] Later evaluate YOLOv8 object detection plus backend inference if bounding boxes become a product requirement.
