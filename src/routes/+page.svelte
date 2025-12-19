<script lang="ts">
	// ---------------------------------------------------------------------------
	// IMPORTS
	// ---------------------------------------------------------------------------
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { locale, t, isLoading as isLocaleLoading } from 'svelte-i18n';

	// Logic & Utils
	import { PatientManager, type Client } from '$lib/utils/patientManager';
	import { parseScaleFiles, type BioMetricRecord } from '$lib/utils/csvSDparser';
	import { exportToCSV } from '$lib/utils/exporters';
	import {
		STATUS_COLORS,
		getBodyFatStatus,
		getVisceralFatStatus,
		getBMIStatus,
		getMetabolicAgeStatus
	} from '$lib/utils/ranges';
	import '$lib/i18n';

	// Components
	import InfoModal from '$lib/components/modals/InfoModal.svelte';
	import DeleteModal from '$lib/components/modals/DeleteModal.svelte';
	import RenameModal from '$lib/components/modals/RenameModal.svelte';
	import GeneralModal from '$lib/components/modals/GeneralModal.svelte';
	import UnlinkModal from '$lib/components/modals/UnlinkModal.svelte';
	import BodyMap from '$lib/components/BodyMap.svelte';
	import ClientDashboard from '$lib/components/ClientDashboard.svelte'; // Adjust path if needed
	import ToastNotification from '$lib/components/ToastNotification.svelte';
	import SettingsTab from '$lib/components/SettingsTab.svelte';
	import HelpTab from '$lib/components/HelpTab.svelte';
	import InboxTab from '$lib/components/InboxTab.svelte';
	import WelcomeModal from '$lib/components/modals/WelcomeModal.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';

	// Icons
	import {
		Inbox,
		Users,
		Settings,
		CircleHelp,
		Lock,
		UploadCloud,
		FolderOpen,
		AlertTriangle,
		CheckCircle,
		Info,
		Edit,
		Trash2,
		FileSpreadsheet,
		Undo2,
		Save,
		Download,
		Upload,
		Rocket,
		BarChart3,
		Target,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		XCircle,
		Scale,
		Activity,
		Droplets,
		Dumbbell,
		Flame,
		Bone,
		Clock,
		Search,
		Sparkles,
		AlertCircle,
		Monitor,
		CheckCircle2,
		Coffee,
		Heart,
		Github,
		RotateCw
	} from 'lucide-svelte';

	// ---------------------------------------------------------------------------
	// CONSTANTS & CONFIGURATION
	// ---------------------------------------------------------------------------

	const CHART_OPTIONS = [
		{ key: 'weight', label: 'metrics.weight', color: '#64748b', unitKey: 'kg' }, // Slate-500
		{ key: 'bmi', label: 'metrics.bmi', color: '#ec4899', unitKey: '' }, // Pink-500
		{ key: 'bodyFat', label: 'metrics.body_fat', color: '#f59e0b', unitKey: 'percent' },
		{ key: 'muscleMass', label: 'metrics.muscle_mass', color: '#6366f1', unitKey: 'kg' },
		{ key: 'boneMass', label: 'metrics.bone_mass', color: '#9ca3af', unitKey: 'kg' },
		{ key: 'dci', label: 'metrics.dci', color: '#10b981', unitKey: 'kcal' },
		{ key: 'metabolicAge', label: 'metrics.metabolic_age', color: '#a855f7', unitKey: 'years' },
		{ key: 'visceralFat', label: 'metrics.visceral_fat', color: '#d97706', unitKey: 'rating' }
	] as const;

	const STYLES = {
		filterBtn:
			'px-3 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 transition-all bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 uppercase tracking-wide cursor-pointer shadow-sm',
		filterBtnActive: '!bg-indigo-600 !text-white !border-indigo-700 font-bold shadow-md',
		cardMetric:
			'bg-white p-4 rounded-xl shadow-sm border-l-4 flex flex-col justify-between min-h-[80px] transition-all hover:shadow-md',
		metricLabel: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider self-start',
		metricValueCard: 'text-2xl font-black text-slate-800 leading-none self-end mt-1',
		metricColMain: 'flex flex-col items-center justify-center px-3',
		metricValueLg: 'text-3xl font-black text-slate-800 leading-none',
		metricValueMd: 'text-2xl font-black leading-none',
		metricUnit: 'text-sm font-medium text-slate-500 ml-1',
		divider: 'w-px h-10 bg-slate-200 mx-2'
	};

	// Mapping: File Name -> Button Key
	const CSV_BUTTON_MAP: Record<string, string> = {
		'data1.csv': 'BUTTON_1',
		'data5.csv': 'BUTTON_1',
		'data2.csv': 'BUTTON_2',
		'data6.csv': 'BUTTON_2',
		'data3.csv': 'BUTTON_3',
		'data7.csv': 'BUTTON_3',
		'data4.csv': 'BUTTON_4',
		'data8.csv': 'BUTTON_4'
	};

	// ---------------------------------------------------------------------------
	// APP STATE
	// ---------------------------------------------------------------------------

	// Data
	let allRecords: BioMetricRecord[] = [];
	let clients: Client[] = [];
	let clientCounts: Record<string, number> = {};

	// UI / Navigation
	let currentTab: 'inbox' | 'clients' | 'settings' | 'help' = 'inbox';
	let isProcessing = false;
	let isDragging = false;
	let errorMessage = '';
	let fileInput: HTMLInputElement | null = null;
	let promptInput: HTMLInputElement | null = null;

	// Selection & Filters
	let selectedClientId: string = '';
	let selectedRecordId: string = '';
	let selectedRecordIds: string[] = [];
	let isMultiSelectMode: boolean = false;
	let selectedInboxMeasurements: string[] = [];

	// Pagination
	let currentPage = 1;
	let clientsPerPage = 10;
	let totalPages = 1;

	// Bulk Assignment Search
	let assignmentSearchTerms: Record<string, string> = {};
	let bulkAssignSearch = '';

	// Chart
	let hoveredIndex: number | null = null;
	let hoveredPointData: any | null = null;

	// --- STATE: MODALS & TOAST ---

	// 1. Generic Modal (Info, Alert, Prompt)
	let showModal = false;
	let modalTitle = '';
	let modalMessage = '';
	let modalType: 'confirm' | 'alert' | 'error' | 'success' | 'prompt' = 'alert';
	let modalConfirmCallback: (() => void) | null = null;
	let modalCancelCallback: (() => void) | null = null;
	let modalInputValue = '';

	// 2. Delete Modal (Safety Check)
	let showDeleteModal = false;
	let deleteModalType: 'client' | 'reset' = 'client';
	let deleteTargetId: string | null = null;
	let deleteTargetName: string = '';

	// 3. Unassign Modal
	let showUnassignModal = false;
	let unassignModalTitle = '';
	let unassignModalMessage = '';
	let unassignTargetId: string | null = null;

	// 3. Rename Modal
	let showRenameModal = false;
	let renameModalHasError = false;
	let renameModalErrorMessage = '';
	let clientToRenameId: string | null = null;
	let clientToRenameCurrentName: string = '';

	// 4. Toast Notification
	let showToast = false;
	let toastMessage = '';

	// 5. Welcome Modal
	let showWelcomeModal = false;
	let showGuide = false;
	let currentRecord: BioMetricRecord | null = null;

	// ---------------------------------------------------------------------------
	// REACTIVE STATEMENTS
	// ---------------------------------------------------------------------------

	// Helpers
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

	// Inbox: Records without a client
	$: inboxRecords = allRecords
		.filter((r) => !PatientManager.getClientForRecord(r.id))
		.sort((a, b) => getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time));

	// Clients Filter & Sort
	$: filteredClients = clients.sort((a, b) => {
		const aAlias = a.alias.toLowerCase();
		const bAlias = b.alias.toLowerCase();
		const aIsNumber = !isNaN(aAlias as any) && !isNaN(parseFloat(aAlias));
		const bIsNumber = !isNaN(bAlias as any) && !isNaN(parseFloat(bAlias));

		if (aIsNumber && !bIsNumber) return -1;
		if (!aIsNumber && bIsNumber) return 1;
		if (aIsNumber && bIsNumber) return parseFloat(aAlias) - parseFloat(bAlias);
		return aAlias.localeCompare(bAlias);
	});

	// Client Pagination
	$: {
		totalPages = Math.max(1, Math.ceil(filteredClients.length / clientsPerPage));
		if (currentPage > totalPages) currentPage = totalPages;
	}

	$: paginatedClients = filteredClients.slice(
		(currentPage - 1) * clientsPerPage,
		currentPage * clientsPerPage
	);

	// Bulk assignment search
	$: filteredAssignmentClients = (searchTerm: string) => {
		if (!searchTerm) return [];
		const term = searchTerm.toLowerCase().trim();
		return clients.filter((c) => c.alias.toLowerCase().includes(term));
	};
	$: filteredBulkClients = filteredAssignmentClients(bulkAssignSearch);

	// History & Selected Record
	$: clientHistory = selectedClientId
		? PatientManager.getClientHistory(selectedClientId, allRecords).sort((a, b) => {
				return getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time);
			})
		: [];

	$: currentRecord =
		clientHistory.find((r) => r.id === selectedRecordId) || clientHistory[0] || null;

	// ---------------------------------------------------------------------------
	// LIFECYCLE
	// ---------------------------------------------------------------------------
	onMount(() => {
		const savedLocale = localStorage.getItem('user_locale');
		if (savedLocale) {
			locale.set(savedLocale);
		} else {
			const browserLang = navigator.language || 'en';
			locale.set(browserLang.toLowerCase().startsWith('es') ? 'es' : 'en');
		}

		refreshClients();

		// New logic: Show welcome modal if no clients exist
		if (clients.length === 0) {
			showWelcomeModal = true;
		}
	});

	// ---------------------------------------------------------------------------
	// CORE FUNCTIONS
	// ---------------------------------------------------------------------------

	function refreshClients() {
	 // 1. Reread clients from DB
	 clients = PatientManager.getClients();
	
	 // 2. Reread counts
	 clientCounts = PatientManager.getClientCounts();
	
	 // 3. IMPORTANT! Force reactivity of allRecords
	 // This makes Svelte automatically recalculate 'inboxRecords'
	 allRecords = [...allRecords];
	}

	const switchTab = (tab: 'inbox' | 'clients' | 'settings' | 'help') => {
		currentTab = tab;

		if (tab !== 'clients') {
			selectedClientId = '';
			selectedRecordId = '';
		}
	};

	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		
		// Convert files to a real Array for filtering
		const filesArray = Array.from(files);
		
		// Filter files: separate valid CSV files from ignored files
		const validFiles: File[] = [];
		const ignoredFiles: File[] = [];
		
		filesArray.forEach(file => {
			const fileName = file.name.toUpperCase();
			// For Inbox: only accept CSV files that contain 'DATA' in the name
			// Ignore files with 'BM' (Backups) or 'PROF' (System files)
			if (fileName.includes('DATA') && fileName.endsWith('.CSV')) {
				validFiles.push(file);
			} else {
				ignoredFiles.push(file);
			}
		});
		
		// Case A: If there are no valid files but there are ignored files
		if (validFiles.length === 0 && ignoredFiles.length > 0) {
			const $t = get(t);
			triggerToast('Archivo ignorado. Solo se admiten archivos DATA*.csv');
			if (fileInput) (fileInput as HTMLInputElement).value = '';
			return;
		}
		
		// Case B: If there are valid files, continue processing
		// If there were also ignored files, show a quick toast
		if (ignoredFiles.length > 0) {
			const $t = get(t);
			triggerToast(`Se procesaron ${validFiles.length} archivos. Se omitieron archivos no válidos.`);
		}
		
		isProcessing = true;
		errorMessage = '';
		const $t = get(t);

		try {
			const parsedData = await parseScaleFiles(validFiles);
			if (parsedData.length === 0) throw new Error('No valid records found.');

			const recordMap = new Map([...allRecords, ...parsedData].map((r) => [r.id, r]));
			allRecords = Array.from(recordMap.values()).sort((a, b) => b.id.localeCompare(a.id));

			if (inboxRecords.length > 0 && currentTab !== 'inbox') {
				if (currentTab === 'help') currentTab = 'inbox';
			}

			triggerToast($t('alerts.csv_imported_success'));
		} catch (err) {
			console.error(err);

			setTimeout(() => {
				showAlert($t('upload.error_title'), $t('upload.error'), 'error');
			}, 10);
		} finally {
			isProcessing = false;
			isDragging = false;
			if (fileInput) (fileInput as HTMLInputElement).value = '';
		}
	};

	// --- CONFIRMATION AND ALERTS LOGIC ---
	
	// 1. Handler: Child (Dashboard) requests unassign
	const handleRequestUnassign = (e: CustomEvent<string>) => {
		unassignTargetId = e.detail;
		const $t = get(t);
		
		unassignModalTitle = $t('dashboard.detach_record_title');
		unassignModalMessage = $t('alerts.detach_record_confirm');
		showUnassignModal = true;
	};
	
	// 3. Actual action: User said YES in the unassign modal
	const confirmUnassignAction = () => {
		if (!unassignTargetId) return;
		
		PatientManager.unassignRecord(unassignTargetId);
		refreshClients();
		
		const $t = get(t);
		
		triggerToast($t('alerts.record_detached'));
		
		unassignTargetId = null;
		showUnassignModal = false;
	};
	

	// --- CLIENT MANAGEMENT (CRUD) ---
	
	// --- FIXED createClient FUNCTION (ONLY ONCE) ---
	function createClient(aliasToCreate: string) {
	 if (!aliasToCreate) return;
	
	 const isDuplicate = clients.some(
	  (client) => client.alias.toLowerCase() === aliasToCreate.toLowerCase()
	 );
	
	 if (isDuplicate) {
      const $t = get(t);
      modalTitle = $t('dashboard.client_exists_title');
      modalMessage = $t('dashboard.client_exists_message');
      modalType = 'alert';
      
      setTimeout(() => {
          showModal = true;
      }, 10);
      
      return;
     }
	
	 const newId = Date.now().toString(36) + Math.random().toString(36).substring(2);
	 const success = PatientManager.addClient(newId, aliasToCreate);
	
	 if (success) {
	  refreshClients();
	  const $t = get(t);
	  triggerToast($t('alerts.client_created'));
	 } else {
	  console.error('Client ID already exists');
	 }
	}

	const handleRenameClient = (id: string, newName: string): boolean => {
		const success = PatientManager.renameClient(id, newName);
		if (success) {
			refreshClients(); // Sync local state with updated DB
		} else {
			console.error('Client not found');
		}
		return success;
	};

	const requestRenameClient = (clientId: string, currentName: string) => {
		clientToRenameId = clientId;
		clientToRenameCurrentName = currentName;
		showRenameModal = true;
	};

	const confirmRenameClient = (newName: string) => {
		if (!clientToRenameId) return;

		// Find the current client to check if the new name is identical
		const currentClient = clients.find((client) => client.id === clientToRenameId);
		if (currentClient && currentClient.alias.toLowerCase() === newName.toLowerCase()) {
			// Set error flag to keep modal open and focused - no separate modal
			const $t = get(t);
			renameModalHasError = true;
			renameModalErrorMessage = $t('dashboard.client_exists_message');
			return;
		}

		// Check for duplicate client names (case insensitive), excluding the current client
		const isDuplicate = clients.some(
			(client) =>
				client.id !== clientToRenameId && client.alias.toLowerCase() === newName.toLowerCase()
		);

		if (isDuplicate) {
			// Set error flag to keep modal open and focused - no separate modal
			const $t = get(t);
			renameModalHasError = true;
			renameModalErrorMessage = $t('dashboard.client_exists_message');
			return;
		}

		const success = handleRenameClient(clientToRenameId, newName);
		if (success) {
			refreshClients(); // Ensure refresh

			const $t = get(t);
			triggerToast($t('alerts.client_renamed'));
			showRenameModal = false;
			renameModalHasError = false; // Reset error state on success
		} else {
			// If rename failed (client not found), set error flag to keep modal open
			// No separate modal, just inline error message
			const $t = get(t);
			renameModalHasError = true;
			renameModalErrorMessage = $t('dashboard.client_exists_message');
		}
	};

	// --- DELETE & RESET ACTIONS (SAFE MODE) ---
	
	const requestDeleteClient = (clientId: string) => {
	 const client = clients.find((c) => c.id === clientId);
	 if (!client) return;
	
	 deleteModalType = 'client';
	 deleteTargetId = clientId;
	 deleteTargetName = client.alias;
	 showDeleteModal = true;
	};
	
	const requestFactoryReset = () => {
	 deleteModalType = 'reset';
	 showDeleteModal = true;
	};
	
	const executeDeleteAction = () => {
	 const $t = get(t);
	
	 if (deleteModalType === 'client' && deleteTargetId) {
	  // --- INDIVIDUAL DELETION ---
	  PatientManager.deleteClient(deleteTargetId);
	
	  if (selectedClientId === deleteTargetId) {
	   selectedClientId = '';
	   selectedRecordId = ''; // Clear selection
	   currentRecord = null;
	  }
	
	  refreshClients();
	  triggerToast($t('alerts.client_deleted'));
	 } else if (deleteModalType === 'reset') {
	  // --- FACTORY RESET (NUCLEAR) ---
	
	  // 1. Delete Persistent Database
	  PatientManager.deleteAllData();
	
	  // 2. COMPLETE MEMORY CLEANUP (This was missing)
	  clients = [];
	  allRecords = []; // CRITICAL! Delete records from memory
	  clientCounts = {};
	
	  // 3. Reset selections and filters
	  selectedClientId = '';
	  selectedRecordId = '';
	  selectedInboxMeasurements = [];
	  unassignTargetId = null;
	
	  // 4. Reset UI
	  currentTab = 'inbox'; // Return to inbox
	  refreshClients(); // Ensure everything is synchronized
	
	  triggerToast($t('alerts.reset_success'));
	 }

		showDeleteModal = false;
	};

	// --- ASSIGNMENT & UNASSIGNMENT ---
	
	const assignRecord = (recordId: string, clientId: string, silent = false) => {
	 if (!clientId) return;
	 PatientManager.assignRecordToClient(recordId, clientId);
	 if (!silent) {
	  refreshClients();
	  const $t = get(t);
	  triggerToast($t('alerts.link_success'));
	 }
	};
	
	const unassignCurrentRecord = (recordId: string) => {
	 // Logic to unassign using recordId
	 PatientManager.unassignRecord(recordId);
	 // Refresh clients to update counts and ensure UI consistency
	 refreshClients();
	 // inboxRecords will be updated automatically via reactive statement
	};

	const toggleMultiSelectMode = () => {
		isMultiSelectMode = !isMultiSelectMode;
		selectedRecordIds = [];
	};

	const toggleRecordSelection = (recordId: string) => {
		if (!isMultiSelectMode) return;
		const index = selectedRecordIds.indexOf(recordId);
		if (index === -1) selectedRecordIds = [...selectedRecordIds, recordId];
		else selectedRecordIds = selectedRecordIds.filter((id) => id !== recordId);
	};

	const unassignSelectedRecords = () => {
		if (selectedRecordIds.length === 0) return;
		const $t = get(t);
		setTimeout(() => {
			showConfirm(
				$t('dashboard.detach_record_title'),
				$t('dashboard.detach_record') + '? (' + selectedRecordIds.length + ')',
				() => {
					selectedRecordIds.forEach((recordId) => PatientManager.unassignRecord(recordId));
					refreshClients();
					selectedRecordIds = [];
				}
			);
		}, 10);
	};

	const assignSelectedRecords = (clientId: string) => {
	 if (!clientId) return;
	 selectedRecordIds.forEach((recordId) => assignRecord(recordId, clientId, true));
	 refreshClients();
	 selectedRecordIds = [];
	 const $t = get(t);
	 // NOW USES TOAST WITH PARAMETERS
	 triggerToast(
	  $t('alerts.link_multiple_success').replace('{n}', selectedRecordIds.length.toString())
	 );
	};

	const toggleInboxSelection = (recordId: string) => {
		const index = selectedInboxMeasurements.indexOf(recordId);
		if (index === -1) selectedInboxMeasurements = [...selectedInboxMeasurements, recordId];
		else selectedInboxMeasurements = selectedInboxMeasurements.filter((id) => id !== recordId);
	};

	const selectAllInboxMeasurements = () => {
		if (selectedInboxMeasurements.length === inboxRecords.length) {
			selectedInboxMeasurements = [];
		} else {
			selectedInboxMeasurements = inboxRecords.map((r) => r.id);
		}
	};

	const assignBulkMeasurements = (clientId: string) => {
		if (!clientId) return;
		const count = selectedInboxMeasurements.length;
		selectedInboxMeasurements.forEach((recordId) => assignRecord(recordId, clientId, true));

		refreshClients();
		selectedInboxMeasurements = [];
		bulkAssignSearch = '';
		const $t = get(t);
		triggerToast($t('alerts.link_multiple_success').replace('{n}', count.toString()));
	};

	// --- EXPORT & IMPORT ---

	const handleExportBackup = () => {
		const now = new Date();
		const day = String(now.getDate()).padStart(2, '0');
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const year = now.getFullYear();
		const hour = String(now.getHours()).padStart(2, '0');
		const minute = String(now.getMinutes()).padStart(2, '0');

		const timestamp = `${day}-${month}-${year}_${hour}-${minute}`;
		const filename = `BM_Backup_${timestamp}.json`;

		PatientManager.exportBackup(filename);
	};

	const exportClientData = (clientId?: string) => {
		const $t = get(t);
		const targetClientId = clientId || selectedClientId;

		if (!targetClientId) {
			setTimeout(() => {
				showAlert($t('dashboard.no_data_title'), $t('dashboard.no_data_client'), 'error');
			}, 10);
			return;
		}

		const history = PatientManager.getClientHistory(targetClientId, allRecords);
		if (!history || history.length === 0) {
			setTimeout(() => {
				showAlert($t('dashboard.no_data_title'), $t('dashboard.no_data_client'), 'error');
			}, 10);
			return;
		}

		const client = clients.find((c) => c.id === targetClientId);

		const now = new Date();
		const day = String(now.getDate()).padStart(2, '0');
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const year = now.getFullYear();
		const hour = String(now.getHours()).padStart(2, '0');
		const minute = String(now.getMinutes()).padStart(2, '0');

		const timestamp = `${day}-${month}-${year}_${hour}-${minute}`;

		const cleanClientName = client ? client.alias.replace(/\s+/g, '_') : 'Unknown';

		const filename = `BM_${cleanClientName}_${timestamp}.csv`;

		// Headers map for CSV
		const headersMap = {
			date: $t('csv_headers.date'),
			time: $t('csv_headers.time'),
			model: $t('csv_headers.model'),
			weight: $t('metrics.weight'),
			bmi: $t('metrics.bmi'),
			bodyFat: $t('metrics.body_fat'),
			muscleMass: $t('metrics.muscle_mass'),
			visceralFat: $t('metrics.visceral_fat'),
			waterPercentage: $t('metrics.water'),
			boneMass: $t('metrics.bone_mass'),
			metabolicAge: $t('metrics.metabolic_age'),
			dci: $t('metrics.dci'),
			fatTrunk: $t('csv_headers.fat_trunk'),
			fatArmR: $t('csv_headers.fat_arm_r'),
			fatArmL: $t('csv_headers.fat_arm_l'),
			fatLegR: $t('csv_headers.fat_leg_r'),
			fatLegL: $t('csv_headers.fat_leg_l'),
			muscleTrunk: $t('csv_headers.mus_trunk'),
			muscleArmR: $t('csv_headers.mus_arm_r'),
			muscleArmL: $t('csv_headers.mus_arm_l'),
			muscleLegR: $t('csv_headers.mus_leg_r'),
			muscleLegL: $t('csv_headers.mus_leg_l')
		};

		exportToCSV(history, headersMap, filename);
		// Show success toast
		triggerToast($t('toast.export_success'));
	};

	const handleImportBackup = async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const $t = get(t);
		
		// Validación del nombre del archivo (El Portero)
		const fileName = file.name.toLowerCase();
		if (!fileName.includes('bm_backup') || !fileName.endsWith('.json')) {
			triggerToast($t('alerts.ignored_files_warning'));
			return;
		}
		
		try {
			const text = await file.text();
			if (PatientManager.importBackup(text)) {
				refreshClients();
				triggerToast($t('settings.import_success'));
			} else {
				setTimeout(() => {
					showAlert($t('settings.import_error_title'), $t('settings.import_error'), 'error');
				}, 10);
			}
		} catch (error) {
			setTimeout(() => {
				showAlert($t('settings.import_error_title'), $t('settings.import_error'), 'error');
			}, 10);
		}
	};

	// ---------------------------------------------------------------------------
	// CHART LOGIC
	// ---------------------------------------------------------------------------
	function prepareSingleChart(
		history: BioMetricRecord[],
		key: keyof BioMetricRecord,
		unitKey: string
	) {
		try {
			const sorted = [...history].sort(
				(a, b) => getTimestamp(a.date, a.time) - getTimestamp(b.date, b.time)
			);
			if (sorted.length === 0) return null;

			const values = sorted.map((d) => Number(d[key]) || 0);
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
				const val = Number(d[key]) || 0;
				const x = sorted.length > 1 ? i * stepX : 50;
				const y = 100 - ((val - axisMin) / range) * 100;

				const showLabel =
					sorted.length <= 6 ||
					i === 0 ||
					i === sorted.length - 1 ||
					(sorted.length > 10 && i % Math.ceil(sorted.length / 5) === 0);

				const isRightSide = x > 60;
				const isTop = y < 25;

				return { x, y, val: val.toFixed(1), date: d.date, showLabel, unitKey, isRightSide, isTop };
			});

			const polyline = sorted.length > 1 ? pointsData.map((p) => `${p.x},${p.y}`).join(' ') : '';
			const areaPath = sorted.length > 1 ? `0,120 ${polyline} 100,120` : '';

			return { pointsData, polyline, areaPath, gridLines };
		} catch (e) {
			return null;
		}
	}

	// ---------------------------------------------------------------------------
	// HELPERS
	// ---------------------------------------------------------------------------

	const getButtonKey = (fileName: string): string => {
		const internalKey = CSV_BUTTON_MAP[fileName.toLowerCase()] || 'UNKNOWN_SOURCE';
		return `dashboard.${internalKey.toLowerCase()}`;
	};


	const getStatusColor = (type: string, val: number) => {
		if (!currentRecord) return STATUS_COLORS.unknown;
		try {
			if (type === 'fat')
				return STATUS_COLORS[getBodyFatStatus(val, currentRecord.gender, currentRecord.age)];
			if (type === 'visceral') return STATUS_COLORS[getVisceralFatStatus(val)];
			if (type === 'bmi') return STATUS_COLORS[getBMIStatus(val)];
			if (type === 'meta') return STATUS_COLORS[getMetabolicAgeStatus(val, currentRecord.age)];
		} catch (e) {
			return STATUS_COLORS.unknown;
		}
		return STATUS_COLORS.unknown;
	};

	const handleDrop = (e: DragEvent) => {
		isDragging = false;
		if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
	};

	const formatText = (text: string) => {
		if (!text) return '';
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-800">$1</strong>')
			.replace(
				/`(.*?)`/g,
				'<code class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-xs border border-indigo-100 font-bold">$1</code>'
			)
			.replace(/\n/g, '<br>');
	};

	const triggerToast = (msg: string) => {
		toastMessage = msg;
		showToast = true;
		setTimeout(() => {
			showToast = false;
		}, 3000);
	};

	// Guide Helpers
	const handleGuideComplete = () => {
		showGuide = false;
		localStorage.setItem('bm_guide_seen', 'true');
	};

	const getClientTotalCount = (client: Client | undefined) => {
		if (!client) return 0;
		return clientCounts[client.id] || 0;
	};

	// Modal Helpers
	const showAlert = (
		title: string,
		message: string,
		type: 'alert' | 'error' | 'success' = 'alert'
	) => {
		modalTitle = title;
		modalMessage = message;
		modalType = type;
		modalConfirmCallback = null;
		modalCancelCallback = null;
		
		setTimeout(() => {
			showModal = true;
		}, 10);
	};
	const showConfirm = (
		title: string,
		message: string,
		onConfirm: () => void,
		onCancel?: () => void
	) => {
		modalTitle = title;
		modalMessage = message;
		modalType = 'confirm';
		modalConfirmCallback = onConfirm;
		modalCancelCallback = onCancel || null;
		
		setTimeout(() => {
			showModal = true;
		}, 10);
	};
	const showPrompt = (
		title: string,
		message: string,
		initialValue: string,
		onConfirm: () => void
	) => {
		modalTitle = title;
		modalMessage = message;
		modalInputValue = initialValue;
		modalType = 'prompt';
		modalConfirmCallback = onConfirm;
		modalCancelCallback = null;
		
		setTimeout(() => {
			showModal = true;
		}, 10);
	};
	const handleModalConfirm = () => {
		if (modalConfirmCallback) modalConfirmCallback();
		showModal = false;
	};
	const handleModalCancel = () => {
		if (modalCancelCallback) modalCancelCallback();
		showModal = false;
	};

	// Global keyboard handler for modals
	const handleGlobalModalKeydown = (e: KeyboardEvent) => {
		if (!showModal) return;
		
		e.stopPropagation();
		
		if (e.key === 'Enter') {
			e.preventDefault();
			if (modalType === 'confirm' || modalType === 'prompt') {
				handleModalConfirm();
			} else {
				showModal = false;
			}
		} else if (e.key === 'Escape') {
			showModal = false;
		}
	};

	// Welcome Modal Helpers
	const handleWelcomeModalClose = () => {
		showWelcomeModal = false;
	};

	const handleGoToHelp = () => {
		currentTab = 'help';
	};
</script>

<svelte:window on:keydown={handleGlobalModalKeydown} />

{#if $isLocaleLoading}
	<div class="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400 gap-3">
		<div
			class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"
		></div>
		<span class="font-mono text-xs uppercase tracking-widest font-bold">Cargando...</span>
	</div>
{:else}
	<div
		role="application"
		class="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 select-none"
		on:dragover|preventDefault={(e) => {
			// Solo activar drag & drop global si estamos en la pestaña inbox
			if (currentTab === 'inbox') {
				isDragging = true;
			}
		}}
		on:dragleave|preventDefault={(e) => {
			// Solo activar drag & drop global si estamos en la pestaña inbox
			if (currentTab === 'inbox') {
				isDragging = false;
			}
		}}
		on:drop|preventDefault={(e) => {
			// Solo activar drag & drop global si estamos en la pestaña inbox
			if (currentTab === 'inbox') {
				isDragging = false;
				if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
			}
		}}
	>
		<header
			class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm transition-all backdrop-blur-sm bg-white/95"
		>
			<div class="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
				<div class="flex items-center gap-1.5 sm:gap-3">
					<div
						class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shadow-md flex-shrink-0 overflow-hidden"
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
							<rect x="0" y="0" width="512" height="512" rx="128" fill="#4f46e5" />
							<g transform="translate(106, 60)">
								<circle cx="150" cy="50" r="45" fill="white" />
								<rect x="110" y="120" width="80" height="260" rx="10" fill="white" />
								<rect
									x="40"
									y="120"
									width="60"
									height="180"
									rx="10"
									fill="white"
									opacity="0.9"
									transform="rotate(30, 100, 120)"
								/>
								<rect
									x="200"
									y="120"
									width="60"
									height="180"
									rx="10"
									fill="white"
									opacity="0.9"
									transform="rotate(-30, 200, 120)"
								/>
							</g>
						</svg>
					</div>
					<div>
						<h1 class="text-base sm:text-xl font-bold text-slate-800 leading-none">
							{$t('app.title')}
						</h1>
					</div>
				</div>

				<div class="flex items-center gap-1.5 sm:gap-3">
					<span
						class="px-2 sm:px-3 py-1 bg-emerald-50 text-emerald-700 text-xs uppercase tracking-wider rounded-full font-semibold border border-emerald-200 shadow-sm flex items-center gap-1"
					>
						<Lock size={12} />
						<span class="hidden sm:inline">{$t('app.privacy_badge')}</span>
					</span>

					<LanguageSelector />
				</div>
			</div>

			<div
				class="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0 sm:gap-8 overflow-x-auto no-scrollbar border-t border-slate-100"
			>
				<button
					class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab ===
					'inbox'
						? 'border-indigo-600 text-indigo-600'
						: 'border-transparent text-gray-500 hover:text-gray-700'}"
					on:click={() => switchTab('inbox')}
				>
					<Inbox size={18} />
					{$t('dashboard.tabs.inbox')}
					{#if inboxRecords.length > 0}
						<span
							class="bg-red-500 text-white text-[10px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse"
							>{inboxRecords.length}</span
						>
					{/if}
				</button>

				<button
					class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab ===
					'clients'
						? 'border-indigo-600 text-indigo-600'
						: 'border-transparent text-gray-500 hover:text-gray-700'}"
					on:click={() => switchTab('clients')}
				>
					<Users size={18} />
					{$t('dashboard.tabs.clients')}
				</button>

				<button
					class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab ===
					'settings'
						? 'border-indigo-600 text-indigo-600'
						: 'border-transparent text-gray-500 hover:text-gray-700'}"
					on:click={() => switchTab('settings')}
				>
					<Settings size={18} />
					{$t('dashboard.tabs.settings')}
				</button>

				<button
					class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab ===
					'help'
						? 'border-indigo-600 text-indigo-600'
						: 'border-transparent text-gray-500 hover:text-gray-700'}"
					on:click={() => switchTab('help')}
				>
					<CircleHelp size={18} />
					{$t('dashboard.tabs.help')}
				</button>
			</div>
		</header>

		<main class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
			{#if currentTab === 'help'}
				<HelpTab />
			{/if}

			{#if currentTab === 'inbox'}
				<InboxTab
					{inboxRecords}
					{clients}
					on:filesSelected={(e) => {
						handleFiles(e.detail.files);
					}}
					on:assignRecord={(e) => {
						const { recordId, clientId } = e.detail;
						// The final 'false' indicates this is NOT bulk (we want toast and immediate refresh)
						assignRecord(recordId, clientId, false);
					}}
					on:assignBulkRecords={(e) => {
						const { recordIds, clientId, count } = e.detail;

	// 1. Assign all in "silent" loop (true)
	recordIds.forEach((id: string) => assignRecord(id, clientId, true));

	// 2. Refresh screen ONLY once at the end
	refreshClients();

	// 3. Show ONE success message
	triggerToast($t('alerts.link_multiple_success').replace('{n}', count.toString()));
					}}
					on:error={(e) => {
						const { message, isIgnoredFile } = e.detail;
						// Si es un archivo ignorado, mostrar Toast en lugar de Modal
						if (isIgnoredFile) {
							triggerToast(message);
						} else {
							setTimeout(() => {
								showAlert($t('common.error'), message, 'error');
							}, 10);
						}
					}}
				/>
			{/if}

			{#if currentTab === 'clients'}
				<ClientDashboard
					{clients}
					{allRecords}
					bind:selectedClientId
					isReadOnly={false}
					on:createClient={(e) => createClient(e.detail)}
					on:deleteClient={(e) => requestDeleteClient(e.detail)}
					on:renameClient={(e) => requestRenameClient(e.detail.id, e.detail.newName)}
					on:exportClient={(e) => exportClientData(e.detail)}
					on:requestUnassign={handleRequestUnassign}
				/>
			{/if}

			{#if currentTab === 'settings'}
				<SettingsTab
					{clients}
					on:backupRestored={() => {
						refreshClients(); // Refresh in-memory data and UI
						const $t = get(t);
						triggerToast($t('alerts.backup_restored')); // Shows: "Backup restored..."
					}}
					on:backupExported={() => {
						const $t = get(t);
						triggerToast($t('alerts.backup_exported')); // Shows: "Backup ready..."
					}}
					on:requestFactoryReset={() => {
						requestFactoryReset(); // Opens confirmation modal
					}}
					on:error={(e) => {
						const { message, isIgnoredFile, isCriticalError } = e.detail;
						// Si es un archivo ignorado (validación), mostrar Toast en lugar de Modal
						if (isIgnoredFile) {
							triggerToast(message);
						} else if (isCriticalError) {
							// Errores críticos (JSON.parse, estructura, corrupción) usan Modal
							setTimeout(() => {
								showAlert($t('common.error'), message, 'error');
							}, 10);
						} else {
							// Comportamiento por defecto para otros errores
							setTimeout(() => {
								showAlert($t('common.error'), message, 'error');
							}, 10);
						}
					}}
				/>
			{/if}

			<GeneralModal
				isOpen={showModal}
				title={modalTitle}
				message={modalMessage}
				type={modalType}
				inputValue={modalInputValue}
				on:confirm={(e) => {
					if (modalType === 'prompt') {
						modalInputValue = e.detail.inputValue;
					}
					handleModalConfirm();
				}}
				on:cancel={handleModalCancel}
				on:close={() => (showModal = false)}
			/>

			<DeleteModal
				isOpen={showDeleteModal}
				title={deleteModalType === 'client'
					? $t('alerts.delete_client_title')
					: $t('alerts.reset_title')}
				message={deleteModalType === 'client'
					? $t('settings.delete_client_warning', { values: { name: deleteTargetName } })
					: $t('settings.factory_reset_warning')}
				confirmationWord={$t('settings.confirm_word')}
				placeholder={$t('settings.type_to_confirm')}
				confirmBtnText={deleteModalType === 'client'
					? $t('actions.delete_confirm_btn')
					: $t('actions.reset_confirm_btn')}
				cancelBtnText={$t('actions.cancel')}
				on:close={() => (showDeleteModal = false)}
				on:confirm={executeDeleteAction}
			/>

			<RenameModal
				isOpen={showRenameModal}
				title={$t('modals.rename_client_title')}
				initialValue={clientToRenameCurrentName}
				confirmBtnText={$t('actions.rename_confirm_btn')}
				cancelBtnText={$t('actions.cancel')}
				hasError={renameModalHasError}
				errorMessage={renameModalErrorMessage}
				on:close={() => {
					// Always close the modal when user clicks cancel
					showRenameModal = false;
					// Reset error state
					renameModalHasError = false;
					renameModalErrorMessage = '';
				}}
				on:confirm={(e) => {
					confirmRenameClient(e.detail.newName);
				}}
			/>

			<UnlinkModal
				isOpen={showUnassignModal}
				title={unassignModalTitle}
				message={unassignModalMessage}
				confirmBtnText={$t('actions.confirm')}
				cancelBtnText={$t('actions.cancel')}
				on:close={() => (showUnassignModal = false)}
				on:confirm={confirmUnassignAction}
			/>

			{#if showToast}
				<ToastNotification message={toastMessage} on:close={() => (showToast = false)} />
			{/if}
		</main>
	</div>
{/if}

{#if showWelcomeModal}
	<WelcomeModal onClose={handleWelcomeModalClose} onGoToHelp={handleGoToHelp} />
{/if}

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	@media print {
		header,
		button {
			display: none !important;
		}
		.shadow-sm {
			box-shadow: none !important;
			border: 1px solid #eee;
		}
		:global(body) {
			background: white;
		}
	}
</style>
