import { useEffect, useState, useRef } from 'react';
import GhostMark from '../components/boot/GhostMark';
import EntanglementCanvas from '../components/boot/EntanglementCanvas';
import styles from './BootScreen.module.css';

/**
 * Billighost OS — Boot Sequence
 *
 * Deliberately staged so nothing competes for attention:
 *
 *   logo        the mark self-draws, wordmark resolves     (0 – 2.0s)
 *   logoOut     logo alone fades from the void             (2.0 – 2.7s)
 *   weave       quantum filament entanglement              (2.7 – 6.5s)
 *   handoff     weave fades, lock screen takes over        (6.5 – 7.2s)
 *
 * The logo phase shows the mark and NOTHING else — no particles, no
 * status text — which is what makes the void read as a void.
 */

const LOGO_HOLD = 2000;
const LOGO_FADE = 700;
const WEAVE_DURATION = 3800;
const HANDOFF_FADE = 700;

export default function BootScreen({ onComplete, playBootAmbient }) {
  const [phase, setPhase] = useState('logo');
  const hasPlayed = useRef(false);

  const onCompleteRef = useRef(onComplete);
  const playAmbientRef = useRef(playBootAmbient);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    playAmbientRef.current = playBootAmbient;
  }, [onComplete, playBootAmbient]);

  // Ambient hum once, on mount.
  useEffect(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;
    try {
      playAmbientRef.current?.();
    } catch {
      /* autoplay may be blocked until first interaction */
    }
  }, []);

  // Logo hold → fade → weave.
  useEffect(() => {
    const toFade = setTimeout(() => setPhase('logoOut'), LOGO_HOLD);
    const toWeave = setTimeout(() => setPhase('weave'), LOGO_HOLD + LOGO_FADE);
    return () => {
      clearTimeout(toFade);
      clearTimeout(toWeave);
    };
  }, []);

  // Weave finished → fade it out → hand off to the lock screen.
  const handleWeaveComplete = () => {
    setPhase('handoff');
    setTimeout(() => onCompleteRef.current?.(), HANDOFF_FADE);
  };

  const logoVisible = phase === 'logo';
  const showWeave = phase === 'weave' || phase === 'handoff';

  return (
    <div className={styles.container} data-testid="boot-screen" data-phase={phase}>
      {/* Stage 1 — the mark alone in the void */}
      {(phase === 'logo' || phase === 'logoOut') && (
        <div className={`${styles.logoStage} ${logoVisible ? '' : styles.logoStageOut}`}>
          <div className={styles.markWrap}>
            <GhostMark size={112} phase={phase} className={styles.mark} />
          </div>

          <div className={styles.wordmark} aria-hidden="true">
            {'BILLIGHOST'.split('').map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className={styles.letter}
                style={{ animationDelay: `${900 + i * 52}ms` }}
              >
                {ch}
              </span>
            ))}
          </div>

          <div className={styles.hairline} />
        </div>
      )}

      {/* Stage 2 — quantum filament entanglement */}
      {showWeave && (
        <EntanglementCanvas
          duration={WEAVE_DURATION}
          onComplete={handleWeaveComplete}
          fading={phase === 'handoff'}
        />
      )}
    </div>
  );
}
