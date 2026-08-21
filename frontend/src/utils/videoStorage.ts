/**
 * IndexedDB Video Storage Utility
 * Stores binary video Blobs (WebM/MP4) locally in the browser
 * so that candidate interview webcam recordings can be replayed instantly
 * in the Admin portal with 0ms network latency and zero server disk limits.
 */

const DB_NAME = 'VOXIS_VIDEO_DB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this environment'));
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

export async function saveRecordedVideo(key: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const cleanKey = key.trim().toLowerCase();
      store.put(blob, cleanKey);
      store.put(blob, 'latest_interview_recording');

      tx.oncomplete = () => {
        console.log(`[VideoStorage] Saved ${(blob.size / (1024 * 1024)).toFixed(2)} MB video recording for key: ${cleanKey}`);
        resolve(true);
      };
      tx.onerror = () => {
        console.warn('[VideoStorage] Error saving video blob:', tx.error);
        resolve(false);
      };
    });
  } catch (e) {
    console.warn('[VideoStorage] IndexedDB save failed:', e);
    return false;
  }
}

export async function getRecordedVideo(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const cleanKey = key.trim().toLowerCase();
      const req = store.get(cleanKey);

      req.onsuccess = () => {
        if (req.result && req.result instanceof Blob) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getRecordedVideoUrl(keys: string[]): Promise<string | null> {
  for (const k of keys) {
    if (!k) continue;
    try {
      const blob = await getRecordedVideo(k);
      if (blob && blob.size > 1000) {
        return URL.createObjectURL(blob);
      }
    } catch {}
  }

  try {
    const latestBlob = await getRecordedVideo('latest_interview_recording');
    if (latestBlob && latestBlob.size > 1000) {
      return URL.createObjectURL(latestBlob);
    }
  } catch {}

  return null;
}
