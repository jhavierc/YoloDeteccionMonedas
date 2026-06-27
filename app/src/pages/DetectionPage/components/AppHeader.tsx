import React from 'react';
import { DetectionStatus } from '../../../types/coins';

const STATUS_LABELS: Record<DetectionStatus, string> = {
  idle:      'En espera',
  loading:   'Cargando…',
  detecting: 'Detectando',
  paused:    'Pausado',
  error:     'Error',
};

interface Props {
  status: DetectionStatus;
}

const AppHeader: React.FC<Props> = ({ status }) => (
  <header className="dp-header">
    <div className="dp-header-logo">
      <img src="/logo_app.png" alt="CoinDetect" className="dp-header-img" />
      <div>
        <h1 className="dp-header-title">CoinDetect</h1>
        <p className="dp-header-subtitle">Monedas COP</p>
      </div>
    </div>

    <div className="dp-status-pill">
      <span className={`dp-status-dot dp-status-dot--${status}`} />
      <span className="dp-status-label">{STATUS_LABELS[status]}</span>
    </div>
  </header>
);

export default AppHeader;
