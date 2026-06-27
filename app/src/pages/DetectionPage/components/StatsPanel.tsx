import React from 'react';
import { CoinDenomination, ALL_DENOMINATIONS } from '../../../types/coins';

const DENOM_CLASS: Record<CoinDenomination, string> = {
  50: 'd50', 100: 'd100', 200: 'd200', 500: 'd500', 1000: 'd1000',
};

interface Props {
  totalAmount: number;
  coinCount: number;
  denominationBreakdown: Record<CoinDenomination, number>;
}

const StatsPanel: React.FC<Props> = ({ totalAmount, coinCount, denominationBreakdown }) => {
  const hasCoins = coinCount > 0;
  const activeChips = ALL_DENOMINATIONS.filter(d => denominationBreakdown[d] > 0);

  return (
    <div className="dp-stats glass-panel">
      <div className="dp-stats-main">
        <span className="dp-stats-currency">$</span>
        <span className={`dp-stats-amount${!hasCoins ? ' dp-stats-amount--zero' : ''}`}>
          {totalAmount.toLocaleString('es-CO')}
        </span>
        <span className="dp-stats-code">COP</span>
      </div>

      <p className="dp-stats-count">
        {hasCoins
          ? <><strong>{coinCount}</strong> {coinCount === 1 ? 'moneda detectada' : 'monedas detectadas'}</>
          : 'Sin detecciones aún'}
      </p>

      {activeChips.length > 0 && (
        <div className="dp-stats-chips">
          {activeChips.map(d => (
            <span key={d} className={`dp-denom-chip dp-denom-chip--${DENOM_CLASS[d]}`}>
              ×{denominationBreakdown[d]} ${d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
