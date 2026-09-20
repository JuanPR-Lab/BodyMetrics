<script lang="ts">
    import { t } from 'svelte-i18n';
    // Cambiado UploadCloud por Upload
    import { Inbox, BarChart3, Smartphone, Wifi } from 'lucide-svelte';
</script>

<div class="max-w-4xl mx-auto px-4 py-8 sm:py-12">
    <!-- Cabecera -->
    <div class="text-center mb-10">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-800 mb-3 tracking-tight">
            {$t('viewer.info.title') || 'Información y Uso'}
        </h1>
        <p class="text-sm sm:text-base text-slate-500 max-w-lg mx-auto">
            {$t('viewer.info.subtitle') || 'Todo lo que necesitas saber sobre el funcionamiento de BodyMetrics.'}
        </p>
    </div>

    <!-- Grid de Tarjetas Informativas -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        <!-- Tarjeta 1: Carga -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md">
            <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                <Inbox size={24} strokeWidth={2} />
            </div>
            <h2 class="text-lg font-bold text-slate-800 mb-2">
                {$t('viewer.info.upload_title')}
            </h2>
            <p class="text-sm text-slate-600 leading-relaxed">
                {$t('viewer.info.upload_desc')}
            </p>
        </div>

        <!-- Tarjeta 2: Visor -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md">
            <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                <BarChart3 size={24} strokeWidth={2} />
            </div>
            <h2 class="text-lg font-bold text-slate-800 mb-2">
                {$t('viewer.info.viewer_title')}
            </h2>
            <p class="text-sm text-slate-600 leading-relaxed">
                {$t('viewer.info.viewer_desc')}
            </p>
        </div>

        <!-- Tarjeta 3: Almacenamiento Local (Privacidad) -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md">
            <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                <Smartphone size={24} strokeWidth={2} />
            </div>
            <h2 class="text-lg font-bold text-slate-800 mb-2">
                {$t('viewer.info.storage_title')}
            </h2>
            <p class="text-sm text-slate-600 leading-relaxed">
                {$t('viewer.info.storage_desc')}
            </p>
        </div>

        <!-- Tarjeta 4: Offline -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md">
            <div class="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 mb-4">
                <Wifi size={24} strokeWidth={2} />
            </div>
            <h2 class="text-lg font-bold text-slate-800 mb-2">
                {$t('viewer.info.offline_title')}
            </h2>
            <p class="text-sm text-slate-600 leading-relaxed">
                {$t('viewer.info.offline_desc')}
            </p>
        </div>
        
    </div>
</div>