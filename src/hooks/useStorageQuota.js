import { useState, useEffect, useCallback } from 'react';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function useStorageQuota() {
  const [storage, setStorage] = useState({
    usage: 0,
    quota: 0,
    usageFormatted: 'Calculating...',
    quotaFormatted: 'Calculating...',
    percentUsed: 0,
    supported: false,
    loading: true,
  });

  const checkStorage = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;
        const percentUsed = Math.min(100, Math.round((usage / quota) * 100));

        setStorage({
          usage,
          quota,
          usageFormatted: formatBytes(usage),
          quotaFormatted: formatBytes(quota),
          percentUsed,
          supported: true,
          loading: false,
        });
      } catch {
        setStorage(prev => ({ ...prev, loading: false }));
      }
    } else {
      setStorage({
        usage: 1024 * 1024 * 12,
        quota: 1024 * 1024 * 1024 * 5,
        usageFormatted: '12 MB',
        quotaFormatted: '5 GB',
        percentUsed: 1,
        supported: false,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    checkStorage();
  }, [checkStorage]);

  return { ...storage, refresh: checkStorage };
}
