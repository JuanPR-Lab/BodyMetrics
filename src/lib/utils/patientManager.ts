import type { BioMetricRecord } from './csvSDparser';

/**
 * Represents a Client in the local database.
 * Privacy Note: The ID should be a code (e.g., "cli001") to separate identity from data.
 */
export interface Client {
	id: string; // Unique Identifier (e.g., "cli001")
	alias: string; // Display name or reference code (e.g., "Ref: 123")
	notes?: string; // Private notes for the dietitian
	createdAt: number; // Timestamp
}

/**
 * The internal structure of the LocalStorage database.
 * Maps anonymous CSV records to specific Clients.
 */
export interface AppDatabase {
	version: number;
	clients: Client[];
	// Mapping: RecordID (Date-Time string from CSV) -> ClientID
	assignments: Record<string, string>;
}

const DB_KEY = 'bodymetrics_db_v1';

/**
 * Helper to trigger browser download of a text string (for Backups).
 */
const triggerDownload = (content: string, filename: string) => {
	if (typeof window === 'undefined') return; // SSR check
	const blob = new Blob([content], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

export const PatientManager = {
	// --- PERSISTENCE (LOCAL STORAGE) ---

	/**
	 * Loads the database from the browser's LocalStorage.
	 * Returns a default empty structure if nothing exists.
	 */
	loadDB(): AppDatabase {
		if (typeof localStorage === 'undefined') {
			return { version: 1, clients: [], assignments: {} };
		}

		const raw = localStorage.getItem(DB_KEY);
		if (!raw) {
			return { version: 1, clients: [], assignments: {} };
		}

		try {
			return JSON.parse(raw);
		} catch (e) {
			console.error('BodyMetrics: Error parsing local database.', e);
			return { version: 1, clients: [], assignments: {} };
		}
	},

	/**
	 * Saves the current state to LocalStorage.
	 */
	saveDB(db: AppDatabase) {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(DB_KEY, JSON.stringify(db));
	},

	/**
	 * DANGER ZONE: Completely wipes all local data.
	 * Used for the "Reset App" or "Clear Data" button.
	 */
	deleteAllData() {
		if (typeof localStorage === 'undefined') return;
		localStorage.removeItem(DB_KEY);
	},

	// --- CLIENT MANAGEMENT ---

	/**
	 * Retrieves the list of all registered clients.
	 */
	getClients(): Client[] {
		return this.loadDB().clients;
	},

	/**
	 * Returns a map of record counts per client.
	 * Optimized to avoid looping through localStorage in the UI.
	 * Example: { 'client_id_1': 5, 'client_id_2': 0 }
	 */
	getClientCounts(): Record<string, number> {
		const db = this.loadDB();
		const counts: Record<string, number> = {};

		// Initialize all clients with 0
		db.clients.forEach((c) => (counts[c.id] = 0));

		// Count assignments
		Object.values(db.assignments).forEach((clientId) => {
			if (counts[clientId] !== undefined) {
				counts[clientId]++;
			}
		});

		return counts;
	},

	/**
	 * Creates a new client profile.
	 * @returns true if created, false if ID already exists.
	 */
	addClient(id: string, alias: string = ''): boolean {
		const db = this.loadDB();

		// Check for duplicates
		if (db.clients.find((c) => c.id === id)) {
			return false;
		}

		db.clients.push({
			id,
			alias: alias || id,
			createdAt: Date.now()
		});

		this.saveDB(db);
		return true;
	},

	/**
	 * Deletes a client and removes all their record associations.
	 * Note: This does NOT delete the raw data from the CSV files, only the link.
	 */
	deleteClient(id: string) {
		const db = this.loadDB();

		// Remove client from list
		db.clients = db.clients.filter((c) => c.id !== id);

		// Cleanup orphaned assignments (records that belonged to this client)
		for (const recordId in db.assignments) {
			if (db.assignments[recordId] === id) {
				delete db.assignments[recordId];
			}
		}

		this.saveDB(db);
	},

	/**
	 * Updates a client's alias without changing their ID.
	 */
	renameClient(id: string, newAlias: string): boolean {
		const db = this.loadDB();
		const clientIndex = db.clients.findIndex((c) => c.id === id);

		if (clientIndex !== -1) {
			db.clients[clientIndex].alias = newAlias;
			this.saveDB(db);
			return true;
		}
		return false;
	},

	// --- RECORD ASSIGNMENT LOGIC ---

	/**
	 * Links a specific CSV record (by its unique Date-Time ID) to a Client.
	 */
	assignRecordToClient(recordId: string, clientId: string) {
		const db = this.loadDB();
		db.assignments[recordId] = clientId;
		this.saveDB(db);
	},

	/**
	 * Returns the total number of linked records in the database.
	 */
	getAssignmentCount(): number {
		const db = this.loadDB();
		return Object.keys(db.assignments || {}).length;
	},

	/**
	 * Removes an assignment (makes the record "Unassigned" again).
	 * Moves it back to the Inbox.
	 */
	unassignRecord(recordId: string) {
		const db = this.loadDB();
		delete db.assignments[recordId];
		this.saveDB(db);
	},

	/**
	 * Checks who owns a specific record.
	 * @returns ClientID or null if unassigned.
	 */
	getClientForRecord(recordId: string): string | null {
		const db = this.loadDB();
		return db.assignments[recordId] || null;
	},

	/**
	 * Returns a filtered list of CSV records belonging to a specific client.
	 * @param clientId The client ID to filter by.
	 * @param allCsvRecords The full dataset loaded from the SD Card.
	 */
	getClientHistory(clientId: string, allCsvRecords: BioMetricRecord[]): BioMetricRecord[] {
		const db = this.loadDB();

		// Filter records where the ID is assigned to this client in our local DB
		const clientRecords = allCsvRecords.filter((r) => db.assignments[r.id] === clientId);

		// Sort by date descending (newest first) based on ID string comparison
		return clientRecords.sort((a, b) => b.id.localeCompare(a.id));
	},

	/**
	 * Filter history by date range.
	 * @param history Array of BioMetricRecord
	 * @param filter 'all' | '1m' | '3m' | '6m' | '1y' | 'custom'
	 * @param start Custom start date (YYYY-MM-DD)
	 * @param end Custom end date (YYYY-MM-DD)
	 */
	filterHistoryByDate(
		history: BioMetricRecord[],
		filter: string,
		start: string,
		end: string
	): BioMetricRecord[] {
		if (filter === 'all' || !history.length) return history;

		const now = new Date();
		const cutoff = new Date();

		if (filter === '1m') cutoff.setMonth(now.getMonth() - 1);
		else if (filter === '3m') cutoff.setMonth(now.getMonth() - 3);
		else if (filter === '6m') cutoff.setMonth(now.getMonth() - 6);
		else if (filter === '1y') cutoff.setFullYear(now.getFullYear() - 1);
		else if (filter === 'custom' && start && end) {
			const startDate = new Date(start);
			const endDate = new Date(end);
			return history.filter((r) => {
				const recordDate = new Date(r.date.split('/').reverse().join('-'));
				return recordDate >= startDate && recordDate <= endDate;
			});
		} else {
			return history;
		}

		return history.filter((r) => {
			const recordDate = new Date(r.date.split('/').reverse().join('-'));
			return recordDate >= cutoff;
		});
	},

	/**
	 * Compute chart data for a given metric key.
	 * @param history Array of BioMetricRecord
	 * @param metricKey keyof BioMetricRecord
	 * @returns Chart data object with pointsData, polyline, areaPath, gridLines
	 */
	computeChartData(history: BioMetricRecord[], metricKey: keyof BioMetricRecord): any {
		if (!history.length) return null;

		const getTimestamp = (dateStr: string, timeStr: string = '00:00:00') => {
			try {
				if (!dateStr) return 0;
				const parts = dateStr.split('/');
				if (parts.length === 3) {
					return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${timeStr}`).getTime();
				}
				return new Date(dateStr).getTime() || 0;
			} catch (e) {
				return 0;
			}
		};

		const sorted = [...history].sort(
			(a, b) => getTimestamp(a.date, a.time) - getTimestamp(b.date, b.time)
		);
		const values = sorted.map((d) => Number(d[metricKey]) || 0);
		const minVal = Math.min(...values);
		const maxVal = Math.max(...values);

		let rawRange = maxVal - minVal;
		if (rawRange === 0) rawRange = 1;

		const roughStep = rawRange / 4;
		const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
		let step = niceSteps.find((s) => s >= roughStep) || roughStep;
		if (step > 100) step = Math.pow(10, Math.floor(Math.log10(rawRange)));

		let axisMin = Math.floor(minVal / step) * step;
		let axisMax = Math.ceil(maxVal / step) * step;

		if (minVal - axisMin < step * 0.1) axisMin -= step;
		if (axisMax - maxVal < step * 0.1) axisMax += step;

		const range = axisMax - axisMin;
		const stepX = sorted.length > 1 ? 100 / (sorted.length - 1) : 0;

		const gridLines = [];
		for (let v = axisMin; v <= axisMax + 0.0001; v += step) {
			const y = 100 - ((v - axisMin) / range) * 100;
			gridLines.push({ y, label: parseFloat(v.toFixed(1)) });
		}

		const pointsData = sorted.map((d, i) => {
			const val = Number(d[metricKey]) || 0;
			const x = sorted.length > 1 ? i * stepX : 50;
			const y = 100 - ((val - axisMin) / range) * 100;

			const showLabel =
				sorted.length <= 6 ||
				i === 0 ||
				i === sorted.length - 1 ||
				(sorted.length > 10 && i % Math.ceil(sorted.length / 5) === 0);

			const isRightSide = x > 60;
			const isTop = y < 25;

			return {
				x,
				y,
				val: val.toFixed(1),
				date: d.date,
				showLabel,
				unitKey: '',
				isRightSide,
				isTop
			};
		});

		const polyline = sorted.length > 1 ? pointsData.map((p) => `${p.x},${p.y}`).join(' ') : '';
		const areaPath = sorted.length > 1 ? `0,120 ${polyline} 100,120` : '';

		return { pointsData, polyline, areaPath, gridLines };
	},

	// --- BACKUP & RESTORE ---

	/**
	 * Exports the local database (clients + assignments) to a JSON file.
	 * Uses LOCAL SYSTEM TIME to avoid UTC offsets.
	 * Format: bm_backup_YYYY-MM-DD_HH-mm-ss.json
	 */
	exportBackup(customFileName?: string) {
		const db = this.loadDB();

		let filename = customFileName;

		if (!filename) {
			const now = new Date();
			const pad = (n: number) => n.toString().padStart(2, '0');

			const day = pad(now.getDate());
			const month = pad(now.getMonth() + 1);
			const year = now.getFullYear();

			const hours = pad(now.getHours());
			const minutes = pad(now.getMinutes());

			filename = `BM_Backup_${day}-${month}-${year}_${hours}-${minutes}.json`;
		}

		triggerDownload(JSON.stringify(db, null, 2), filename);
	},

	/**
	 * Imports a backup JSON file, replacing the current local database.
	 * @returns true if successful, false if format was invalid.
	 */
	importBackup(jsonString: string): boolean {
		try {
			const newDB = JSON.parse(jsonString);

			// Basic validation of the schema
			if (!Array.isArray(newDB.clients) || !newDB.assignments) {
				throw new Error('Invalid backup file format');
			}

			this.saveDB(newDB);
			return true;
		} catch (e) {
			console.error('BodyMetrics: Import failed', e);
			return false;
		}
	}
};
