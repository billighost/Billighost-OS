import { useState, useRef, useEffect, useCallback } from 'react';
import { LocalSettings } from '../services/storage/localStorage';
import { importFile, LIBRARY, ACCEPT } from '../services/storage/fileImport';
import GhostMark from '../components/boot/GhostMark';
import { WALLPAPERS } from '../components/wallpapers/registry';
import { UserIcon, LockIcon, PaletteIcon, CheckIcon, UploadIcon } from '../components/Icons';
import styles from './SetupScreen.module.css';

/**
 * Billighost OS — First-run Setup
 *
 * Runs once, before the lock screen ever appears, so the OS never presents
 * someone else's name, address or PIN as a default. Four steps:
 *
 *   identity → PIN → wallpaper → confirm
 *
 * Everything is written to LocalSettings only on the final step, so backing
 * out part-way leaves nothing half-configured.
 */

const STEPS = [
  { id: 'identity', label: 'Identity', Icon: UserIcon },
  { id: 'pin', label: 'Security', Icon: LockIcon },
  { id: 'wallpaper', label: 'Appearance', Icon: PaletteIcon },
  { id: 'done', label: 'Finish', Icon: CheckIcon },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SetupScreen({ onComplete, playClick = () => {}, playSuccess = () => {} }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  // Identity
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Security
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinConfirm, setPinConfirm] = useState(['', '', '', '']);
  const [pinStage, setPinStage] = useState('enter');   // 'enter' | 'confirm'
  const [pinError, setPinError] = useState('');

  // Appearance
  const [wallpaperId, setWallpaperId] = useState(WALLPAPERS[0].id);
  const [customWallpaper, setCustomWallpaper] = useState(null);

  const pinRefs = useRef([]);
  const confirmRefs = useRef([]);
  const fileRef = useRef(null);

  const step = STEPS[stepIndex];

  /* ── Focus management ─────────────────────── */

  useEffect(() => {
    if (step.id !== 'pin') return;
    const refs = pinStage === 'enter' ? pinRefs : confirmRefs;
    refs.current[0]?.focus();
  }, [step.id, pinStage]);

  /* ── PIN entry ────────────────────────────── */

  const handlePinDigit = (index, value, stage) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const setter = stage === 'enter' ? setPin : setPinConfirm;
    const refs = stage === 'enter' ? pinRefs : confirmRefs;

    setter(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setPinError('');

    if (digit && index < 3) refs.current[index + 1]?.focus();
  };

  const handlePinKey = (index, e, stage) => {
    const values = stage === 'enter' ? pin : pinConfirm;
    const refs = stage === 'enter' ? pinRefs : confirmRefs;

    if (e.key === 'Backspace' && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  /* ── Wallpaper ────────────────────────────── */

  const handleWallpaperUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    e.target.value = '';

    try {
      // Stored in the Pictures library so it is browsable afterwards, not
      // only embedded in settings.
      const saved = await importFile(file, { dir: LIBRARY.image });
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      setCustomWallpaper({ dataUrl, name: saved.name, path: saved.path });
      setWallpaperId('custom');
    } catch {
      /* import service reports its own failures */
    }
  };

  /* ── Navigation ───────────────────────────── */

  const canAdvance = useCallback(() => {
    if (step.id === 'identity') {
      return name.trim().length >= 2 && EMAIL_RE.test(email.trim());
    }
    if (step.id === 'pin') {
      return pinStage === 'enter'
        ? pin.every(d => d !== '')
        : pinConfirm.every(d => d !== '');
    }
    return true;
  }, [step.id, name, email, pin, pinConfirm, pinStage]);

  const goNext = () => {
    if (!canAdvance()) return;
    playClick();

    if (step.id === 'pin') {
      if (pinStage === 'enter') {
        setPinStage('confirm');
        return;
      }
      if (pin.join('') !== pinConfirm.join('')) {
        setPinError('Those PINs do not match. Try again.');
        setPinConfirm(['', '', '', '']);
        confirmRefs.current[0]?.focus();
        return;
      }
    }

    setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    playClick();
    if (step.id === 'pin' && pinStage === 'confirm') {
      setPinStage('enter');
      setPinConfirm(['', '', '', '']);
      setPinError('');
      return;
    }
    setStepIndex(i => Math.max(0, i - 1));
  };

  const finish = () => {
    playClick();

    // Everything is written here, in one place, so an abandoned setup
    // leaves no partial configuration behind.
    LocalSettings.setProfile({ name: name.trim(), email: email.trim() });
    LocalSettings.setSecurity({ pin: pin.join('') });

    const chosen = WALLPAPERS.find(w => w.id === wallpaperId);
    LocalSettings.setAppearance({
      wallpaper: wallpaperId,
      customWallpaperData: wallpaperId === 'custom' ? customWallpaper?.dataUrl || null : null,
      wallpaperCss: chosen?.css || null,
      liveWallpaper: chosen?.live || null,
    });

    LocalSettings.markSetupComplete();
    playSuccess();

    setLeaving(true);
    setTimeout(() => onComplete?.(), 620);
  };

  // Enter advances; Escape steps back.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (step.id === 'done') finish(); else goNext();
      } else if (e.key === 'Escape' && stepIndex > 0) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const activeWallpaper = WALLPAPERS.find(w => w.id === wallpaperId);

  return (
    <div className={`${styles.container} ${leaving ? styles.leaving : ''}`} data-testid="setup-screen">
      {/* Live preview of the chosen wallpaper, behind everything */}
      <div className={styles.preview}>
        {wallpaperId === 'custom' && customWallpaper ? (
          <img src={customWallpaper.dataUrl} alt="" className={styles.previewImg} />
        ) : (
          <div className={styles.previewCss} style={{ background: activeWallpaper?.css }} />
        )}
        <div className={styles.previewScrim} />
      </div>

      <div className={styles.card} data-step={step.id}>
        {/* Brand */}
        <div className={styles.brand}>
          <GhostMark size={44} phase="done" className={styles.mark} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>BILLIGHOST</span>
            <span className={styles.brandSub}>First-run setup</span>
          </div>
        </div>

        {/* Progress */}
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.stepDot} ${i === stepIndex ? styles.stepActive : ''} ${i < stepIndex ? styles.stepDone : ''}`}
            >
              <span className={styles.stepIcon}>
                {i < stepIndex ? <CheckIcon size={12} /> : <s.Icon size={12} />}
              </span>
              <span className={styles.stepLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Step: identity ── */}
        {step.id === 'identity' && (
          <div className={styles.body}>
            <h1 className={styles.title}>Who is using this machine?</h1>
            <p className={styles.desc}>
              Your name appears on the lock screen and in Settings. Nothing leaves
              this browser — it is stored locally.
            </p>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Display name</span>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Mensah"
                maxLength={40}
                autoFocus
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email address</span>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={80}
              />
              {email && !EMAIL_RE.test(email.trim()) && (
                <span className={styles.hintError}>That does not look like an email address.</span>
              )}
            </label>
          </div>
        )}

        {/* ── Step: PIN ── */}
        {step.id === 'pin' && (
          <div className={styles.body}>
            <h1 className={styles.title}>
              {pinStage === 'enter' ? 'Choose a 4-digit PIN' : 'Confirm your PIN'}
            </h1>
            <p className={styles.desc}>
              {pinStage === 'enter'
                ? 'You will enter this to unlock the desktop. Pick something you will remember — there is no recovery.'
                : 'Type the same four digits again.'}
            </p>

            <div className={styles.pinRow}>
              {[0, 1, 2, 3].map(i => {
                const stage = pinStage;
                const values = stage === 'enter' ? pin : pinConfirm;
                const refs = stage === 'enter' ? pinRefs : confirmRefs;
                return (
                  <div key={i} className={`${styles.pinBox} ${pinError ? styles.pinBoxError : ''}`}>
                    <input
                      ref={(el) => { refs.current[i] = el; }}
                      className={styles.pinInput}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={values[i]}
                      onChange={(e) => handlePinDigit(i, e.target.value, stage)}
                      onKeyDown={(e) => handlePinKey(i, e, stage)}
                      autoComplete="off"
                      spellCheck={false}
                      aria-label={`PIN digit ${i + 1}`}
                    />
                    <span className={`${styles.pinDot} ${values[i] ? styles.pinDotFilled : ''}`} />
                  </div>
                );
              })}
            </div>

            {pinError && <span className={styles.errorText}>{pinError}</span>}
          </div>
        )}

        {/* ── Step: wallpaper ── */}
        {step.id === 'wallpaper' && (
          <div className={styles.body}>
            <h1 className={styles.title}>Pick a backdrop</h1>
            <p className={styles.desc}>
              Live wallpapers react to your windows. You can change this any time in Settings.
            </p>

            <div className={styles.wallGrid}>
              {WALLPAPERS.map(w => (
                <button
                  key={w.id}
                  className={`${styles.wallOption} ${wallpaperId === w.id ? styles.wallActive : ''}`}
                  style={{ background: w.css }}
                  onClick={() => { playClick(); setWallpaperId(w.id); }}
                  title={w.description}
                >
                  <span className={styles.wallName}>{w.name}</span>
                  {w.live && <span className={styles.wallBadge}>LIVE</span>}
                  {wallpaperId === w.id && (
                    <span className={styles.wallCheck}><CheckIcon size={13} /></span>
                  )}
                </button>
              ))}

              <button
                className={`${styles.wallOption} ${styles.wallUpload} ${wallpaperId === 'custom' ? styles.wallActive : ''}`}
                onClick={() => { playClick(); fileRef.current?.click(); }}
                style={customWallpaper ? { backgroundImage: `url(${customWallpaper.dataUrl})`, backgroundSize: 'cover' } : undefined}
              >
                <UploadIcon size={18} />
                <span className={styles.wallName}>
                  {customWallpaper ? customWallpaper.name : 'Your own image'}
                </span>
                {wallpaperId === 'custom' && (
                  <span className={styles.wallCheck}><CheckIcon size={13} /></span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT.image}
                onChange={handleWallpaperUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        )}

        {/* ── Step: done ── */}
        {step.id === 'done' && (
          <div className={styles.body}>
            <h1 className={styles.title}>You are all set, {name.split(' ')[0] || 'friend'}</h1>
            <p className={styles.desc}>
              Everything below is stored locally in this browser and can be changed in Settings.
            </p>

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Name</span><span>{name}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Email</span><span>{email}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Unlock PIN</span><span>•••• (set)</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Wallpaper</span>
                <span>
                  {wallpaperId === 'custom'
                    ? customWallpaper?.name || 'Custom image'
                    : activeWallpaper?.name}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.ghostBtn}
            onClick={goBack}
            disabled={stepIndex === 0 && pinStage === 'enter'}
          >
            Back
          </button>

          <span className={styles.footerHint}>
            {step.id === 'done' ? 'Press Enter to start' : 'Press Enter to continue'}
          </span>

          {step.id === 'done' ? (
            <button className={styles.primaryBtn} onClick={finish} data-testid="setup-finish">
              Enter Billighost
            </button>
          ) : (
            <button
              className={styles.primaryBtn}
              onClick={goNext}
              disabled={!canAdvance()}
              data-testid="setup-next"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
