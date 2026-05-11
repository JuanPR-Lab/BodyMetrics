import { browser } from '$app/environment';
import type { BioMetricRecord } from '$lib/utils/csvSDparser';

/**
 * Viewer-specific state using Svelte 5 Runes.
 * Stores loaded CSV data and syncs with localStorage.
 */
export const viewerState = $state({
    // Loaded records from CSV
    records: [] as BioMetricRecord[],
    // Currently selected record ID (optional)
    selectedRecordId: null as string | null,
    // Whether any data has been loaded
    hasData: false,

    /**
     * Loads state from localStorage (client-side only).
     */
    loadFromStorage() {
        if (!browser) return;
        const saved = localStorage.getItem('bodymetrics_viewer_data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.records = parsed.records || [];
                this.selectedRecordId = parsed.selectedRecordId || null;
                this.hasData = this.records.length > 0;
            } catch (e) {
                console.error('Failed to parse viewer state from localStorage', e);
                this.clear();
            }
        }
    },

    /**
     * Saves current state to localStorage.
     */
    saveToStorage() {
        if (!browser) return;
        const data = {
            records: this.records,
            selectedRecordId: this.selectedRecordId,
            version: 1
        };
        localStorage.setItem('bodymetrics_viewer_data', JSON.stringify(data));
    },

    /**
     * Updates records and saves.
     */
    setRecords(newRecords: BioMetricRecord[]) {
        this.records = newRecords;
        this.hasData = newRecords.length > 0;
        // Auto-select first record if none selected
        if (newRecords.length > 0 && !this.selectedRecordId) {
            this.selectedRecordId = newRecords[0].id;
        }
        this.saveToStorage();
    },

    /**
     * Adds a single record (or multiple) and saves.
     */
    addRecords(recordsToAdd: BioMetricRecord[]) {
        const existingIds = new Set(this.records.map(r => r.id));
        const unique = recordsToAdd.filter(r => !existingIds.has(r.id));
        this.records = [...this.records, ...unique];
        this.hasData = this.records.length > 0;
        if (this.selectedRecordId === null && unique.length > 0) {
            this.selectedRecordId = unique[0].id;
        }
        this.saveToStorage();
    },

    /**
     * Removes a record by ID.
     */
    removeRecord(recordId: string) {
        this.records = this.records.filter(r => r.id !== recordId);
        this.hasData = this.records.length > 0;
        if (this.selectedRecordId === recordId) {
            this.selectedRecordId = this.records.length > 0 ? this.records[0].id : null;
        }
        this.saveToStorage();
    },

    /**
     * Selects a record.
     */
    selectRecord(recordId: string) {
        if (this.records.some(r => r.id === recordId)) {
            this.selectedRecordId = recordId;
            this.saveToStorage();
        }
    },

    /**
     * Clears all data (reset).
     */
    clear() {
        this.records = [];
        this.selectedRecordId = null;
        this.hasData = false;
        if (browser) {
            localStorage.removeItem('bodymetrics_viewer_data');
        }
    }
});

// Initialize from localStorage on module load
if (browser) {
    viewerState.loadFromStorage();
}
