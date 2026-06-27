import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coindetect.app',
  appName: 'CoinDetect',
  webDir: 'dist',
  server: { androidScheme: 'https' },
};

export default config;
