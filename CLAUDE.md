# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time detection and counting of Colombian coins (COP denominations: 50, 100, 200, 500, 1000) using a fine-tuned YOLOv8n model served on-device via ONNX Runtime Web inside an Ionic + React + Capacitor mobile app.

## Commands

### Python / ML side (notebooks & training)

Requires Python 3.12. Install with [uv](https://github.com/astral-sh/uv):

```bash
uv sync                          # install all deps into .venv
source .venv/bin/activate        # or `.venv\Scripts\activate` on Windows
jupyter lab                      # open notebooks/
```

Run a single notebook non-interactively:
```bash
jupyter nbconvert --to notebook --execute notebooks/v2/03_train.ipynb --output notebooks/v2/03_train.ipynb
```

### App (Ionic + React + Capacitor)

All commands run from `app/`:

```bash
cd app
npm install          # install JS deps
npm run dev          # dev server at http://localhost:8100
npm run build        # TypeScript check + Vite build → dist/
```

Android native build (after `npm run build`):
```bash
npx cap sync android
npx cap open android    # opens Android Studio
```

There is no test runner configured — verify behavior by running the dev server.

## Architecture

### Two independent subsystems

```
SistemaRecomendacion/
├── notebooks/v2/        ← Python pipeline (EDA → training → export)
├── dataset_v2/          ← YOLOv8 format dataset (5 classes, 40 images)
├── model/               ← exported weights (.pt, .onnx)
├── reports/             ← auto-generated CSVs and PNGs from notebooks
└── app/                 ← Ionic/React/Capacitor mobile app
```

The Python pipeline and the JS app are decoupled: notebooks produce `model/v2/best.onnx`, which is manually copied to `app/public/models/coin-detector.onnx` for the web app to consume.

### Python pipeline (notebooks/v2/)

Four sequential notebooks:
1. `01_eda.ipynb` — dataset audit, writes CSVs/PNGs to `reports/v2/`
2. `02_dataset_prep.ipynb` — augmentation config, `data_train.yaml` adjustments
3. `03_train.ipynb` — Ultralytics `YOLO.train()`, saves runs under `runs/`
4. `04_export.ipynb` — exports to ONNX (`imgsz=416`, no letterbox), copies to `model/v2/`

**Critical preprocessing detail:** Roboflow stretched all images to 512×512 (no letterbox), so the model expects **stretch** preprocessing (not letterbox). Both the export and `lib/yolo.ts` replicate this via `ctx.drawImage(source, 0, 0, 416, 416)`.

**Dataset notes:**
- `dataset_v2/data.yaml` declares 5 classes: `['100', '1000', '200', '50', '500']` (class `modenas` dropped in v2).
- YOLO class_id → denomination mapping: `{0:100, 1:1000, 2:200, 3:50, 4:500}` — this order is alphabetical, not numeric. It is hardcoded in `app/src/lib/yolo.ts`.

### Mobile app (app/)

**Data flow:**
```
useCamera (getUserMedia) → videoRef → useDetection loop → detect() in lib/yolo.ts
                                                         ↓
                                               ONNX InferenceSession (WASM)
                                                         ↓
                                          postprocess → NMS → RawDetection[]
                                                         ↓
                                          mergeDetections (EMA tracker) → DetectedCoin[]
                                                         ↓
                             DetectionPage → CameraViewport + CoinOverlay + StatsPanel
```

**Key files:**
- `src/lib/yolo.ts` — model loading, `preprocess()` (CHW float32), `postprocess()` (decode YOLOv8 output tensor `[1, 9, 8400]`), NMS, `detect()`
- `src/hooks/useCamera.ts` — `getUserMedia` lifecycle, `videoRef`
- `src/hooks/useDetection.ts` — RAF loop throttled to 6 FPS, EMA smoothing tracker (α=0.4), TTL=700ms
- `src/pages/DetectionPage/` — single page: `AppHeader`, `StatsPanel`, `CameraViewport`, `CoinOverlay` (bbox overlay), `ActionBar`, `ResultModal`, `IntegrantsModal`
- `src/types/coins.ts` — `CoinDenomination`, `DetectedCoin`, `DetectionStatus`

**ONNX Runtime WASM setup:** WASM binaries are served locally from `public/ort/` and from CDN fallback (`jsdelivr`). Single-threaded mode is forced (`numThreads=1`, `proxy=false`) to avoid `SharedArrayBuffer` COOP/COEP header requirements in Vite dev mode.

**Model served at:** `public/models/coin-detector.onnx` (path is hardcoded in `lib/yolo.ts` as `MODEL_URL = '/models/coin-detector.onnx'`).

### After retraining: update the app model

```bash
cp model/v2/best.onnx app/public/models/coin-detector.onnx
```

Then verify `CLASS_TO_DENOMINATION` in `app/src/lib/yolo.ts` still matches the class order in `dataset_v2/data.yaml`.
