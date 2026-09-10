import { useState, useEffect, useCallback } from 'react';
import styles from './NotificationToasts.module.css';

export default function NotificationToasts({ playClick = () => {} }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handleNewToast = (e) => {
      const toast = e.detail;
      setToasts(prev => [...prev, toast]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(toast.id);
      }, 4000);
    };

    window.addEventListener('billighost:notification-toast', handleNewToast);
    return () => window.removeEventListener('billighost:notification-toast', handleNewToast);
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastsContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toastCard} ${styles['toast_' + toast.type]}`}
          onClick={() => { playClick(); removeToast(toast.id); }}
        >
          <div className={styles.toastIcon}>{toast.icon || '🔔'}</div>
          <div className={styles.toastContent}>
            <div className={styles.toastTitle}>{toast.title}</div>
            <div className={styles.toastMessage}>{toast.message}</div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              removeToast(toast.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
