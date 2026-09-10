// Notification & Toast System for Billighost OS

const STORAGE_KEY = 'billighost_notifications';

export const NotificationService = {
  getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  send({ title, message, icon = '🔔', type = 'info' }) {
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      message,
      icon,
      type, // 'info' | 'success' | 'warning' | 'error'
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const current = this.getAll();
    const updated = [newNotification, ...current.slice(0, 24)]; // keep last 25

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Dispatch global toast event
    window.dispatchEvent(
      new CustomEvent('billighost:notification-toast', { detail: newNotification })
    );
    window.dispatchEvent(
      new CustomEvent('billighost:notifications-update', { detail: updated })
    );

    return newNotification;
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('billighost:notifications-update', { detail: [] })
    );
  },

  remove(id) {
    const current = this.getAll();
    const updated = current.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent('billighost:notifications-update', { detail: updated })
    );
  },
};
