/**
 * AI Journal - Main Application Controller
 */

import {
    initDB,
    saveEntry,
    getEntry,
    getEntriesWithPreviews,
    updateEntry,
    deleteEntry,
    deleteAllEntries,
    searchEntries,
    setting
} from './db.js';
import { exportAsJSON, exportAsText } from './utils/export.js';

// ===== State =====
const state = {
    currentView: 'list',
    currentEntryId: null,
    selectedMood: null,
    entries: [],
    autosaveEnabled: false,
    autosaveTimer: null
};

// ===== Mood Mapping =====
const MOOD_EMOJI = {
    1: '😢',
    2: '😕',
    3: '😐',
    4: '🙂',
    5: '😊'
};

// ===== DOM Elements =====
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// ===== Initialization =====
async function init() {
    try {
        // Initialize database
        await initDB();

        // Load settings
        state.autosaveEnabled = await setting('autosave') || false;
        const theme = await setting('theme') || 'dark';
        applyTheme(theme);

        // Update settings UI
        $('#toggle-autosave').checked = state.autosaveEnabled;
        $('#toggle-theme').checked = theme === 'dark';

        // Set up event listeners
        setupEventListeners();

        // Load entries
        await loadEntries();

        // Check offline status
        updateOfflineStatus();

        // Register service worker
        registerServiceWorker();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to initialize the app. Please refresh the page.');
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Navigation
    $('#btn-new-entry').addEventListener('click', () => showEditor());
    $('#btn-settings').addEventListener('click', () => showView('settings'));
    $('#btn-settings-back').addEventListener('click', () => showView('list'));
    $('#btn-back').addEventListener('click', () => showView('list'));

    // Editor
    $('#btn-cancel').addEventListener('click', cancelEdit);
    $('#btn-save').addEventListener('click', saveCurrentEntry);
    $('#entry-textarea').addEventListener('input', handleTextInput);

    // Mood selector
    $$('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => selectMood(parseInt(btn.dataset.mood)));
    });
    $('.mood-dismiss').addEventListener('click', () => {
        state.selectedMood = null;
        $$('.mood-btn').forEach(b => b.classList.remove('selected'));
    });

    // Detail view
    $('#btn-edit').addEventListener('click', editCurrentEntry);
    $('#btn-delete').addEventListener('click', deleteCurrentEntry);

    // Settings
    $('#toggle-autosave').addEventListener('change', toggleAutosave);
    $('#toggle-theme').addEventListener('change', toggleTheme);
    $('#btn-export-json').addEventListener('click', exportAsJSON);
    $('#btn-export-text').addEventListener('click', exportAsText);
    $('#btn-delete-all').addEventListener('click', confirmDeleteAll);

    // Search
    $('#search-input').addEventListener('input', debounce(handleSearch, 300));

    // Offline detection
    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
}

// ===== View Management =====
function showView(viewName) {
    // Hide all views
    $$('.view').forEach(v => v.classList.add('hidden'));

    // Show requested view
    $(`#view-${viewName}`).classList.remove('hidden');
    state.currentView = viewName;

    // Handle view-specific logic
    if (viewName === 'list') {
        state.currentEntryId = null;
        loadEntries();
    }
}

function showEditor(entryId = null) {
    state.currentEntryId = entryId;
    state.selectedMood = null;

    // Reset editor
    $('#entry-textarea').value = '';
    $('#word-count').textContent = '0 words';
    $$('.mood-btn').forEach(b => b.classList.remove('selected'));

    if (entryId) {
        // Edit mode - load entry
        loadEntryForEditing(entryId);
    }

    showView('editor');
    $('#entry-textarea').focus();
}

async function loadEntryForEditing(entryId) {
    const entry = await getEntry(entryId);
    if (entry) {
        $('#entry-textarea').value = entry.content;
        updateWordCount(entry.content);

        if (entry.mood) {
            selectMood(entry.mood);
        }
    }
}

// ===== Entry Management =====
async function loadEntries() {
    state.entries = await getEntriesWithPreviews();
    renderEntryList();
}

function renderEntryList() {
    const listEl = $('#entry-list');
    const emptyState = $('#empty-state');

    if (state.entries.length === 0) {
        listEl.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Group entries by date
    const grouped = groupEntriesByDate(state.entries);

    let html = '';
    for (const [group, entries] of Object.entries(grouped)) {
        html += `<div class="date-group">${group}</div>`;

        for (const entry of entries) {
            html += `
                <div class="entry-card" data-id="${entry.id}">
                    <div class="entry-card-header">
                        <span class="entry-date">${formatTime(entry.createdAt)}</span>
                        <span class="entry-mood">${entry.mood ? MOOD_EMOJI[entry.mood] : ''}</span>
                    </div>
                    <p class="entry-preview">${escapeHtml(entry.preview)}</p>
                </div>
            `;
        }
    }

    listEl.innerHTML = html;

    // Add click handlers
    $$('.entry-card').forEach(card => {
        card.addEventListener('click', () => showEntryDetail(card.dataset.id));
    });
}

function groupEntriesByDate(entries) {
    const groups = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    for (const entry of entries) {
        const entryDate = new Date(entry.createdAt);
        const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());

        let group;
        if (entryDay.getTime() === today.getTime()) {
            group = 'Today';
        } else if (entryDay.getTime() === yesterday.getTime()) {
            group = 'Yesterday';
        } else if (entryDay > weekAgo) {
            group = 'This Week';
        } else {
            group = entryDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(entry);
    }

    return groups;
}

async function showEntryDetail(entryId) {
    const entry = await getEntry(entryId);
    if (!entry) return;

    state.currentEntryId = entryId;

    $('#detail-date').textContent = formatDate(entry.createdAt);
    $('#detail-mood').textContent = entry.mood ? MOOD_EMOJI[entry.mood] : '';
    $('#detail-content').textContent = entry.content;

    showView('detail');
}

async function saveCurrentEntry() {
    const content = $('#entry-textarea').value.trim();

    if (!content) {
        alert('Please write something before saving.');
        return;
    }

    try {
        if (state.currentEntryId) {
            // Update existing
            await updateEntry(state.currentEntryId, {
                content,
                mood: state.selectedMood
            });
        } else {
            // Create new
            await saveEntry({
                content,
                mood: state.selectedMood
            });
        }

        showView('list');
    } catch (error) {
        console.error('Failed to save entry:', error);
        alert('Failed to save entry. Please try again.');
    }
}

function cancelEdit() {
    const content = $('#entry-textarea').value.trim();

    if (content && !confirm('Discard this entry?')) {
        return;
    }

    showView('list');
}

function editCurrentEntry() {
    showEditor(state.currentEntryId);
}

async function deleteCurrentEntry() {
    if (!confirm('Delete this entry? This cannot be undone.')) {
        return;
    }

    try {
        await deleteEntry(state.currentEntryId);
        showView('list');
    } catch (error) {
        console.error('Failed to delete entry:', error);
        alert('Failed to delete entry. Please try again.');
    }
}

// ===== Mood Selection =====
function selectMood(mood) {
    state.selectedMood = mood;

    $$('.mood-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.mood) === mood);
    });
}

// ===== Text Input Handling =====
function handleTextInput() {
    const content = $('#entry-textarea').value;
    updateWordCount(content);

    // Autosave if enabled
    if (state.autosaveEnabled) {
        scheduleAutosave();
    }
}

function updateWordCount(content) {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    $('#word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

function scheduleAutosave() {
    if (state.autosaveTimer) {
        clearTimeout(state.autosaveTimer);
    }

    state.autosaveTimer = setTimeout(async () => {
        const content = $('#entry-textarea').value.trim();
        if (!content) return;

        try {
            if (state.currentEntryId) {
                await updateEntry(state.currentEntryId, {
                    content,
                    mood: state.selectedMood
                });
            } else {
                const entry = await saveEntry({
                    content,
                    mood: state.selectedMood
                });
                state.currentEntryId = entry.id;
            }
            console.log('Autosaved');
        } catch (error) {
            console.error('Autosave failed:', error);
        }
    }, 30000); // 30 seconds
}

// ===== Search =====
async function handleSearch() {
    const query = $('#search-input').value.trim();

    if (!query) {
        await loadEntries();
        return;
    }

    state.entries = await searchEntries(query);
    renderEntryList();
}

// ===== Settings =====
async function toggleAutosave() {
    state.autosaveEnabled = $('#toggle-autosave').checked;
    await setting('autosave', state.autosaveEnabled);
}

async function toggleTheme() {
    const theme = $('#toggle-theme').checked ? 'dark' : 'light';
    await setting('theme', theme);
    applyTheme(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

async function confirmDeleteAll() {
    const confirm1 = confirm('Delete ALL journal entries? This cannot be undone.');
    if (!confirm1) return;

    const confirm2 = confirm('Are you absolutely sure? All your entries will be permanently deleted.');
    if (!confirm2) return;

    try {
        await deleteAllEntries();
        await loadEntries();
        showView('list');
        alert('All entries have been deleted.');
    } catch (error) {
        console.error('Failed to delete all entries:', error);
        alert('Failed to delete entries. Please try again.');
    }
}

// ===== Offline Status =====
function updateOfflineStatus() {
    const banner = $('#offline-banner');

    if (navigator.onLine) {
        banner.classList.add('hidden');
        banner.classList.remove('visible');
    } else {
        banner.classList.remove('hidden');
        banner.classList.add('visible');
    }
}

// ===== Service Worker =====
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service worker registered');
        } catch (error) {
            console.error('Service worker registration failed:', error);
        }
    }
}

// ===== Utility Functions =====
function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ===== Start =====
init();
