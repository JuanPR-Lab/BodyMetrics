<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { viewerState } from './viewerState.svelte.ts';

	// Redirect based on data presence
	onMount(() => {
		if (viewerState.hasData) {
			goto('/viewer/visor');
		} else {
			goto('/viewer/info');
		}
	});
</script>

<div class="flex items-center justify-center min-h-screen bg-slate-50">
	<div class="text-center p-8">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
		<p class="text-slate-600">Redirigiendo...</p>
	</div>
</div>
