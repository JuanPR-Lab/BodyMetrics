<script lang="ts">
    import { t } from 'svelte-i18n';
    import BodyMap from '$lib/components/BodyMap.svelte';
    import { viewerState } from '../../../routes/viewer/viewerState.svelte.ts';
    import { formatWeight } from '$lib/utils/format';
    import { getBodyFatStatus, getBMIStatus, getMetabolicAgeStatus } from '$lib/utils/ranges';
    import { settings } from '$lib/utils/settings.svelte';
    
    // Iconos de Lucide
    import { 
        Scale, Activity, Droplets, Dumbbell, Bone, Flame, Clock, 
        BarChart3, Inbox, FileSpreadsheet 
    } from 'lucide-svelte';

    // --- STATE (Svelte 5) ---
    let activeFilter = $state('all');
    let customDateStart = $state(new Date().toISOString().split('T')[0]);
    let customDateEnd = $state(new Date().toISOString().split('T')[0]);
    let selectedChartMetric = $state('weight');
    let hoveredIndex = $state<number | null>(null);
    let hoveredPointData = $state<any>(null);


    // --- REACTIVE DATA (Svelte 5) ---
    const allRecords = $derived(viewerState.records || []);
    const hasData = $derived(viewerState.hasData);
    const selectedRecordId = $derived(viewerState.selectedRecordId);
    
    // --- FUNCTIONS ---
    function applyFilter(filter: string) {
        activeFilter = filter;
    }

    function parseToYYYYMMDD(date: string | Date): string {
        if (date instanceof Date) {
            return date.toISOString().split('T')[0];
        }
        if (typeof date === 'string' && date.includes('/')) {
            const parts = date.split('/');
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return date;
    }

    // Filter history based on selected filter and custom dates
    const filteredHistory = $derived.by(() => {
        if (!allRecords || allRecords.length === 0) return [];

        if (activeFilter === 'custom' && customDateStart && customDateEnd) {
            return allRecords.filter((record) => {
                const recordDate = parseToYYYYMMDD(record.date);
                return recordDate >= customDateStart && recordDate <= customDateEnd;
            });
        }
        
        if (activeFilter === 'all') return allRecords;
        
        const now = new Date();
        const cutoff = new Date(now);

        switch (activeFilter) {
            case 'oneMonth': cutoff.setMonth(now.getMonth() - 1); break;
            case 'threeMonths': cutoff.setMonth(now.getMonth() - 3); break;
            case 'sixMonths': cutoff.setMonth(now.getMonth() - 6); break;
            case 'oneYear': cutoff.setFullYear(now.getFullYear() - 1); break;
            default: return allRecords;
        }

        const cutoffStr = parseToYYYYMMDD(cutoff);
        return allRecords.filter((record) => {
            return parseToYYYYMMDD(record.date) >= cutoffStr;
        });
    });

    const displayedHistory = $derived(filteredHistory);
    const currentRecord = $derived(displayedHistory.find(r => r.id === selectedRecordId) || displayedHistory[0] || null);

    // Chart data
    const chartHistory = $derived(displayedHistory.map(r => ({
        ...r,
        weight: (Number(formatWeight(r.weight, settings.unit)))
    })));

    const chartData = $derived(currentRecord && chartHistory.length > 0 ? computeChartData(chartHistory, selectedChartMetric) : null);
    
    function getStatusColor(metric: string, value: number | null, record: any): string {
        if (value === null) return 'text-slate-900';
        
        switch (metric) {
            case 'bmi':
                return getBMIStatus(value).replace('bg-', 'text-').replace('-100', '-600');
            case 'bodyFat':
                return getBodyFatStatus(value, record.gender, record.age).replace('bg-', 'text-').replace('-100', '-600');
            case 'metabolicAge':
                return getMetabolicAgeStatus(value, record.age).replace('bg-', 'text-').replace('-100', '-600');
            default:
                return 'text-slate-800';
        }
    }

    function computeChartData(history: any[], metricKey: string) {
        if (!history.length) return null;

        const getTimestamp = (dateStr: string, timeStr: string = '00:00:00') => {
            try {
                if (!dateStr) return 0;
                const parts = dateStr.split('/');
                if (parts.length !== 3) return 0;
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${timeStr}`).getTime();
            } catch (e) {
                return 0;
            }
        };

        const sorted = [...history].sort((a, b) => getTimestamp(a.date, a.time) - getTimestamp(b.date, b.time));
        const values = sorted.map(d => Number(d[metricKey]) || 0);
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);

        let rawRange = maxVal - minVal;
        if (rawRange === 0) rawRange = 1;

        const roughStep = rawRange / 4;
        const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
        let step = niceSteps.find(s => s >= roughStep) || roughStep;
        if (step > 100) step = Math.pow(10, Math.floor(Math.log10(rawRange)));

        let axisMin = Math.floor(minVal / step) * step;
        let axisMax = Math.ceil(maxVal / step) * step;

        if (minVal - axisMin < step * 0.1) axisMin -= step;
        if (axisMax - maxVal < step * 0.1) axisMax += step;

        const range = axisMax - axisMin;
        const stepX = sorted.length > 1 ? 100 / (sorted.length - 1) : 0;

        const gridLines = [];
        for (let v = axisMin; v <= axisMax + 0.0001; v += step) {
            const y = 100 - ((v - axisMin) / range) * 100;
            gridLines.push({ y, label: parseFloat(v.toFixed(1)) });
        }

        const pointsData = sorted.map((d, i) => {
            const val = Number(d[metricKey]) || 0;
            const x = sorted.length > 1 ? i * stepX : 50;
            const y = 100 - ((val - axisMin) / range) * 100;

            const showLabel =
                sorted.length <= 6 ||
                i === 0 ||
                i === sorted.length - 1 ||
                (sorted.length > 10 && i % Math.ceil(sorted.length / 5) === 0);

            return {
                id: d.id, // <--- AÑADIMOS EL ID PARA LA SINCRONIZACIÓN
                x, y, val: val.toFixed(1), date: d.date, showLabel,
                unitKey: settings.unit, isRightSide: x > 60, isTop: y < 25
            };
        });

        const polyline = sorted.length > 1 ? pointsData.map(p => `${p.x},${p.y}`).join(' ') : '';
        // Bajamos el areaPath a 130 para dar espacio a los textos grandes
        const areaPath = sorted.length > 1 ? `0,130 ${polyline} 100,130` : '';

        return { pointsData, polyline, areaPath, gridLines };
    }

    function selectRecord(recordId: string) {
        viewerState.selectRecord(recordId);
        hoveredIndex = null;     // <-- Limpiamos el rastro del punto
        hoveredPointData = null; // <-- Limpiamos el tooltip
    }

    const hasSegmental = $derived(currentRecord && (
        currentRecord.fatArmR != null || currentRecord.fatArmL != null ||
        currentRecord.fatLegR != null || currentRecord.fatLegL != null ||
        currentRecord.fatTrunk != null ||
        currentRecord.muscleArmR != null || currentRecord.muscleArmL != null ||
        currentRecord.muscleLegR != null || currentRecord.muscleLegL != null ||
        currentRecord.muscleTrunk != null
    ));
    // --- SMART CHART METRICS ---
    // Lista de todas las métricas que se podrían graficar
    const CHARTABLE_METRICS = [
        { id: 'weight', labelKey: 'metrics.weight' },
        { id: 'bmi', labelKey: 'metrics.bmi' },
        { id: 'bodyFat', labelKey: 'metrics.body_fat' },
        { id: 'muscleMass', labelKey: 'metrics.muscle_mass' },
        { id: 'waterPercentage', labelKey: 'metrics.water' },
        { id: 'boneMass', labelKey: 'metrics.bone_mass' },
        { id: 'dci', labelKey: 'metrics.dci' },
        { id: 'metabolicAge', labelKey: 'metrics.metabolic_age' }
    ];

    // Filtra dinámicamente solo las métricas que existen en la medición actual
    const availableChartMetrics = $derived(
    CHARTABLE_METRICS.filter(metric => currentRecord && (currentRecord as any)[metric.id] != null)
    );

    // Si la métrica seleccionada no existe en el nuevo archivo, vuelve al peso por defecto
    $effect(() => {
        if (availableChartMetrics.length > 0 && !availableChartMetrics.some(m => m.id === selectedChartMetric)) {
            selectedChartMetric = 'weight'; // fallback seguro
        }
    });
    // Mapeo exacto de los colores de las tarjetas (valores HEX de Tailwind)
    const METRIC_COLORS: Record<string, string> = {
        weight: '#1e293b',          // slate-800
        bmi: '#ec4899',             // pink-500
        bodyFat: '#f59e0b',         // amber-500
        muscleMass: '#6366f1',      // indigo-500
        waterPercentage: '#06b6d4', // cyan-500
        boneMass: '#9ca3af',        // slate-400
        dci: '#10b981',             // emerald-500
        metabolicAge: '#a855f7'     // purple-500
    };

    // Color dinámico según la métrica elegida
    const chartColor = $derived(METRIC_COLORS[selectedChartMetric] || '#6366f1');
</script>

{#if !hasData}
    <!-- ESTADO: NO HAY ARCHIVO CARGADO -->
    <div class="max-w-md mx-auto mt-20 p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div class="w-20 h-20 mx-auto mb-4 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
            <Inbox size={40} strokeWidth={1.5} />
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">{$t('dashboard.inbox_empty')}</h2>
        <p class="text-sm text-slate-500 mb-6">
            {$t('help.starting_first_steps_text')}
        </p>
    </div>
{:else}
    <!-- ESTADO: ARCHIVO CARGADO -->
    <div class="max-w-7xl mx-auto px-3 sm:px-4 py-6">
        
        <!-- BARRA DE FILTROS (Siempre visible si hay archivo) -->
        <div class="flex flex-col xl:flex-row justify-between items-center gap-4 w-full mb-6 -mt-4">
            
            <div class="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <span class="text-xs font-bold text-slate-400 tracking-wider uppercase">
                    {$t('viewer.filters.view') || 'VER:'}
                </span>
                
                <div class="flex flex-wrap justify-center sm:justify-start gap-2 w-full max-w-[260px] sm:max-w-none mx-auto sm:mx-0">
                    {#each ['all', 'oneMonth', 'threeMonths', 'sixMonths', 'oneYear'] as filter}
                        <button 
                            onclick={() => applyFilter(filter)} 
                            class="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border {activeFilter === filter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}"
                        >
                            {$t(`viewer.filters.${filter}`)}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="w-full xl:w-auto flex items-center justify-between border border-slate-200 rounded-lg p-1.5 bg-white overflow-hidden shrink-0 shadow-sm">
                <div class="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2 w-full">
                    <span class="text-xs font-bold text-slate-400 uppercase">{$t('viewer.filters.from') || 'DEL:'}</span>
                    <input 
                        type="date" 
                        bind:value={customDateStart} 
                        onchange={() => activeFilter = 'custom'}
                        class="text-xs sm:text-sm bg-transparent border-none outline-none text-slate-700 font-medium w-full min-w-0"
                    />
                </div>
                
                <div class="w-px h-5 bg-slate-200 shrink-0 mx-1"></div>
                
                <div class="flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2 w-full">
                    <span class="text-xs font-bold text-slate-400 uppercase">{$t('viewer.filters.to') || 'AL:'}</span>
                    <input 
                        type="date" 
                        bind:value={customDateEnd} 
                        onchange={() => activeFilter = 'custom'}
                        class="text-xs sm:text-sm bg-transparent border-none outline-none text-slate-700 font-medium w-full min-w-0"
                    />
                </div>
            </div>
        </div>

        <!-- CONTENIDO PRINCIPAL (Solo si el filtro devuelve mediciones) -->
        {#if displayedHistory.length > 0}
            
            <!-- Cinta horizontal de fechas -->
            <div class="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mb-6 overflow-x-auto scrollbar-thin">
                <div class="flex gap-3">
                    {#each displayedHistory as rec (rec.id)}
                        <button
                            onclick={() => selectRecord(rec.id)}
                            class="flex-shrink-0 w-[85px] sm:w-[85px] p-2 rounded-lg border text-left transition-all touch-manipulation relative
                            {selectedRecordId === rec.id || (!selectedRecordId && rec === currentRecord)
                                ? 'border-indigo-400 bg-indigo-50 shadow-md transform scale-105 z-10'
                                : 'bg-white border-gray-200 opacity-80 hover:opacity-100'}"
                        >
                            <div class="text-[12px] sm:text-[13px] text-gray-500 uppercase font-bold mb-1 leading-tight">
                                {rec.date} <br><span class="font-normal opacity-75 text-[11px] sm:text-[12px]">{rec.time}</span>
                            </div>
                            <div class="font-black text-gray-800 text-lg sm:text-xl">
                                {formatWeight(rec.weight, settings.unit)}<span class="text-xs sm:text-sm font-normal text-gray-400 ml-0.5">{$t('units.' + settings.unit)}</span>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Grid de Tarjetas (Smart UI ya lo tenías bien) -->
            {#if currentRecord}
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div class="flex flex-col gap-3 sm:gap-4 xl:col-span-1">
                        <div class="grid grid-cols-2 gap-3 sm:gap-4">
                            
                            {#if currentRecord.weight != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-slate-800 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate">{$t('metrics.weight')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Scale size={20} class="text-slate-400 mb-1" strokeWidth={2} />
                                    <div class="text-right leading-none">
                                        <span class="text-xl sm:text-2xl font-black text-slate-800">{formatWeight(currentRecord.weight, settings.unit)}</span>
                                        <span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.' + settings.unit)}</span>
                                    </div>
                                </div>
                            </div>
                            {/if}

                            {#if currentRecord.bmi != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-pink-500 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate">{$t('metrics.bmi')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Activity size={20} class="text-pink-400 mb-1" strokeWidth={2} />
                                    <span class="text-xl sm:text-2xl font-black {getStatusColor('bmi', currentRecord.bmi, currentRecord)}">
                                        {currentRecord.bmi}
                                    </span>
                                </div>
                            </div>
                            {/if}

                            {#if currentRecord.bodyFat != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-amber-500 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest truncate">{$t('metrics.body_fat')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Droplets size={20} class="text-amber-400 mb-1" strokeWidth={2} />
                                    <div class="text-right leading-none">
                                        <span class="text-xl sm:text-2xl font-black {getStatusColor('bodyFat', currentRecord.bodyFat, currentRecord)}">
                                            {currentRecord.bodyFat}
                                        </span>
                                        <span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">%</span>
                                    </div>
                                </div>
                            </div>
                            {/if}

                            {#if currentRecord.muscleMass != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-indigo-500 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest">{$t('metrics.muscle_mass')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Dumbbell size={20} class="text-indigo-400 mb-1" strokeWidth={2} />
                                    <div class="text-right leading-none">
                                        <span class="text-xl sm:text-2xl font-black text-slate-800">{formatWeight(currentRecord.muscleMass, settings.unit)}</span>
                                        <span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.' + settings.unit)}</span>
                                    </div>
                                </div>
                            </div>
                            {/if}

                            {#if currentRecord.waterPercentage != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-cyan-500 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest">{$t('metrics.water')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Droplets size={20} class="text-cyan-400 mb-1" strokeWidth={2} />
                                    <div class="text-right leading-none">
                                        <span class="text-xl sm:text-2xl font-black text-slate-800">{currentRecord.waterPercentage}</span>
                                        <span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">%</span>
                                    </div>
                                </div>
                            </div>
                            {/if}

                            {#if currentRecord.boneMass != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-gray-400 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest">{$t('metrics.bone_mass')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Bone size={20} class="text-slate-400 mb-1" strokeWidth={2} />
                                    <div class="text-right leading-none">
                                        <span class="text-xl sm:text-2xl font-black text-slate-800">{formatWeight(currentRecord.boneMass, settings.unit)}</span>
                                        <span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.' + settings.unit)}</span>
                                    </div>
                                </div>
                            </div>
                            {/if}

                            {#if currentRecord.dci != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest">{$t('metrics.dci')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Flame size={20} class="text-emerald-400 mb-1" strokeWidth={2} />
                                    <div class="text-right leading-none">
                                        <span class="text-xl sm:text-2xl font-black text-slate-800">{currentRecord.dci}</span>
                                        <span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.kcal')}</span>
                                    </div>
                                </div>
                            </div>
                            {/if}

                            {#if currentRecord.metabolicAge != null}
                            <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500 transition-transform hover:scale-[1.02] flex flex-col justify-between">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest">{$t('metrics.metabolic_age')}</span>
                                </div>
                                <div class="flex items-end justify-between mt-1">
                                    <Clock size={20} class="text-purple-400 mb-1" strokeWidth={2} />
                                    <div class="text-right leading-none">
                                        <span class="text-xl sm:text-2xl font-black {currentRecord.metabolicAge == null || !currentRecord.age ? 'text-slate-900' : (currentRecord.metabolicAge <= currentRecord.age ? 'text-green-600' : 'text-red-600')}">
                                            {currentRecord.metabolicAge}
                                        </span>
                                        <span class="text-[10px] sm:text-xs font-bold text-slate-400 ml-0.5">{$t('units.years')}</span>
                                    </div>
                                </div>
                            </div>
                            {/if}
                        </div>
                    </div>

                    {#if hasSegmental}
                    <div class="xl:col-span-1 h-full min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] xl:min-h-[500px]">
                        <BodyMap record={currentRecord} />
                    </div>
                    {/if}
                </div>

                {#if chartData}
                    <div class="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
                        <div class="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
                            <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 size={18} color={chartColor} /> {$t('dashboard.evolution_chart')} ({chartData.pointsData.length})
                            </h3>
                            <select
                                bind:value={selectedChartMetric}
                                class="w-full sm:w-auto min-w-[200px] sm:min-w-[240px] border border-gray-300 rounded px-3 py-1.5 text-xs sm:text-sm font-medium bg-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none cursor-pointer shadow-sm"
>
                                {#each availableChartMetrics as metric}
                                    <option value={metric.id}>{$t(metric.labelKey)}</option>
                                {/each}
                            </select>
                        </div>

                        <div role="img" aria-label="Evolution Chart" class="h-48 sm:h-64 md:h-72 w-full relative group" onmouseleave={() => { hoveredPointData = null; hoveredIndex = null; }}>                        
                            <svg viewBox="-16 -5 125 130" preserveAspectRatio="none" class="w-full h-full overflow-visible font-sans">
    <defs>
        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color={chartColor} stop-opacity="0.25" />
            <stop offset="100%" stop-color={chartColor} stop-opacity="0" />
        </linearGradient>
    </defs>

    {#each chartData.gridLines as grid}
        <line x1="0" y1={grid.y} x2="100" y2={grid.y} stroke="#e5e7eb" stroke-width="0.5" />
        <!-- CLASE RESPONSIVE APLICADA AQUÍ -->
        <text x="-3" y={grid.y + 1.5} class="text-[4.5px] sm:text-[3.5px] lg:text-[2.8px]" font-weight="bold" fill="#9ca3af" text-anchor="end">{grid.label}</text>
    {/each}

    <polyline points={chartData.areaPath} fill="url(#chartGradient)" />
    <polyline fill="none" stroke={chartColor} stroke-width="1.5" points={chartData.polyline} vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />

    {#each chartData.pointsData as p, i}
        <circle cx={p.x} cy={p.y} r={p.id === selectedRecordId ? 4 : (hoveredIndex === i ? 3 : 1.5)} fill={chartColor} stroke="white" stroke-width={p.id === selectedRecordId ? 1.5 : 0.5} class="transition-all duration-150 pointer-events-none" />

        <rect
            role="button"
            tabindex="0"
            x={p.x - 4}
            y="0"
            width="8"
            height="115"
            fill="transparent"
            class="cursor-pointer hover:fill-gray-50/20 outline-none"
            onclick={() => selectRecord(p.id)} 
            onkeydown={(e) => { if (e.key === 'Enter') selectRecord(p.id); }}
            onmouseenter={() => {
                hoveredIndex = i;
                hoveredPointData = {
                    ...p,
                    unitKey: settings.unit,
                    isHighPoint: p.y < 20,
                    alignment: p.x < 15 ? 'left' : p.x > 85 ? 'right' : 'center'
                };
            }}
            ontouchstart={(e) => {
                hoveredIndex = i;
                hoveredPointData = {
                    ...p,
                    unitKey: settings.unit,
                    isHighPoint: p.y < 20,
                    alignment: p.x < 15 ? 'left' : p.x > 85 ? 'right' : 'center'
                };
            }}
        />
        {#if p.showLabel}
            <!-- CLASE RESPONSIVE APLICADA AQUÍ -->
            <text x={p.x} y="118" class="text-[4.5px] sm:text-[3.5px] lg:text-[2.8px]" font-weight="bold" fill="#6b7280" text-anchor="middle">{p.date.slice(0, 5)}</text>
        {/if}
    {/each}
</svg>

                            {#if hoveredPointData}
                                <div class="absolute bg-gray-900 text-white text-xs sm:text-sm rounded px-2 sm:px-3 py-1 sm:py-2 pointer-events-none shadow-xl z-50 min-w-[80px] sm:min-w-[100px] text-center transition-all duration-75"
                                    style="left: {hoveredPointData.alignment === 'left' ? hoveredPointData.x + 2 : hoveredPointData.alignment === 'right' ? hoveredPointData.x - 2 : hoveredPointData.x}%; top: {hoveredPointData.isHighPoint ? hoveredPointData.y + 15 : hoveredPointData.y - 20}%; transform: {hoveredPointData.alignment === 'left' ? 'translate(0, -50%)' : hoveredPointData.alignment === 'right' ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)'} translateY({hoveredPointData.isHighPoint ? '20px' : '-20px'});">
                                    <div class="font-black text-base sm:text-lg leading-none mb-1">
                                        {hoveredPointData.val}<span class="text-xs font-normal opacity-80">{$t('units.' + hoveredPointData.unitKey)}</span>
                                    </div>
                                    <div class="text-[9px] sm:text-[10px] font-mono text-gray-300 border-t border-gray-700 pt-1 mt-1">
                                        {hoveredPointData.date}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            {/if}
        {:else}
            <!-- ESTADO: FILTRO VACÍO (Reemplaza la barra blanca) -->
            <div class="max-w-md mx-auto mt-12 p-8 text-center bg-transparent">
                <FileSpreadsheet size={36} class="text-slate-300 mx-auto mb-4" />
                <p class="text-sm font-medium text-slate-500">
                    {$t('dashboard.no_data_in_period')}
                </p>
            </div>
        {/if}
    </div>
{/if}