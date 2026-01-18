/**
 * Tests for crypto module
 */
import { describe, it, expect } from 'vitest';
import {
    generateKey,
    exportKey,
    importKey,
    encryptEntry,
    decryptEntry,
    bufferToBase64,
    base64ToBuffer,
    uint8ArrayToBase64,
    base64ToUint8Array
} from '../crypto.js';


describe('Crypto Module', () => {
    describe('Key Generation', () => {
        it('should generate a valid AES-GCM key', async () => {
            const key = await generateKey();

            expect(key).toBeDefined();
            expect(key.type).toBe('secret');
            expect(key.algorithm.name).toBe('AES-GCM');
            expect(key.algorithm.length).toBe(256);
        });

        it('should export and import key correctly', async () => {
            const originalKey = await generateKey();
            const exported = await exportKey(originalKey);
            const imported = await importKey(exported);

            expect(imported.type).toBe('secret');
            expect(imported.algorithm.name).toBe('AES-GCM');
        });
    });

    describe('Encryption/Decryption', () => {
        it('should encrypt and decrypt text correctly', async () => {
            const key = await generateKey();
            const plaintext = 'This is a test journal entry';

            const { ciphertext, iv } = await encryptEntry(plaintext, key);
            const decrypted = await decryptEntry(ciphertext, iv, key);

            expect(decrypted).toBe(plaintext);
        });

        it('should produce different ciphertext for same plaintext', async () => {
            const key = await generateKey();
            const plaintext = 'Same text';

            const result1 = await encryptEntry(plaintext, key);
            const result2 = await encryptEntry(plaintext, key);

            // Different IVs should produce different ciphertext
            expect(result1.iv).not.toEqual(result2.iv);
        });

        it('should handle unicode characters', async () => {
            const key = await generateKey();
            const plaintext = 'Hello 世界 🌙';

            const { ciphertext, iv } = await encryptEntry(plaintext, key);
            const decrypted = await decryptEntry(ciphertext, iv, key);

            expect(decrypted).toBe(plaintext);
        });
    });

    describe('Base64 Conversion', () => {
        it('should convert ArrayBuffer to base64 and back', () => {
            const original = new Uint8Array([1, 2, 3, 4, 5]);
            const base64 = bufferToBase64(original.buffer);
            const restored = base64ToBuffer(base64);

            expect(new Uint8Array(restored)).toEqual(original);
        });

        it('should convert Uint8Array to base64 and back', () => {
            const original = new Uint8Array([10, 20, 30, 40, 50]);
            const base64 = uint8ArrayToBase64(original);
            const restored = base64ToUint8Array(base64);

            expect(restored).toEqual(original);
        });
    });
});
