import { CustomerPhotoItem, PrintSheetSettings } from './types.js';

const DB_NAME = 'ecyber_passport_db';
const DB_VERSION = 1;
const STORE_NAME = 'project_state';
const CURRENT_PROJECT_KEY = 'active_project';

export interface SavedProjectState {
  version: number;
  updatedAt: number;
  activeItemId: string | null;
  items: CustomerPhotoItem[];
  sheetSettings: PrintSheetSettings;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves current project snapshot to IndexedDB.
 */
export async function saveProjectToStorage(
  items: CustomerPhotoItem[],
  activeItemId: string | null,
  sheetSettings: PrintSheetSettings
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Filter out huge raw Blob references from persistence to avoid exceeding storage quota,
    // relying on persistent data URLs or strings
    const serializedItems: CustomerPhotoItem[] = items.map(it => ({
      ...it,
      originalImageBlob: undefined,
      transparentForegroundBlob: undefined
    }));

    const state: SavedProjectState = {
      version: 1,
      updatedAt: Date.now(),
      activeItemId,
      items: serializedItems,
      sheetSettings
    };

    store.put(state, CURRENT_PROJECT_KEY);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[PassportPhoto] Could not autosave to IndexedDB:', err);
  }
}

/**
 * Loads saved project snapshot from IndexedDB.
 */
export async function loadSavedProjectFromStorage(): Promise<SavedProjectState | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(CURRENT_PROJECT_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const state = request.result as SavedProjectState | undefined;
        resolve(state || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[PassportPhoto] Could not load from IndexedDB:', err);
    return null;
  }
}

/**
 * Clears the saved project snapshot from IndexedDB.
 */
export async function clearSavedProject(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(CURRENT_PROJECT_KEY);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[PassportPhoto] Could not clear IndexedDB project:', err);
  }
}
