<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { Upload, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import { parseScaleFiles } from '$lib/utils/csvSDparser';
	import { viewerState } from '../viewerState.svelte.ts';

	let isDragging = false;
	let isProcessing = false;
	let errorMessage = '';
	let successMessage = '';
	let fileInput: HTMLInputElement;

	const handleFiles = async (files: FileList | File[] | null) => {
		if (!files || files.length === 0) return;
		isProcessing = true;
		errorMessage = '';
		successMessage = '';

		try {
			const records = await parseScaleFiles(files);
			if (records.length === 0) {
				errorMessage = 'No se encontraron datos válidos en el archivo.';
				return;
			}
			// Replace existing records with new ones (overwrite)
			viewerState.setRecords(records);
			successMessage = `Se cargaron ${records.length} mediciones correctamente.`;
		} catch (err) {
			console.error(err);
			errorMessage = 'Error al procesar el archivo. Asegúrate de que es un CSV válido de Tanita.';
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
	<h1 class="text-2xl font-bold text-slate-800 mb-2">Carga de Datos</h1>
	<p class="text-slate-600 mb-6">Sube tu archivo CSV exportado desde la báscula Tanita (BM_*.csv) para visualizar tus mediciones.</p>

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

	<div
		role="button"
		tabindex="0"
		class="border-2 border-dashed rounded-2xl p-8 text-center transition-colors {isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'}"
		on:dragover={handleDragOver}
		on:dragleave={handleDragLeave}
		on:drop={handleDrop}
		on:keydown={(e) => e.key === 'Enter' && triggerFileInput()}
	>
		<Upload class="mx-auto text-slate-400 mb-4" size={48} />
		<h3 class="text-lg font-semibold text-slate-700 mb-2">Arrastra y suelta tu archivo CSV</h3>
		<p class="text-slate-500 mb-6">o haz clic para seleccionar</p>
		<button
			on:click={triggerFileInput}
			class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={isProcessing}
		>
			{isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
		</button>
		<input
			bind:this={fileInput}
			type="file"
			accept=".csv"
			class="hidden"
			on:change={(e) => handleFiles((e.target as HTMLInputElement).files)}
		/>
		<p class="text-sm text-slate-400 mt-4">Solo archivos CSV con formato Tanita BC‑601/602</p>
	</div>

	<div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
			<h4 class="font-bold text-slate-800 mb-2">¿Dónde encuentro el archivo?</h4>
			<p class="text-slate-600 text-sm">Conecta la tarjeta SD de la báscula a tu ordenador y navega a la carpeta <code class="bg-slate-100 px-1 rounded">/TANITA/GRAPHV1/DATA/</code>. Busca archivos que empiecen por <strong>BM_</strong>.</p>
		</div>
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
			<h4 class="font-bold text-slate-800 mb-2">Privacidad garantizada</h4>
			<p class="text-slate-600 text-sm">Tus datos nunca salen de tu navegador. Se almacenan localmente y puedes borrarlos cuando quieras.</p>
		</div>
	</div>

	{#if viewerState.records.length > 0}
		<div class="mt-10 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
			<h4 class="font-bold text-slate-800 mb-3">Datos actualmente cargados</h4>
			<p class="text-slate-600 mb-4">Tienes <strong>{viewerState.records.length}</strong> mediciones almacenadas. Puedes verlas en la pestaña <a href="/viewer/visor" class="text-indigo-600 font-semibold hover:underline">Visor</a>.</p>
			<button
				on:click={() => viewerState.clear()}
				class="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors"
			>
				Borrar todos los datos
			</button>
		</div>
	{/if}
</div>
