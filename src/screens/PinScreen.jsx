import { useState, useRef, useEffect, useCallback } from 'react';
import { LocalSettings } from '../services/storage/localStorage';
import styles from './PinScreen.module.css';

export default function PinScreen({ onSuccess, wallpaperSrc, audio = {} }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [security, setSecurity] = useState(() => LocalSettings.getSecurity());
  const [profile, setProfile] = useState(() => LocalSettings.getProfile());
  const inputRefs = useRef([]);

  const { playKeyPress = () => {}, playError = () => {}, playSuccess = () => {} } = audio;

  useEffect(() => {
    const handleSec = (e) => setSecurity(e.detail);
    const handleProf = (e) => setProfile(e.detail);
    window.addEventListener('billighost:security-change', handleSec);
    window.addEventListener('billighost:profile-change', handleProf);
    return () => {
      window.removeEventListener('billighost:security-change', handleSec);
      window.removeEventListener('billighost:profile-change', handleProf);
    };
  }, []);

  // Auto focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const evaluatePin = useCallback(
    (enteredPin) => {
      const correctPin = security?.pin || '0813';
      if (enteredPin === correctPin) {
        setIsSuccess(true);
        playSuccess();
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setIsError(true);
        playError();
        setTimeout(() => {
          setPin(['', '', '', '']);
          setIsError(false);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    },
    [onSuccess, playError, playSuccess, security?.pin]
  );

  const handleInputChange = (index, value) => {
    if (isSuccess || isError) return;

    // Only allow numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newPin = [...pin];
      newPin[index] = '';
      setPin(newPin);
      return;
    }

    const digit = cleaned.slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    playKeyPress();

    // Move to next box if available
    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if full PIN entered
    const fullPin = newPin.join('');
    if (fullPin.length === 4 && newPin.every((d) => d !== '')) {
      evaluatePin(fullPin);
    }
  };

  const handleKeyDown = (index, e) => {
    if (isSuccess) return;

    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        // Move to previous box if current is empty
        inputRefs.current[index - 1]?.focus();
      } else {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (isSuccess || isError) return;

    const pastedData = e.clipboardData.getData('text').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, 4).split('');

    if (digits.length === 0) return;

    const newPin = ['', '', '', ''];
    digits.forEach((d, i) => {
      if (i < 4) newPin[i] = d;
    });
    setPin(newPin);
    playKeyPress();

    const nextIndex = Math.min(digits.length, 3);
    inputRefs.current[nextIndex]?.focus();

    if (digits.length === 4) {
      evaluatePin(digits.join(''));
    }
  };

  return (
    <div className={styles.container}>
      {/* Wallpaper */}
      {wallpaperSrc ? (
        <img src={wallpaperSrc} alt="" className={styles.wallpaper} draggable={false} />
      ) : (
        <div className={styles.wallpaperFallback} />
      )}

      {/* Blurred Scrim */}
      <div className={styles.scrim} />

      {/* Central Card */}
      <div className={styles.content}>
        <div className={styles.avatarWrapper}>
          {!imgError ? (
            <img
              src="/src/assets/avatar.png"
              alt="Avatar"
              className={styles.avatar}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <span className={styles.avatarInitial}>B</span>
            </div>
          )}
        </div>

        <div className={styles.username}>bb2010ng@gmail.com</div>

        {/*
          Plain <div>, and the inputs are type="text" with the digits masked
          visually by the .pinDot overlay.

          A <form> silenced Chrome's "password field not contained in a form"
          note but immediately traded it for "Multiple forms should be
          contained in their own form elements", because four single-character
          password inputs do not look like one credential to the heuristic.
          Since this is a local unlock code rather than a transmitted
          credential, type="text" + inputMode="numeric" is the honest markup:
          no password manager should offer to save it, and no warning fires.
        */}
        <div
          className={`${styles.pinContainer} ${isError ? styles.pinShake : ''} ${
            isError ? styles.pinError : ''
          } ${isSuccess ? styles.pinSuccess : ''}`}
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={styles.pinBox}
              onClick={() => inputRefs.current[index]?.focus()}
            >
              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoCorrect="off"
                spellCheck={false}
                value={pin[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={styles.pinInput}
                name={`pin-digit-${index + 1}`}
                autoComplete="off"
                aria-label={`PIN digit ${index + 1}`}
              />
              <div
                className={`${styles.pinDot} ${pin[index] ? styles.pinDotVisible : ''}`}
              />
            </div>
          ))}
        </div>

        <span className={styles.hint}>Enter PIN (0813)</span>
      </div>
    </div>
  );
}
