/**
 * Export Utilities - Export entries as JSON or plaintext
 */

import { exportAllEntries } from '../db.js';

const MOOD_LABELS = {
    1: '😢 Very Bad',
    2: '😕 Bad',
    3: '😐 Neutral',
    4: '🙂 Good',
    5: '😊 Very Good'
};

/**
 * Format a date for display
 * @param {string} isoDate 
 * @returns {string}
 */
function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Export all entries as JSON
 */
export async function exportAsJSON() {
    const entries = await exportAllEntries();

    const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        entryCount: entries.length,
        entries: entries
    };

    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, 'journal-export.json', 'application/json');
}

/**
 * Export all entries as plain text
 */
export async function exportAsText() {
    const entries = await exportAllEntries();

    let text = '═══════════════════════════════════════\n';
    text += '           AI JOURNAL EXPORT\n';
    text += `           ${new Date().toLocaleDateString()}\n`;
    text += '═══════════════════════════════════════\n\n';
    text += `Total Entries: ${entries.length}\n\n`;

    for (const entry of entries) {
        text += '───────────────────────────────────────\n';
        text += `Date: ${formatDate(entry.createdAt)}\n`;
        if (entry.mood) {
            text += `Mood: ${MOOD_LABELS[entry.mood] || entry.mood}\n`;
        }
        text += `Words: ${entry.wordCount}\n`;
        text += '───────────────────────────────────────\n\n';
        text += entry.content;
        text += '\n\n';
    }

    text += '═══════════════════════════════════════\n';
    text += '              END OF EXPORT\n';
    text += '═══════════════════════════════════════\n';

    downloadFile(text, 'journal-export.txt', 'text/plain');
}

/**
 * Trigger a file download
 * @param {string} content 
 * @param {string} filename 
 * @param {string} mimeType 
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
