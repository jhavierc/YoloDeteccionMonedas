export type CoinDenomination = 50 | 100 | 200 | 500 | 1000;

export interface DetectedCoin {
  id: string;
  denomination: CoinDenomination;
  confidence: number;
  /** Normalized center X within viewport (0–1) */
  x: number;
  /** Normalized center Y within viewport (0–1) */
  y: number;
  /** Normalized bounding-box width (0–1). Optional para retrocompatibilidad con mocks. */
  w?: number;
  /** Normalized bounding-box height (0–1). */
  h?: number;
}

export type DetectionStatus = 'idle' | 'loading' | 'detecting' | 'paused' | 'error';

export const ALL_DENOMINATIONS: CoinDenomination[] = [50, 100, 200, 500, 1000];

export const EMPTY_BREAKDOWN: Record<CoinDenomination, number> = {
  50: 0, 100: 0, 200: 0, 500: 0, 1000: 0,
};
