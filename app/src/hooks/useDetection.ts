import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DetectedCoin,
  DetectionStatus,
  CoinDenomination,
  EMPTY_BREAKDOWN,
} from '../types/coins';
import { detect, loadModel } from '../lib/yolo';
import { useCamera } from './useCamera';

/**
 * Frecuencia objetivo de inferencia en FPS. YOLOv8n en WASM ronda 3-8 fps en
 * móviles modernos; un throttling explícito mantiene la UI fluida.
 */
const TARGET_FPS = 6;
const MIN_FRAME_MS = 1000 / TARGET_FPS;

/** Suaviza detecciones entre frames manteniendo identidad por proximidad. */
const TRACKING_DISTANCE = 0.08; // distancia normalizada para considerar la misma moneda
const TRACKING_TTL_MS = 700;    // si no se ve durante este tiempo, se elimina

/**
 * Umbral mínimo de confianza para EXPONER una detección en la UI (bbox, total,
 * conteo y breakdown). El modelo en `lib/yolo.ts` mantiene su propio
 * `CONF_THRESH` más permisivo para que el tracker pueda acumular evidencia
 * frame a frame; solo cuando la confianza suavizada llega a este umbral la
 * moneda se considera "confirmada" y se muestra al usuario.
 */
const DISPLAY_CONF_THRESH = 0.8;

interface TrackedCoin extends DetectedCoin {
  lastSeen: number;
}

export function useDetection() {
  const { videoRef, isReady, error, start: startCamera, stop: stopCamera } = useCamera();
  const [status, setStatus] = useState<DetectionStatus>('idle');
  const [coins, setCoins] = useState<DetectedCoin[]>([]);

  const trackedRef = useRef<TrackedCoin[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastInferRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);

  const totalAmount = coins.reduce((sum, c) => sum + c.denomination, 0);
  const coinCount = coins.length;
  const denominationBreakdown = coins.reduce(
    (acc, c) => ({ ...acc, [c.denomination]: acc[c.denomination] + 1 }),
    { ...EMPTY_BREAKDOWN } as Record<CoinDenomination, number>,
  );

  const pruneAndUpdate = useCallback(() => {
    const now = performance.now();
    trackedRef.current = trackedRef.current.filter(c => now - c.lastSeen < TRACKING_TTL_MS);
    // El tracker sigue conservando detecciones de baja confianza para no
    // perder identidad entre frames; pero a la UI solo exponemos las que
    // superan `DISPLAY_CONF_THRESH`.
    setCoins(
      trackedRef.current
        .filter(c => c.confidence >= DISPLAY_CONF_THRESH)
        .map(({ lastSeen, ...rest }) => rest),
    );
  }, []);

  const mergeDetections = useCallback((dets: { denomination: CoinDenomination; confidence: number; cx: number; cy: number; w: number; h: number }[]) => {
    const now = performance.now();
    const next: TrackedCoin[] = [];

    for (const d of dets) {
      // Buscar tracked existente cercano de la misma denominación
      const idx = trackedRef.current.findIndex(t =>
        t.denomination === d.denomination &&
        Math.hypot(t.x - d.cx, t.y - d.cy) < TRACKING_DISTANCE,
      );
      if (idx >= 0) {
        const existing = trackedRef.current[idx];
        // Suavizado exponencial para box stable (alfa = 0.4)
        const alpha = 0.4;
        next.push({
          ...existing,
          x: existing.x * (1 - alpha) + d.cx * alpha,
          y: existing.y * (1 - alpha) + d.cy * alpha,
          w: (existing.w ?? d.w) * (1 - alpha) + d.w * alpha,
          h: (existing.h ?? d.h) * (1 - alpha) + d.h * alpha,
          confidence: Math.max(existing.confidence * 0.7 + d.confidence * 0.3, d.confidence),
          lastSeen: now,
        });
        trackedRef.current.splice(idx, 1);
      } else {
        next.push({
          id: `${d.denomination}-${now}-${Math.random().toString(36).slice(2, 6)}`,
          denomination: d.denomination,
          confidence: d.confidence,
          x: d.cx,
          y: d.cy,
          w: d.w,
          h: d.h,
          lastSeen: now,
        });
      }
    }
    // Conservar tracked que no fueron actualizados pero aún están dentro del TTL
    for (const t of trackedRef.current) {
      if (now - t.lastSeen < TRACKING_TTL_MS) {
        next.push(t);
      }
    }
    trackedRef.current = next;
    pruneAndUpdate();
  }, [pruneAndUpdate]);

  const loop = useCallback(async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(() => void loop());
      return;
    }
    const now = performance.now();
    if (now - lastInferRef.current >= MIN_FRAME_MS) {
      lastInferRef.current = now;
      try {
        const dets = await detect(video);
        mergeDetections(dets);
      } catch (e) {
        console.error('[useDetection] inferencia falló', e);
      }
    } else {
      pruneAndUpdate();
    }
    if (runningRef.current) {
      rafRef.current = requestAnimationFrame(() => void loop());
    }
  }, [videoRef, mergeDetections, pruneAndUpdate]);

  const startDetection = useCallback(async () => {
    if (status === 'detecting' || status === 'loading') return;
    setStatus('loading');
    setCoins([]);
    trackedRef.current = [];

    try {
      // Pre-cargar el modelo en paralelo a la inicialización de cámara.
      const modelPromise = loadModel();
      await startCamera();
      await modelPromise;
      runningRef.current = true;
      setStatus('detecting');
      lastInferRef.current = 0;
      rafRef.current = requestAnimationFrame(() => void loop());
    } catch (e) {
      console.error('[useDetection] error al iniciar', e);
      setStatus('error');
    }
  }, [startCamera, loop, status]);

  const reset = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopCamera();
    trackedRef.current = [];
    setCoins([]);
    setStatus('idle');
  }, [stopCamera]);

  // Limpieza al desmontar
  useEffect(() => () => {
    runningRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    stopCamera();
  }, [stopCamera]);

  return {
    status,
    coins,
    totalAmount,
    coinCount,
    denominationBreakdown,
    startDetection,
    reset,
    videoRef,
    cameraReady: isReady,
    cameraError: error,
  };
}
