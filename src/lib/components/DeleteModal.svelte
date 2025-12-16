<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { AlertTriangle, Trash2 } from 'lucide-svelte';

  const dispatch = createEventDispatcher();

  export let isOpen: boolean = false;
  export let title: string = "";
  export let message: string = "";
  export let confirmationWord: string = "DELETE"; 
  export let confirmBtnText: string = "Delete";
  export let cancelBtnText: string = "Cancel";
  export let placeholder: string = "";

  let inputValue = "";

  $: if (isOpen) inputValue = "";
  $: inputClean = inputValue.trim().toUpperCase();
  $: validWords = [confirmationWord.toUpperCase(), 'DELETE', 'BORRAR'];
  $: isMatch = validWords.includes(inputClean);

  function close() { dispatch('close'); }
  
  function confirm() {
    if (isMatch) {
      dispatch('confirm');
      close();
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" transition:fade={{ duration: 200 }}>
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100" transition:scale={{ duration: 200, start: 0.95 }}>
      <div class="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
        <div class="bg-red-100 p-2 rounded-full"><AlertTriangle class="text-red-600" size={24} /></div>
        <h3 class="font-bold text-red-900 text-lg">{title}</h3>
      </div>

      <div class="px-6 py-6">
        <p class="text-slate-600 mb-4 text-sm leading-relaxed">{@html message}</p>
        <div class="space-y-2">
          <label for="delete-confirmation-input" class="block text-xs font-bold text-slate-500 uppercase tracking-wide">
            {placeholder} <span class="select-none text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">{confirmationWord}</span>
          </label>
          <input id="delete-confirmation-input" type="text" bind:value={inputValue} placeholder={confirmationWord}
            class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-red-500 focus:ring-red-500 outline-none transition-all font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal uppercase"
          />
        </div>
      </div>

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
        <button on:click={close} class="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg transition-colors">
          {cancelBtnText}
        </button>
        <button on:click={confirm} disabled={!isMatch}
          class="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 transition-all {isMatch ? 'hover:bg-red-700 hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'}">
          <Trash2 size={16} /> {confirmBtnText}
        </button>
      </div>
    </div>
  </div>
{/if}