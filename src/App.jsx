import { useState, useEffect, useRef } from 'react';
import { useAudio } from './hooks/useAudio';
import { LocalSettings } from './services/storage/localStorage';
import BootScreen from './screens/BootScreen';
import SetupScreen from './screens/SetupScreen';
import LockScreen from './screens/LockScreen';
import PinScreen from './screens/PinScreen';
import SigningInScreen from './screens/SigningInScreen';
import DesktopScreen from './screens/DesktopScreen';
import MobileGate from './components/MobileGate';
import styles from './App.module.css';

export default function App() {
  // 'boot' | 'setup' | 'lock' | 'pin' | 'signingIn' | 'desktop'
  const [screen, setScreen] = useState('boot');

  /*
   * First run goes through setup instead of straight to the lock screen, so
   * the OS never presents a placeholder identity or a shipped PIN. Read once
   * at mount: completing setup advances the screen explicitly.
   */
  const needsSetup = useRef(!LocalSettings.isSetupComplete());
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
    <MobileGate>
    <div className={styles.appContainer}>
      {screen === 'boot' && (
        <div className={styles.screenWrapper}>
          <BootScreen
            onComplete={() => setScreen(needsSetup.current ? 'setup' : 'lock')}
            playBootAmbient={audio.playBootAmbient}
          />
        </div>
      )}

      {screen === 'setup' && (
        <div className={styles.screenWrapper}>
          <SetupScreen
            onComplete={() => {
              needsSetup.current = false;
              setScreen('lock');
            }}
            playClick={audio.playClick}
            playSuccess={audio.playSuccess}
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
    </MobileGate>
  );
}
