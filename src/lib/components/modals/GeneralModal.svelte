<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import {
		AlertTriangle,
		CheckCircle,
		CircleHelp,
		Edit,
		Info
	} from 'lucide-svelte';
	import { t } from 'svelte-i18n';

	const dispatch = createEventDispatcher();

	// Props
	export let isOpen: boolean = false;
	export let title: string = '';
	export let message: string = '';
	export let type: 'confirm' | 'alert' | 'error' | 'success' | 'prompt' = 'alert';
	export let inputValue: string = '';
	let promptInput: HTMLInputElement | null = null;

	function handleConfirm() {
		if (type === 'confirm' || type === 'prompt') {
			dispatch('confirm', { inputValue });
		} else {
			dispatch('close');
		}
	}

	function handleCancel() {
		if (type === 'confirm' || type === 'prompt') {
			dispatch('cancel');
		}
		dispatch('close');
	}

	function handleKeydown(e: KeyboardEvent) {
		e.stopPropagation();
		
		if (e.key === 'Enter') {
			e.preventDefault();
			if (type === 'confirm' || type === 'prompt') {
				handleConfirm();
			} else {
				dispatch('close');
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			dispatch('close');
		}
	}

	function handlePromptKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleConfirm();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in"
		transition:fade={{ duration: 200 }}
		on:keydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto animate-slide-up"
			transition:scale={{ duration: 200, start: 0.95 }}
			role="document"
		>
			<div class="p-6">
				<div class="flex items-center gap-3 mb-4">
					{#if type === 'error'}
						<div class="bg-rose-100 text-rose-600 p-2 rounded-lg flex-shrink-0">
							<AlertTriangle size={24} />
						</div>
					{:else if type === 'success'}
						<div class="bg-emerald-100 text-emerald-600 p-2 rounded-lg flex-shrink-0">
							<CheckCircle size={24} />
						</div>
					{:else if type === 'confirm'}
						<div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg flex-shrink-0">
							<CircleHelp size={24} />
						</div>
					{:else if type === 'prompt'}
						<div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg flex-shrink-0">
							<Edit size={24} />
						</div>
					{:else}
						<div class="bg-slate-100 text-slate-600 p-2 rounded-lg flex-shrink-0">
							<Info size={24} />
						</div>
					{/if}

					<h3 class="text-lg font-bold text-slate-800">{title}</h3>
				</div>

				<div class="mb-6 space-y-3">
					<p class="text-slate-600 text-sm leading-relaxed">{@html message}</p>

					{#if type === 'prompt'}
						<div>
							<input
								type="text"
								bind:this={promptInput}
								bind:value={inputValue}
								class="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
								placeholder={$t('dashboard.new_alias_placeholder')}
								on:keydown={handlePromptKeydown}
							/>
						</div>
					{/if}
				</div>

				<div class="flex justify-end gap-3">
					{#if type === 'confirm' || type === 'prompt'}
						<button
							on:click={handleCancel}
							class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
						>
							{$t('actions.cancel')}
						</button>
						<button
							on:click={handleConfirm}
							class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
						>
							{$t('actions.confirm')}
						</button>
					{:else}
						<button
							on:click={() => dispatch('close')}
							class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
						>
							{$t('actions.ok')}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}
</style>