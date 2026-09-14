import { useState, useRef, useEffect, useCallback } from 'react';
import { LocalSettings } from '../services/storage/localStorage';
import { importFile, LIBRARY, ACCEPT } from '../services/storage/fileImport';
import GhostMark from '../components/boot/GhostMark';
import { WALLPAPERS } from '../components/wallpapers/registry';
import {
  UserIcon,
  LockIcon,
  PaletteIcon,
  CheckIcon,
  UploadIcon,
  ShieldIcon,
  TerminalIcon,
  GlobeIcon,
  FolderIcon,
} from '../components/Icons';
import styles from './SetupScreen.module.css';

/**
 * Billighost OS — First-run Setup (Nordic Obsidian Edition)
 *
 * Runs once, before the lock screen ever appears. Four steps:
 *   identity → PIN → wallpaper → confirm
 *
 * Features:
 *  - Luxurious Nordic Obsidian liquid glass aesthetic
 *  - Real-time interactive miniature desktop preview
 *  - Tactile PIN keypad & keyboard focus
 *  - Fluid height-responsive layout for short viewports (e.g. 1366x420 half-height)
 *  - Sticky non-clipping action bar
 *  - Full data contract backwards compatibility
 */

const STEPS = [
  { id: 'identity', label: 'Identity', subtitle: 'User Profile', Icon: UserIcon },
  { id: 'pin', label: 'Security', subtitle: '4-Digit PIN', Icon: LockIcon },
  { id: 'wallpaper', label: 'Backdrop', subtitle: 'Atmosphere', Icon: PaletteIcon },
  { id: 'done', label: 'Finalize', subtitle: 'Ready to Launch', Icon: CheckIcon },
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
  const [pinStage, setPinStage] = useState('enter'); // 'enter' | 'confirm'
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
    const timer = setTimeout(() => {
      refs.current[0]?.focus();
    }, 40);
    return () => clearTimeout(timer);
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

    if (digit && index < 3) {
      refs.current[index + 1]?.focus();
    }
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

  // Numpad button click handler
  const handleNumpadClick = (numStr) => {
    playClick();
    const stage = pinStage;
    const setter = stage === 'enter' ? setPin : setPinConfirm;
    const refs = stage === 'enter' ? pinRefs : confirmRefs;
    const values = stage === 'enter' ? pin : pinConfirm;

    if (numStr === 'clear') {
      setter(['', '', '', '']);
      refs.current[0]?.focus();
      setPinError('');
      return;
    }

    if (numStr === 'back') {
      const lastIndex = values.reduce((acc, curr, idx) => (curr ? idx : acc), -1);
      if (lastIndex >= 0) {
        setter(prev => {
          const next = [...prev];
          next[lastIndex] = '';
          return next;
        });
        refs.current[lastIndex]?.focus();
      }
      return;
    }

    // Insert next digit
    const firstEmpty = values.findIndex(d => d === '');
    if (firstEmpty !== -1) {
      setter(prev => {
        const next = [...prev];
        next[firstEmpty] = numStr;
        return next;
      });
      setPinError('');
      if (firstEmpty < 3) {
        refs.current[firstEmpty + 1]?.focus();
      }
    }
  };

  /* ── Wallpaper ────────────────────────────── */
  const handleWallpaperUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    e.target.value = '';

    try {
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
      /* File import reports own failures */
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

  // Keyboard navigation: Enter advances, Escape goes back
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (step.id === 'done') finish(); else goNext();
      } else if (e.key === 'Escape' && (stepIndex > 0 || pinStage === 'confirm')) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const activeWallpaper = WALLPAPERS.find(w => w.id === wallpaperId);
  const activeBgStyle = wallpaperId === 'custom' && customWallpaper
    ? { backgroundImage: `url(${customWallpaper.dataUrl})`, backgroundSize: 'cover' }
    : { background: activeWallpaper?.css };

  // Initials for avatar
  const initials = name.trim()
    ? name.trim().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'BG';

  return (
    <div className={`${styles.viewportContainer} ${leaving ? styles.leaving : ''}`} data-testid="setup-screen">
      {/* Dynamic ambient backdrop */}
      <div className={styles.backdropLayer} style={activeBgStyle}>
        <div className={styles.backdropMeshOverlay} />
        <div className={styles.backdropRadialGlow} />
      </div>

      {/* Main Nordic Obsidian Card */}
      <div className={styles.setupCard} data-step={step.id}>
        {/* Prismatic Top Light Bar */}
        <div className={styles.prismaticBorder} />

        {/* ── Header: Brand & Progress Breadcrumb ── */}
        <header className={styles.header}>
          <div className={styles.brandRow}>
            <div className={styles.markWrapper}>
              <GhostMark size={36} phase="done" className={styles.ghostMark} />
              <div className={styles.markGlowRing} />
            </div>
            <div className={styles.brandInfo}>
              <div className={styles.brandLogoRow}>
                <span className={styles.brandTitle}>BILLIGHOST</span>
                <span className={styles.brandBadge}>OS</span>
              </div>
              <span className={styles.brandSubtitle}>Nordic Setup Assistant</span>
            </div>
          </div>

          {/* Stepper Breadcrumb */}
          <nav className={styles.stepperNav} aria-label="Setup Steps">
            {STEPS.map((s, idx) => {
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <div
                  key={s.id}
                  className={`${styles.stepPill} ${isCurrent ? styles.stepPillActive : ''} ${isPast ? styles.stepPillDone : ''}`}
                >
                  <span className={styles.stepPillIcon}>
                    {isPast ? <CheckIcon size={12} /> : <span>{idx + 1}</span>}
                  </span>
                  <div className={styles.stepPillText}>
                    <span className={styles.stepPillLabel}>{s.label}</span>
                    <span className={styles.stepPillSub}>{s.subtitle}</span>
                  </div>
                  {idx < STEPS.length - 1 && <span className={styles.stepConnector} />}
                </div>
              );
            })}
          </nav>
        </header>

        {/* ── Content Stage ── */}
        <main className={styles.mainStage}>
          {/* STEP 1: IDENTITY */}
          {step.id === 'identity' && (
            <section className={styles.stageBody}>
              <div className={styles.splitStage}>
                {/* Left Profile Avatar Card */}
                <div className={styles.profileBadgeCard}>
                  <div className={styles.avatarOrb}>
                    <span className={styles.avatarInitials}>{initials}</span>
                    <div className={styles.avatarRing} />
                  </div>
                  <h2 className={styles.avatarTitle}>{name.trim() || 'Welcome'}</h2>
                  <p className={styles.avatarSubtitle}>
                    {email.trim() || 'Create your local profile'}
                  </p>
                  <div className={styles.privacyPill}>
                    <ShieldIcon size={13} color="var(--accent-success)" />
                    <span>100% Stored Locally • Zero Telemetry</span>
                  </div>
                </div>

                {/* Right Form Fields */}
                <div className={styles.formColumn}>
                  <div className={styles.sectionHeader}>
                    <h1 className={styles.stageHeading}>Create Your Profile</h1>
                    <p className={styles.stageDesc}>
                      Personalize your identity on Billighost OS. This will be shown on your lock screen and terminal.
                    </p>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="setup-name">
                      <span>Display Name</span>
                      {name.trim().length >= 2 && (
                        <span className={styles.validTag}><CheckIcon size={10} /> Valid</span>
                      )}
                    </label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}><UserIcon size={16} /></span>
                      <input
                        id="setup-name"
                        className={styles.textInput}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Linus Torvalds"
                        maxLength={40}
                        autoFocus
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel} htmlFor="setup-email">
                      <span>Email Address</span>
                      {email && EMAIL_RE.test(email.trim()) && (
                        <span className={styles.validTag}><CheckIcon size={10} /> Valid</span>
                      )}
                    </label>
                    <div className={styles.inputWrapper}>
                      <span className={styles.inputIcon}><GlobeIcon size={16} /></span>
                      <input
                        id="setup-email"
                        type="email"
                        className={styles.textInput}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. user@billighost.dev"
                        maxLength={80}
                        autoComplete="email"
                      />
                    </div>
                    {email && !EMAIL_RE.test(email.trim()) && (
                      <span className={styles.inlineErrorText}>
                        Please enter a valid email address (e.g. user@domain.com)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2: SECURITY PIN */}
          {step.id === 'pin' && (
            <section className={styles.stageBody}>
              <div className={styles.pinStageLayout}>
                <div className={styles.pinHeader}>
                  <div className={styles.pinStagePill}>
                    <LockIcon size={14} color="var(--accent-glow)" />
                    <span>{pinStage === 'enter' ? 'Step 1 of 2: Create PIN' : 'Step 2 of 2: Confirm PIN'}</span>
                  </div>
                  <h1 className={styles.stageHeading}>
                    {pinStage === 'enter' ? 'Set a 4-Digit Security PIN' : 'Confirm Your 4-Digit PIN'}
                  </h1>
                  <p className={styles.stageDesc}>
                    {pinStage === 'enter'
                      ? 'Used to unlock your desktop session. Securely encrypted and stored only inside your browser.'
                      : 'Re-enter the exact four digits to confirm your security code.'}
                  </p>
                </div>

                {/* PIN Boxes */}
                <div className={`${styles.pinBoxesRow} ${pinError ? styles.pinShake : ''}`}>
                  {[0, 1, 2, 3].map(i => {
                    const stage = pinStage;
                    const values = stage === 'enter' ? pin : pinConfirm;
                    const refs = stage === 'enter' ? pinRefs : confirmRefs;
                    const isFilled = Boolean(values[i]);

                    return (
                      <div
                        key={i}
                        className={`${styles.pinDigitCell} ${isFilled ? styles.pinDigitFilled : ''} ${pinError ? styles.pinDigitError : ''}`}
                      >
                        <input
                          ref={(el) => { refs.current[i] = el; }}
                          className={styles.hiddenPinInput}
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
                        <div className={styles.pinGlowDot} />
                        {isFilled && <span className={styles.pinDigitChar}>•</span>}
                      </div>
                    );
                  })}
                </div>

                {pinError && (
                  <div className={styles.pinErrorBanner}>
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Tactile On-Screen Numpad for Click/Touch */}
                <div className={styles.numpadGrid} aria-label="PIN Numpad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map(btn => {
                    if (btn === 'clear') {
                      return (
                        <button
                          key={btn}
                          type="button"
                          className={`${styles.numpadBtn} ${styles.numpadActionBtn}`}
                          onClick={() => handleNumpadClick('clear')}
                          title="Clear PIN"
                        >
                          C
                        </button>
                      );
                    }
                    if (btn === 'back') {
                      return (
                        <button
                          key={btn}
                          type="button"
                          className={`${styles.numpadBtn} ${styles.numpadActionBtn}`}
                          onClick={() => handleNumpadClick('back')}
                          title="Backspace"
                        >
                          ⌫
                        </button>
                      );
                    }
                    return (
                      <button
                        key={btn}
                        type="button"
                        className={styles.numpadBtn}
                        onClick={() => handleNumpadClick(btn)}
                      >
                        {btn}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: WALLPAPER / ATMOSPHERE */}
          {step.id === 'wallpaper' && (
            <section className={styles.stageBody}>
              <div className={styles.wallpaperLayout}>
                {/* Miniature Desktop Live Preview */}
                <div className={styles.desktopMiniPreviewContainer}>
                  <div className={styles.desktopMiniBezel}>
                    <div className={styles.desktopMiniScreen} style={activeBgStyle}>
                      {/* Top simulated status bar */}
                      <div className={styles.miniStatusBar}>
                        <span className={styles.miniLogo}>BILLIGHOST OS</span>
                        <div className={styles.miniStatusRight}>
                          <span>10:24</span>
                          <span className={styles.miniDotOnline} />
                        </div>
                      </div>

                      {/* Desktop Icons in preview */}
                      <div className={styles.miniDesktopGrid}>
                        <div className={styles.miniIconItem}>
                          <GlobeIcon size={12} color="#7eb8ff" />
                          <span>Browser</span>
                        </div>
                        <div className={styles.miniIconItem}>
                          <TerminalIcon size={12} color="#34d399" />
                          <span>Terminal</span>
                        </div>
                        <div className={styles.miniIconItem}>
                          <FolderIcon size={12} color="#fbbf24" />
                          <span>Files</span>
                        </div>
                      </div>

                      {/* Taskbar in preview */}
                      <div className={styles.miniTaskbar}>
                        <GhostMark size={10} phase="done" />
                        <div className={styles.miniDockPill} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.previewCaptionRow}>
                    <span className={styles.previewCaptionName}>
                      {wallpaperId === 'custom'
                        ? (customWallpaper?.name || 'Custom Image')
                        : activeWallpaper?.name}
                    </span>
                    {activeWallpaper?.live && (
                      <span className={styles.previewLivePill}>⚡ Dynamic Canvas Effect</span>
                    )}
                  </div>
                </div>

                {/* Wallpaper Gallery Swatches */}
                <div className={styles.wallpaperGalleryWrapper}>
                  <div className={styles.sectionHeader}>
                    <h1 className={styles.stageHeading}>Select System Atmosphere</h1>
                    <p className={styles.stageDesc}>
                      Choose from curated ambient canvases or upload your own wallpaper image.
                    </p>
                  </div>

                  <div className={styles.wallpaperGrid} role="radiogroup" aria-label="Select Wallpaper">
                    {WALLPAPERS.map(w => {
                      const isSelected = wallpaperId === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`${styles.wallCard} ${isSelected ? styles.wallCardActive : ''}`}
                          style={{ background: w.css }}
                          onClick={() => { playClick(); setWallpaperId(w.id); }}
                        >
                          <div className={styles.wallCardContent}>
                            <span className={styles.wallTitle}>{w.name}</span>
                            {w.live && <span className={styles.wallLiveTag}>LIVE</span>}
                          </div>
                          {isSelected && (
                            <div className={styles.wallSelectedRing}>
                              <CheckIcon size={12} />
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Custom Upload Card */}
                    <button
                      type="button"
                      className={`${styles.wallCard} ${styles.wallCardUpload} ${wallpaperId === 'custom' ? styles.wallCardActive : ''}`}
                      onClick={() => { playClick(); fileRef.current?.click(); }}
                      style={customWallpaper ? { backgroundImage: `url(${customWallpaper.dataUrl})`, backgroundSize: 'cover' } : undefined}
                    >
                      <div className={styles.uploadOverlay}>
                        <UploadIcon size={18} color="var(--accent-glow)" />
                        <span className={styles.wallTitle}>
                          {customWallpaper ? customWallpaper.name : 'Custom Image'}
                        </span>
                      </div>
                      {wallpaperId === 'custom' && (
                        <div className={styles.wallSelectedRing}>
                          <CheckIcon size={12} />
                        </div>
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
              </div>
            </section>
          )}

          {/* STEP 4: FINALIZE */}
          {step.id === 'done' && (
            <section className={styles.stageBody}>
              <div className={styles.finalizeLayout}>
                <div className={styles.sectionHeaderCentered}>
                  <div className={styles.successPulseBadge}>
                    <CheckIcon size={24} color="var(--accent-success)" />
                  </div>
                  <h1 className={styles.stageHeading}>
                    Ready for Takeoff, {name.split(' ')[0] || 'User'}
                  </h1>
                  <p className={styles.stageDesc}>
                    Your operating system environment is primed and initialized. Review your configuration below.
                  </p>
                </div>

                <div className={styles.summaryTelemetryCard}>
                  <div className={styles.telemetryRow}>
                    <div className={styles.telemetryLeft}>
                      <UserIcon size={16} color="var(--accent-glow)" />
                      <span>Display Identity</span>
                    </div>
                    <div className={styles.telemetryRight}>
                      <strong>{name}</strong>
                      <span className={styles.telemetrySub}>({email})</span>
                    </div>
                  </div>

                  <div className={styles.telemetryRow}>
                    <div className={styles.telemetryLeft}>
                      <LockIcon size={16} color="var(--accent-success)" />
                      <span>Security PIN</span>
                    </div>
                    <div className={styles.telemetryRight}>
                      <span className={styles.pinMaskedChip}>•••• ENCRYPTED</span>
                    </div>
                  </div>

                  <div className={styles.telemetryRow}>
                    <div className={styles.telemetryLeft}>
                      <PaletteIcon size={16} color="var(--accent-soft)" />
                      <span>Atmosphere Backdrop</span>
                    </div>
                    <div className={styles.telemetryRight}>
                      <div className={styles.telemetryWallChip} style={activeBgStyle} />
                      <span>
                        {wallpaperId === 'custom'
                          ? customWallpaper?.name || 'Custom image'
                          : activeWallpaper?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.readinessChecklist}>
                  <div className={styles.checkItem}>
                    <CheckIcon size={12} color="var(--accent-success)" />
                    <span>Local vault initialized</span>
                  </div>
                  <div className={styles.checkItem}>
                    <CheckIcon size={12} color="var(--accent-success)" />
                    <span>Hardware graphics acceleration ready</span>
                  </div>
                  <div className={styles.checkItem}>
                    <CheckIcon size={12} color="var(--accent-success)" />
                    <span>Session encryption armed</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* ── Sticky Action Bar Footer ── */}
        <footer className={styles.footerBar}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={goBack}
            disabled={stepIndex === 0 && pinStage === 'enter'}
          >
            Back
          </button>

          <div className={styles.footerCenterHint}>
            <span className={styles.kbdShortcut}>↵ Enter</span>
            <span>{step.id === 'done' ? 'to launch' : 'to proceed'}</span>
          </div>

          {step.id === 'done' ? (
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={finish}
              data-testid="setup-finish"
            >
              <span className={styles.btnShimmer} />
              <span>Enter Billighost OS</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={goNext}
              disabled={!canAdvance()}
              data-testid="setup-next"
            >
              <span className={styles.btnShimmer} />
              <span>Continue</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
