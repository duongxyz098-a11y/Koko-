export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      // Quota exceeded. Try to clear old chat messages to make space.
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('koko_npc_msgs_')) {
          localStorage.removeItem(k);
        }
      });
      // Try again
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e2) {
        console.error('Failed to save to localStorage even after clearing old data:', e2);
        return false;
      }
    } else {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }
};
