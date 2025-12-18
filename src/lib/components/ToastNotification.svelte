<script lang="ts">
  import { CheckCircle2 } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let message: string = '';
  export let duration: number = 3000;

  // Si quieres que el componente se cierre solo, usamos onMount
  const dispatch = createEventDispatcher();

  onMount(() => {
    const timer = setTimeout(() => {
      dispatch('close');
    }, duration);

    return () => clearTimeout(timer);
  });
</script>

<div class="fixed bottom-6 right-6 z-[70] flex items-center gap-3 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in-up" role="alert">
  <CheckCircle2 class="text-emerald-400" size={20} />
  <span class="font-medium text-sm">{message}</span>
</div>

<style>
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.3s ease-out forwards;
  }
</style>