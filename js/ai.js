/**
 * AI Features - Prompt Generation and Entry Analysis
 */

import { API_BASE, fetchWithRetry } from './api.js';
import { showError, showSuccess, showInfo } from './utils/notifications.js';

/**
 * Generate an AI journaling prompt
 * @param {Object} options - Prompt generation options
 * @param {number} options.mood - Current mood (1-5)
 * @param {string} options.currentText - Current entry text
 * @param {Array<string>} options.recentEntries - Recent entry themes
 * @returns {Promise<{success: boolean, prompt?: string, error?: string}>}
 */
export async function generatePrompt({ mood, currentText = '', recentEntries = [] }) {
    try {
        const response = await fetchWithRetry(`${API_BASE}/ai/prompt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                mood,
                current_text: currentText,
                recent_entries: recentEntries.slice(0, 3)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to generate prompt'
            };
        }

        return {
            success: true,
            prompt: data.prompt
        };
    } catch (error) {
        console.error('AI prompt error:', error);
        return {
            success: false,
            error: 'Unable to connect to AI service. Please check your connection.'
        };
    }
}

/**
 * Analyze a journal entry
 * @param {Object} options - Analysis options
 * @param {string} options.content - Entry content
 * @param {number} options.mood - Entry mood (1-5)
 * @returns {Promise<{success: boolean, analysis?: Object, error?: string}>}
 */
export async function analyzeEntry({ content, mood }) {
    try {
        const response = await fetchWithRetry(`${API_BASE}/ai/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                content,
                mood
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to analyze entry'
            };
        }

        return {
            success: true,
            analysis: data.analysis
        };
    } catch (error) {
        console.error('AI analysis error:', error);
        return {
            success: false,
            error: 'Unable to connect to AI service. Please check your connection.'
        };
    }
}

/**
 * Analyze patterns across multiple entries
 * @param {Array<Object>} entries - Array of entries with content, mood, date
 * @returns {Promise<{success: boolean, patterns?: Object, error?: string}>}
 */
export async function analyzePatterns(entries) {
    try {
        const response = await fetchWithRetry(`${API_BASE}/ai/patterns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                entries: entries.map(e => ({
                    content: e.content,
                    mood: e.mood,
                    date: e.createdAt
                }))
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Failed to analyze patterns'
            };
        }

        return {
            success: true,
            patterns: data.patterns
        };
    } catch (error) {
        console.error('AI patterns error:', error);
        return {
            success: false,
            error: 'Unable to connect to AI service. Please check your connection.'
        };
    }
}
