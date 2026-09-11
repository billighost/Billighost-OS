import { useState, useEffect } from 'react';
import { SmartphoneIcon, RotateIcon } from './Icons';
import styles from './MobileGate.module.css';

/**
 * MobileGate — Blocks portrait mobile access to Billighost OS.
 * Shows a premium "rotate to landscape" or "use desktop" message.
 * In landscape, allows through.
 */
export default function MobileGate({ children }) {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth <= 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 150));
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortraitMobile) return children;

  return (
    <div className={styles.gate}>
      <div className={styles.gateContent}>
        <div className={styles.iconRow}>
          <SmartphoneIcon size={48} color="var(--accent-glow)" />
          <div className={styles.rotateArrow}>
            <RotateIcon size={32} color="var(--text-secondary)" />
          </div>
        </div>

        <h1 className={styles.title}>Billighost OS</h1>
        <p className={styles.subtitle}>
          This operating system is designed for desktop browsers.
        </p>

        <div className={styles.divider} />

        <div className={styles.hint}>
          <RotateIcon size={18} color="var(--accent-glow)" />
          <span>Rotate to landscape mode for the best experience</span>
        </div>

        <p className={styles.footnote}>
          For the full experience, use a laptop or desktop browser with a wider screen.
        </p>
      </div>
    </div>
  );
}
