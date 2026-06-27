import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useDetection } from '../../hooks/useDetection';
import AppHeader from './components/AppHeader';
import StatsPanel from './components/StatsPanel';
import CameraViewport from './components/CameraViewport';
import ActionBar from './components/ActionBar';
import ResultModal from './components/ResultModal';
import IntegrantsModal from './components/IntegrantsModal';
import './DetectionPage.css';

const DetectionPage: React.FC = () => {
  const detection = useDetection();
  const [showResult, setShowResult] = useState(false);
  const [showIntegrants, setShowIntegrants] = useState(false);

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} className="dp-content">
        <div className="dp-screen">
          <AppHeader status={detection.status} />

          <StatsPanel
            totalAmount={detection.totalAmount}
            coinCount={detection.coinCount}
            denominationBreakdown={detection.denominationBreakdown}
          />

          <CameraViewport
            coins={detection.coins}
            status={detection.status}
            onStart={detection.startDetection}
            videoRef={detection.videoRef}
            cameraError={detection.cameraError}
          />

          <ActionBar
            status={detection.status}
            coinCount={detection.coinCount}
            onCalculate={() => setShowResult(true)}
            onReset={detection.reset}
            onIntegrants={() => setShowIntegrants(true)}
          />
        </div>

        <ResultModal
          isOpen={showResult}
          totalAmount={detection.totalAmount}
          coinCount={detection.coinCount}
          denominationBreakdown={detection.denominationBreakdown}
          onClose={() => setShowResult(false)}
        />

        <IntegrantsModal
          isOpen={showIntegrants}
          onClose={() => setShowIntegrants(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default DetectionPage;
