<script lang="ts">
	import { t } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import { Upload, CheckCircle, AlertTriangle, Clock } from 'lucide-svelte';
	import { parseScaleFiles } from '$lib/utils/csvSDparser';
	import { viewerState } from '../viewerState.svelte.ts';
	import ToastNotification from '$lib/components/ToastNotification.svelte';

	let isDragging = false;
	let isProcessing = false;
	let errorMessage = $state('');
	let successMessage = '';
	let fileInput: HTMLInputElement;
	let lastUploadedDate = $state(browser ? localStorage.getItem('lastUploadedDate') : null);

	let showToast = $state(false);
	let toastMessage = $state('');
	let toastTimeout: ReturnType<typeof setTimeout>;

	const triggerToast = (msg: string) => {
		toastMessage = msg;
		showToast = true;
		clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			showToast = false;
		}, 7000);
	};

	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		
		const file = files[0];
		if (!file.name.toLowerCase().endsWith('.csv') || !file.name.startsWith('BM_')) {
			triggerToast($t('viewer.upload.invalidFormat'));
			return;
		}

		isProcessing = true;
		errorMessage = '';
		successMessage = '';

		try {
			const records = await parseScaleFiles(files);
			if (records.length === 0) {
				errorMessage = $t('viewer.upload.errors.noData');
				return;
			}
			
			const match = file.name.match(/(\d{2}-\d{2}-\d{4})/);
			if (match) {
				const formattedDate = match[1].replace(/-/g, '/');
				lastUploadedDate = formattedDate;
				localStorage.setItem('lastUploadedDate', formattedDate);
			}

			viewerState.setRecords(records);
			successMessage = $t('viewer.upload.success', { values: { count: records.length } });
		} catch (err) {
			console.error(err);
			errorMessage = $t('viewer.upload.errors.invalidFile');
		} finally {
			isProcessing = false;
		}
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		isDragging = false;
		const files = e.dataTransfer?.files;
		if (files) handleFiles(files);
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		isDragging = true;
	};

	const handleDragLeave = () => {
		isDragging = false;
	};

	const triggerFileInput = () => {
		fileInput?.click();
	};
</script>

<div class="max-w-4xl mx-auto p-4 sm:p-6">
	<h1 class="text-2xl font-bold text-slate-800 mb-2 text-center">{$t('viewer.upload.title')}</h1>
	<p class="text-slate-600 mb-6 text-center">{$t('viewer.upload.description')}</p>

	{#if errorMessage}
		<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
			<AlertTriangle class="text-red-500" size={20} />
			<span class="text-red-700">{errorMessage}</span>
		</div>
	{/if}

	{#if successMessage}
		<div class="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
			<CheckCircle class="text-emerald-500" size={20} />
			<span class="text-emerald-700">{successMessage}</span>
		</div>
	{/if}

	<label
		role="button"
		tabindex="0"
		class="block border-2 border-dashed rounded-2xl p-8 text-center transition-colors {isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'}"
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
	>
		<input
			bind:this={fileInput}
			type="file"
			accept=".csv, text/csv, application/csv, text/comma-separated-values"
			class="hidden"
			on:change={(e) => handleFiles((e.target as HTMLInputElement).files)}
		/>
		<Upload class="mx-auto text-slate-400 mb-4" size={48} />
		<h3 class="text-lg font-semibold text-slate-700 mb-2">{$t('viewer.upload.dragAndDrop')}</h3>
		<p class="text-slate-500 mb-6">{$t('viewer.upload.clickToSelect')}</p>
		<button
			type="button"
			on:click={triggerFileInput}
			class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={isProcessing}
		>
			{isProcessing ? $t('viewer.upload.processing') : $t('viewer.upload.selectFile')}
		</button>
	</label>

	<div class="mt-6 text-center">
		{#if lastUploadedDate}
			<div class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-100 border border-indigo-300 text-indigo-800 font-semibold rounded-full shadow-sm text-base">
				<Clock size={16} />
				<span>{$t('viewer.upload.lastUpdate')} <strong>{lastUploadedDate}</strong></span>
			</div>
		{:else}
			<span class="text-slate-400 text-sm italic">{$t('viewer.upload.noPreviousUpload')}</span>
		{/if}
	</div>

	{#if showToast}
		<ToastNotification {showToast} {toastMessage} />
	{/if}
</div>
