<script>
    import { fly } from 'svelte/transition';
    import { AlertTriangle } from 'lucide-svelte';

    let { showToast = false, toastMessage = '' } = $props();
</script>

{#if showToast}
    <div 
        transition:fly={{ y: 20, duration: 300 }}
        class="fixed bottom-6 left-4 right-4 sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-max bg-slate-800 text-white px-5 py-3.5 rounded-xl sm:rounded-full shadow-2xl z-[100] font-medium text-sm flex items-center justify-center gap-3 text-center sm:text-left"
    >
        <AlertTriangle size={20} class="text-red-400 shrink-0" />
        <span>{toastMessage}</span>
    </div>
{/if}
