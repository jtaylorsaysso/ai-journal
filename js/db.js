/**
 * Database Module - IndexedDB wrapper for encrypted entry storage
 */

import {
    encryptEntry,
    decryptEntry,
    generateKey,
    exportKey,
    importKey,
    bufferToBase64,
    base64ToBuffer,
    uint8ArrayToBase64,
    base64ToUint8Array
} from './crypto.js';

const DB_NAME = 'ai-journal';
const DB_VERSION = 1;

// Store names
const STORES = {
    ENTRIES: 'entries',
    KEYS: 'keys',
    SETTINGS: 'settings'
};

let db = null;
let cryptoKey = null;

/**
 * Initialize the database and encryption key
 * @returns {Promise<void>}
 */
export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            const error = request.error;
            console.error('Failed to open database:', error);

            if (error.name === 'QuotaExceededError') {
                reject(new Error('Storage quota exceeded. Please free up space.'));
            } else if (error.name === 'VersionError') {
                reject(new Error('Database version conflict. Please refresh the page.'));
            } else {
                reject(new Error(`Failed to open database: ${error.message}`));
            }
        };

        request.onsuccess = async () => {
            db = request.result;

            // Handle database errors
            db.onerror = (event) => {
                console.error('Database error:', event.target.error);
            };

            try {
                await initializeEncryptionKey();
                resolve();
            } catch (error) {
                reject(error);
            }
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Entries store - stores encrypted journal entries
            if (!database.objectStoreNames.contains(STORES.ENTRIES)) {
                const entriesStore = database.createObjectStore(STORES.ENTRIES, { keyPath: 'id' });
                entriesStore.createIndex('createdAt', 'createdAt', { unique: false });
                entriesStore.createIndex('mood', 'mood', { unique: false });
            }

            // Keys store - stores encryption key
            if (!database.objectStoreNames.contains(STORES.KEYS)) {
                database.createObjectStore(STORES.KEYS, { keyPath: 'id' });
            }

            // Settings store - stores user preferences
            if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
                database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Initialize or load the encryption key
 */
async function initializeEncryptionKey() {
    const transaction = db.transaction(STORES.KEYS, 'readonly');
    const store = transaction.objectStore(STORES.KEYS);
    const request = store.get('master-key');

    return new Promise(async (resolve, reject) => {
        request.onsuccess = async () => {
            if (request.result) {
                // Load existing key
                const keyData = base64ToBuffer(request.result.keyData);
                cryptoKey = await importKey(keyData);
            } else {
                // Generate new key
                cryptoKey = await generateKey();
                const keyData = await exportKey(cryptoKey);

                // Store the key
                const writeTransaction = db.transaction(STORES.KEYS, 'readwrite');
                const writeStore = writeTransaction.objectStore(STORES.KEYS);
                writeStore.put({
                    id: 'master-key',
                    keyData: bufferToBase64(keyData),
                    createdAt: new Date().toISOString()
                });
            }
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Generate a UUID for entry IDs
 * @returns {string}
 */
function generateId() {
    return crypto.randomUUID();
}

/**
 * Save a new journal entry
 * @param {Object} entry - Entry data
 * @param {string} entry.content - Plaintext content
 * @param {number} entry.mood - Mood value (1-5)
 * @returns {Promise<Object>} - Saved entry (with encrypted content)
 */
export async function saveEntry({ content, mood = null }) {
    const id = generateId();
    const now = new Date().toISOString();

    try {
        // Encrypt the content
        const { ciphertext, iv } = await encryptEntry(content, cryptoKey);

        const entry = {
            id,
            encryptedContent: bufferToBase64(ciphertext),
            iv: uint8ArrayToBase64(iv),
            mood,
            wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
            createdAt: now,
            updatedAt: now
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.ENTRIES, 'readwrite');
            const store = transaction.objectStore(STORES.ENTRIES);
            const request = store.put(entry);

            request.onsuccess = () => resolve(entry);
            request.onerror = () => {
                const error = request.error;
                if (error.name === 'QuotaExceededError') {
                    reject(new Error('Storage quota exceeded. Please delete some entries or export your data.'));
                } else {
                    reject(new Error(`Failed to save entry: ${error.message}`));
                }
            };
        });
    } catch (error) {
        if (error.name === 'OperationError') {
            throw new Error('Encryption failed. Your browser may not support the required crypto features.');
        }
        throw error;
    }
}

/**
 * Get a single entry by ID (decrypted)
 * @param {string} id 
 * @returns {Promise<Object|null>}
 */
export async function getEntry(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readonly');
        const store = transaction.objectStore(STORES.ENTRIES);
        const request = store.get(id);

        request.onsuccess = async () => {
            if (!request.result) {
                resolve(null);
                return;
            }

            const entry = request.result;

            try {
                const ciphertext = base64ToBuffer(entry.encryptedContent);
                const iv = base64ToUint8Array(entry.iv);
                const content = await decryptEntry(ciphertext, iv, cryptoKey);
                resolve({ ...entry, content });
            } catch (error) {
                console.error('Decryption error:', error);
                reject(new Error('Failed to decrypt entry. The data may be corrupted.'));
            }
        };
        request.onerror = () => reject(new Error(`Failed to retrieve entry: ${request.error.message}`));
    });
}

/**
 * Get all entries (metadata only, not decrypted)
 * @returns {Promise<Array>}
 */
export async function getAllEntries() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readonly');
        const store = transaction.objectStore(STORES.ENTRIES);
        const index = store.index('createdAt');
        const request = index.openCursor(null, 'prev'); // Newest first

        const entries = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // Return metadata only (content stays encrypted)
                const { id, mood, wordCount, createdAt, updatedAt } = cursor.value;
                entries.push({ id, mood, wordCount, createdAt, updatedAt });
                cursor.continue();
            } else {
                resolve(entries);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get entries with decrypted previews (first 100 chars)
 * @returns {Promise<Array>}
 */
export async function getEntriesWithPreviews() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readonly');
        const store = transaction.objectStore(STORES.ENTRIES);
        const index = store.index('createdAt');
        const request = index.openCursor(null, 'prev'); // Newest first

        const entries = [];
        const decryptPromises = [];

        request.onsuccess = async (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const entry = cursor.value;

                // Decrypt for preview
                const decryptPromise = (async () => {
                    try {
                        const ciphertext = base64ToBuffer(entry.encryptedContent);
                        const iv = base64ToUint8Array(entry.iv);
                        const content = await decryptEntry(ciphertext, iv, cryptoKey);
                        const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');

                        return {
                            id: entry.id,
                            mood: entry.mood,
                            wordCount: entry.wordCount,
                            createdAt: entry.createdAt,
                            updatedAt: entry.updatedAt,
                            preview
                        };
                    } catch {
                        return null;
                    }
                })();

                decryptPromises.push(decryptPromise);
                cursor.continue();
            } else {
                const results = await Promise.all(decryptPromises);
                resolve(results.filter(r => r !== null));
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update an existing entry
 * @param {string} id 
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateEntry(id, { content, mood }) {
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readwrite');
        const store = transaction.objectStore(STORES.ENTRIES);
        const request = store.get(id);

        request.onsuccess = async () => {
            if (!request.result) {
                reject(new Error('Entry not found'));
                return;
            }

            const entry = request.result;

            // Update encrypted content if provided
            if (content !== undefined) {
                const { ciphertext, iv } = await encryptEntry(content, cryptoKey);
                entry.encryptedContent = bufferToBase64(ciphertext);
                entry.iv = uint8ArrayToBase64(iv);
                entry.wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
            }

            // Update mood if provided
            if (mood !== undefined) {
                entry.mood = mood;
            }

            entry.updatedAt = new Date().toISOString();

            const updateRequest = store.put(entry);
            updateRequest.onsuccess = () => resolve(entry);
            updateRequest.onerror = () => reject(updateRequest.error);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete an entry
 * @param {string} id 
 * @returns {Promise<void>}
 */
export async function deleteEntry(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readwrite');
        const store = transaction.objectStore(STORES.ENTRIES);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete all entries (for data reset)
 * @returns {Promise<void>}
 */
export async function deleteAllEntries() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readwrite');
        const store = transaction.objectStore(STORES.ENTRIES);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Search entries by content (client-side decryption + search)
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchEntries(query) {
    const allEntries = await getEntriesWithPreviews();
    const lowerQuery = query.toLowerCase();

    // For full search, we need to decrypt all entries
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readonly');
        const store = transaction.objectStore(STORES.ENTRIES);
        const request = store.getAll();

        request.onsuccess = async () => {
            const results = [];

            for (const entry of request.result) {
                try {
                    const ciphertext = base64ToBuffer(entry.encryptedContent);
                    const iv = base64ToUint8Array(entry.iv);
                    const content = await decryptEntry(ciphertext, iv, cryptoKey);

                    if (content.toLowerCase().includes(lowerQuery)) {
                        const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
                        results.push({
                            id: entry.id,
                            mood: entry.mood,
                            wordCount: entry.wordCount,
                            createdAt: entry.createdAt,
                            updatedAt: entry.updatedAt,
                            preview
                        });
                    }
                } catch {
                    // Skip entries that can't be decrypted
                }
            }

            // Sort by date (newest first)
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get or set a setting
 * @param {string} key 
 * @param {*} value - If provided, sets the value
 * @returns {Promise<*>}
 */
export async function setting(key, value = undefined) {
    if (value !== undefined) {
        // Set value
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.put({ key, value });

            request.onsuccess = () => resolve(value);
            request.onerror = () => reject(request.error);
        });
    } else {
        // Get value
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.SETTINGS, 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }
}

/**
 * Export all entries (decrypted) for backup
 * @returns {Promise<Array>}
 */
export async function exportAllEntries() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ENTRIES, 'readonly');
        const store = transaction.objectStore(STORES.ENTRIES);
        const request = store.getAll();

        request.onsuccess = async () => {
            const entries = [];

            for (const entry of request.result) {
                try {
                    const ciphertext = base64ToBuffer(entry.encryptedContent);
                    const iv = base64ToUint8Array(entry.iv);
                    const content = await decryptEntry(ciphertext, iv, cryptoKey);

                    entries.push({
                        id: entry.id,
                        content,
                        mood: entry.mood,
                        wordCount: entry.wordCount,
                        createdAt: entry.createdAt,
                        updatedAt: entry.updatedAt
                    });
                } catch {
                    // Skip entries that can't be decrypted
                }
            }

            // Sort by date (oldest first for export)
            entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            resolve(entries);
        };
        request.onerror = () => reject(request.error);
    });
}
