/**
 * Crypto Module - Client-side encryption using Web Crypto API
 * Uses AES-256-GCM for authenticated encryption
 */

const CRYPTO_CONFIG = {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12,  // 96 bits recommended for GCM
    keyStoreName: 'encryption-key'
};

/**
 * Generate a new AES-256 encryption key
 * @returns {Promise<CryptoKey>}
 */
export async function generateKey() {
    return await crypto.subtle.generateKey(
        {
            name: CRYPTO_CONFIG.algorithm,
            length: CRYPTO_CONFIG.keyLength
        },
        true,  // extractable (needed for storage)
        ['encrypt', 'decrypt']
    );
}

/**
 * Export key to raw bytes for storage
 * @param {CryptoKey} key 
 * @returns {Promise<ArrayBuffer>}
 */
export async function exportKey(key) {
    return await crypto.subtle.exportKey('raw', key);
}

/**
 * Import key from raw bytes
 * @param {ArrayBuffer} keyData 
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(keyData) {
    return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: CRYPTO_CONFIG.algorithm },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt plaintext using AES-GCM
 * @param {string} plaintext - Text to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{ciphertext: ArrayBuffer, iv: Uint8Array}>}
 */
export async function encryptEntry(plaintext, key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.ivLength));
    
    const ciphertext = await crypto.subtle.encrypt(
        { name: CRYPTO_CONFIG.algorithm, iv },
        key,
        data
    );
    
    return { ciphertext, iv };
}

/**
 * Decrypt ciphertext using AES-GCM
 * @param {ArrayBuffer} ciphertext - Encrypted data
 * @param {Uint8Array} iv - Initialization vector
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>}
 */
export async function decryptEntry(ciphertext, iv, key) {
    const decrypted = await crypto.subtle.decrypt(
        { name: CRYPTO_CONFIG.algorithm, iv },
        key,
        ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Convert ArrayBuffer to Base64 string for storage
 * @param {ArrayBuffer} buffer 
 * @returns {string}
 */
export function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string back to ArrayBuffer
 * @param {string} base64 
 * @returns {ArrayBuffer}
 */
export function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Convert Uint8Array to Base64 string
 * @param {Uint8Array} array 
 * @returns {string}
 */
export function uint8ArrayToBase64(array) {
    let binary = '';
    for (let i = 0; i < array.length; i++) {
        binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 * @param {string} base64 
 * @returns {Uint8Array}
 */
export function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
