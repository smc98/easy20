import { CACHE_TTL_MS } from './bestiary-config.js';

const DB_NAME = 'easy20-bestiary';
const DB_VERSION = 1;

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('sourceMeta')) {
                db.createObjectStore('sourceMeta', { keyPath: 'sourceKey' });
            }
            if (!db.objectStoreNames.contains('sourceData')) {
                db.createObjectStore('sourceData', { keyPath: 'sourceKey' });
            }
            if (!db.objectStoreNames.contains('searchIndex')) {
                const store = db.createObjectStore('searchIndex', { keyPath: 'id' });
                store.createIndex('sourceKey', 'sourceKey', { unique: false });
                store.createIndex('nameLower', 'nameLower', { unique: false });
            }
            if (!db.objectStoreNames.contains('auxData')) {
                db.createObjectStore('auxData', { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function tx(storeName, mode) {
    return openDb().then(db => {
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    });
}

function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getSourceMeta(sourceKey) {
    const store = await tx('sourceMeta', 'readonly');
    return promisifyRequest(store.get(sourceKey));
}

export async function setSourceMeta(meta) {
    const store = await tx('sourceMeta', 'readwrite');
    return promisifyRequest(store.put(meta));
}

export async function getSourceData(sourceKey) {
    const store = await tx('sourceData', 'readonly');
    const row = await promisifyRequest(store.get(sourceKey));
    return row?.payload ?? null;
}

export async function setSourceData(sourceKey, payload) {
    const store = await tx('sourceData', 'readwrite');
    return promisifyRequest(store.put({ sourceKey, payload }));
}

export async function deleteSourceData(sourceKey) {
    const db = await openDb();
    const transaction = db.transaction(['sourceMeta', 'sourceData', 'searchIndex'], 'readwrite');

    transaction.objectStore('sourceMeta').delete(sourceKey);
    transaction.objectStore('sourceData').delete(sourceKey);

    const indexStore = transaction.objectStore('searchIndex');
    const index = indexStore.index('sourceKey');
    const range = IDBKeyRange.only(sourceKey);

    await new Promise((resolve, reject) => {
        const cursorReq = index.openCursor(range);
        cursorReq.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            } else {
                resolve();
            }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
    });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function putSearchEntries(entries) {
    const store = await tx('searchIndex', 'readwrite');
    for (const entry of entries) {
        await promisifyRequest(store.put(entry));
    }
}

export async function getSearchEntriesForSources(sourceKeys) {
    const store = await tx('searchIndex', 'readonly');
    const index = store.index('sourceKey');
    const results = [];

    for (const sourceKey of sourceKeys) {
        const entries = await new Promise((resolve, reject) => {
            const collected = [];
            const cursorReq = index.openCursor(IDBKeyRange.only(sourceKey));
            cursorReq.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    collected.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(collected);
                }
            };
            cursorReq.onerror = () => reject(cursorReq.error);
        });
        results.push(...entries);
    }

    return results;
}

export async function getAuxData(key) {
    const store = await tx('auxData', 'readonly');
    const row = await promisifyRequest(store.get(key));
    return row ?? null;
}

export async function setAuxData(key, payload, fetchedAt = Date.now()) {
    const store = await tx('auxData', 'readwrite');
    return promisifyRequest(store.put({ key, payload, fetchedAt }));
}

export function isCacheFresh(fetchedAt, ttlMs = CACHE_TTL_MS) {
    return fetchedAt && (Date.now() - fetchedAt) < ttlMs;
}

export async function clearAllCache() {
    const db = await openDb();
    const names = ['sourceMeta', 'sourceData', 'searchIndex', 'auxData'];
    const transaction = db.transaction(names, 'readwrite');

    for (const name of names) {
        transaction.objectStore(name).clear();
    }

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}
