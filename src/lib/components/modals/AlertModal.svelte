<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { AlertTriangle } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	export let isOpen: boolean = false;
	export let title: string = '';
	export let message: string = '';

	function close() {
		dispatch('close');
	}

	function handleKeydown(e: KeyboardEvent) {
		e.stopPropagation();
		
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
		on:keydown={handleKeydown}
	>
		<div
			class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<div class="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
				<div class="bg-red-100 p-2 rounded-full">
					<AlertTriangle class="text-red-600" size={24} />
				</div>
				<h3 class="font-bold text-red-900 text-lg">{title}</h3>
			</div>

			<div class="px-6 py-6">
				<p class="text-slate-600 text-sm leading-relaxed">{@html message}</p>
			</div>

			<div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
				<button
					on:click={close}
					class="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-red-700 hover:shadow-md transition-all cursor-pointer"
				>
					Aceptar
				</button>
			</div>
		</div>
	</div>
{/if}
