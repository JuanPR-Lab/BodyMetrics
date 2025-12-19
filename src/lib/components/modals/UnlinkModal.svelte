<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { AlertTriangle } from 'lucide-svelte';
	import { t } from 'svelte-i18n';

	const dispatch = createEventDispatcher();

	export let isOpen: boolean = false;
	export let title: string = '';
	export let message: string = '';
	export let confirmBtnText: string = 'Confirm';
	export let cancelBtnText: string = 'Cancel';

	function close() {
		dispatch('close');
	}

	function confirm() {
		dispatch('confirm');
		close();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		e.stopPropagation();
		
		if (e.key === 'Enter') {
			e.preventDefault();
			confirm();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
	>
		<div
			class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-100"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<div class="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
				<div class="bg-amber-100 p-2 rounded-full">
					<AlertTriangle class="text-amber-600" size={24} />
				</div>
				<h3 class="font-bold text-amber-900 text-lg">{title}</h3>
			</div>

			<div class="px-6 py-6">
				<p class="text-slate-600 mb-4 text-sm leading-relaxed">{@html message}</p>
			</div>

			<div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
				<button
					on:click={close}
					class="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors"
				>
					{cancelBtnText}
				</button>
				<button
					on:click={confirm}
					class="px-4 py-2 bg-amber-600 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 transition-all hover:bg-amber-700 hover:shadow-md"
				>
					<AlertTriangle size={16} />
					{confirmBtnText}
				</button>
			</div>
		</div>
	</div>
{/if}