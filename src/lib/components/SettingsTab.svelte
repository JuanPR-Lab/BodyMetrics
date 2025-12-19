<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { t } from 'svelte-i18n';
	import { PatientManager } from '$lib/utils/patientManager';
	import { Users, BarChart3, Save, Download, Upload, AlertTriangle, Trash2 } from 'lucide-svelte';
	import type { Client } from '../../types';

	// Props received from parent
	export let clients: Client[] = [];

	// Calculate total assigned measurements using the Manager
	$: totalMeasurements = PatientManager.getAssignmentCount();

	const dispatch = createEventDispatcher();

	// --- EXPORT LOGIC ---
	const handleExportBackup = () => {
	 const now = new Date();
	 const timestamp = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
	 const filename = `BM_Backup_${timestamp}.json`;

	 // 1. Generate and trigger download
	 PatientManager.exportBackup(filename);

	 // 2. Immediately notify parent to show Toast
	 // This gives the "Mission accomplished" feeling while the browser opens the save dialog
	 dispatch('backupExported');
	};

	// --- IMPORT LOGIC ---
	const handleImportBackup = async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		await handleBackupFile(file);
		
		// Clear input to allow selecting the same file again if desired
		(e.target as HTMLInputElement).value = '';
	};

	const handleDrop = async (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		
		const file = e.dataTransfer?.files?.[0];
		if (!file) return;
		
		await handleBackupFile(file);
	};

	const handleBackupFile = async (file: File) => {
		// 1. Validate filename (whitelist filter)
		// The name of the file must contain the literal string 'BM_Backup' (case insensitive) AND have .json extension
		const fileName = file.name.toLowerCase();
		if (!fileName.includes('bm_backup') || !fileName.endsWith('.json')) {
			dispatch('error', { message: $t('alerts.ignored_files_warning'), isIgnoredFile: true });
			return;
		}

		try {
			// 3. Read file content
			const text = await file.text();
			
			// 4. Parse JSON
			let parsedData;
			try {
				parsedData = JSON.parse(text);
			} catch (parseError) {
				dispatch('error', { message: $t('settings.import_error'), isCriticalError: true, error: parseError });
				return;
			}

			// 5. Validate structure
			const isValidBackup = Array.isArray(parsedData) ||
				(typeof parsedData === 'object' && parsedData !== null && 'clients' in parsedData);

			if (!isValidBackup) {
				dispatch('error', { message: $t('settings.import_error'), isCriticalError: true });
				return;
			}

			// 6. Import backup
			const success = PatientManager.importBackup(text);

			if (success) {
				// If everything went well, notify parent
				dispatch('backupRestored');
			} else {
				// If file is corrupted
				dispatch('error', { message: $t('settings.import_error'), isCriticalError: true });
			}
		} catch (error) {
			console.error(error);
			dispatch('error', { message: $t('settings.import_error'), isCriticalError: true, error });
		}
	};

	// --- RESET LOGIC ---
	const requestFactoryReset = () => {
	 // We only ask the parent to open the modal. We don't delete anything here.
	 dispatch('requestFactoryReset');
	};
</script>

<div class="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
	<div class="text-center pt-4 mb-2">
		<h2 class="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
			{$t('settings.title')}
		</h2>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div
			class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]"
		>
			<div class="mb-3 p-3 rounded-full bg-indigo-50 text-indigo-600">
				<Users size={28} />
			</div>
			<span class="text-2xl font-black text-slate-800 leading-none">{clients.length}</span>
			<span class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1"
				>{$t('settings.active_clients')}</span
			>
		</div>
		<div
			class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]"
		>
			<div class="mb-3 p-3 rounded-full bg-emerald-50 text-emerald-600">
				<BarChart3 size={28} />
			</div>
			<span class="text-2xl font-black text-slate-800 leading-none">
				{totalMeasurements}
			</span>
			<span class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1"
				>{$t('settings.total_measurements')}</span
			>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div class="bg-slate-50 px-6 py-4 border-b border-slate-100">
			<h3 class="font-bold text-slate-700 flex items-center gap-2">
				<Save size={18} class="text-indigo-600" />
				{$t('settings.backup_section')}
			</h3>
		</div>

		<div class="p-6 sm:p-8 space-y-8">
			<div>
				<div class="relative flex py-2 items-center mb-4">
					<div class="flex-grow border-t border-slate-200"></div>
					<span
						class="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider"
					>
						{$t('settings.section_save')}
					</span>
					<div class="flex-grow border-t border-slate-200"></div>
				</div>

				<button
					on:click={handleExportBackup}
					class="flex items-center justify-center gap-3 w-full bg-indigo-600 text-white py-3 sm:py-4 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-md shadow-indigo-200 active:scale-[0.98]"
				>
					<Download size={20} />
					{$t('settings.btn_export')}
				</button>
			</div>

			<div>
				<div class="relative flex py-2 items-center mb-4">
					<div class="flex-grow border-t border-slate-200"></div>
					<span
						class="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider"
					>
						{$t('settings.section_restore')}
					</span>
					<div class="flex-grow border-t border-slate-200"></div>
				</div>

				<div class="relative group">
					<div
						role="button"
						tabindex="0"
						class="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-indigo-50/30 transition-all group-hover:bg-indigo-50 group-hover:border-indigo-400 cursor-pointer"
					>
						<div
							class="flex flex-col items-center gap-3 text-indigo-600 group-hover:text-indigo-700"
						>
							<Upload size={32} class="transition-transform group-hover:scale-110" />
							<div class="flex flex-col">
								<span class="font-bold text-sm">{$t('settings.btn_import')}</span>
								<span class="text-xs text-indigo-400 font-normal mt-1">
									{$t('settings.drag_backup')}
								</span>
							</div>
						</div>
					</div>
					<input
						type="file"
						accept=".json, application/json"
						on:change={handleImportBackup}
						on:click={(e) => {
							(e.currentTarget as HTMLInputElement).value = '';
						}}
						on:drop={handleDrop}
						on:dragover={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						on:dragenter={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						on:dragleave={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="bg-red-50 border border-red-100 rounded-xl overflow-hidden shadow-sm mt-8">
		<div
			class="px-6 py-4 border-b border-red-100 bg-red-100/50 flex items-center justify-center gap-2"
		>
			<AlertTriangle class="text-red-500" size={20} />
			<h3 class="text-lg font-bold text-red-700">{$t('settings.danger_zone_title')}</h3>
		</div>

		<div class="p-6 flex flex-col items-center text-center">
			<p class="text-sm text-red-800 font-medium mb-6 max-w-lg">
				{$t('settings.danger_zone_description')}
			</p>

			<button
				on:click={requestFactoryReset}
				class="bg-white border-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2"
			>
				<Trash2 size={18} />
				{$t('settings.delete_all_btn')}
			</button>
		</div>
	</div>
</div>
