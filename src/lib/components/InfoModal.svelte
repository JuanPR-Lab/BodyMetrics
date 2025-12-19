<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	// --- PROPS ---
	export let title: string = 'Information';
	export let message: string = '';
	export let isOpen: boolean = false;

	// We no longer need buttonText
	export let closeAriaLabel: string = 'Close modal';

	// --- HANDLERS ---
	function close() {
		dispatch('close');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' || e.key === 'Enter') {
			close();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 outline-none"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
		on:click|self={close}
		on:keydown={handleKeydown}
	>
		<div
			class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
			transition:scale={{ duration: 200, start: 0.95 }}
			role="document"
		>
			<div class="px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
				<h3 id="modal-title" class="font-bold text-indigo-600 text-lg">
					{title}
				</h3>

				<button
					on:click={close}
					class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
					aria-label={closeAriaLabel}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<div class="px-6 py-6">
				<p class="text-slate-600 leading-relaxed text-sm">
					{@html message}
				</p>
			</div>
		</div>
	</div>
{/if}
