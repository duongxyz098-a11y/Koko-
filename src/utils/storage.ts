import { get, set, del, keys, createStore } from 'idb-keyval';

// Create a custom store to avoid version conflicts with the default 'keyval-store'
const customStore = createStore('banhnho-db', 'banhnho-store');

export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      // Quota exceeded. Try to clear old chat messages and old kikoko/banhnho stories to make space.
      Object.keys(localStorage).forEach(k => {
        if (
          k.startsWith('koko_npc_msgs_') || 
          k.startsWith('kikoko_story_') ||
          k.startsWith('banhnho_posts_') ||
          k.startsWith('banhnho_promote_') ||
          k.startsWith('banhnho_approved_') ||
          k.startsWith('banhnho_npc_posts_') ||
          k === 'banhnho_groups' ||
          k === 'banhnho_form_data' ||
          k === 'banhnho_new_post_content' ||
          k === 'banhnho_promote_content' ||
          k === 'kikoko_story_ids'
        ) {
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

export const setLargeData = async (key: string, value: any): Promise<void> => {
  try {
    await set(key, value, customStore);
  } catch (e) {
    console.error('Failed to save large data to IndexedDB:', e);
  }
};

export const getLargeData = async (key: string): Promise<any> => {
  try {
    return await get(key, customStore);
  } catch (e) {
    console.error('Failed to get large data from IndexedDB:', e);
    return null;
  }
};

export const removeLargeData = async (key: string): Promise<void> => {
  try {
    await del(key, customStore);
  } catch (e) {
    console.error('Failed to remove large data from IndexedDB:', e);
  }
};

export const getAllLargeDataKeys = async (): Promise<IDBValidKey[]> => {
  try {
    return await keys(customStore);
  } catch (e) {
    console.error('Failed to get keys from IndexedDB:', e);
    return [];
  }
};
