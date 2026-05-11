<script lang="ts">
	import { isLoading } from 'svelte-i18n';
	import '$lib/i18n';
	import ViewerHeader from './ViewerHeader.svelte';
	import BottomNav from './BottomNav.svelte';

	let { children } = $props();
</script>

{#if !$isLoading}
	<div class="min-h-screen flex flex-col bg-slate-50">
		<ViewerHeader />
		<main class="flex-1 overflow-y-auto pb-16">
			{@render children()}
		</main>
		<BottomNav />
	</div>
{:else}
	<div class="min-h-screen flex items-center justify-center bg-slate-50">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
			<p class="text-slate-600">Cargando idioma...</p>
		</div>
	</div>
{/if}
