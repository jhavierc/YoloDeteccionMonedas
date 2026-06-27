import React from 'react';
import { IonModal, IonContent, IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';
import { CoinDenomination, ALL_DENOMINATIONS } from '../../../types/coins';

interface Props {
  isOpen: boolean;
  totalAmount: number;
  coinCount: number;
  denominationBreakdown: Record<CoinDenomination, number>;
  onClose: () => void;
}

const ResultModal: React.FC<Props> = ({
  isOpen, totalAmount, coinCount, denominationBreakdown, onClose,
}) => {
  const activeRows = ALL_DENOMINATIONS.filter(d => denominationBreakdown[d] > 0);

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.62}
      breakpoints={[0, 0.62, 1]}
    >
      <IonContent scrollY={false}>
        <div className="dp-result">
          <div className="dp-result-handle" />

          {/* Icon + Total */}
          <div className="dp-result-header">
            <div className="dp-result-icon-wrap">
              <IonIcon icon={checkmarkCircleOutline} className="dp-result-icon" />
            </div>
            <p className="dp-result-label">Total calculado</p>
            <div className="dp-result-total">
              ${totalAmount.toLocaleString('es-CO')}
            </div>
            <p className="dp-result-sub">
              {coinCount} {coinCount === 1 ? 'moneda' : 'monedas'} · Pesos Colombianos
            </p>
          </div>

          {/* Breakdown */}
          <div className="dp-result-table glass-panel">
            {activeRows.map((d, idx) => (
              <div
                key={d}
                className={`dp-result-row${idx < activeRows.length - 1 ? ' dp-result-row--divider' : ''}`}
              >
                <span className="dp-result-row-label">${d} COP</span>
                <span className="dp-result-row-qty">×{denominationBreakdown[d]}</span>
                <span className="dp-result-row-amount">
                  ${(d * denominationBreakdown[d]).toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>

          <IonButton className="dp-result-close" expand="block" onClick={onClose}>
            Cerrar
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ResultModal;
