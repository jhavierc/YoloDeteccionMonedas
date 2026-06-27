import React from 'react';
import { DetectedCoin, CoinDenomination } from '../../../types/coins';

const DENOM_CLASS: Record<CoinDenomination, string> = {
  50: 'd50', 100: 'd100', 200: 'd200', 500: 'd500', 1000: 'd1000',
};

interface Props {
  coin: DetectedCoin;
}

/**
 * Dibuja el bounding box completo del modelo (rectángulo + label en la
 * esquina superior). Si la detección no trae w/h (e.g. datos mock viejos),
 * cae al overlay circular original.
 */
const CoinOverlay: React.FC<Props> = ({ coin }) => {
  const cls = DENOM_CLASS[coin.denomination];
  const conf = Math.round(coin.confidence * 100);
  const label = `$${coin.denomination} · ${conf}%`;
  const aria = `Moneda de $${coin.denomination} detectada con ${conf}% de confianza`;

  if (coin.w == null || coin.h == null) {
    return (
      <div
        className={`dp-coin dp-coin--${cls}`}
        style={{ left: `${coin.x * 100}%`, top: `${coin.y * 100}%` }}
        aria-label={aria}
      >
        <span className="dp-coin-value">${coin.denomination}</span>
        <span className="dp-coin-conf">{conf}%</span>
      </div>
    );
  }

  const left = Math.max(0, (coin.x - coin.w / 2) * 100);
  const top = Math.max(0, (coin.y - coin.h / 2) * 100);
  const width = coin.w * 100;
  const height = coin.h * 100;

  return (
    <div
      className={`dp-bbox dp-bbox--${cls}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      aria-label={aria}
    >
      <span className={`dp-bbox-label dp-bbox-label--${cls}`}>{label}</span>
    </div>
  );
};

export default CoinOverlay;
