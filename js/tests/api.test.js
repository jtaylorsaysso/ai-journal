/**
 * Tests for API error handling and retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();
global.navigator = { onLine: true };

describe('API Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.navigator.onLine = true;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Retry Mechanism', () => {
        it('should retry failed requests with exponential backoff', async () => {
            // Mock fetch to fail twice then succeed
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ success: true })
                });
            });

            // Import after mocking
            const { login } = await import('../api.js');

            const result = await login('testuser', '1234');

            expect(callCount).toBe(3);
            expect(result.success).toBe(true);
        });

        it('should not retry non-retryable errors', async () => {
            // Mock fetch to return 400 (non-retryable)
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Bad request' })
            });

            const { login } = await import('../api.js');

            const result = await login('testuser', '1234');

            // Should only call once (no retries for 400)
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(result.success).toBe(false);
        });

        it('should retry 500 errors', async () => {
            // Mock fetch to return 500 twice then 200
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.resolve({
                        ok: false,
                        status: 500,
                        json: () => Promise.resolve({ error: 'Server error' })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ success: true, user: { username: 'testuser' } })
                });
            });

            const { login } = await import('../api.js');

            const result = await login('testuser', '1234');

            expect(callCount).toBe(3);
            expect(result.success).toBe(true);
        });
    });

    describe('Error Messages', () => {
        it('should return offline message when navigator.onLine is false', async () => {
            global.navigator.onLine = false;
            global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            const { login } = await import('../api.js');

            const result = await login('testuser', '1234');

            expect(result.success).toBe(false);
            expect(result.error).toContain('offline');
        });

        it('should return timeout message for AbortError', async () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';

            global.fetch = vi.fn().mockRejectedValue(abortError);

            const { login } = await import('../api.js');

            const result = await login('testuser', '1234');

            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
        });

        it('should return specific message for 401 errors', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ error: 'Unauthorized' })
            });

            const { login } = await import('../api.js');

            const result = await login('testuser', 'wrongpin');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('Timeout Handling', () => {
        it('should timeout long-running requests', async () => {
            // Mock a request that never resolves
            global.fetch = vi.fn().mockImplementation(() =>
                new Promise(() => { }) // Never resolves
            );

            const { checkAuthStatus } = await import('../api.js');

            // This should timeout after 10 seconds (mocked)
            const startTime = Date.now();
            await checkAuthStatus();
            const endTime = Date.now();

            // In real scenario would timeout, but in test we just verify it doesn't hang
            expect(endTime - startTime).toBeLessThan(15000);
        }, 15000);
    });

    describe('Connection Check', () => {
        it('should return true when server is reachable', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ authenticated: false })
            });

            const { checkServerConnection } = await import('../api.js');

            const result = await checkServerConnection();

            expect(result).toBe(true);
        });

        it('should return false when server is unreachable', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const { checkServerConnection } = await import('../api.js');

            const result = await checkServerConnection();

            expect(result).toBe(false);
        });
    });
});
