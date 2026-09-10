// Browser Cache API helper for Billighost OS (offline media, wallpapers, assets)

const CACHE_NAME = 'billighost-media-v1';

export const CacheStorageService = {
  async putAsset(key, dataBlob) {
    if (typeof caches === 'undefined') return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(dataBlob);
      await cache.put(new Request(`/os-cache/${key}`), response);
      return true;
    } catch {
      return false;
    }
  },

  async getAsset(key) {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(new Request(`/os-cache/${key}`));
      if (!response) return null;
      return await response.blob();
    } catch {
      return null;
    }
  },

  async clearCache() {
    if (typeof caches === 'undefined') return false;
    try {
      return await caches.delete(CACHE_NAME);
    } catch {
      return false;
    }
  }
};
