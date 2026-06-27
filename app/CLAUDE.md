# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does

Real-time Colombian peso coin detector running entirely in the browser. A YOLOv8n ONNX model classifies 5 denominations (50, 100, 200, 500, 1000 COP) from the device camera feed. Totals and bounding boxes are shown live. Built with Ionic React + Vite, deployable as a native Android app via Capacitor.

## Commands

```bash
npm run dev        # dev server at http://localhost:8100
npm run build      # tsc + vite build → dist/
npx cap sync android   # copy dist/ into android/ WebView assets
npx cap open android   # open Android Studio
```

No test runner is configured.

## Architecture

Data flows: camera → `useCamera` → `useDetection` (RAF loop) → `yolo.detect()` → tracker → `DetectionPage` UI.

**`src/lib/yolo.ts`** — the entire inference pipeline:
- Model loaded once (idempotent singleton) from `public/models/coin-detector.onnx`
- WASM runtime loaded from CDN (`jsdelivr`) with `numThreads=1`, `proxy=false` — avoids SharedArrayBuffer/COOP header requirement that Vite/WebView doesn't satisfy
- Preprocessing: stretch-resize to 416×416 (no letterbox) → CHW float32 [0,1]
- Output tensor shape: `(1, 9, 3549)` — 4 bbox coords + 5 class scores × 3549 anchors
- NMS applied per-class with `CONF_THRESH=0.4` and `IOU_THRESH=0.45`

**`src/hooks/useDetection.ts`** — RAF-based inference loop:
- Throttled to `TARGET_FPS=6` to keep UI smooth on mobile WASM (~3–8 fps realistic)
- Two-level confidence: `CONF_THRESH=0.4` in yolo.ts (raw model gate), `DISPLAY_CONF_THRESH=0.8` here (what the user sees)
- Tracker uses exponential smoothing (α=0.4) on position/size and `TRACKING_TTL_MS=700ms` to suppress flicker between frames

**`src/hooks/useCamera.ts`** — getUserMedia wrapper:
- Requests 1920×1080 environment-facing camera with continuous focus/exposure
- Falls back to looser constraints if the WebView rejects strict ones

**`src/pages/DetectionPage/`** — single page composed of: `AppHeader`, `StatsPanel`, `CameraViewport` (contains `CoinOverlay` bboxes), `ActionBar`, `ResultModal`, `IntegrantsModal`.

**`src/types/coins.ts`** — shared `CoinDenomination`, `DetectedCoin`, `DetectionStatus` types. Import from here, don't redeclare.

## Key constraints

- The ONNX model file (`public/models/coin-detector.onnx`) **must stay in `public/`** so Vite serves it as a static asset at `/models/coin-detector.onnx` — `yolo.ts` hardcodes that path.
- Do **not** switch to multithreaded WASM (`numThreads > 1` or `proxy=true`) without adding the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers to Vite's dev server config and verifying Capacitor's WebView serves them too.
- Class-ID mapping is fixed: `0:100, 1:1000, 2:200, 3:50, 4:500` — matches the training order, not numeric order.
- Ionic is forced to Material Design (`mode: 'md'`) in `App.tsx` for consistent cross-platform appearance.
