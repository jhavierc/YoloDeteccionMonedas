import { useCallback, useRef, useState } from 'react';

/**
 * Constraints "extendidos": Chromium, WebKit y el WebView de Android soportan
 * `focusMode`, `exposureMode` y `whiteBalanceMode` en runtime desde hace años,
 * pero `lib.dom.d.ts` todavía no los expone. Declaramos la interfaz local para
 * que TypeScript las acepte sin recurrir a `any` ni a `@ts-expect-error`.
 */
type ContinuousMode = 'continuous' | 'manual' | 'single-shot' | 'none';
interface AdvancedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  focusMode?: ContinuousMode;
  exposureMode?: Exclude<ContinuousMode, 'single-shot'>;
  whiteBalanceMode?: Exclude<ContinuousMode, 'single-shot'>;
}
interface AdvancedMediaTrackConstraints extends MediaTrackConstraints {
  advanced?: AdvancedMediaTrackConstraintSet[];
}
interface AdvancedMediaTrackSettings extends MediaTrackSettings {
  focusMode?: ContinuousMode;
}

/**
 * Maneja el ciclo de vida del stream de cámara con getUserMedia.
 * Compatible con web y el WebView de Capacitor (Android/iOS) — no requiere
 * plugins nativos siempre que el WebView tenga permisos de cámara concedidos.
 *
 * Resolución: pedimos 1920x1080 como ideal con un mínimo de 1280x720. El
 * modelo siempre redimensiona el frame a 416x416 en `lib/yolo.ts`, por lo que
 * una resolución mayor NO encarece la inferencia, pero sí preserva detalle al
 * hacer downscale (los bordes y relieves de las monedas son claves para que
 * el YOLO supere `CONF_THRESH=0.4`). Si el dispositivo no soporta 1080p,
 * caemos a un fallback más permisivo.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const acquireStream = useCallback(async (): Promise<MediaStream> => {
    const videoConstraints: AdvancedMediaTrackConstraints = {
      facingMode: { ideal: 'environment' },
      width: { min: 1280, ideal: 1920, max: 3840 },
      height: { min: 720, ideal: 1080, max: 2160 },
      frameRate: { ideal: 30, max: 60 },
      // `advanced` se ignora silenciosamente si el navegador no lo soporta.
      // Sirve para empujar al WebView a foco continuo (clave para monedas
      // cercanas) y exposición automática.
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'continuous' },
        { whiteBalanceMode: 'continuous' },
      ],
    };

    try {
      return await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    } catch (err) {
      // Fallback: algunos WebViews fallan con `min` o `advanced`. Reintenta
      // solo con `ideal` para máxima compatibilidad.
      console.warn('[useCamera] constraints estrictos fallaron, reintentando con fallback', err);
      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setIsReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('La cámara no está disponible en este dispositivo.');
      }
      const stream = await acquireStream();
      streamRef.current = stream;

      // Diagnóstico: muestra la resolución y modo real que el WebView nos dio.
      // Útil para saber si el dispositivo está respetando los constraints.
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings() as AdvancedMediaTrackSettings;
        console.log('[useCamera] video track settings', {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          facingMode: settings.facingMode,
          focusMode: settings.focusMode,
        });
      }

      const video = videoRef.current;
      if (!video) {
        // Si el ref aún no está montado, lo dejamos pendiente — el componente
        // padre debe pasar el ref al <video> antes de llamar a start.
        throw new Error('Elemento de video no disponible.');
      }
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();
      setIsReady(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar la cámara';
      setError(msg);
      setIsReady(false);
    }
  }, [acquireStream]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  return { videoRef, isReady, error, start, stop };
}
