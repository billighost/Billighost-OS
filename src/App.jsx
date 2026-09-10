import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { LocalSettings } from './services/storage/localStorage';
import BootScreen from './screens/BootScreen';
import LockScreen from './screens/LockScreen';
import PinScreen from './screens/PinScreen';
import SigningInScreen from './screens/SigningInScreen';
import DesktopScreen from './screens/DesktopScreen';
import styles from './App.module.css';

export default function App() {
  const [screen, setScreen] = useState('boot'); // 'boot' | 'lock' | 'pin' | 'signingIn' | 'desktop'
  const [wallpaperSrc, setWallpaperSrc] = useState(() => {
    const app = LocalSettings.getAppearance();
    return app.customWallpaperData || null;
  });
  const audio = useAudio();

  // Listen to appearance changes from Settings
  useEffect(() => {
    const handleAppearance = (e) => {
      const app = e.detail;
      if (app.customWallpaperData) {
        setWallpaperSrc(app.customWallpaperData);
      }
    };
    window.addEventListener('billighost:appearance-change', handleAppearance);
    return () => window.removeEventListener('billighost:appearance-change', handleAppearance);
  }, []);

  // Try detecting custom user wallpaper if placed in public/ or assets (if none chosen)
  useEffect(() => {
    if (wallpaperSrc) return;
    const candidatePaths = ['/wallpaper.png', '/wallpaper.jpg', '/src/assets/wallpaper.png', '/src/assets/wallpaper.jpg'];
    let cancelled = false;

    const testNext = (index) => {
      if (cancelled || index >= candidatePaths.length) return;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setWallpaperSrc(candidatePaths[index]);
      };
      img.onerror = () => {
        testNext(index + 1);
      };
      img.src = candidatePaths[index];
    };

    testNext(0);

    return () => {
      cancelled = true;
    };
  }, [wallpaperSrc]);

  return (
    <div className={styles.appContainer}>
      {screen === 'boot' && (
        <div className={styles.screenWrapper}>
          <BootScreen
            onComplete={() => setScreen('lock')}
            playBootAmbient={audio.playBootAmbient}
          />
        </div>
      )}

      {screen === 'lock' && (
        <div className={styles.screenWrapper}>
          <LockScreen
            onUnlock={() => setScreen('pin')}
            playUnlock={audio.playUnlock}
            playClick={audio.playClick}
            wallpaperSrc={wallpaperSrc}
          />
        </div>
      )}

      {screen === 'pin' && (
        <div className={styles.screenWrapper}>
          <PinScreen
            onSuccess={() => setScreen('signingIn')}
            wallpaperSrc={wallpaperSrc}
            audio={audio}
          />
        </div>
      )}

      {screen === 'signingIn' && (
        <div className={styles.screenWrapper}>
          <SigningInScreen
            onComplete={() => setScreen('desktop')}
            wallpaperSrc={wallpaperSrc}
            playChime={audio.playChime}
          />
        </div>
      )}

      {screen === 'desktop' && (
        <div className={styles.screenWrapper}>
          <DesktopScreen
            wallpaperSrc={wallpaperSrc}
            onLock={() => setScreen('lock')}
            playClick={audio.playClick}
          />
        </div>
      )}
    </div>
  );
}
