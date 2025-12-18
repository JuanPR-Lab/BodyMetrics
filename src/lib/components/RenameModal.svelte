<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit3 } from 'lucide-svelte';
  import { t } from 'svelte-i18n';

  const dispatch = createEventDispatcher();

  export let isOpen: boolean = false;
  export let title: string = "Rename Client";
  export let confirmBtnText: string = "Rename";
  export let cancelBtnText: string = "Cancel";
    // initialValue is not used but kept for API compatibility
      export const initialValue: string = "";

  let inputValue = "";

  $: if (isOpen) inputValue = "";

  function close() { 
    dispatch('close'); 
  }
  
  function confirm() {
    dispatch('confirm', { newName: inputValue });
    close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && inputValue.trim()) {
      confirm();
    } else if (e.key === 'Escape') {
      close();
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
    tabindex="0"
    transition:fade={{ duration: 200 }}
    on:click|self={close}
    on:keydown={handleKeydown}
  >
    <div
          class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-indigo-100"
          transition:scale={{ duration: 200, start: 0.95 }}
        >
      <div class="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
              <div class="bg-indigo-100 p-2 rounded-full">
                <Edit3 class="text-indigo-600" size={24} />
              </div>
              <h3 class="font-bold text-indigo-900 text-lg">{title}</h3>
            </div>

      <div class="px-6 py-6">
        <div class="space-y-2">
          <input
            id="rename-input"
            type="text"
            bind:value={inputValue}
            placeholder={$t('dashboard.new_alias_placeholder')}
            class="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-indigo-500 focus:ring-indigo-500 outline-none transition-all"
            autocomplete="off"
          />
        </div>
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
          disabled={!inputValue.trim()}
          class="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 transition-all {inputValue.trim() ? 'hover:bg-indigo-700 hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'}"
        >
          <Edit3 size={16} /> {confirmBtnText}
        </button>
      </div>
    </div>
  </div>
{/if}