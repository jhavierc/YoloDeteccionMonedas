import React from 'react';
import { IonModal, IonContent, IonButton, IonIcon } from '@ionic/react';
import { peopleCircleOutline, schoolOutline } from 'ionicons/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const INTEGRANTS = [
  'Carlos Cepeda',
  'David Salamanca',
  'Alexander Torres',
  'Camilo Arciniegas',
  'Anderson Trujillo',
  'Deivid Bastidas',
];

const IntegrantsModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <IonModal
    isOpen={isOpen}
    onDidDismiss={onClose}
    initialBreakpoint={0.78}
    breakpoints={[0, 0.78, 1]}
  >
    <IonContent scrollY={true}>
      <div className="dp-integrants">
        <div className="dp-result-handle" />

        {/* Header con logo y datos institucionales */}
        <div className="dp-integrants-header">
          <img
            src="/logo-gris-claro.png"
            alt="Universidad Icesi"
            className="dp-integrants-logo"
          />
          <p className="dp-integrants-uni">
            <IonIcon icon={schoolOutline} className="dp-integrants-uni-icon" />
            Universidad Icesi
          </p>
          <p className="dp-integrants-program">
            Maestría en Inteligencia Artificial Aplicada
          </p>
        </div>

        {/* Integrantes */}
        <div className="dp-integrants-section">
          <div className="dp-integrants-section-title">
            <IonIcon icon={peopleCircleOutline} />
            <span>Integrantes</span>
          </div>
          <div className="dp-integrants-list glass-panel">
            {INTEGRANTS.map((name, idx) => (
              <div
                key={name}
                className={`dp-integrants-row${idx < INTEGRANTS.length - 1 ? ' dp-integrants-row--divider' : ''}`}
              >
                <span className="dp-integrants-bullet">{idx + 1}</span>
                <span className="dp-integrants-name">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <IonButton className="dp-result-close" expand="block" onClick={onClose}>
          Cerrar
        </IonButton>
      </div>
    </IonContent>
  </IonModal>
);

export default IntegrantsModal;
