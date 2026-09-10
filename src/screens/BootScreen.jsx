import { useEffect, useState, useRef } from 'react';
import ParticleCanvas from '../components/ParticleCanvas';
import styles from './BootScreen.module.css';

export default function BootScreen({ onComplete, playBootAmbient }) {
  const [fadeOut, setFadeOut] = useState(false);
  const hasPlayed = useRef(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const playAmbientRef = useRef(playBootAmbient);
  playAmbientRef.current = playBootAmbient;

  useEffect(() => {
    /* Random duration between 3-7 seconds */
    const duration = 3000 + Math.random() * 4000;

    /* Play ambient sound on mount */
    if (!hasPlayed.current) {
      hasPlayed.current = true;
      try {
        playAmbientRef.current?.();
      } catch (e) {
        /* Browser may block autoplay */
      }
    }

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration);

    const completeTimer = setTimeout(() => {
      onCompleteRef.current?.();
    }, duration + 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className={`${styles.container} ${fadeOut ? styles.fadeOut : ''}`}>
      <ParticleCanvas active={!fadeOut} />
      <span className={`${styles.logo} ${fadeOut ? styles.fadeOut : ''}`}>
        Billighost
      </span>
    </div>
  );
}
