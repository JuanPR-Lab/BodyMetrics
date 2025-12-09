<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { locale, t, isLoading as isLocaleLoading } from 'svelte-i18n';
  
  import { parseScaleFiles, type BioMetricRecord } from '$lib/utils/csvSDparser';
  import { 
    STATUS_COLORS, 
    getBodyFatStatus, 
    getWaterStatus, 
    getVisceralFatStatus, 
    getBMIStatus, 
    getMetabolicAgeStatus 
  } from '$lib/utils/ranges';
  import { exportToCSV } from '$lib/utils/exporters';
  import { PatientManager, type Client } from '$lib/utils/patientManager';
  import BodyMap from '$lib/components/BodyMap.svelte';
  import '$lib/i18n';

  // --- STATIC CONFIG ---
  const CHART_OPTIONS = [
    { key: 'weight', label: 'metrics.weight', color: '#1f2937', unitKey: 'kg' },
    { key: 'bmi', label: 'metrics.bmi', color: '#4b5563', unitKey: '' },
    { key: 'dci', label: 'metrics.dci', color: '#10b981', unitKey: 'kcal' },
    { key: 'bodyFat', label: 'metrics.body_fat', color: '#eab308', unitKey: 'percent' },
    { key: 'muscleMass', label: 'metrics.muscle_mass', color: '#3b82f6', unitKey: 'kg' },
    { key: 'waterPercentage', label: 'metrics.water', color: '#0ea5e9', unitKey: 'percent' },
    { key: 'boneMass', label: 'metrics.bone_mass', color: '#6b7280', unitKey: 'kg' },
    { key: 'visceralFat', label: 'metrics.visceral_fat', color: '#d97706', unitKey: 'rating' },
    { key: 'metabolicAge', label: 'metrics.metabolic_age', color: '#8b5cf6', unitKey: 'years' }
  ] as const;

  // --- STYLE CONSTANTS (Tailwind v4 Safe) ---
  const STYLES = {
    // CORRECCIÓN 1: Filtros legibles (Texto oscuro siempre)
    // Inactivo: Fondo blanco, texto gris
    filterBtn: "px-3 py-1 text-[11px] font-bold rounded border border-gray-200 transition bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 uppercase tracking-wide cursor-pointer",
    // Activo: Fondo gris claro, texto negro intenso, borde gris oscuro (NO TEXTO BLANCO)
    filterBtnActive: "bg-gray-200 text-gray-900 border-gray-400 font-black shadow-inner ring-1 ring-gray-300",
    
    // Tarjetas métricas (Layout Flex Vertical)
    cardMetric: "bg-white p-3 rounded-xl shadow-sm border-l-4 border-gray-100 flex flex-col justify-between min-h-[80px]",
    
    // CORRECCIÓN 3: Estilos para alinear a la derecha
    metricLabel: "text-[10px] font-bold text-gray-400 uppercase tracking-wider self-start", 
    metricValueCard: "text-2xl font-black text-gray-800 leading-none self-end mt-1", // Valor alineado a la derecha
    
    // Estilos para la tarjeta principal (Peso/BMI)
    metricColMain: "flex flex-col items-center justify-center px-2",
    metricValueLg: "text-3xl font-black text-gray-800 leading-none",
    metricValueMd: "text-2xl font-black leading-none",
    metricUnit: "text-sm font-medium text-gray-400 ml-1",
    divider: "w-px h-10 bg-gray-100 mx-1"
  };

  // --- STATE ---
  let allRecords: BioMetricRecord[] = [];
  let clients: Client[] = [];
  
  // UI State
  let currentTab: 'inbox' | 'clients' | 'settings' | 'help' = 'inbox';
  let isProcessing = false;
  let errorMessage = '';
  let isDragging = false;
  let fileInput: HTMLInputElement;

  // Selection & Filters
  let selectedClientId: string = '';
  let selectedRecordId: string = '';
  let clientSearchTerm = ''; 
  
  type FilterMode = '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';
  let currentFilter: FilterMode = 'all'; 
  let customDateStart = '';
  let customDateEnd = '';

  // Chart State
  // @ts-ignore
  let selectedChartMetric: keyof BioMetricRecord = 'weight';
  let hoveredIndex: number | null = null;
  let hoveredPointData: any | null = null;
  
  // Forms
  let newClientCodeOrAlias = '';

  // --- HELPER: DATE SORTING ---
  const getTimestamp = (dateStr: string, timeStr: string = '00:00:00') => {
    try {
      if (!dateStr) return 0;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${timeStr}`).getTime();
      }
      return new Date(dateStr).getTime() || 0;
    } catch (e) { return 0; }
  };

  // --- REACTIVE DERIVED STATE ---
  $: inboxRecords = allRecords.filter(r => !PatientManager.getClientForRecord(r.id));

  $: filteredClients = clients.filter(c => {
    if (!clientSearchTerm) return true;
    const term = clientSearchTerm.toLowerCase().trim();
    return c.id.toLowerCase().includes(term) || c.alias.toLowerCase().includes(term);
  });

  $: clientHistory = selectedClientId 
    ? PatientManager.getClientHistory(selectedClientId, allRecords).sort((a, b) => {
        return getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time);
      })
    : [];

  $: displayedHistory = filterHistory(clientHistory, currentFilter, customDateStart, customDateEnd);
  
  $: currentRecord = displayedHistory.find(r => r.id === selectedRecordId) || displayedHistory[0] || null;

  $: activeChartOption = CHART_OPTIONS.find(o => o.key === selectedChartMetric);
  $: activeChartColor = activeChartOption?.color || '#1f2937';
  $: activeChartUnitKey = activeChartOption?.unitKey || ''; 
  
  $: chartData = displayedHistory.length > 0 ? prepareSingleChart(displayedHistory, selectedChartMetric, activeChartUnitKey) : null;

  // --- LIFECYCLE ---
  onMount(() => {
    refreshClients();
    const today = new Date().toISOString().split('T')[0];
    customDateEnd = today;
    
    if (clients.length === 0) {
      currentTab = 'help';
    }
  });

  // --- ACTIONS ---

  function refreshClients() {
    clients = PatientManager.getClients();
    allRecords = [...allRecords]; 
  }

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    isProcessing = true;
    errorMessage = '';
    
    try {
      const parsedData = await parseScaleFiles(files);
      if (parsedData.length === 0) throw new Error('No valid records found.');
      
      const recordMap = new Map([...allRecords, ...parsedData].map(r => [r.id, r]));
      allRecords = Array.from(recordMap.values()).sort((a, b) => b.id.localeCompare(a.id));
      
      if (inboxRecords.length > 0 && currentTab !== 'inbox') {
        if(currentTab === 'help') currentTab = 'inbox';
      }
    } catch (err) {
      console.error(err);
      const $t = get(t);
      errorMessage = $t('upload.error');
    } finally {
      isProcessing = false;
      isDragging = false;
      if(fileInput) fileInput.value = ''; 
    }
  };

  function filterHistory(history: BioMetricRecord[], mode: FilterMode, start: string, end: string) {
    if (history.length === 0) return [];
    if (mode === 'all') return history;

    const now = new Date();
    let cutoffTime = 0;

    if (mode === '1m') cutoffTime = new Date(now.setMonth(now.getMonth() - 1)).getTime();
    else if (mode === '3m') cutoffTime = new Date(now.setMonth(now.getMonth() - 3)).getTime();
    else if (mode === '6m') cutoffTime = new Date(now.setMonth(now.getMonth() - 6)).getTime();
    else if (mode === '1y') cutoffTime = new Date(now.setFullYear(now.getFullYear() - 1)).getTime();
    else if (mode === 'custom') {
      const s = start ? new Date(start).getTime() : 0;
      const e = end ? new Date(end).getTime() + 86400000 : Infinity;
      return history.filter(r => {
        const t = getTimestamp(r.date, r.time);
        return t >= s && t < e;
      });
    }
    return history.filter(r => getTimestamp(r.date, r.time) >= cutoffTime);
  }

  // --- CRUD OPERATIONS ---
  const createClient = () => {
    if (!newClientCodeOrAlias) return;
    const success = PatientManager.addClient(newClientCodeOrAlias, newClientCodeOrAlias);
    if (success) {
      refreshClients();
      selectedClientId = newClientCodeOrAlias;
      newClientCodeOrAlias = '';
      clientSearchTerm = '';
      currentTab = 'clients';
    } else {
      alert('Error: Client ID exists.');
    }
  };

  const deleteClient = (id: string) => {
    const $t = get(t); 
    if (!confirm($t('dashboard.delete_client_confirm'))) return;
    PatientManager.deleteClient(id);
    if (selectedClientId === id) selectedClientId = '';
    refreshClients();
  };

  const assignRecord = (recordId: string, clientId: string) => {
    if (!clientId) return;
    PatientManager.assignRecordToClient(recordId, clientId);
    refreshClients(); 
  };

  const unassignCurrentRecord = () => {
    if (!currentRecord) return;
    const $t = get(t);
    if (!confirm($t('dashboard.detach_record') + '?')) return;
    PatientManager.unassignRecord(currentRecord.id);
    refreshClients();
    selectedRecordId = ''; 
  };

  const deleteAllData = () => {
    const $t = get(t);
    if (confirm($t('settings.delete_all_confirm'))) {
      PatientManager.deleteAllData();
      clients = [];
      selectedClientId = '';
      selectedRecordId = '';
      refreshClients();
    }
  };

  const exportClientData = () => {
    const $t = get(t);
    // Verificación de datos vacíos
    if (!clientHistory || clientHistory.length === 0) {
      alert($t('dashboard.no_data_client') || "No hay mediciones para exportar.");
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    const filename = client ? `${client.id}_${client.alias.replace(/\s/g, '_')}.csv` : 'export.csv';
    
    const headersMap = {
      date: $t('csv_headers.date'), time: $t('csv_headers.time'), model: $t('csv_headers.model'),
      weight: $t('metrics.weight'), bmi: $t('metrics.bmi'), bodyFat: $t('metrics.body_fat'), 
      muscleMass: $t('metrics.muscle_mass'), visceralFat: $t('metrics.visceral_fat'),
      waterPercentage: $t('metrics.water'), boneMass: $t('metrics.bone_mass'),
      metabolicAge: $t('metrics.metabolic_age'), dci: $t('metrics.dci'),
      fatTrunk: $t('csv_headers.fat_trunk'), fatArmR: $t('csv_headers.fat_arm_r'),
      fatArmL: $t('csv_headers.fat_arm_l'), fatLegR: $t('csv_headers.fat_leg_r'),
      fatLegL: $t('csv_headers.fat_leg_l'), muscleTrunk: $t('csv_headers.mus_trunk'),
      muscleArmR: $t('csv_headers.mus_arm_r'), muscleArmL: $t('csv_headers.mus_arm_l'),
      muscleLegR: $t('csv_headers.mus_leg_r'), muscleLegL: $t('csv_headers.mus_leg_l')
    };
    exportToCSV(clientHistory, headersMap, filename);
  };

  const handleImportBackup = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const $t = get(t);
    try {
        const text = await file.text();
        if (PatientManager.importBackup(text)) {
          alert($t('settings.import_success'));
          refreshClients();
        } else {
          alert($t('settings.import_error'));
        }
    } catch (error) {
        alert($t('settings.import_error'));
    }
  };

  // --- CHART LOGIC ---
  function prepareSingleChart(history: BioMetricRecord[], key: keyof BioMetricRecord, unitKey: string) {
    try {
      const sorted = [...history].sort((a, b) => getTimestamp(a.date, a.time) - getTimestamp(b.date, b.time));
      if (sorted.length === 0) return null;

      const values = sorted.map(d => Number(d[key]) || 0);
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
        const y = 100 - ((v - axisMin) / range * 100);
        gridLines.push({ y, label: parseFloat(v.toFixed(1)) }); 
      }

      const pointsData = sorted.map((d, i) => {
        const val = Number(d[key]) || 0;
        const x = sorted.length > 1 ? i * stepX : 50;
        const y = 100 - ((val - axisMin) / range * 100);
        
        const showLabel = (sorted.length <= 6) || 
                          (i === 0) || 
                          (i === sorted.length - 1) || 
                          (sorted.length > 10 && i % Math.ceil(sorted.length / 5) === 0);
        
        const isRightSide = x > 60; 
        const isTop = y < 25;

        return { x, y, val: val.toFixed(1), date: d.date, showLabel, unitKey, isRightSide, isTop };
      });

      const polyline = sorted.length > 1 ? pointsData.map(p => `${p.x},${p.y}`).join(' ') : '';
      const areaPath = sorted.length > 1 ? `0,120 ${polyline} 100,120` : '';

      return { pointsData, polyline, areaPath, gridLines };
    } catch (e) { return null; }
  }

  // --- UI HELPERS ---
  const switchLang = (lang: string) => locale.set(lang);

  const getStatusColor = (type: string, val: number) => {
    if (!currentRecord) return STATUS_COLORS.unknown;
    try {
      if (type === 'fat') return STATUS_COLORS[getBodyFatStatus(val, currentRecord.gender, currentRecord.age)];
      if (type === 'water') return STATUS_COLORS[getWaterStatus(val, currentRecord.gender)];
      if (type === 'visceral') return STATUS_COLORS[getVisceralFatStatus(val)];
      if (type === 'bmi') return STATUS_COLORS[getBMIStatus(val)];
      if (type === 'meta') return STATUS_COLORS[getMetabolicAgeStatus(val, currentRecord.age)];
    } catch (e) { return STATUS_COLORS.unknown; }
    return STATUS_COLORS.unknown;
  };

  const handleDrop = (e: DragEvent) => { 
    isDragging = false; 
    if(e.dataTransfer?.files) handleFiles(e.dataTransfer.files); 
  };
</script>

{#if $isLocaleLoading}
  <div class="flex items-center justify-center h-screen text-gray-500 font-mono animate-pulse">Loading BodyMetrics...</div>
{:else}
  <div
    role="application"
    class="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20 select-none"
    on:dragover|preventDefault={() => isDragging = true}
    on:dragleave|preventDefault={() => isDragging = false}
    on:drop|preventDefault={handleDrop}
  >
    <header class="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm transition-all">
      <div class="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-lg font-black text-lg sm:text-xl tracking-tighter shadow-sm">BM</div>
          <div><h1 class="text-base sm:text-lg font-bold text-gray-800 leading-none">{$t('app.title')}</h1></div>
        </div>
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] uppercase tracking-wider rounded font-bold border border-green-100">🔒 {$t('app.privacy_badge')}</span>
          <div class="flex items-center text-xs font-bold border rounded overflow-hidden bg-white">
            <button on:click={() => switchLang('es')} class="px-2 py-1 hover:bg-gray-100 border-r transition-colors">ES</button>
            <button on:click={() => switchLang('en')} class="px-2 py-1 hover:bg-gray-100 transition-colors">EN</button>
          </div>
        </div>
      </div>
      
      <div class="max-w-7xl mx-auto px-3 sm:px-4 flex gap-0 sm:gap-8 mt-1 overflow-x-auto no-scrollbar">
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'inbox' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'inbox'}>
          📥 {$t('dashboard.tabs.inbox')}
          {#if inboxRecords.length > 0}
            <span class="bg-red-500 text-white text-[10px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse">{inboxRecords.length}</span>
          {/if}
        </button>
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'clients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'clients'}>
          👥 {$t('dashboard.tabs.clients')}
        </button>
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'settings'}>
          ⚙️ {$t('dashboard.tabs.settings')}
        </button>
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'help' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'help'}>
          ℹ️ {$t('dashboard.tabs.help')}
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      
      {#if currentTab === 'help'}
        <div class="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
            <div class="text-center py-4 sm:py-6">
                <div class="text-4xl sm:text-6xl mb-3 sm:mb-4">👋</div>
                <h2 class="text-2xl sm:text-3xl font-black text-gray-800 mb-2">{$t('welcome.title')}</h2>
                <p class="text-gray-500 text-base sm:text-lg">{$t('welcome.subtitle')}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div class="bg-blue-50 p-4 sm:p-6 rounded-xl border border-blue-100">
                    <h3 class="font-bold text-blue-900 text-sm sm:text-base mb-2">{$t('help.pwa_title')}</h3>
                    <p class="text-sm sm:text-base text-blue-800 leading-relaxed">{$t('help.pwa_text')}</p>
                </div>
                <div class="bg-purple-50 p-4 sm:p-6 rounded-xl border border-purple-100">
                    <h3 class="font-bold text-purple-900 text-sm sm:text-base mb-2">{$t('help.first_time_title')}</h3>
                    <p class="text-sm sm:text-base text-purple-800 leading-relaxed">{$t('help.first_time_text')}</p>
                </div>

                <div class="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
                    <h3 class="font-bold text-gray-800 text-sm sm:text-base mb-2">{$t('welcome.guide_1_title')}</h3>
                    <p class="text-sm sm:text-base text-gray-600 leading-relaxed">{$t('welcome.guide_1_text')}</p>
                </div>
                <div class="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200">
                    <h3 class="font-bold text-gray-800 text-sm sm:text-base mb-2">{$t('welcome.guide_2_title')}</h3>
                    <p class="text-sm sm:text-base text-gray-600 leading-relaxed">{$t('welcome.guide_2_text')}</p>
                </div>

                <div class="bg-yellow-50 p-4 sm:p-6 rounded-xl border border-yellow-100">
                    <h3 class="font-bold text-yellow-900 text-sm sm:text-base mb-2">{$t('welcome.guide_3_title')}</h3>
                    <p class="text-sm sm:text-base text-yellow-800 leading-relaxed whitespace-pre-line">{$t('welcome.guide_3_text')}</p>
                </div>
                <div class="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
                    <h3 class="font-bold text-gray-800 text-sm sm:text-base mb-2">{$t('welcome.guide_4_title')}</h3>
                    <p class="text-sm sm:text-base text-gray-600 leading-relaxed">{$t('welcome.guide_4_text')}</p>
                </div>

                <div class="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 md:col-span-2">
                    <h3 class="font-bold text-gray-800 text-sm sm:text-base mb-2">{$t('welcome.guide_5_title')}</h3>
                    <p class="text-sm sm:text-base text-gray-600 leading-relaxed">{$t('welcome.guide_5_text')}</p>
                </div>
            </div>

            <div class="mt-8 sm:mt-12 bg-gray-800 text-gray-300 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center shadow-lg">
                <h4 class="font-bold text-white text-base sm:text-lg mb-2">{$t('about.title')}</h4>
                <p class="text-xs sm:text-sm mb-4 sm:mb-6 max-w-4xl mx-auto">{$t('about.description')}</p>
                
                <div class="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs font-mono mb-6 sm:mb-8">
                    <span class="bg-gray-700 px-2 sm:px-3 py-1 rounded-full border border-gray-600">{$t('about.version')}</span>
                    <span class="bg-gray-700 px-2 sm:px-3 py-1 rounded-full border border-gray-600">{$t('about.license')}</span>
                    <span class="bg-gray-700 px-2 sm:px-3 py-1 rounded-full border border-gray-600">{$t('about.developer')}</span>
                </div>
                
                <a href="https://github.com/JuanPR-Lab/BodyMetrics" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-white text-gray-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-gray-200 transition-colors shadow-md">
                    <svg viewBox="0 0 24 24" class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    {$t('about.github_btn')}
                </a>
                
                <p class="text-[9px] sm:text-[10px] mt-4 sm:mt-6 opacity-40 uppercase tracking-widest">{$t('about.disclaimer')}</p>
            </div>
        </div>
      {/if}

      {#if currentTab === 'inbox'}
          <div class="bg-white p-4 sm:p-6 md:p-8 rounded-xl border-2 border-dashed border-gray-300 mb-6 sm:mb-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 transition-all hover:border-blue-400 hover:bg-gray-50 {isDragging ? 'ring-4 ring-blue-100 border-blue-500 bg-blue-50' : ''}">
            <div class="text-xs sm:text-sm text-gray-600 flex flex-col gap-2 max-w-lg">
              <strong class="text-gray-800 text-base sm:text-lg flex items-center gap-2"><span>📥</span> {$t('upload.instruction_title')}</strong>
              <span class="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200 w-fit">{$t('upload.instruction_path')}</span>
            </div>
            <div class="flex flex-col items-center md:items-end gap-2 sm:gap-3 w-full md:w-auto">
              <span class="text-xs sm:text-sm text-gray-400 font-medium italic">{$t('upload.drop_zone')}</span>
              <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-bold transition inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95 w-full md:w-auto touch-manipulation">
                <span>📂</span> {isProcessing ? $t('upload.processing') : $t('upload.browse')}
                <input
                  bind:this={fileInput}
                  type="file"
                  multiple
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  on:click={(e) => { e.currentTarget.value = ''; }}
                  on:change={(e)=>handleFiles((e.target as HTMLInputElement).files)}
                  disabled={isProcessing}
                  class="hidden"
                />
              </label>
            </div>
            {#if errorMessage}<div class="w-full md:w-auto text-red-500 text-xs font-bold bg-red-50 px-2 sm:px-3 py-1 sm:py-2 rounded border border-red-100 animate-pulse">{errorMessage}</div>{/if}
          </div>
        
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[200px] sm:min-h-[300px]">
            {#if inboxRecords.length === 0}
              <div class="p-8 sm:p-12 text-center text-gray-400 bg-gray-50 h-full flex flex-col justify-center items-center"><div class="text-3xl sm:text-4xl mb-2 opacity-50">✓</div><p class="text-sm">{$t('dashboard.inbox_empty')}</p></div>
            {:else}
              <div class="block lg:hidden bg-gray-50 p-2 space-y-2 sm:space-y-3">
                {#each inboxRecords as rec (rec.id)}
                  <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex justify-between items-start mb-2 sm:mb-3">
                      <div>
                        <div class="text-sm font-bold text-gray-500">{rec.date} {rec.time}</div>
                        <div class="text-xl sm:text-xl font-black text-gray-800">{rec.weight} <span class="text-sm sm:text-sm font-normal text-gray-400">kg</span></div>
                        <div class="text-sm text-gray-500 mt-1">{$t('common.height')}: {rec.height}cm</div>
                        <div class="text-sm text-gray-500">{rec.bodyFat}% {$t('metrics.body_fat')}</div>
                        <div class="text-sm text-gray-500">{rec.gender === 'male' ? $t('common.male_short') : $t('common.female_short')} / {rec.age} {$t('units.years')}</div>
                      </div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-gray-100">
                      <select class="w-full bg-blue-600 text-white font-bold text-sm sm:text-sm py-2 sm:py-3 px-3 sm:px-4 rounded-lg focus:outline-none" value="" on:change={(e) => { assignRecord(rec.id, e.currentTarget.value); e.currentTarget.value = ""; }}>
                        <option value="" disabled selected class="bg-white text-gray-600">{$t('dashboard.assign_btn')}</option>
                        {#each clients as c}<option value={c.id} class="bg-white text-gray-800">{c.alias}</option>{/each}
                      </select>
                    </div>
                  </div>
                 {/each}
               </div>

              <div class="hidden lg:block overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 text-gray-500 font-medium border-b"><tr><th class="px-4 sm:px-6 py-2 sm:py-3 w-32">{$t('analysis.date')}</th><th class="px-4 sm:px-6 py-2 sm:py-3 w-40">{$t('metrics.weight')}</th><th class="px-4 sm:px-6 py-2 sm:py-3">Info</th><th class="px-4 sm:px-6 py-2 sm:py-3 text-right w-64">{$t('dashboard.assign_btn')}</th></tr></thead>
                  <tbody class="divide-y divide-gray-100">
                    {#each inboxRecords as rec (rec.id)}
                      <tr class="hover:bg-blue-50 transition">
                        <td class="px-4 sm:px-6 py-3 sm:py-4 font-medium text-gray-800 whitespace-nowrap">{rec.date} <br><span class="text-xs text-gray-400 font-mono">{rec.time}</span></td>
                        <td class="px-4 sm:px-6 py-3 sm:py-4 font-bold text-lg whitespace-nowrap">{rec.weight} <span class="text-xs text-gray-400 font-normal">{$t('units.kg')}</span></td>
                        <td class="px-4 sm:px-6 py-3 sm:py-4">
                           <div class="flex gap-1 sm:gap-2 text-xs">
                             <span class="bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">{rec.bodyFat} {$t('units.percent')} {$t('metrics.body_fat')}</span>
                             <span class="bg-gray-100 px-2 py-1 rounded text-gray-600">{rec.gender === 'male' ? $t('common.male_short') : $t('common.female_short')} / {rec.age} {$t('units.years')}</span>
                             <span class="bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">{rec.height}cm</span>
                           </div>
                        </td>
                        <td class="px-4 sm:px-6 py-3 sm:py-4 text-right">
                          <select class="w-40 sm:w-48 border border-gray-300 rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-blue-400 transition-colors" value="" on:change={(e) => { assignRecord(rec.id, e.currentTarget.value); e.currentTarget.value = ""; }}>
                            <option value="" disabled selected>{$t('dashboard.assign_btn')}</option>
                            {#each clients as c}<option value={c.id}>{c.alias}</option>{/each}
                          </select>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/if}

        {#if currentTab === 'clients'}
          <div class="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 h-auto lg:h-[800px]">
            
            <div class="lg:col-span-1 flex flex-col gap-3 sm:gap-4 h-auto lg:h-full">
              <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                <h3 class="font-bold text-gray-700 text-xs uppercase mb-2 sm:mb-3 tracking-wide">{$t('dashboard.create_btn')}</h3>
                <div class="space-y-2">
                  <input bind:value={newClientCodeOrAlias} placeholder="{$t('dashboard.client_id_placeholder')}" class="w-full text-sm sm:text-sm border rounded px-3 sm:px-3 py-2 sm:py-2 bg-gray-50 focus:bg-white transition-colors" />
                  <button on:click={createClient} disabled={!newClientCodeOrAlias} class="w-full bg-gray-800 text-white text-sm sm:text-sm font-bold py-2 sm:py-2 rounded hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm touch-manipulation">{$t('actions.save')}</button>
                  <p class="text-[10px] sm:text-[9px] text-red-400 italic mt-1">{$t('welcome.privacy_hint')}</p>
                </div>
              </div>
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col min-h-[200px] sm:min-h-[300px] lg:min-h-0">
                <div class="p-2 border-b bg-gray-50">
                  <input type="text" bind:value={clientSearchTerm} placeholder={$t('dashboard.filter_placeholder')} class="w-full text-sm sm:text-sm border rounded px-3 sm:px-3 py-2 sm:py-1.5 bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div class="overflow-y-auto flex-1 p-1 sm:p-2 space-y-1">
                  {#each filteredClients as client (client.id)}
                    <button on:click={() => selectedClientId = client.id} class="w-full text-left px-3 sm:px-3 py-3 sm:py-3 rounded-md text-sm sm:text-sm group hover:bg-blue-50 transition flex justify-between items-center touch-manipulation {selectedClientId === client.id ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-300' : 'text-gray-700'}">
                      <div class="truncate pr-2">
                          <div class="font-bold truncate">{client.alias}</div>
                      </div>
                      <span class="text-[10px] sm:text-[10px] bg-white border px-2 sm:px-1.5 py-1 rounded text-gray-500 font-mono">
                         {PatientManager.getClientHistory(client.id, allRecords).length}
                      </span>
                    </button>
                  {/each}
                </div>
              </div>
            </div>
            
            <div class="lg:col-span-3 flex flex-col gap-4 sm:gap-6 h-full lg:overflow-y-auto lg:pr-1 lg:pb-10">
              {#if !selectedClientId}
                <div class="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200 py-12 px-4 text-center">
                  <p class="text-4xl mb-4 opacity-50">👤</p>
                  <p class="max-w-xs">{$t('dashboard.select_client_prompt')}</p>
                </div>
              {:else}
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 flex-shrink-0">
                  <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <h2 class="text-2xl font-bold text-gray-800">{clients.find(c => c.id === selectedClientId)?.alias}</h2>
                    </div>
                    <div class="flex gap-2">
                      <button on:click={() => deleteClient(selectedClientId)} class="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded border border-transparent hover:border-red-100 transition touch-manipulation">🗑 {$t('actions.delete')}</button>
                      <button on:click={exportClientData} class="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-green-700 shadow-sm transition touch-manipulation">📊 {$t('actions.export_csv')}</button>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 border-t pt-3">
                    <span class="text-xs font-bold text-gray-400 uppercase mr-1">{$t('dashboard.filters.title')}</span>
                    <button on:click={() => currentFilter = 'all'} class="{STYLES.filterBtn} {currentFilter === 'all' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.all')}</button>
                    <button on:click={() => currentFilter = '1m'} class="{STYLES.filterBtn} {currentFilter === '1m' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_month')}</button>
                    <button on:click={() => currentFilter = '3m'} class="{STYLES.filterBtn} {currentFilter === '3m' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_3_months')}</button>
                    <button on:click={() => currentFilter = '6m'} class="{STYLES.filterBtn} {currentFilter === '6m' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_6_months')}</button>
                    <button on:click={() => currentFilter = '1y'} class="{STYLES.filterBtn} {currentFilter === '1y' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_year')}</button>
                    
                    <div class="flex items-center gap-2 ml-auto border rounded px-3 py-1 bg-gray-50 flex-grow max-w-sm">
                       <input type="date" bind:value={customDateStart} on:change={() => currentFilter = 'custom'} class="text-xs bg-transparent outline-none flex-grow" />
                       <span class="text-gray-400 font-bold">→</span>
                       <input type="date" bind:value={customDateEnd} on:change={() => currentFilter = 'custom'} class="text-xs bg-transparent outline-none flex-grow" />
                    </div>
                  </div>
                </div>

                <div class="w-full flex-shrink-0 bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-200 shadow-inner overflow-x-auto scrollbar-thin">
                  {#if displayedHistory.length === 0}
                    <p class="text-xs sm:text-sm text-gray-400 text-center py-2">{$t('dashboard.no_data_client')}</p>
                  {:else}
                    <div class="flex gap-2 sm:gap-3">
                      {#each displayedHistory as rec (rec.id)}
                        <button on:click={() => selectedRecordId = rec.id} class="flex-shrink-0 w-24 sm:w-32 p-2 sm:p-3 rounded-lg border text-left transition-all touch-manipulation {selectedRecordId === rec.id || (!selectedRecordId && rec === currentRecord) ? 'border-blue-600 bg-white ring-2 ring-blue-500 shadow-md transform scale-105 z-10' : 'bg-white border-gray-200 opacity-80 hover:opacity-100'}">
                          <div class="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold mb-1 leading-tight">{rec.date} <br><span class="font-normal opacity-75 text-[8px] sm:text-[9px]">{rec.time}</span></div>
                          <div class="font-black text-gray-800 text-lg sm:text-xl">{rec.weight}<span class="text-xs sm:text-sm font-normal text-gray-400 ml-0.5">{$t('units.kg')}</span></div>
                          <div class="text-xs font-medium mt-1 sm:mt-2 flex justify-between"><span class="text-blue-600">{rec.bodyFat}%</span><span class="text-gray-400">{rec.bmi}</span></div>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
                
                {#if currentRecord}
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 -mt-2 mb-4 border-b border-gray-100 pb-3">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">{$t('dashboard.latest_reading')}</span>
                      <span class="text-xs font-mono text-gray-300 hidden sm:inline">|</span>
                      <span class="text-xs font-bold text-gray-600">{currentRecord.date} {currentRecord.time}</span>
                    </div>
                    <button on:click={unassignCurrentRecord} class="text-xs text-red-500 hover:text-white border border-red-200 hover:bg-red-500 px-2 sm:px-3 py-1 rounded transition-colors flex items-center gap-1 font-medium touch-manipulation self-end sm:self-auto">
                      <span>↩️</span> {$t('dashboard.detach_record')}
                    </button>
                  </div>

                  <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    <div class="h-full min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] xl:min-h-[500px]">
                      <BodyMap record={currentRecord} />
                    </div>

                    <div class="flex flex-col gap-3 sm:gap-4">
                      <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-1 sm:gap-2">
                        <div class={STYLES.metricColMain}>
                          <span class={STYLES.metricLabel}>{$t('metrics.weight')}</span>
                          <span class={STYLES.metricValueLg}>{currentRecord.weight}<span class={STYLES.metricUnit}>{$t('units.kg')}</span></span>
                        </div>
                        <div class={STYLES.divider}></div>
                        <div class={STYLES.metricColMain}>
                          <span class={STYLES.metricLabel}>{$t('metrics.bmi')}</span>
                          <span class="{STYLES.metricValueMd} {getStatusColor('bmi', currentRecord.bmi).replace('bg-', 'text-').replace('-100', '-600')}">{currentRecord.bmi}</span>
                        </div>
                        <div class={STYLES.divider}></div>
                        <div class={STYLES.metricColMain}>
                          <span class={STYLES.metricLabel}>{$t('metrics.dci')}</span>
                          <span class="{STYLES.metricValueMd} text-green-600">{currentRecord.dci}<span class={STYLES.metricUnit}>kcal</span></span>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-2 sm:gap-3">
                        <div class="{STYLES.cardMetric} border-yellow-500">
                            <span class={STYLES.metricLabel}>{$t('metrics.body_fat')}</span>
                            <span class={STYLES.metricValueCard}>{currentRecord.bodyFat}<span class={STYLES.metricUnit}>{$t('units.percent')}</span></span>
                        </div>
                        <div class="{STYLES.cardMetric} border-blue-500">
                            <span class={STYLES.metricLabel}>{$t('metrics.muscle_mass')}</span>
                            <span class={STYLES.metricValueCard}>{currentRecord.muscleMass}<span class={STYLES.metricUnit}>{$t('units.kg')}</span></span>
                        </div>
                        <div class="{STYLES.cardMetric} {getStatusColor('water', currentRecord.waterPercentage).replace('bg-', 'border-')}">
                            <span class={STYLES.metricLabel}>{$t('metrics.water')}</span>
                            <span class={STYLES.metricValueCard}>{currentRecord.waterPercentage}<span class={STYLES.metricUnit}>{$t('units.percent')}</span></span>
                        </div>
                        <div class="{STYLES.cardMetric} border-gray-400">
                            <span class={STYLES.metricLabel}>{$t('metrics.bone_mass')}</span>
                            <span class={STYLES.metricValueCard}>{currentRecord.boneMass}<span class={STYLES.metricUnit}>{$t('units.kg')}</span></span>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-2 sm:gap-3">
                        <div class="bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <p class="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">{$t('metrics.visceral_fat')}</p>
                          <div class="flex items-end justify-between mt-1">
                            <span class="text-xs text-gray-400">Objetivo: 1-12</span>
                            <span class="text-base sm:text-lg font-black {getStatusColor('visceral', currentRecord.visceralFat).replace('bg-', 'text-').replace('-100', '-600')}">{currentRecord.visceralFat}</span>
                          </div>
                        </div>
                        <div class="bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <p class="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase">{$t('metrics.metabolic_age')}</p>
                          <div class="flex items-end justify-between mt-1">
                            <span class="text-xs text-gray-400">Edad: {currentRecord.age}</span>
                            <span class="text-base sm:text-lg font-black {getStatusColor('meta', currentRecord.metabolicAge).replace('bg-', 'text-').replace('-100', '-600')}">{currentRecord.metabolicAge}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {#if chartData}
                    <div class="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mt-4 sm:mt-6">
                      <div class="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
                         <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">{$t('dashboard.evolution_chart')} ({chartData.pointsData.length})</h3>
                         <select bind:value={selectedChartMetric} class="w-full sm:w-auto min-w-[200px] sm:min-w-[240px] border border-gray-300 rounded px-3 py-1.5 text-xs sm:text-sm font-medium bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm">
                           {#each CHART_OPTIONS as option}<option value={option.key}>{$t(option.label)}</option>{/each}
                         </select>
                      </div>
                      <div role="img" aria-label="Evolution Chart" class="h-48 sm:h-64 md:h-72 w-full relative group" on:mouseleave={() => { hoveredIndex = null; hoveredPointData = null; }}>
                        <svg viewBox="-12 -5 115 120" preserveAspectRatio="none" class="w-full h-full overflow-visible font-sans">
                          <defs><linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color={activeChartColor} stop-opacity="0.2"/><stop offset="100%" stop-color={activeChartColor} stop-opacity="0"/></linearGradient></defs>
                          {#each chartData.gridLines as grid}
                             <line x1="0" y1={grid.y} x2="100" y2={grid.y} stroke="#e5e7eb" stroke-width="0.5" />
                             <text x="-3" y={grid.y + 1.5} font-size="3.0" font-weight="bold" fill="#9ca3af" text-anchor="end">{grid.label}</text>
                          {/each}
                          <polyline points={chartData.areaPath} fill="url(#chartGradient)" />
                          <polyline fill="none" stroke={activeChartColor} stroke-width="1.5" points={chartData.polyline} vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
                          {#each chartData.pointsData as p, i}
                            <circle cx={p.x} cy={p.y} r={hoveredIndex === i ? 3 : 1.5} fill={activeChartColor} stroke="white" stroke-width="0.5" class="transition-all duration-150 pointer-events-none" />
                            <rect role="presentation" x={p.x - 3} y="0" width="6" height="100" fill="transparent" class="cursor-pointer hover:fill-gray-50/10"
                                  on:mouseenter={() => { hoveredIndex = i; hoveredPointData = { ...p, unitKey: activeChartUnitKey }; }}
                                  on:touchstart|passive={() => { hoveredIndex = i; hoveredPointData = { ...p, unitKey: activeChartUnitKey }; }} />
                            {#if p.showLabel}
                               <text x={p.x} y="112" font-size="3.2" font-weight="bold" fill="#6b7280" text-anchor="middle">{p.date.slice(0,5)}</text>
                            {/if}
                          {/each}
                        </svg>
                        
                        {#if hoveredPointData}
                          <div class="absolute bg-gray-900 text-white text-xs sm:text-sm rounded px-2 sm:px-3 py-1 sm:py-2 pointer-events-none transform shadow-xl z-30 min-w-[80px] sm:min-w-[100px] text-center transition-all duration-75"
                               style="left: {hoveredPointData.x}%; top: {hoveredPointData.isTop ? hoveredPointData.y + 10 : hoveredPointData.y - 15}%; transform: translate({hoveredPointData.isRightSide ? '-100%' : hoveredPointData.x < 15 ? '0%' : '-50%'}, -50%);">
                            <div class="font-black text-base sm:text-lg leading-none mb-1">{hoveredPointData.val} <span class="text-xs font-normal opacity-80">{$t(`units.${hoveredPointData.unitKey}`)}</span></div>
                            <div class="text-[9px] sm:text-[10px] font-mono text-gray-300 border-t border-gray-700 pt-1 mt-1">{hoveredPointData.date}</div>
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if} {/if} {/if} </div>
          </div>
        {/if} {#if currentTab === 'settings'}
          <div class="max-w-2xl mx-auto space-y-6 sm:space-y-8">
            <div class="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                <h3 class="text-base sm:text-lg font-bold text-gray-800 mb-2">{$t('settings.backup_section')}</h3>
                <div class="grid gap-3 sm:gap-4">
                    <button on:click={() => PatientManager.exportBackup()} class="flex items-center justify-center gap-2 sm:gap-3 w-full bg-gray-800 text-white py-3 sm:py-4 rounded-lg hover:bg-black transition font-bold shadow-md text-sm sm:text-base"><span>💾</span> {$t('settings.btn_export')}</button>
                    <div class="relative border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 md:p-8 text-center hover:bg-gray-50 transition cursor-pointer group">
                        <input type="file" accept=".json" on:change={handleImportBackup} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div class="text-gray-500 group-hover:text-blue-600 font-medium flex flex-col items-center gap-2"><span class="text-xl sm:text-2xl">📂</span> {$t('settings.btn_import')}</div>
                    </div>
                </div>
                <div class="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-red-100">
                    <button on:click={deleteAllData} class="flex items-center justify-center gap-2 w-full text-red-600 text-xs sm:text-sm font-bold hover:text-red-800 hover:bg-red-50 py-3 sm:py-4 border border-red-100 rounded transition"><span>🗑️</span> {$t('settings.delete_all_btn')}</button>
                </div>
            </div>
          </div>
        {/if}
    </main>
  </div>
{/if}

<style>
  /* Scrollbar Minimalista (CSS Válido, no usa @apply) */
  .scrollbar-thin::-webkit-scrollbar { height: 6px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 20px; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  @media print {
    header, input[type="file"], button, .bg-blue-50, .border-dashed { display: none !important; }
    .shadow-sm { box-shadow: none !important; border: 1px solid #eee; }
    :global(body) { background: white; }
  }
</style>