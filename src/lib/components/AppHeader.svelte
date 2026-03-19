<script lang="ts">
    import { t } from 'svelte-i18n';
    import { Inbox, Users, Settings, CircleHelp, Lock } from 'lucide-svelte';
    import LanguageSelector from './LanguageSelector.svelte';

    export let currentTab: string;
    export let inboxCount: number = 0;

    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    function setTab(tab: string) {
        dispatch('tabChange', tab);
    }
</script>

<header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm transition-all backdrop-blur-sm bg-white/95">
    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <div class="flex items-center gap-1.5 sm:gap-3">
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shadow-md flex-shrink-0 overflow-hidden">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="0" y="0" width="512" height="512" rx="128" fill="#4f46e5" /><g transform="translate(106, 60)"><circle cx="150" cy="50" r="45" fill="white" /><rect x="110" y="120" width="80" height="260" rx="10" fill="white" /><rect x="40" y="120" width="60" height="180" rx="10" fill="white" opacity="0.9" transform="rotate(30, 100, 120)" /><rect x="200" y="120" width="60" height="180" rx="10" fill="white" opacity="0.9" transform="rotate(-30, 200, 120)" /></g></svg>
            </div>
            <div>
                <h1 class="text-base sm:text-xl font-bold text-slate-800 leading-none">
                    {$t('app.title')}
                </h1>
            </div>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-3">
            <span class="px-2 sm:px-3 py-1 bg-emerald-50 text-emerald-700 text-xs uppercase tracking-wider rounded-full font-semibold border border-emerald-200 shadow-sm flex items-center gap-1">
                <Lock size={12} />
                <span class="hidden sm:inline">{$t('app.privacy_badge')}</span>
            </span>
            <LanguageSelector />
        </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0 sm:gap-8 overflow-x-auto no-scrollbar border-t border-slate-100">
        <button
            class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'inbox' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setTab('inbox')}
        >
            <Inbox size={18} />
            {$t('dashboard.tabs.inbox')}
            {#if inboxCount > 0}
                <span class="bg-red-500 text-white text-[10px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse">{inboxCount}</span>
            {/if}
        </button>

        <button
            class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setTab('clients')}
        >
            <Users size={18} />
            {$t('dashboard.tabs.clients')}
        </button>

        <button
            class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setTab('settings')}
        >
            <Settings size={18} />
            {$t('dashboard.tabs.settings')}
        </button>

        <button
            class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'help' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => setTab('help')}
        >
            <CircleHelp size={18} />
            {$t('dashboard.tabs.help')}
        </button>
    </div>
</header>