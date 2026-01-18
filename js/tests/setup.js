/**
 * Test setup - runs before all tests
 */
import 'fake-indexeddb/auto';

// Mock window.crypto for tests
if (!globalThis.crypto) {
    const { webcrypto } = await import('crypto');
    globalThis.crypto = webcrypto;
}
