<script lang="ts">
    import { Upload, Eye, Info } from 'lucide-svelte';
    import { page } from '$app/stores';
    import { t } from 'svelte-i18n';

    const tabs = [
        { id: 'carga', label: 'Carga', icon: Upload, path: '/viewer/carga' },
        { id: 'visor', label: 'Visor', icon: Eye, path: '/viewer/visor' },
        { id: 'info', label: 'Info', icon: Info, path: '/viewer/info' }
    ];
</script>

<nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 py-2 px-4">
    <div class="max-w-7xl mx-auto flex justify-around items-center">
        {#each tabs as tab}
            <a
                href={tab.path}
                class="flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors {($page.url.pathname === tab.path || ($page.url.pathname === '/viewer' && tab.id === 'visor')) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700'}"
                aria-current={($page.url.pathname === tab.path) ? 'page' : undefined}
            >
                <svelte:component this={tab.icon} size={22} />
                <span class="text-xs font-medium mt-1">{tab.label}</span>
            </a>
        {/each}
    </div>
</nav>
