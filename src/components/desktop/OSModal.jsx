import { useState, useEffect, useRef } from 'react';
import { LockIcon, AlertTriangleIcon, PenIcon } from '../Icons';
import styles from './OSModal.module.css';

/**
 * OSModal — Billighost OS native modal dialog.
 *
 * Props:
 *   isOpen: boolean
 *   type: 'alert' | 'confirm' | 'prompt'
 *   title: string
 *   message: string
 *   defaultValue: string (for prompt mode)
 *   onClose: (value) => void
 */
export default function OSModal({ isOpen, type = 'alert', title, message, defaultValue = '', onClose }) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef(null);

  // Reset input when modal opens with a new defaultValue
  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
      setClosing(false);
    }
  }, [isOpen, defaultValue]);

  // Auto-focus input in prompt mode
  useEffect(() => {
    if (isOpen && type === 'prompt' && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type]);

  if (!isOpen && !closing) return null;

  const handleClose = (value) => {
    setClosing(true);
    setTimeout(() => {
      onClose(value);
      setClosing(false);
    }, 200);
  };

  const handleOk = () => {
    if (type === 'alert') handleClose(undefined);
    else if (type === 'confirm') handleClose(true);
    else if (type === 'prompt') handleClose(inputValue);
  };

  const handleCancel = () => {
    if (type === 'alert') handleClose(undefined);
    else if (type === 'confirm') handleClose(false);
    else if (type === 'prompt') handleClose(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleOk();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const ModalIcon = type === 'confirm' ? AlertTriangleIcon : type === 'prompt' ? PenIcon : LockIcon;

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={handleCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`${styles.panel} ${closing ? styles.panelClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <ModalIcon size={20} color="var(--accent-glow)" />
          </div>
          <h3 className={styles.title}>{title}</h3>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <p className={styles.message}>{message}</p>

          {type === 'prompt' && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.input}
              autoFocus
            />
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {type !== 'alert' && (
            <button className={styles.btnCancel} onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button className={styles.btnOk} onClick={handleOk} autoFocus={type === 'alert'}>
            {type === 'alert' ? 'OK' : type === 'confirm' ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
