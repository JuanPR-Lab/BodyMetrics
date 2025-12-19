<script lang="ts">
	import { Upload, ArrowLeft, XCircle } from 'lucide-svelte';
	import { parseClientCSV } from '$lib/utils/importParser';
	import type { BioMetricRecord } from '$lib/utils/csvSDparser';
	import ClientDashboard from '$lib/components/ClientDashboard.svelte';

	let isDragging = false;
	let error: string | null = null;
	let clientData: BioMetricRecord[] | null = null;
	let fileName: string = '';

	const handleFile = async (file: File) => {
		error = null;
		if (!file.name.endsWith('.csv')) {
			error = 'Invalid format. Please use a .csv file.';
			return;
		}

		try {
			// Clean filename to use as Client Name
			fileName = file.name.replace('.csv', '').replace('BodyMetrics_', '').replace(/_/g, ' ');

			clientData = await parseClientCSV(file);

			if (clientData.length === 0) throw new Error('File is empty');
		} catch (err) {
			console.error(err);
			error = 'Could not parse file. Ensure it is a valid export.';
			clientData = null;
		}
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files[0]) handleFile(e.dataTransfer.files[0]);
	};
</script>

<div class="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
	<nav class="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 py-3">
		<div class="mx-auto flex max-w-7xl items-center justify-between">
			<div class="flex items-center gap-3">
				<img src="/icon-192.png" alt="Logo" class="h-8 w-8 rounded-lg shadow-sm" />
				<span class="font-bold text-slate-900 tracking-tight"
					>BodyMetrics <span class="text-indigo-600">Viewer</span></span
				>
			</div>

			{#if clientData}
				<button
					on:click={() => (clientData = null)}
					class="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-lg"
				>
					<XCircle size={16} /> Close File
				</button>
			{:else}
				<a
					href="/"
					class="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
				>
					<ArrowLeft size={16} /> Back to App
				</a>
			{/if}
		</div>
	</nav>

	<main class="mx-auto max-w-7xl p-4 md:p-8">
		{#if !clientData}
			<div
				class="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700"
			>
				<div class="text-center mb-8 max-w-md">
					<h1 class="text-3xl font-extrabold text-slate-900 mb-2">Patient Viewer</h1>
					<p class="text-slate-500">
						Securely visualize your progress. All data remains on your device.
					</p>
				</div>

				<div
					class="relative w-full max-w-lg flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 transition-all duration-200 cursor-pointer
           {isDragging
						? 'border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-xl'
						: 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50 hover:shadow-sm'}"
					on:dragover|preventDefault={() => (isDragging = true)}
					on:dragleave={() => (isDragging = false)}
					on:drop={handleDrop}
					role="region"
					aria-label="File Upload Dropzone"
				>
					<input
						type="file"
						accept=".csv"
						class="absolute inset-0 cursor-pointer opacity-0 z-10"
						on:change={(e) => {
							const f = (e.currentTarget as HTMLInputElement).files?.[0];
							if (f) handleFile(f);
						}}
					/>

					<div class="mb-6 rounded-2xl bg-indigo-50 p-5 text-indigo-600 ring-1 ring-indigo-100">
						<Upload size={40} strokeWidth={1.5} />
					</div>

					<span class="text-xl font-bold text-slate-800">Drop CSV file here</span>
					<span class="text-sm text-slate-400 mt-2">or click to browse your device</span>

					{#if error}
						<div
							class="absolute -bottom-16 left-0 right-0 mx-auto w-max max-w-full bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium animate-bounce shadow-sm"
						>
							{error}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="animate-in fade-in slide-in-from-bottom-8 duration-500">
				<ClientDashboard records={clientData} clientName={fileName} readonly={true} />
			</div>
		{/if}
	</main>
</div>
