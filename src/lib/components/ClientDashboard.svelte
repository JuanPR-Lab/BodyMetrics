<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// ICONS
	import {
	 Users,
	 ChevronDown,
	 ChevronLeft,
	 ChevronRight,
	 CheckCircle,
	 FileSpreadsheet,
	 Edit,
	 Trash2,
	 AlertCircle,
	 Undo2,
	 Scale,
	 Activity,
	 Droplets,
	 Dumbbell,
	 Bone,
	 Flame,
	 Clock,
	 BarChart3,
	 Info,
	 Download,
	 Monitor
	} from 'lucide-svelte';

	// COMPONENTS & UTILITIES
	import BodyMap from './BodyMap.svelte';
	import InfoModal from './modals/InfoModal.svelte';
	import { t } from 'svelte-i18n';
	import { PatientManager } from '../utils/patientManager';
	import { CHART_OPTIONS, getStatusColor } from '../utils/constants';
	import type { Client, BioMetricRecord } from '../../types';

	// --- PROPERTIES ---
	export let clients: Client[] = [];
	export let selectedClientId: string | null = null;
	export let allRecords: BioMetricRecord[] = [];
	export let isReadOnly = false;
	export let records: BioMetricRecord[] | undefined = undefined;
	export let clientName: string | undefined = undefined;
	export let readonly = false;
	
	$: effectiveReadOnly = isReadOnly || readonly;
	
	const dispatch = createEventDispatcher();
	
	// Sidebar and Filters
	let clientSearchTerm = '';
	let isClientListOpen = false;
	let currentPage = 1;
	const clientsPerPage = 10;
	
	let newClientCodeOrAlias = '';
	let currentFilter = 'all';
	let customDateStart = '';
	let customDateEnd = '';
	let selectedRecordId: string | null = null;
	
	// Charts
	let selectedChartMetric: keyof BioMetricRecord = 'weight';
	let hoveredIndex: number | null = null;
	let hoveredPointData: any = null;
	
	// Modals
	let showInfoModal = false;
	let infoModalTitle = '';
	let infoModalContent = '';
	
	// --- REACTIVE LOGIC ---

	// Filtering
	$: filteredClients = clients.filter((c) =>
		c.alias.toLowerCase().includes(clientSearchTerm.toLowerCase())
	);

	// Reset page when searching
	$: {
		if (clientSearchTerm) currentPage = 1;
	}

	$: totalPages = Math.ceil(filteredClients.length / clientsPerPage);

	$: paginatedClients = filteredClients.slice(
		(currentPage - 1) * clientsPerPage,
		currentPage * clientsPerPage
	);

	// Client and Data
	$: currentClient = clients.find((c) => c.id === selectedClientId);

	$: clientHistory =
		effectiveReadOnly && records
			? records
			: currentClient
				? PatientManager.getClientHistory(currentClient.id, allRecords)
				: [];

	$: displayedHistory = filterHistory(clientHistory, currentFilter, customDateStart, customDateEnd);

	$: currentRecord = selectedRecordId
		? displayedHistory.find((r: BioMetricRecord) => r.id === selectedRecordId)
		: displayedHistory.length > 0
			? displayedHistory[0]
			: null;

	$: chartData =
		currentClient && displayedHistory.length > 0
			? PatientManager.computeChartData(
					displayedHistory,
					selectedChartMetric as keyof BioMetricRecord
				)
			: null;

	$: activeChartColor =
		CHART_OPTIONS.find((o) => o.key === selectedChartMetric)?.color || '#6366f1';
	$: activeChartUnitKey = CHART_OPTIONS.find((o) => o.key === selectedChartMetric)?.unitKey || '';

	// Counters
	$: clientCounts = (() => {
		if (effectiveReadOnly && records) {
			const count = records.length;
			const counts: Record<string, number> = {};
			clients.forEach((client) => (counts[client.id] = count));
			return counts;
		} else {
			return PatientManager.getClientCounts();
		}
	})();

	// --- FUNCTIONS ---

	function filterHistory(history: any[], filter: string, start: string, end: string) {
		return PatientManager.filterHistoryByDate(history, filter, start, end);
	}

	function openInfo(metricKey: string) {
		infoModalTitle = $t(`metrics.${metricKey}`);
		infoModalContent = $t(`metrics_info.${metricKey}`);
		showInfoModal = true;
	}

	// Save Button (Hybrid Safe Version)
	let isProcessing = false;
	function handleCreateClient(e?: Event) {
	 if (isProcessing) return;
	 isProcessing = true;
	 setTimeout(() => {
	  isProcessing = false;
	 }, 500);

		const inputElement = document.getElementById('new-client-input') as HTMLInputElement;
		const valueToSave = inputElement?.value?.trim() || newClientCodeOrAlias?.trim();

		if (!valueToSave) return;

		dispatch('createClient', valueToSave);

		// Cleanup
		if (inputElement) inputElement.value = '';
		newClientCodeOrAlias = '';

		clientSearchTerm = '';
		currentPage = 1;
	}

	function handleDeleteClient() {
		dispatch('deleteClient', selectedClientId);
	}
	function handleRenameClient() {
		dispatch('renameClient', { id: selectedClientId, newName: currentClient?.alias || '' });
	}
	function handleUnassignRecord() {
		if (currentRecord) {
			dispatch('requestUnassign', currentRecord.id);
		}
	}
	function handleExport() {
		dispatch('exportClient', selectedClientId);
	}

	const STYLES = {
		filterBtn: 'px-3 py-1 text-xs font-bold rounded-full border transition-all duration-200',
		filterBtnActive: 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105',
		filterBtnInactive:
			'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
	};
</script>

<div
	class="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 h-auto lg:h-[800px] animate-fade-in"
>
	<div class="lg:col-span-1 flex flex-col gap-3 sm:gap-4 h-auto lg:h-full">
		{#if !effectiveReadOnly}
			<div
				class="bg-indigo-50 p-3 sm:p-4 rounded-lg shadow-sm border border-indigo-100 flex-shrink-0 relative z-0"
			>
				<h3 class="font-bold text-indigo-900 text-xs uppercase mb-2 sm:mb-3 tracking-wide">
					{$t('dashboard.create_btn')}
				</h3>

				<div class="space-y-2">
					<input
						id="new-client-input"
						bind:value={newClientCodeOrAlias}
						placeholder={$t('dashboard.client_id_placeholder')}
						class="w-full text-sm border border-indigo-200 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
						on:keydown={(e) => e.key === 'Enter' && handleCreateClient()}
					/>

					<button
						type="button"
						class="w-full bg-gray-800 text-white text-sm font-bold py-2 rounded hover:bg-black transition shadow-sm flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
						on:click|preventDefault|stopPropagation={handleCreateClient}
						on:touchstart|passive={handleCreateClient}
					>
						<CheckCircle size={14} />
						{$t('actions.save')}
					</button>
				</div>
			</div>
		{/if}

		<div class="lg:hidden bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
			<button
				on:click={() => (isClientListOpen = !isClientListOpen)}
				class="w-full flex items-center justify-center px-3 py-5 font-medium text-gray-700 hover:bg-gray-50 transition relative"
			>
				<Users class="text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2" size={20} />
				<span class="text-sm font-bold text-gray-700 uppercase absolute left-1/2 -translate-x-1/2">
					{$t('dashboard.client_list_title')}
				</span>
				<ChevronDown
					class="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 transition-transform {isClientListOpen
						? 'rotate-180'
						: ''}"
					size={16}
				/>
			</button>

			{#if isClientListOpen}
				<div class="border-t border-gray-100">
					<div class="p-2 border-b bg-gray-50">
						<input
							type="text"
							bind:value={clientSearchTerm}
							placeholder={$t('dashboard.filter_placeholder')}
							class="w-full text-sm border rounded px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
							on:keydown={(e) => {
								if (e.key === 'Enter' && filteredClients.length > 0) {
									selectedClientId = filteredClients[0].id;
								}
							}}
						/>
					</div>
					<div class="max-h-[300px] overflow-y-auto p-1 sm:p-2 space-y-1">
						{#if clients.length === 0}
							<div class="p-4 text-center text-xs text-slate-400 italic">
								{$t('dashboard.no_clients_created')}
							</div>
						{:else}
							{#each paginatedClients as client (client.id)}
								<button
									on:click={() => {
										selectedClientId = client.id;
										isClientListOpen = false;
									}}
									class="w-full text-left px-3 py-3 rounded-lg text-sm group transition-all duration-150 flex justify-between items-center touch-manipulation border border-transparent hover:border-indigo-200 hover:shadow-sm {selectedClientId ===
									client.id
										? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-sm'
										: 'bg-white text-gray-700 hover:bg-indigo-50'}"
								>
									<div class="truncate pr-2 flex items-center gap-2">
										<div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
										<div class="font-semibold truncate">{client.alias}</div>
									</div>
									<span
										class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold min-w-[24px] text-center"
										>{clientCounts[client.id] || 0}</span
									>
								</button>
							{/each}
						{/if}
					</div>
					{#if filteredClients.length > clientsPerPage}
						<div
							class="border-t border-gray-100 p-2 bg-gray-50 flex justify-center gap-4 items-center"
						>
							<button
								on:click={() => (currentPage = Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
								class="p-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
								><ChevronLeft size={16} /></button
							>
							<span class="text-xs text-gray-500"
								>{$t('dashboard.pagination.page_of', {
									values: { current: currentPage, total: totalPages }
								})}</span
							>
							<button
								on:click={() => (currentPage = Math.min(totalPages, currentPage + 1))}
								disabled={currentPage === totalPages}
								class="p-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
								><ChevronRight size={16} /></button
							>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div
			class="hidden lg:flex bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex-col h-[560px]"
		>
			<div class="p-2 border-b bg-gray-50">
				<input
					type="text"
					bind:value={clientSearchTerm}
					placeholder={$t('dashboard.filter_placeholder')}
					class="w-full text-sm border rounded px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
					on:keydown={(e) => {
						if (e.key === 'Enter' && filteredClients.length > 0) {
							selectedClientId = filteredClients[0].id;
							isClientListOpen = false;
						}
					}}
				/>
			</div>

			<div class="overflow-y-auto flex-1 p-1 sm:p-2 space-y-1">
				{#if clients.length === 0}
					<div class="flex flex-col items-center justify-center h-32 text-center p-4">
						<Users size={24} class="text-slate-300 mb-2" />
						<p class="text-xs text-slate-400 italic leading-relaxed">
							{$t('dashboard.no_clients_created')}
						</p>
					</div>
				{:else}
					{#each paginatedClients as client (client.id)}
						<button
							on:click={() => (selectedClientId = client.id)}
							class="w-full text-left px-3 py-3 rounded-lg text-sm group transition-all duration-150 flex justify-between items-center touch-manipulation border border-transparent hover:border-indigo-200 hover:shadow-sm {selectedClientId ===
							client.id
								? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-sm'
								: 'bg-white text-gray-700 hover:bg-indigo-50'}"
						>
							<div class="truncate pr-2 flex items-center gap-2">
								<div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
								<div class="font-semibold truncate">{client.alias}</div>
							</div>
							<span
								class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold min-w-[24px] text-center"
								>{clientCounts[client.id] || 0}</span
							>
						</button>
					{/each}
				{/if}
			</div>

			{#if filteredClients.length > clientsPerPage}
				<div
					class="border-t border-gray-200 p-2 bg-gray-50 flex justify-center gap-4 items-center mt-auto"
				>
					<button
						on:click={() => (currentPage = Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						class="p-1 rounded border hover:bg-gray-50 disabled:opacity-50"
						><ChevronLeft size={16} /></button
					>
					<span class="text-xs text-gray-500"
						>{$t('dashboard.pagination.page_of', {
							values: { current: currentPage, total: totalPages }
						})}</span
					>
					<button
						on:click={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
						class="p-1 rounded border hover:bg-gray-50 disabled:opacity-50"
						><ChevronRight size={16} /></button
					>
				</div>
			{/if}
		</div>
	</div>

	<div
		class="lg:col-span-3 flex flex-col gap-4 sm:gap-6 h-full lg:overflow-y-auto lg:pr-1 lg:pb-10"
	>
		{#if !selectedClientId}
			<div
				class="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200 py-12 px-4 text-center"
			>
				<div class="bg-gray-50 p-6 rounded-full mb-4">
					<Users class="text-slate-300" size={48} strokeWidth={1.5} />
				</div>
				<p class="max-w-xs font-medium text-slate-500">{$t('dashboard.select_client_prompt')}</p>
			</div>
		{:else}
			<div
				class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 flex-shrink-0"
			>
				<div
					class="flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-4 w-full"
				>
					<div class="text-center sm:text-left">
						<h2 class="text-2xl font-bold text-gray-800 break-words">
							{effectiveReadOnly && clientName ? clientName : currentClient?.alias}
						</h2>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
						<button
							on:click={handleExport}
							class="w-full sm:col-span-1 justify-center text-emerald-600 hover:text-white border border-emerald-200 hover:bg-emerald-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-2"
							title={$t('dashboard.export_csv_btn')}
						>
							<FileSpreadsheet size={14} /><span>{$t('dashboard.export_csv_btn')}</span>
						</button>

						{#if !effectiveReadOnly}
							<button
								on:click={handleRenameClient}
								class="w-full sm:col-span-1 sm:w-auto justify-center text-indigo-600 hover:text-white border border-indigo-200 hover:bg-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-2"
								title={$t('actions.rename')}
							>
								<Edit size={14} /><span>{$t('actions.rename')}</span>
							</button>

							<button
								on:click={handleDeleteClient}
								class="w-full sm:col-span-1 sm:w-auto justify-center text-red-600 hover:text-white border border-red-200 hover:bg-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-2"
								title={$t('actions.delete')}
							>
								<Trash2 size={14} /><span>{$t('actions.delete')}</span>
							</button>
						{/if}
					</div>
				</div>

				<div class="flex flex-col sm:flex-row items-center gap-3 border-t pt-3 w-full">
					<div
						class="flex flex-col sm:flex-row items-center sm:items-start w-full sm:w-auto gap-2 sm:gap-0"
					>
						<div class="w-full sm:w-12 text-center sm:text-left flex-shrink-0 sm:pt-1 mb-1 sm:mb-0">
							<span class="text-xs font-bold text-gray-400 uppercase"
								>{$t('dashboard.filters.title')}</span
							>
						</div>
						<div
							class="flex flex-wrap justify-center sm:justify-start gap-2 flex-grow px-10 sm:px-0"
						>
							<button
								on:click={() => (currentFilter = 'all')}
								class="{STYLES.filterBtn} {currentFilter === 'all'
									? STYLES.filterBtnActive
									: STYLES.filterBtnInactive}">{$t('dashboard.filters.all')}</button
							>
							<button
								on:click={() => (currentFilter = '1m')}
								class="{STYLES.filterBtn} {currentFilter === '1m'
									? STYLES.filterBtnActive
									: STYLES.filterBtnInactive}">{$t('dashboard.filters.last_month')}</button
							>
							<button
								on:click={() => (currentFilter = '3m')}
								class="{STYLES.filterBtn} {currentFilter === '3m'
									? STYLES.filterBtnActive
									: STYLES.filterBtnInactive}">{$t('dashboard.filters.last_3_months')}</button
							>
							<button
								on:click={() => (currentFilter = '6m')}
								class="{STYLES.filterBtn} {currentFilter === '6m'
									? STYLES.filterBtnActive
									: STYLES.filterBtnInactive}">{$t('dashboard.filters.last_6_months')}</button
							>
							<button
								on:click={() => (currentFilter = '1y')}
								class="{STYLES.filterBtn} {currentFilter === '1y'
									? STYLES.filterBtnActive
									: STYLES.filterBtnInactive}">{$t('dashboard.filters.last_year')}</button
							>
						</div>
					</div>

					<div
						class="flex items-center gap-2 sm:ml-auto border border-slate-200 rounded-xl px-4 py-2 bg-white flex-shrink-0 mt-2 sm:mt-0 shadow-sm transition-colors hover:border-indigo-300"
					>
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
							>{$t('dashboard.filters.from')}</span
						>
						<input
							type="date"
							bind:value={customDateStart}
							on:change={() => (currentFilter = 'custom')}
							class="text-xs text-gray-500 font-bold bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors"
						/>
						<span class="text-slate-300 mx-1">|</span>
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
							>{$t('dashboard.filters.to')}</span
						>
						<input
							type="date"
							bind:value={customDateEnd}
							on:change={() => (currentFilter = 'custom')}
							class="text-xs text-gray-500 font-bold bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors"
						/>
					</div>
				</div>
			</div>

			<div
				class="w-full flex-shrink-0 bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-200 shadow-inner overflow-x-auto scrollbar-thin"
			>
				{#if displayedHistory.length === 0}
					<div
						class="flex flex-col items-center justify-center py-4 text-center px-4 w-full h-[85px] sm:h-[105px]"
					>
						{#if effectiveReadOnly}
							<div class="text-gray-400 flex flex-col items-center gap-1">
								<span class="text-xs italic">{$t('dashboard.client_no_history')}</span>
							</div>
						{:else if (clientCounts[currentClient?.id || ''] || 0) === 0}
							<div class="text-gray-400 flex flex-col items-center gap-1">
								<span class="text-xs italic">{$t('dashboard.client_no_history')}</span>
							</div>
						{:else}
							<div
								class="flex items-center gap-3 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 shadow-sm animate-pulse"
							>
								<AlertCircle size={18} class="flex-shrink-0" />
								<p class="text-xs font-bold text-left">
									{$t('dashboard.client_data_missing_short')}
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex gap-2 sm:gap-3">
						{#each displayedHistory as rec (rec.id)}
							<button
								on:click={() => (selectedRecordId = rec.id)}
								class="flex-shrink-0 w-[85px] sm:w-[85px] p-2 rounded-lg border text-left transition-all touch-manipulation relative
                {selectedRecordId === rec.id || (!selectedRecordId && rec === currentRecord)
									? 'border-indigo-400 bg-indigo-50 shadow-md transform scale-105 z-10'
									: 'bg-white border-gray-200 opacity-80 hover:opacity-100'}"
							>
								<div
									class="text-[12px] sm:text-[13px] text-gray-500 uppercase font-bold mb-1 leading-tight"
								>
									{rec.date} <br /><span class="font-normal opacity-75 text-[11px] sm:text-[12px]"
										>{rec.time}</span
									>
								</div>
								<div class="font-black text-gray-800 text-lg sm:text-xl">
									{rec.weight}<span class="text-xs sm:text-sm font-normal text-gray-400 ml-0.5"
										>{$t('units.kg')}</span
									>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			{#if currentRecord}
				<div
					class="flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-0 -mt-2 mb-4 border-b border-gray-100 pb-3 w-full"
				>
					<div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
						<span class="text-xs font-bold text-gray-400 uppercase tracking-wider"
							>{$t('dashboard.latest_reading')}</span
						>
						<span class="text-xs font-mono text-gray-300 hidden sm:inline">|</span>
						<div class="flex items-baseline gap-1.5">
							<span class="text-xs font-black text-gray-700">{currentRecord.date}</span>
							<span class="text-[10px] font-medium text-gray-400">{currentRecord.time}</span>
						</div>
					</div>

					{#if !effectiveReadOnly}
						<button
							on:click={handleUnassignRecord}
							class="text-red-600 hover:text-white border border-red-200 hover:bg-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-2"
						>
							<Undo2 size={14} />
							<span>{$t('dashboard.detach_record')}</span>
						</button>
					{/if}
				</div>

				<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
					<div class="flex flex-col gap-3 sm:gap-4 xl:col-span-1">
						<div class="grid grid-cols-2 gap-3 sm:gap-4">
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-slate-800 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.weight')}</span
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Scale size={20} class="text-slate-400 mb-1" strokeWidth={2} />
									<div class="text-right leading-none">
										<span class="text-xl sm:text-2xl font-black text-slate-800"
											>{currentRecord?.weight ?? '--'}</span
										><span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5"
											>{$t('units.kg')}</span
										>
									</div>
								</div>
							</div>
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-pink-500 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.bmi')}</span
									><button
										on:click={() => openInfo('bmi')}
										class="text-slate-300 hover:text-indigo-500 transition-colors"
										><Info size={16} /></button
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Activity size={20} class="text-pink-500 mb-1" strokeWidth={2} /><span
										class="text-xl sm:text-2xl font-black leading-none {getStatusColor(
											'bmi',
											currentRecord?.bmi,
											currentRecord
										)
											.replace('bg-', 'text-')
											.replace('-100', '-600')}">{currentRecord?.bmi ?? '--'}</span
									>
								</div>
							</div>
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.body_fat')}</span
									><button
										on:click={() => openInfo('body_fat')}
										class="text-slate-300 hover:text-indigo-500 transition-colors"
										><Info size={16} /></button
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Droplets size={20} class="text-amber-400 mb-1" strokeWidth={2} />
									<div class="text-right leading-none">
										<span
											class="text-xl sm:text-2xl font-black {getStatusColor(
												'fat',
												currentRecord?.bodyFat,
												currentRecord
											)
												.replace('bg-', 'text-')
												.replace('-100', '-600')}">{currentRecord?.bodyFat ?? '--'}</span
										><span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">%</span>
									</div>
								</div>
							</div>
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.muscle_mass')}</span
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Dumbbell size={20} class="text-indigo-400 mb-1" strokeWidth={2} />
									<div class="text-right leading-none">
										<span class="text-xl sm:text-2xl font-black text-slate-800"
											>{currentRecord?.muscleMass ?? '--'}</span
										><span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.kg')}</span>
									</div>
								</div>
							</div>
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-cyan-500 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.water')}</span
									><button
										on:click={() => openInfo('water')}
										class="text-slate-300 hover:text-indigo-500 transition-colors"
										><Info size={16} /></button
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Droplets size={20} class="text-cyan-400 mb-1" strokeWidth={2} />
									<div class="text-right leading-none">
										<span class="text-xl sm:text-2xl font-black text-slate-800"
											>{currentRecord?.waterPercentage ?? '--'}</span
										><span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">%</span>
									</div>
								</div>
							</div>
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-gray-400 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.bone_mass')}</span
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Bone size={20} class="text-slate-400 mb-1" strokeWidth={2} />
									<div class="text-right leading-none">
										<span class="text-xl sm:text-2xl font-black text-slate-800"
											>{currentRecord?.boneMass ?? '--'}</span
										><span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.kg')}</span>
									</div>
								</div>
							</div>
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.dci')}</span
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Flame size={20} class="text-emerald-400 mb-1" strokeWidth={2} />
									<div class="text-right leading-none">
										<span class="text-xl sm:text-2xl font-black text-slate-800"
											>{currentRecord?.dci ?? '--'}</span
										><span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.kcal')}</span
										>
									</div>
								</div>
							</div>
							<div
								class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500 transition-transform hover:scale-[1.02] h-full flex flex-col justify-between"
							>
								<div class="min-h-[24px] flex items-center justify-between mb-2">
									<span
										class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate"
										>{$t('metrics.metabolic_age')}</span
									><button
										on:click={() => openInfo('metabolic_age')}
										class="text-slate-300 hover:text-indigo-500 transition-colors"
										><Info size={16} /></button
									>
								</div>
								<div class="flex items-end justify-between mt-1">
									<Clock size={20} class="text-purple-400 mb-1" strokeWidth={2} />
									<div class="text-right leading-none">
										<span
											class="text-xl sm:text-2xl font-black {getStatusColor(
												'meta',
												currentRecord?.metabolicAge,
												currentRecord
											)
												.replace('bg-', 'text-')
												.replace('-100', '-600')}">{currentRecord?.metabolicAge ?? '--'}</span
										><span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5"
											>{$t('units.years')}</span
										>
									</div>
								</div>
							</div>
						</div>

						<InfoModal
							isOpen={showInfoModal}
							title={infoModalTitle}
							message={infoModalContent}
							closeAriaLabel={$t('common.close') || 'Close'}
							on:close={() => (showInfoModal = false)}
						/>
					</div>

					<div
						class="xl:col-span-1 h-full min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] xl:min-h-[500px]"
					>
						<BodyMap record={currentRecord} on:info={() => openInfo('segmental')} />
					</div>
				</div>

				{#if chartData}
					<div class="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mt-4 sm:mt-6">
						<div class="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
							<h3
								class="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2"
							>
								<BarChart3 size={16} class="text-indigo-600" />
								{$t('dashboard.evolution_chart')} ({chartData.pointsData.length})
							</h3>
							<select
								bind:value={selectedChartMetric}
								class="w-full sm:w-auto min-w-[200px] sm:min-w-[240px] border border-gray-300 rounded px-3 py-1.5 text-xs sm:text-sm font-medium bg-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none cursor-pointer shadow-sm"
							>
								{#each CHART_OPTIONS as option}<option value={option.key}>{$t(option.label)}</option
									>{/each}
							</select>
						</div>

						<div
							role="img"
							aria-label="Evolution Chart"
							class="h-48 sm:h-64 md:h-72 w-full relative group"
							on:mouseleave={() => {
								hoveredIndex = null;
								hoveredPointData = null;
							}}
						>
							<svg
								viewBox="-12 -5 115 120"
								preserveAspectRatio="none"
								class="w-full h-full overflow-visible font-sans"
							>
								<defs
									><linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1"
										><stop offset="0%" stop-color={activeChartColor} stop-opacity="0.2" /><stop
											offset="100%"
											stop-color={activeChartColor}
											stop-opacity="0"
										/></linearGradient
									></defs
								>
								{#each chartData.gridLines as grid}
									<line
										x1="0"
										y1={grid.y}
										x2="100"
										y2={grid.y}
										stroke="#e5e7eb"
										stroke-width="0.5"
									/>
									<text
										x="-3"
										y={grid.y + 1.5}
										font-size="3.0"
										font-weight="bold"
										fill="#9ca3af"
										text-anchor="end">{grid.label}</text
									>
								{/each}
								<polyline points={chartData.areaPath} fill="url(#chartGradient)" />
								<polyline
									fill="none"
									stroke={activeChartColor}
									stroke-width="1.5"
									points={chartData.polyline}
									vector-effect="non-scaling-stroke"
									stroke-linejoin="round"
									stroke-linecap="round"
								/>
								{#each chartData.pointsData as p, i}
									<circle
										cx={p.x}
										cy={p.y}
										r={hoveredIndex === i ? 3 : 1.5}
										fill={activeChartColor}
										stroke="white"
										stroke-width="0.5"
										class="transition-all duration-150 pointer-events-none"
									/>
									<rect
										role="presentation"
										x={p.x - 3}
										y="0"
										width="6"
										height="100"
										fill="transparent"
										class="cursor-pointer hover:fill-gray-50/10"
										on:mouseenter={() => {
											const isHighPoint = p.y < 20;
											let alignment = 'center';
											if (p.x < 15) {
												alignment = 'left';
											} else if (p.x > 85) {
												alignment = 'right';
											}
											hoveredIndex = i;
											hoveredPointData = {
												...p,
												unitKey: activeChartUnitKey,
												isHighPoint,
												alignment
											};
										}}
										on:touchstart|passive={() => {
											const isHighPoint = p.y < 20;
											let alignment = 'center';
											if (p.x < 15) {
												alignment = 'left';
											} else if (p.x > 85) {
												alignment = 'right';
											}
											hoveredIndex = i;
											hoveredPointData = {
												...p,
												unitKey: activeChartUnitKey,
												isHighPoint,
												alignment
											};
										}}
									/>
									{#if p.showLabel}
										<text
											x={p.x}
											y="112"
											font-size="3.2"
											font-weight="bold"
											fill="#6b7280"
											text-anchor="middle">{p.date.slice(0, 5)}</text
										>
									{/if}
								{/each}
							</svg>

							{#if hoveredPointData}
								<div
									class="absolute bg-gray-900 text-white text-xs sm:text-sm rounded px-2 sm:px-3 py-1 sm:py-2 pointer-events-none shadow-xl z-50 min-w-[80px] sm:min-w-[100px] text-center transition-all duration-75"
									style="left: {hoveredPointData.alignment === 'left'
										? hoveredPointData.x + 2
										: hoveredPointData.alignment === 'right'
											? hoveredPointData.x - 2
											: hoveredPointData.x}%; top: {hoveredPointData.isHighPoint
										? hoveredPointData.y + 15
										: hoveredPointData.y - 20}%; transform: {hoveredPointData.alignment === 'left'
										? 'translate(0, -50%)'
										: hoveredPointData.alignment === 'right'
											? 'translate(-100%, -50%)'
											: 'translate(-50%, -50%)'} translateY({hoveredPointData.isHighPoint
										? '20px'
										: '-20px'});"
								>
									<div class="font-black text-base sm:text-lg leading-none mb-1">
										{hoveredPointData.val}
										<span class="text-xs font-normal opacity-80"
											>{$t(`units.${hoveredPointData.unitKey}`)}</span
										>
									</div>
									<div
										class="text-[9px] sm:text-[10px] font-mono text-gray-300 border-t border-gray-700 pt-1 mt-1"
									>
										{hoveredPointData.date}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>
