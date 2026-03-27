import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'banhnho_db';
const STORE_NAME = 'bot_cards';
const BG_STORE_NAME = 'backgrounds';
const STORY_STORE_NAME = 'stories';
const CHAT_STORE_NAME = 'chat_history';
const VERSION = 4;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, VERSION, {
    upgrade(db, oldVersion, newVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(BG_STORE_NAME)) {
        db.createObjectStore(BG_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORY_STORE_NAME)) {
        db.createObjectStore(STORY_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(CHAT_STORE_NAME)) {
        db.createObjectStore(CHAT_STORE_NAME);
      }
    },
  });
}

export async function saveChat(botId: string, messages: any[]) {
  const db = await getDB();
  await db.put(CHAT_STORE_NAME, messages, botId);
}

export async function loadChat(botId: string): Promise<any[]> {
  const db = await getDB();
  return (await db.get(CHAT_STORE_NAME, botId)) || [];
}

export async function saveChatSettings(botId: string, settings: any) {
  const db = await getDB();
  await db.put(CHAT_STORE_NAME, settings, `settings_${botId}`);
}

export async function loadChatSettings(botId: string): Promise<any> {
  const db = await getDB();
  return await db.get(CHAT_STORE_NAME, `settings_${botId}`);
}

export async function saveCards(cards: any[]) {
  const db = await getDB();
  await db.put(STORE_NAME, cards, 'saved_cards');
}

export async function loadCards(): Promise<any[]> {
  const db = await getDB();
  return (await db.get(STORE_NAME, 'saved_cards')) || [];
}

export async function saveDraft(key: string, value: any) {
  const db = await getDB();
  await db.put(STORE_NAME, value, `draft_${key}`);
}

export async function loadDraft(key: string): Promise<any> {
  const db = await getDB();
  return await db.get(STORE_NAME, `draft_${key}`);
}

export async function clearDrafts() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const keys = await store.getAllKeys();
  for (const key of keys) {
    if (typeof key === 'string' && key.startsWith('draft_')) {
      await store.delete(key);
    }
  }
  await tx.done;
}

export async function saveBackground(tabId: string, base64: string) {
  const db = await getDB();
  await db.put(BG_STORE_NAME, base64, tabId);
}

export async function loadBackgrounds(): Promise<Record<string, string>> {
  const db = await getDB();
  const tx = db.transaction(BG_STORE_NAME, 'readonly');
  const store = tx.objectStore(BG_STORE_NAME);
  const keys = await store.getAllKeys();
  const values = await store.getAll();
  
  const result: Record<string, string> = {};
  keys.forEach((key, i) => {
    result[key as string] = values[i];
  });
  return result;
}

export async function getAllStories(): Promise<any[]> {
  const db = await getDB();
  return await db.getAll(STORY_STORE_NAME);
}

export async function saveStory(story: any) {
  const db = await getDB();
  await db.put(STORY_STORE_NAME, story, story.id);
}

export async function deleteStory(id: string) {
  const db = await getDB();
  await db.delete(STORY_STORE_NAME, id);
}
