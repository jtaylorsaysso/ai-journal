/**
 * Tests for database module
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    initDB,
    saveEntry,
    getEntry,
    getAllEntries,
    updateEntry,
    deleteEntry,
    searchEntries
} from '../db.js';


describe('Database Module', () => {
    beforeEach(async () => {
        // Initialize fresh database for each test
        await initDB();
    });

    describe('Entry Management', () => {
        it('should save an entry', async () => {
            const entry = await saveEntry({
                content: 'Test entry content',
                mood: 3
            });

            expect(entry).toBeDefined();
            expect(entry.id).toBeDefined();
            expect(entry.mood).toBe(3);
            expect(entry.wordCount).toBeGreaterThan(0);
        });

        it('should retrieve a saved entry', async () => {
            const saved = await saveEntry({
                content: 'Retrieve me',
                mood: 4
            });

            const retrieved = await getEntry(saved.id);

            expect(retrieved).toBeDefined();
            expect(retrieved.content).toBe('Retrieve me');
            expect(retrieved.mood).toBe(4);
        });

        it('should update an entry', async () => {
            const saved = await saveEntry({
                content: 'Original content',
                mood: 2
            });

            await updateEntry(saved.id, {
                content: 'Updated content',
                mood: 5
            });

            const updated = await getEntry(saved.id);
            expect(updated.content).toBe('Updated content');
            expect(updated.mood).toBe(5);
        });

        it('should delete an entry', async () => {
            const saved = await saveEntry({
                content: 'Delete me',
                mood: 1
            });

            await deleteEntry(saved.id);

            const deleted = await getEntry(saved.id);
            expect(deleted).toBeNull();
        });
    });

    describe('Entry Listing', () => {
        it('should list all entries', async () => {
            await saveEntry({ content: 'Entry 1', mood: 3 });
            await saveEntry({ content: 'Entry 2', mood: 4 });
            await saveEntry({ content: 'Entry 3', mood: 2 });

            const entries = await getAllEntries();

            expect(entries).toHaveLength(3);
        });

        it('should search entries by content', async () => {
            await saveEntry({ content: 'Today was sunny', mood: 5 });
            await saveEntry({ content: 'Today was rainy', mood: 2 });
            await saveEntry({ content: 'Yesterday was cloudy', mood: 3 });

            const results = await searchEntries('sunny');

            expect(results).toHaveLength(1);
            expect(results[0].preview).toContain('sunny');
        });

        it('should handle case-insensitive search', async () => {
            await saveEntry({ content: 'UPPERCASE content', mood: 3 });

            const results = await searchEntries('uppercase');

            expect(results).toHaveLength(1);
        });
    });

    describe('Encryption', () => {
        it('should store entries encrypted', async () => {
            const saved = await saveEntry({
                content: 'Secret content',
                mood: 3
            });

            // Entry should have encrypted content, not plaintext
            expect(saved.encryptedContent).toBeDefined();
            expect(saved.iv).toBeDefined();
            expect(saved.content).toBeUndefined();
        });

        it('should decrypt on retrieval', async () => {
            const saved = await saveEntry({
                content: 'Encrypted entry',
                mood: 4
            });

            const retrieved = await getEntry(saved.id);

            // Retrieved entry should have decrypted content
            expect(retrieved.content).toBe('Encrypted entry');
        });
    });
});
