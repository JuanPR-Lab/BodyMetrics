<script lang="ts">
	import ViewerDashboard from '$lib/components/viewer/ViewerDashboard.svelte';
	import { viewerState } from '../viewerState.svelte.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Upload } from 'lucide-svelte';

	// If no data, redirect to info (or show empty state)
	onMount(() => {
		if (!viewerState.hasData) {
			// We'll show empty state instead of redirecting
		}
	});
</script>

{#if viewerState.records.length > 0}
	<div class="max-w-7xl mx-auto p-4 sm:p-6">
		<ViewerDashboard records={viewerState.records} />
	</div>
{:else}
	<div class="max-w-4xl mx-auto p-8 text-center">
		<div class="bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
			<div class="w-24 h-24 mx-auto mb-6 bg-indigo-50 rounded-full flex items-center justify-center">
				<Upload class="text-indigo-600" size={48} />
			</div>
			<h2 class="text-2xl font-bold text-slate-800 mb-3">Estado Vacío</h2>
			<p class="text-slate-600 mb-8 max-w-md mx-auto">
				Aún no has cargado ningún archivo de mediciones. Sube tu primer archivo CSV exportado desde la báscula Tanita para visualizar tus datos.
			</p>
			<a
				href="/viewer/carga"
				class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
			>
				<Upload size={20} />
				Cargar mi primer archivo BM_*.csv
			</a>
			<p class="text-sm text-slate-500 mt-6">
				¿No sabes cómo obtener el archivo? Visita la pestaña <a href="/viewer/info" class="text-indigo-600 font-semibold hover:underline">Info</a> para una guía paso a paso.
			</p>
		</div>
	</div>
{/if}
