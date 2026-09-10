import { useEffect, useRef } from 'react';
import styles from './SigningInScreen.module.css';

export default function SigningInScreen({ onComplete, wallpaperSrc, playChime = () => {} }) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const playChimeRef = useRef(playChime);
  playChimeRef.current = playChime;

  useEffect(() => {
    // Play chime sound on sign in
    try {
      playChimeRef.current?.();
    } catch (e) {}

    // Transition to desktop after ~2.4 seconds
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.container}>
      {/* Wallpaper */}
      {wallpaperSrc ? (
        <img src={wallpaperSrc} alt="" className={styles.wallpaper} draggable={false} />
      ) : (
        <div className={styles.wallpaperFallback} />
      )}

      {/* Blurred Glass Scrim */}
      <div className={styles.scrim} />

      {/* Center Group */}
      <div className={styles.content}>
        {/* Orbital 3-dot spinner */}
        <div className={styles.spinnerWrapper}>
          <div className={styles.spinnerNucleus} />
          <div className={styles.orbitRing} />
          <div className={`${styles.orbitDot} ${styles.dot1}`} />
          <div className={`${styles.orbitDot} ${styles.dot2}`} />
          <div className={`${styles.orbitDot} ${styles.dot3}`} />
        </div>

        {/* Text */}
        <div className={styles.textGroup}>
          <div className={styles.title}>
            Signing you in
            <span className={styles.ellipsisDot1}>.</span>
            <span className={styles.ellipsisDot2}>.</span>
            <span className={styles.ellipsisDot3}>.</span>
          </div>
          <span className={styles.email}>bb2010ng@gmail.com</span>
        </div>

        {/* Micro progress line */}
        <div className={styles.progressBarTrack}>
          <div className={styles.progressBarFill} />
        </div>
      </div>
    </div>
  );
}
