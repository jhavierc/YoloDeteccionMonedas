import React from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import {
  cameraOutline,
  scanOutline,
  playCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { DetectedCoin, DetectionStatus } from '../../../types/coins';
import CoinOverlay from './CoinOverlay';

interface Props {
  coins: DetectedCoin[];
  status: DetectionStatus;
  onStart: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraError?: string | null;
}

const CameraViewport: React.FC<Props> = ({
  coins,
  status,
  onStart,
  videoRef,
  cameraError,
}) => {
  const showVideo = status === 'detecting' || status === 'loading';

  return (
    <div className={`dp-viewport${status === 'detecting' ? ' dp-viewport--active' : ''}`}>
      <div className="dp-camera-feed">
        {/* Stream de cámara — siempre montado, visible cuando se está detectando.
            Se mantiene en el DOM para que el ref esté listo antes de iniciar. */}
        <video
          ref={videoRef}
          className="dp-camera-video"
          style={{ display: showVideo ? 'block' : 'none' }}
          autoPlay
          playsInline
          muted
        />

        {/* Corner brackets */}
        <span className="dp-corner dp-corner--tl" />
        <span className="dp-corner dp-corner--tr" />
        <span className="dp-corner dp-corner--bl" />
        <span className="dp-corner dp-corner--br" />

        {/* Animated scan line while detecting */}
        {(status === 'detecting' || status === 'loading') && (
          <div className="dp-scan-line" />
        )}

        {/* ── Idle state ── */}
        {status === 'idle' && (
          <div className="dp-overlay-center">
            <div className="dp-hint-circle">
              <IonIcon icon={cameraOutline} />
            </div>
            <p className="dp-hint-text">
              Apunta hacia las monedas<br />y presiona Iniciar
            </p>
            <IonButton className="dp-start-btn" onClick={onStart} fill="outline" size="small">
              <IonIcon slot="start" icon={playCircleOutline} />
              Iniciar Detección
            </IonButton>
          </div>
        )}

        {/* ── Loading state ── */}
        {status === 'loading' && (
          <div className="dp-overlay-center">
            <div className="dp-loading-ring" />
            <p className="dp-hint-text">Cargando modelo y cámara…</p>
          </div>
        )}

        {/* ── Detecting but no coins found yet ── */}
        {status === 'detecting' && coins.length === 0 && (
          <div className="dp-overlay-center dp-overlay-center--bottom">
            <IonIcon icon={scanOutline} className="dp-scanning-icon" />
            <p className="dp-hint-text">Buscando monedas…</p>
          </div>
        )}

        {/* ── Error state ── */}
        {status === 'error' && (
          <div className="dp-overlay-center">
            <div className="dp-hint-circle dp-hint-circle--error">
              <IonIcon icon={alertCircleOutline} />
            </div>
            <p className="dp-hint-text">
              {cameraError || 'No se pudo iniciar la detección.'}<br />
              Verifica los permisos de cámara.
            </p>
            <IonButton className="dp-start-btn" onClick={onStart} fill="outline" size="small">
              <IonIcon slot="start" icon={playCircleOutline} />
              Reintentar
            </IonButton>
          </div>
        )}

        {/* ── Detected coin overlays ── */}
        {coins.map(coin => (
          <CoinOverlay key={coin.id} coin={coin} />
        ))}
      </div>
    </div>
  );
};

export default CameraViewport;
