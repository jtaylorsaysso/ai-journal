/**
 * API Client for Authentication
 * Enhanced with retry logic, timeout handling, and better error messages
 */

// Auto-detect API base URL based on environment
const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

// Configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000,  // 1 second
    maxDelay: 8000,      // 8 seconds
    timeout: 30000       // 30 seconds
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-indexed)
 * @returns {number} - Delay in milliseconds
 */
function getBackoffDelay(attempt) {
    const delay = RETRY_CONFIG.initialDelay * Math.pow(2, attempt);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @param {Response} response - Response object (if available)
 * @returns {boolean}
 */
function isRetryable(error, response = null) {
    // Network errors are retryable
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
        return true;
    }

    // Timeout errors are retryable
    if (error.name === 'AbortError') {
        return true;
    }

    // 5xx server errors are retryable
    if (response && response.status >= 500) {
        return true;
    }

    // 429 (Too Many Requests) is retryable
    if (response && response.status === 429) {
        return true;
    }

    return false;
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @param {Response} response - Response object (if available)
 * @returns {string}
 */
function getErrorMessage(error, response = null) {
    // Network errors
    if (!navigator.onLine) {
        return 'You appear to be offline. Please check your internet connection.';
    }

    if (error.name === 'AbortError') {
        return 'Request timed out. Please try again.';
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'Unable to connect to server. Please check your connection.';
    }

    // HTTP errors
    if (response) {
        switch (response.status) {
            case 400:
                return 'Invalid request. Please check your input.';
            case 401:
                return 'Authentication failed. Please check your credentials.';
            case 403:
                return 'Access denied.';
            case 404:
                return 'Server endpoint not found.';
            case 429:
                return 'Too many requests. Please wait a moment.';
            case 500:
                return 'Server error. Please try again later.';
            case 502:
            case 503:
                return 'Server is temporarily unavailable.';
            case 504:
                return 'Server timeout. Please try again.';
            default:
                if (response.status >= 500) {
                    return 'Server error. Please try again later.';
                }
        }
    }

    return 'Network error. Please try again.';
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = RETRY_CONFIG.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Fetch with retry logic and exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options = {}) {
    let lastError = null;
    let lastResponse = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options);

            // If successful or non-retryable error, return immediately
            if (response.ok || !isRetryable(null, response)) {
                return response;
            }

            // Store response for potential retry
            lastResponse = response;

            // If retryable, wait before next attempt
            if (attempt < RETRY_CONFIG.maxRetries - 1) {
                const delay = getBackoffDelay(attempt);
                console.log(`Request failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}), retrying in ${delay}ms...`);
                await sleep(delay);
            }
        } catch (error) {
            lastError = error;

            // If not retryable, throw immediately
            if (!isRetryable(error)) {
                throw error;
            }

            // If retryable and not last attempt, wait before retry
            if (attempt < RETRY_CONFIG.maxRetries - 1) {
                const delay = getBackoffDelay(attempt);
                console.log(`Request failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries}), retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    // All retries exhausted
    if (lastResponse) {
        return lastResponse;
    }

    throw lastError || new Error('Request failed after retries');
}

/**
 * Register a new user
 * @param {string} username - Username (3-20 alphanumeric chars)
 * @param {string} pin - PIN (4-6 digits)
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function register(username, pin) {
    try {
        const response = await fetchWithRetry(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, pin })
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Registration failed' };
        }

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Login with username and PIN
 * @param {string} username - Username
 * @param {string} pin - PIN
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function login(username, pin) {
    try {
        const response = await fetchWithRetry(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, pin })
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Login failed' };
        }

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Logout current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function logout() {
    try {
        const response = await fetchWithRetry(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false, error: 'Logout failed' };
        }

        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

/**
 * Check authentication status
 * @returns {Promise<{authenticated: boolean, user?: object}>}
 */
export async function checkAuthStatus() {
    try {
        // Don't retry auth status check - fail fast
        const response = await fetchWithTimeout(`${API_BASE}/auth/status`, {
            credentials: 'include'
        }, 10000); // 10 second timeout for initial load

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Auth status check error:', error);
        return { authenticated: false };
    }
}

/**
 * Check if server is reachable
 * @returns {Promise<boolean>}
 */
export async function checkServerConnection() {
    try {
        const response = await fetchWithTimeout(`${API_BASE}/auth/status`, {
            credentials: 'include'
        }, 5000);
        return response.ok || response.status < 500;
    } catch (error) {
        return false;
    }
}
