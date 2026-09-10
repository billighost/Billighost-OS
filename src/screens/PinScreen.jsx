import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './PinScreen.module.css';

const CORRECT_PIN = '0813';

export default function PinScreen({ onSuccess, wallpaperSrc, audio = {} }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [imgError, setImgError] = useState(false);
  const inputRefs = useRef([]);

  const { playKeyPress = () => {}, playError = () => {}, playSuccess = () => {} } = audio;

  // Auto focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const evaluatePin = useCallback(
    (enteredPin) => {
      if (enteredPin === CORRECT_PIN) {
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
    [onSuccess, playError, playSuccess]
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
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={pin[index]}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={styles.pinInput}
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
