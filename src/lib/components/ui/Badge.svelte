<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'indigo' | 'emerald' | 'red' | 'slate' | 'warning';
		children: Snippet;
	}

	let { variant = 'slate', children }: Props = $props();

	const variants = {
		indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
		emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
		red: 'bg-red-50 text-red-700 border-red-200',
		slate: 'bg-slate-100 text-slate-600 border-slate-200',
		warning: 'bg-amber-50 text-amber-700 border-amber-200'
	};
</script>

<span
	class="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border {variants[variant]}"
>
	{@render children()}
</span>