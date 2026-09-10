import { useState, useEffect } from 'react';

function getNetworkInfo() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const conn = typeof navigator !== 'undefined'
    ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection)
    : null;

  return {
    isOnline,
    effectiveType: conn?.effectiveType || (isOnline ? '4g' : 'offline'),
    downlink: conn?.downlink ?? (isOnline ? 10 : 0), // Mb/s
    rtt: conn?.rtt ?? (isOnline ? 40 : 0), // ms
    saveData: conn?.saveData ?? false,
    type: conn?.type || (isOnline ? 'wifi' : 'none'),
    statusLabel: isOnline ? (conn?.effectiveType ? conn.effectiveType.toUpperCase() : 'Online') : 'Offline',
  };
}

export function useNetwork() {
  const [network, setNetwork] = useState(getNetworkInfo);

  useEffect(() => {
    const update = () => {
      setNetwork(getNetworkInfo());
    };

    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const conn = typeof navigator !== 'undefined'
      ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection)
      : null;

    if (conn && conn.addEventListener) {
      conn.addEventListener('change', update);
    }

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', update);
      }
    };
  }, []);

  return network;
}
