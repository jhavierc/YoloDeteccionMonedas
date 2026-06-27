/**
 * YOLOv8 detector wrapper para onnxruntime-web.
 * Modelo v2: 5 clases COP — class_id → denominación: 0:100, 1:1000, 2:200, 3:50, 4:500.
 * Input:  images (1, 3, 416, 416) float32 [0,1] RGB CHW
 * Output: output0 (1, 9, 3549) — 9 = 4 bbox + 5 class scores; 3549 anchors (52²+26²+13²).
 */

import * as ort from 'onnxruntime-web';
import type { CoinDenomination } from '../types/coins';

const MODEL_URL = '/models/coin-detector.onnx';
const IMG_SIZE = 416;
const CONF_THRESH = 0.4;
const IOU_THRESH = 0.45;

export const CLASS_TO_DENOMINATION: Record<number, CoinDenomination> = {
  0: 100,
  1: 1000,
  2: 200,
  3: 50,
  4: 500,
};

export interface RawDetection {
  classId: number;
  denomination: CoinDenomination;
  confidence: number;
  /** Bbox en coordenadas absolutas del input 640x640 (xmin, ymin, xmax, ymax). */
  box: [number, number, number, number];
  /** Centro normalizado [0,1] respecto al input 640x640 (igual al frame original tras stretch). */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

let session: ort.InferenceSession | null = null;
let loadingPromise: Promise<ort.InferenceSession> | null = null;

/** Carga el modelo una vez (idempotente). */
export async function loadModel(): Promise<ort.InferenceSession> {
  if (session) return session;
  if (loadingPromise) return loadingPromise;

  // Servimos los wasm desde el CDN público (jsdelivr) — evita configurar
  // copia/aliasing en Vite y el SPA fallback que servía index.html en lugar
  // del .wasm en dev mode.
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';

  // Single-thread + sin proxy: evita el wasm threaded que requiere
  // SharedArrayBuffer (necesita headers COOP/COEP que Vite no envía).
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  // eslint-disable-next-line no-console
  console.log('[yolo] cargando modelo', MODEL_URL, ' wasm desde CDN');

  loadingPromise = ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  }).then(s => {
    session = s;
    loadingPromise = null;
    return s;
  });
  return loadingPromise;
}

/**
 * Convierte un HTMLVideoElement (o canvas/image) a un Float32Array CHW [0,1].
 * Usa stretch (sin letterbox) — coherente con el preprocesamiento de Roboflow.
 */
function preprocess(source: CanvasImageSource): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = IMG_SIZE;
  canvas.height = IMG_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, IMG_SIZE, IMG_SIZE);
  const { data } = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE);

  const out = new Float32Array(3 * IMG_SIZE * IMG_SIZE);
  const plane = IMG_SIZE * IMG_SIZE;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    out[j] = data[i] / 255;                  // R
    out[plane + j] = data[i + 1] / 255;      // G
    out[2 * plane + j] = data[i + 2] / 255;  // B
  }
  return out;
}

/** IoU entre dos cajas (xmin, ymin, xmax, ymax). */
function iou(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const aArea = (a[2] - a[0]) * (a[3] - a[1]);
  const bArea = (b[2] - b[0]) * (b[3] - b[1]);
  const union = aArea + bArea - inter;
  return union > 0 ? inter / union : 0;
}

/** NMS por clase. */
function nms(
  detections: RawDetection[],
  iouThresh: number,
): RawDetection[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: RawDetection[] = [];
  while (sorted.length) {
    const best = sorted.shift()!;
    kept.push(best);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (
        sorted[i].classId === best.classId &&
        iou(sorted[i].box, best.box) >= iouThresh
      ) {
        sorted.splice(i, 1);
      }
    }
  }
  return kept;
}

/**
 * Decodifica el tensor de salida del modelo y aplica NMS.
 * El output viene como (1, 9, 8400). Transponemos a (8400, 9) y procesamos.
 */
function postprocess(outputData: Float32Array, numAnchors: number): RawDetection[] {
  const numClasses = 5;
  const stride = numAnchors;
  const detections: RawDetection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    // YOLOv8 output: row-major (1, 9, 8400) → para anchor i:
    //   cx = output[0 * stride + i], cy = output[1 * stride + i],
    //   w  = output[2 * stride + i], h  = output[3 * stride + i],
    //   classes[k] = output[(4 + k) * stride + i]
    let bestClass = -1;
    let bestScore = 0;
    for (let k = 0; k < numClasses; k++) {
      const score = outputData[(4 + k) * stride + i];
      if (score > bestScore) {
        bestScore = score;
        bestClass = k;
      }
    }
    if (bestScore < CONF_THRESH) continue;

    const cx = outputData[0 * stride + i];
    const cy = outputData[1 * stride + i];
    const w = outputData[2 * stride + i];
    const h = outputData[3 * stride + i];
    const xmin = cx - w / 2;
    const ymin = cy - h / 2;
    const xmax = cx + w / 2;
    const ymax = cy + h / 2;

    detections.push({
      classId: bestClass,
      denomination: CLASS_TO_DENOMINATION[bestClass],
      confidence: bestScore,
      box: [xmin, ymin, xmax, ymax],
      cx: cx / IMG_SIZE,
      cy: cy / IMG_SIZE,
      w: w / IMG_SIZE,
      h: h / IMG_SIZE,
    });
  }

  return nms(detections, IOU_THRESH);
}

/** Inferencia end-to-end sobre un frame de video. */
export async function detect(source: CanvasImageSource): Promise<RawDetection[]> {
  const sess = await loadModel();
  const inputData = preprocess(source);
  const tensor = new ort.Tensor('float32', inputData, [1, 3, IMG_SIZE, IMG_SIZE]);
  const feeds: Record<string, ort.Tensor> = { [sess.inputNames[0]]: tensor };
  const results = await sess.run(feeds);
  const output = results[sess.outputNames[0]];
  // output.dims = [1, 9, 8400]
  return postprocess(output.data as Float32Array, output.dims[2]);
}
