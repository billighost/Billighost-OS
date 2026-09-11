import { useState, useCallback, useRef } from 'react';

/**
 * useOSModal — Hook for Billighost OS native modal dialogs.
 *
 * Returns { showAlert, showConfirm, showPrompt, modalProps }.
 * Render <OSModal {...modalProps} /> in the parent component.
 *
 * Each method returns a Promise:
 *   showAlert(message, title?) → void
 *   showConfirm(message, title?) → boolean
 *   showPrompt(message, defaultValue?, title?) → string | null
 */
export function useOSModal() {
  const [modal, setModal] = useState(null);
  const resolveRef = useRef(null);

  const close = useCallback((value) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setModal(null);
  }, []);

  const showAlert = useCallback((message, title = 'Alert') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ type: 'alert', title, message, defaultValue: '' });
    });
  }, []);

  const showConfirm = useCallback((message, title = 'Confirm') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ type: 'confirm', title, message, defaultValue: '' });
    });
  }, []);

  const showPrompt = useCallback((message, defaultValue = '', title = 'Input') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal({ type: 'prompt', title, message, defaultValue });
    });
  }, []);

  const modalProps = {
    isOpen: !!modal,
    type: modal?.type || 'alert',
    title: modal?.title || '',
    message: modal?.message || '',
    defaultValue: modal?.defaultValue || '',
    onClose: close,
  };

  return { showAlert, showConfirm, showPrompt, modalProps };
}
