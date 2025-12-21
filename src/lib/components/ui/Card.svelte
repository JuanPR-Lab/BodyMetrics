<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		noPadding?: boolean;
		hover?: boolean;
		class?: string;
		children: Snippet;
	}

	let { noPadding = false, hover = false, class: className = '', children }: Props = $props();
</script>

<div
	class="bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-200
    {noPadding ? '' : 'p-4 sm:p-6'}
    {hover ? 'hover:shadow-md hover:scale-[1.01]' : ''} {className}"
>
	{@render children()}
</div>