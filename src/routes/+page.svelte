<script lang="ts">
	// ---------------------------------------------------------------------------
	// IMPORTS
	// ---------------------------------------------------------------------------
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { locale, t, isLoading as isLocaleLoading } from 'svelte-i18n';
	import '$lib/i18n';

	// Logic & Utils
	import { PatientManager, type Client } from '$lib/utils/patientManager';
	import { parseScaleFiles, type BioMetricRecord } from '$lib/utils/csvSDparser';
	import { exportToCSV } from '$lib/utils/exporters';

	// Components - Layout & Tabs
	import AppHeader from '$lib/components/AppHeader.svelte';
	import InboxTab from '$lib/components/InboxTab.svelte';
	import ClientDashboard from '$lib/components/ClientDashboard.svelte';
	import SettingsTab from '$lib/components/SettingsTab.svelte';
	import HelpTab from '$lib/components/HelpTab.svelte';
	import ToastNotification from '$lib/components/ToastNotification.svelte';

	// Components - Modals
	import WelcomeModal from '$lib/components/modals/WelcomeModal.svelte';
	import DeleteModal from '$lib/components/modals/DeleteModal.svelte';
	import RenameModal from '$lib/components/modals/RenameModal.svelte';
	import GeneralModal from '$lib/components/modals/GeneralModal.svelte';
	import UnlinkModal from '$lib/components/modals/UnlinkModal.svelte';

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
	let fileInput: HTMLInputElement | null = null;

	// Selection
	let selectedClientId: string = '';
	
	// --- STATE: MODALS & TOAST ---
	
	// 1. Generic Modal
	let showModal = false;
	let modalTitle = '';
	let modalMessage = '';
	let modalType: 'confirm' | 'alert' | 'error' | 'success' | 'prompt' = 'alert';
	let modalConfirmCallback: (() => void) | null = null;
	let modalCancelCallback: (() => void) | null = null;
	let modalInputValue = '';

	// 2. Delete Modal
	let showDeleteModal = false;
	let deleteModalType: 'client' | 'reset' = 'client';
	let deleteTargetId: string | null = null;
	let deleteTargetName: string = '';

	// 3. Rename Modal
	let showRenameModal = false;
	let renameModalHasError = false;
	let renameModalErrorMessage = '';
	let clientToRenameId: string | null = null;
	let clientToRenameCurrentName: string = '';

	// 4. Unlink Modal
	let showUnassignModal = false;
	let unassignModalTitle = '';
	let unassignModalMessage = '';
	let unassignTargetId: string | null = null;

	// 5. Toast & Welcome
	let showToast = false;
	let toastMessage = '';
	let showWelcomeModal = false;

	// ---------------------------------------------------------------------------
	// REACTIVE STATEMENTS
	// ---------------------------------------------------------------------------

	// Inbox: Records without a client
	// Helper simple para ordenar por fecha
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

	$: inboxRecords = allRecords
		.filter((r) => !PatientManager.getClientForRecord(r.id))
		.sort((a, b) => getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time));

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

		if (clients.length === 0) {
			showWelcomeModal = true;
		}
	});

	// ---------------------------------------------------------------------------
	// CORE FUNCTIONS
	// ---------------------------------------------------------------------------

	function refreshClients() {
		clients = PatientManager.getClients();
		clientCounts = PatientManager.getClientCounts();
		allRecords = [...allRecords]; // Force reactivity
	}

	const switchTab = (tab: string) => {
		// TypeScript casting seguro ya que el Header emite strings validos
		currentTab = tab as 'inbox' | 'clients' | 'settings' | 'help';
		if (tab !== 'clients') {
			selectedClientId = '';
		}
	};

	// --- FILE HANDLING (Unified & Clean) ---
	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		
		const filesArray = Array.from(files);
		const validFiles: File[] = [];
		const ignoredFiles: File[] = [];
		
		// STRICT WHITELIST: Only accept DATA*.CSV
		filesArray.forEach(file => {
			const fileName = file.name.toUpperCase();
			if (fileName.includes('DATA') && fileName.endsWith('.CSV')) {
				validFiles.push(file);
			} else {
				ignoredFiles.push(file);
			}
		});
		
		// Case A: Only garbage
		if (validFiles.length === 0 && ignoredFiles.length > 0) {
			const $t = get(t);
			triggerToast($t('alerts.ignored_files_warning') || 'Archivo ignorado. Solo DATA*.csv');
			return;
		}
		
		// Case B: Mixed content
		if (ignoredFiles.length > 0) {
			const $t = get(t);
			triggerToast($t('alerts.processed_files_omitted').replace('{n}', validFiles.length.toString()));
		}
		
		isProcessing = true;
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
			// Error crítico de parseo (contenido corrupto)
			setTimeout(() => {
				showAlert($t('upload.error_title'), $t('upload.error'), 'error');
			}, 10);
		} finally {
			isProcessing = false;
			isDragging = false;
		}
	};

	// --- CLIENT MANAGEMENT (CRUD) ---

	function createClient(aliasToCreate: string) {
		if (!aliasToCreate) return;
		const isDuplicate = clients.some(
			(client) => client.alias.toLowerCase() === aliasToCreate.toLowerCase()
		);

		if (isDuplicate) {
			const $t = get(t);
			showAlert($t('dashboard.client_exists_title'), $t('dashboard.client_exists_message'), 'alert');
			return;
		}

		const newId = Date.now().toString(36) + Math.random().toString(36).substring(2);
		if (PatientManager.addClient(newId, aliasToCreate)) {
			refreshClients();
			const $t = get(t);
			triggerToast($t('alerts.client_created'));
		}
	}

	// Rename Logic
	const requestRenameClient = (clientId: string, currentName: string) => {
		clientToRenameId = clientId;
		clientToRenameCurrentName = currentName;
		showRenameModal = true;
	};

	const confirmRenameClient = (newName: string) => {
		if (!clientToRenameId) return;

		// Check duplicates
		const isDuplicate = clients.some(
			(client) =>
				client.id !== clientToRenameId && client.alias.toLowerCase() === newName.toLowerCase()
		);
		
		// Check if same name
		const isSame = clients.some(c => c.id === clientToRenameId && c.alias.toLowerCase() === newName.toLowerCase());

		if (isDuplicate || isSame) {
			const $t = get(t);
			renameModalHasError = true;
			renameModalErrorMessage = $t('dashboard.client_exists_message');
			return;
		}

		if (PatientManager.renameClient(clientToRenameId, newName)) {
			refreshClients();
			const $t = get(t);
			triggerToast($t('alerts.client_renamed'));
			showRenameModal = false;
			renameModalHasError = false;
		} else {
			const $t = get(t);
			renameModalHasError = true;
			renameModalErrorMessage = $t('dashboard.client_exists_message'); // Generic error
		}
	};

	// Delete Logic
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
			PatientManager.deleteClient(deleteTargetId);
			if (selectedClientId === deleteTargetId) selectedClientId = '';
			refreshClients();
			triggerToast($t('alerts.client_deleted'));
		} else if (deleteModalType === 'reset') {
			PatientManager.deleteAllData();
			clients = [];
			allRecords = [];
			clientCounts = {};
			selectedClientId = '';
			currentTab = 'inbox';
			refreshClients();
			triggerToast($t('alerts.reset_success'));
		}
		showDeleteModal = false;
	};

	// --- ASSIGNMENT LOGIC ---

	const assignRecord = (recordId: string, clientId: string, silent = false) => {
		if (!clientId) return;
		PatientManager.assignRecordToClient(recordId, clientId);
		if (!silent) {
			refreshClients();
			const $t = get(t);
			triggerToast($t('alerts.link_success'));
		}
	};

	const handleRequestUnassign = (e: CustomEvent<string>) => {
		unassignTargetId = e.detail;
		const $t = get(t);
		unassignModalTitle = $t('dashboard.detach_record_title');
		unassignModalMessage = $t('alerts.detach_record_confirm');
		showUnassignModal = true;
	};

	const confirmUnassignAction = () => {
		if (!unassignTargetId) return;
		PatientManager.unassignRecord(unassignTargetId);
		refreshClients();
		const $t = get(t);
		triggerToast($t('alerts.record_detached'));
		unassignTargetId = null;
		showUnassignModal = false;
	};

	// --- EXPORT & IMPORT ---
	
	const exportClientData = (clientId?: string) => {
		const $t = get(t);
		const targetClientId = clientId || selectedClientId;

		if (!targetClientId) {
			setTimeout(() => showAlert($t('dashboard.no_data_title'), $t('dashboard.no_data_client'), 'error'), 10);
			return;
		}

		const history = PatientManager.getClientHistory(targetClientId, allRecords);
		if (!history || history.length === 0) {
			setTimeout(() => showAlert($t('dashboard.no_data_title'), $t('dashboard.no_data_client'), 'error'), 10);
			return;
		}

		const client = clients.find((c) => c.id === targetClientId);
		
		// Date formatting for filename
		const now = new Date();
		const ts = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
		const cleanClientName = client ? client.alias.replace(/\s+/g, '_') : 'Unknown';
		const filename = `BM_${cleanClientName}_${ts}.csv`;

		// CSV Headers Map
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
		triggerToast($t('toast.export_success'));
	};

	// --- HELPER FUNCTIONS ---

	const triggerToast = (msg: string) => {
		toastMessage = msg;
		showToast = true;
		setTimeout(() => { showToast = false; }, 3000);
	};

	const showAlert = (title: string, message: string, type: 'alert' | 'error' | 'success' = 'alert') => {
		modalTitle = title;
		modalMessage = message;
		modalType = type;
		modalConfirmCallback = null;
		modalCancelCallback = null;
		setTimeout(() => { showModal = true; }, 10);
	};

	const handleModalConfirm = () => {
		if (modalConfirmCallback) modalConfirmCallback();
		showModal = false;
	};

	const handleModalCancel = () => {
		if (modalCancelCallback) modalCancelCallback();
		showModal = false;
	};

	const handleGlobalModalKeydown = (e: KeyboardEvent) => {
		if (!showModal) return;
		e.stopPropagation();
		if (e.key === 'Enter') {
			e.preventDefault();
			if (modalType === 'confirm' || modalType === 'prompt') handleModalConfirm();
			else showModal = false;
		} else if (e.key === 'Escape') {
			showModal = false;
		}
	};
</script>

<svelte:window on:keydown={handleGlobalModalKeydown} />

{#if $isLocaleLoading}
	<div class="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400 gap-3">
		<div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
		<span class="font-mono text-xs uppercase tracking-widest font-bold">Cargando...</span>
	</div>
{:else}
	<div
		role="application"
		class="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 select-none"
		on:dragover|preventDefault={(e) => {
			if (currentTab === 'inbox') isDragging = true;
		}}
		on:dragleave|preventDefault={(e) => {
			if (currentTab === 'inbox') isDragging = false;
		}}
		on:drop|preventDefault={(e) => {
			if (currentTab === 'inbox') {
				isDragging = false;
				if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
			}
		}}
	>
		<AppHeader 
			{currentTab} 
			inboxCount={inboxRecords.length} 
			on:tabChange={(e) => switchTab(e.detail)} 
		/>

		<main class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
			{#if currentTab === 'help'}
				<HelpTab />
			{/if}

			{#if currentTab === 'inbox'}
				<InboxTab
					{inboxRecords}
					{clients}
					on:filesSelected={(e) => handleFiles(e.detail.files)}
					on:assignRecord={(e) => assignRecord(e.detail.recordId, e.detail.clientId, false)}
					on:assignBulkRecords={(e) => {
						const { recordIds, clientId, count } = e.detail;
						recordIds.forEach((id: string) => assignRecord(id, clientId, true));
						refreshClients();
						const $t = get(t);
						triggerToast($t('alerts.link_multiple_success').replace('{n}', count.toString()));
					}}
					on:error={(e) => {
						const { message, isIgnoredFile } = e.detail;
						if (isIgnoredFile) triggerToast(message);
						else setTimeout(() => showAlert(get(t)('common.error'), message, 'error'), 10);
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
						refreshClients();
						triggerToast(get(t)('alerts.backup_restored'));
					}}
					on:backupExported={() => triggerToast(get(t)('alerts.backup_exported'))}
					on:requestFactoryReset={requestFactoryReset}
					on:error={(e) => {
						const { message, isIgnoredFile } = e.detail;
						if (isIgnoredFile) triggerToast(message);
						else setTimeout(() => showAlert(get(t)('common.error'), message, 'error'), 10);
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
					if (modalType === 'prompt') modalInputValue = e.detail.inputValue;
					handleModalConfirm();
				}}
				on:cancel={handleModalCancel}
				on:close={() => (showModal = false)}
			/>

			<DeleteModal
				isOpen={showDeleteModal}
				title={deleteModalType === 'client' ? $t('alerts.delete_client_title') : $t('alerts.reset_title')}
				message={deleteModalType === 'client' ? $t('settings.delete_client_warning', { values: { name: deleteTargetName } }) : $t('settings.factory_reset_warning')}
				confirmationWord={$t('settings.confirm_word')}
				placeholder={$t('settings.type_to_confirm')}
				confirmBtnText={deleteModalType === 'client' ? $t('actions.delete_confirm_btn') : $t('actions.reset_confirm_btn')}
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
					showRenameModal = false;
					renameModalHasError = false;
				}}
				on:confirm={(e) => confirmRenameClient(e.detail.newName)}
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
	<WelcomeModal onClose={() => (showWelcomeModal = false)} onGoToHelp={() => (currentTab = 'help')} />
{/if}

<style>
	@media print {
		:global(body) { background: white; }
	}
</style>