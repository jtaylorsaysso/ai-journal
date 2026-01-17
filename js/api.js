/**
 * API Client for Authentication
 */

// Auto-detect API base URL based on environment
const API_BASE = window.location.origin.includes('localhost')
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;

/**
 * Register a new user
 * @param {string} username - Username (3-20 alphanumeric chars)
 * @param {string} pin - PIN (4-6 digits)
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function register(username, pin) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
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
        return { success: false, error: 'Network error. Please try again.' };
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
        const response = await fetch(`${API_BASE}/auth/login`, {
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
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Logout current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function logout() {
    try {
        const response = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            return { success: false, error: 'Logout failed' };
        }

        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Check authentication status
 * @returns {Promise<{authenticated: boolean, user?: object}>}
 */
export async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/status`, {
            credentials: 'include'
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Auth status check error:', error);
        return { authenticated: false };
    }
}
