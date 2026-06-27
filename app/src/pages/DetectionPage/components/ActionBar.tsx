import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { refreshOutline, calculatorOutline, personSharp } from 'ionicons/icons';
import { DetectionStatus } from '../../../types/coins';

interface Props {
  status: DetectionStatus;
  coinCount: number;
  onCalculate: () => void;
  onReset: () => void;
  onIntegrants: () => void;
}

const ActionBar: React.FC<Props> = ({ status, coinCount, onCalculate, onReset, onIntegrants }) => {
  const canCalculate = coinCount > 0;
  const canReset     = status !== 'idle';

  return (
    <div className="dp-action-bar">
      <IonButton
        className="dp-icon-btn"
        fill="solid"
        disabled={!canReset}
        onClick={onReset}
        aria-label="Reiniciar"
      >
        <IonIcon icon={refreshOutline} />
      </IonButton>

      <IonButton
        className="dp-calculate-btn"
        fill="solid"
        disabled={!canCalculate}
        onClick={onCalculate}
      >
        <IonIcon slot="start" icon={calculatorOutline} />
        Calcular Monto
      </IonButton>

      <IonButton
        className="dp-icon-btn"
        fill="solid"
        onClick={onIntegrants}
        aria-label="Integrantes"
      >
        <IonIcon icon={personSharp} />
      </IonButton>
    </div>
  );
};

export default ActionBar;
