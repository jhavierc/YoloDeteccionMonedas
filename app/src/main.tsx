import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Bloqueo de orientación en portrait. En Android (WebView de Capacitor) el
// lock real lo hace `android:screenOrientation="portrait"` del Manifest; esta
// llamada cubre dev en navegador y futuros despliegues PWA. La API requiere
// que el documento esté en fullscreen en algunos navegadores y/o un gesto
// del usuario, por eso envolvemos en try/catch silencioso.
type OrientationLockType = 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape' | 'any';
interface LockableOrientation extends ScreenOrientation {
  lock?: (orientation: OrientationLockType) => Promise<void>;
}
function lockPortrait(): void {
  const orientation = screen.orientation as LockableOrientation | undefined;
  if (orientation?.lock) {
    orientation.lock('portrait').catch(() => {
      // Silenciamos: el navegador puede rechazar si no hay fullscreen o si
      // está en desktop. No es un error de la app.
    });
  }
}
lockPortrait();

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
