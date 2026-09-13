<script lang="ts">
    import { isLoading, t } from 'svelte-i18n';
    import '$lib/i18n';
    import ViewerHeader from './ViewerHeader.svelte';
    import { page } from '$app/stores';
    import { Inbox, BarChart3, Info } from 'lucide-svelte';

    let { children } = $props();
</script>

{#if !$isLoading}
    <div class="min-h-screen flex flex-col bg-slate-50">
        <ViewerHeader />

        <nav class="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-center gap-4 sm:gap-8">
                    <a href="/viewer/carga" 
                       class="flex items-center justify-center gap-2 py-3 px-3 w-32 md:w-56 border-b-2 font-bold text-sm transition-colors {$page.url.pathname.includes('/carga') ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}">
                       <Inbox size={18} strokeWidth={2.5} />
                       <span>{$t('nav.load')}</span>
                   </a>
                   
                   <a href="/viewer/visor"
                      class="flex items-center justify-center gap-2 py-3 px-3 w-32 md:w-56 border-b-2 font-bold text-sm transition-colors {$page.url.pathname.includes('/visor') ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}">
                       <BarChart3 size={18} strokeWidth={2.5} />
                       <span>{$t('nav.viewer')}</span>
                   </a>

                   <a href="/viewer/ayuda"
                      class="flex items-center justify-center gap-2 py-3 px-3 w-32 md:w-56 border-b-2 font-bold text-sm transition-colors {$page.url.pathname.includes('/ayuda') || $page.url.pathname.includes('/info') ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}">
                       <Info size={18} strokeWidth={2.5} />
                       <span>{$t('nav.help')}</span>
                   </a>
                </div>
            </div>
        </nav>

        <main class="flex-1 overflow-y-auto pt-4">
            {@render children()}
        </main>
    </div>
{:else}
    <div class="min-h-screen flex items-center justify-center bg-slate-50">
        <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p class="text-slate-600 font-medium">Loading...</p>
        </div>
    </div>
{/if}