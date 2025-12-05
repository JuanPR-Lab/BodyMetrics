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

  // --- STATE MANAGEMENT ---
  let allRecords: BioMetricRecord[] = [];
  let clients: Client[] = [];

  // UI State
  let currentTab: 'inbox' | 'clients' | 'settings' = 'inbox';
  let isProcessing = false;
  let errorMessage = '';
  let isDragging = false;

  // Selection State
  let selectedClientId: string = '';
  let selectedRecordId: string = '';
  let clientSearchTerm = ''; 
  
  // Filter State
  type FilterMode = '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';
  let currentFilter: FilterMode = 'all'; 
  let customDateStart = '';
  let customDateEnd = '';

  // Chart State
  let selectedChartMetric: keyof BioMetricRecord = 'weight';

  // Visual Hover State
  let hoveredIndex: number | null = null;
  let hoveredPointData: { x: number, y: number, val: string, date: string, unitKey: string, isRightSide: boolean, isTop: boolean } | null = null;
  
  // Form State
  let newClientId = '';
  let newClientAlias = '';

  // --- CHART OPTIONS ---
  const chartOptions = [
    { key: 'weight', label: 'metrics.weight', color: '#1f2937', unitKey: 'kg' },
    { key: 'bmi', label: 'metrics.bmi', color: '#4b5563', unitKey: '' },
    { key: 'dci', label: 'metrics.dci', color: '#10b981', unitKey: 'kcal' },
    { key: 'bodyFat', label: 'metrics.body_fat', color: '#eab308', unitKey: 'percent' },
    { key: 'muscleMass', label: 'metrics.muscle_mass', color: '#3b82f6', unitKey: 'kg' },
    { key: 'waterPercentage', label: 'metrics.water', color: '#0ea5e9', unitKey: 'percent' },
    { key: 'boneMass', label: 'metrics.bone_mass', color: '#6b7280', unitKey: 'kg' },
    { key: 'visceralFat', label: 'metrics.visceral_fat', color: '#d97706', unitKey: 'rating' },
    { key: 'metabolicAge', label: 'metrics.metabolic_age', color: '#8b5cf6', unitKey: 'years' }
  ];

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
  $: showWelcomeScreen = clients.length === 0;
  $: inboxRecords = allRecords.filter(r => !PatientManager.getClientForRecord(r.id));
  $: filteredClients = clients.filter(c => {
    if (!clientSearchTerm) return true;
    const term = clientSearchTerm.toLowerCase().trim();
    const id = c.id.toLowerCase();
    const alias = c.alias.toLowerCase();
    return id.includes(term) || alias.includes(term) || id.replace(/0/g, '').includes(term.replace(/0/g, ''));
  });

  $: clientHistory = selectedClientId 
    ? PatientManager.getClientHistory(selectedClientId, allRecords).sort((a, b) => {
        return getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time);
      })
    : [];

  $: displayedHistory = filterHistory(clientHistory, currentFilter, customDateStart, customDateEnd);
  $: currentRecord = displayedHistory.find(r => r.id === selectedRecordId) || displayedHistory[0] || null;

  // Chart Data Calculation
  $: activeChartOption = chartOptions.find(o => o.key === selectedChartMetric);
  $: activeChartColor = activeChartOption?.color || '#1f2937';
  $: activeChartUnitKey = activeChartOption?.unitKey || ''; 
  
  $: chartData = displayedHistory.length > 0 ? prepareSingleChart(displayedHistory, selectedChartMetric, activeChartUnitKey) : null;

  // --- DATA OPERATIONS ---
  function filterHistory(history: BioMetricRecord[], mode: FilterMode, start: string, end: string) {
    if (history.length === 0) return [];
    if (mode === 'all') return history;

    const now = new Date();
    let cutoffTime = 0;

    if (mode === '1m') cutoffTime = new Date(now.setMonth(now.getMonth() - 1)).getTime();
    if (mode === '3m') cutoffTime = new Date(now.setMonth(now.getMonth() - 3)).getTime();
    if (mode === '6m') cutoffTime = new Date(now.setMonth(now.getMonth() - 6)).getTime();
    if (mode === '1y') cutoffTime = new Date(now.setFullYear(now.getFullYear() - 1)).getTime();

    if (mode === 'custom') {
      const s = start ? new Date(start).getTime() : 0;
      const e = end ? new Date(end).getTime() + 86400000 : Infinity;
      return history.filter(r => {
        const t = getTimestamp(r.date, r.time);
        return t >= s && t < e;
      });
    }
    return history.filter(r => getTimestamp(r.date, r.time) >= cutoffTime);
  }

  onMount(() => {
    refreshClients();
    const today = new Date().toISOString().split('T')[0];
    customDateEnd = today;
  });

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
      
      if (!showWelcomeScreen && inboxRecords.length > 0) currentTab = 'inbox';
    } catch (err) {
      console.error(err);
      const $t = get(t);
      errorMessage = $t('upload.error');
    } finally {
      isProcessing = false;
      isDragging = false;
    }
  };

  const createClient = () => {
    if (!newClientId) return;
    const success = PatientManager.addClient(newClientId, newClientAlias);
    if (success) {
      refreshClients();
      selectedClientId = newClientId;
      newClientId = '';
      newClientAlias = '';
      clientSearchTerm = '';
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
    setTimeout(() => refreshClients(), 50);
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
    const client = clients.find(c => c.id === selectedClientId);
    const filename = client ? `${client.id}_${client.alias.replace(/\s/g, '_')}.csv` : 'export.csv';
    
    const headersMap = {
      date: $t('csv_headers.date'), 
      time: $t('csv_headers.time'), 
      model: $t('csv_headers.model'),
      weight: $t('metrics.weight'), 
      bmi: $t('metrics.bmi'), 
      bodyFat: $t('metrics.body_fat'), 
      muscleMass: $t('metrics.muscle_mass'), 
      visceralFat: $t('metrics.visceral_fat'),
      waterPercentage: $t('metrics.water'), 
      boneMass: $t('metrics.bone_mass'),
      metabolicAge: $t('metrics.metabolic_age'), 
      dci: $t('metrics.dci'),
      fatTrunk: $t('csv_headers.fat_trunk'), 
      fatArmR: $t('csv_headers.fat_arm_r'),
      fatArmL: $t('csv_headers.fat_arm_l'), 
      fatLegR: $t('csv_headers.fat_leg_r'),
      fatLegL: $t('csv_headers.fat_leg_l'), 
      muscleTrunk: $t('csv_headers.mus_trunk'),
      muscleArmR: $t('csv_headers.mus_arm_r'), 
      muscleArmL: $t('csv_headers.mus_arm_l'),
      muscleLegR: $t('csv_headers.mus_leg_r'), 
      muscleLegL: $t('csv_headers.mus_leg_l')
    };
    
    exportToCSV(clientHistory, headersMap, filename);
  };

  const handleImportBackup = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const $t = get(t);
    const text = await file.text();
    
    if (PatientManager.importBackup(text)) {
      alert($t('settings.import_success'));
      refreshClients();
    } else {
      alert($t('settings.import_error'));
    }
  };

  // --- CHART GENERATOR LOGIC ---
  function prepareSingleChart(history: BioMetricRecord[], key: keyof BioMetricRecord, unitKey: string) {
    try {
      const sorted = [...history].sort((a, b) => getTimestamp(a.date, a.time) - getTimestamp(b.date, b.time));
      const data = sorted;
      if (data.length === 0) return null;

      const values = data.map(d => Number(d[key]) || 0);
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
      const stepX = data.length > 1 ? 100 / (data.length - 1) : 0;

      const gridLines = [];
      for (let v = axisMin; v <= axisMax + 0.0001; v += step) {
        const y = 100 - ((v - axisMin) / range * 100);
        gridLines.push({ y, label: parseFloat(v.toFixed(1)) }); 
      }

      const pointsData = data.map((d, i) => {
        const val = Number(d[key]) || 0;
        const x = data.length > 1 ? i * stepX : 50;
        const y = 100 - ((val - axisMin) / range * 100);
        
        const showLabel = (data.length <= 6) || 
                          (i === 0) || 
                          (i === data.length - 1) || 
                          (data.length > 10 && i % Math.ceil(data.length / 5) === 0);
        
        const isRightSide = x > 60; 
        const isTop = y < 25;

        return { x, y, val: val.toFixed(1), date: d.date, showLabel, unitKey, isRightSide, isTop };
      });

      const polyline = data.length > 1 ? pointsData.map(p => `${p.x},${p.y}`).join(' ') : '';
      const areaPath = data.length > 1 ? `0,120 ${polyline} 100,120` : '';

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

  const onPointEnter = (i: number, point: any) => {
    hoveredIndex = i;
    hoveredPointData = point;
  };
  const onChartLeave = () => {
    hoveredIndex = null;
    hoveredPointData = null;
  };
</script>

{#if $isLocaleLoading}
  <div class="flex items-center justify-center h-screen text-gray-500">Loading...</div>
{:else}
  <div 
    role="application"
    class="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20"
    on:dragover|preventDefault={() => isDragging = true} 
    on:dragleave|preventDefault={() => isDragging = false} 
    on:drop|preventDefault={handleDrop}
  >
    <header class="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="bg-blue-600 text-white px-3 py-1 rounded-lg font-black text-xl tracking-tighter shadow-sm">BM</div>
          <div><h1 class="text-lg font-bold text-gray-800 leading-none">{$t('app.title')}</h1></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="hidden md:inline-block px-2 py-0.5 bg-green-50 text-green-700 text-[10px] uppercase tracking-wider rounded font-bold border border-green-100">🔒 {$t('app.privacy_badge')}</span>
          <div class="flex text-xs font-bold border rounded overflow-hidden bg-white">
            <button on:click={() => switchLang('es')} class="px-2 py-1 hover:bg-gray-50 border-r transition-colors">ES</button>
            <button on:click={() => switchLang('en')} class="px-2 py-1 hover:bg-gray-50 transition-colors">EN</button>
          </div>
        </div>
      </div>
      {#if !showWelcomeScreen}
        <div class="max-w-7xl mx-auto px-4 flex gap-2 sm:gap-8 mt-1 overflow-x-auto">
          <button class="whitespace-nowrap py-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors {currentTab === 'inbox' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'inbox'}>📥 {$t('dashboard.tabs.inbox')} {#if inboxRecords.length > 0}<span class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">{inboxRecords.length}</span>{/if}</button>
          <button class="whitespace-nowrap py-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors {currentTab === 'clients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'clients'}>👥 {$t('dashboard.tabs.clients')}</button>
          <button class="whitespace-nowrap py-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors {currentTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'settings'}>⚙️ {$t('dashboard.tabs.settings')}</button>
        </div>
      {/if}
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6">
      {#if showWelcomeScreen}
        <div class="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-12 text-center mt-2 md:mt-6">
          <div class="text-6xl mb-6 animate-pulse">👋</div>
          <h2 class="text-3xl font-black text-gray-800 mb-3">{$t('welcome.title')}</h2>
          <p class="text-gray-500 mb-10 text-lg max-w-2xl mx-auto">{$t('welcome.subtitle')}</p>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-left mb-12">
            <div class="p-6 bg-blue-50 rounded-xl border border-blue-100 hover:shadow-md transition-shadow">
              <h3 class="font-bold text-blue-900 text-sm mb-2">{$t('welcome.guide_1_title')}</h3>
              <p class="text-xs text-blue-800 leading-relaxed">{$t('welcome.guide_1_text')}</p>
            </div>
            <div class="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
              <h3 class="font-bold text-gray-800 text-sm mb-2">{$t('welcome.guide_2_title')}</h3>
              <p class="text-xs text-gray-600 leading-relaxed">{$t('welcome.guide_2_text')}</p>
            </div>
            <div class="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
              <h3 class="font-bold text-gray-800 text-sm mb-2">{$t('welcome.guide_3_title')}</h3>
              <p class="text-xs text-gray-600 leading-relaxed">{$t('welcome.guide_3_text')}</p>
            </div>
            <div class="p-6 bg-green-50 rounded-xl border border-green-100 hover:shadow-md transition-shadow">
              <h3 class="font-bold text-green-900 text-sm mb-2">{$t('welcome.guide_4_title')}</h3>
              <p class="text-xs text-green-800 leading-relaxed">{$t('welcome.guide_4_text')}</p>
            </div>
            <div class="p-6 bg-yellow-50 rounded-xl border border-yellow-100 hover:shadow-md transition-shadow">
              <h3 class="font-bold text-yellow-900 text-sm mb-2">{$t('welcome.guide_5_title')}</h3>
              <p class="text-xs text-yellow-800 leading-relaxed">{$t('welcome.guide_5_text')}</p>
            </div>
            <div class="p-6 bg-gray-800 rounded-xl border border-gray-700 text-gray-300 hover:shadow-md transition-shadow">
              <h3 class="font-bold text-white text-sm mb-2">{$t('welcome.guide_6_title')}</h3>
              <p class="text-xs leading-relaxed mb-3">{$t('welcome.guide_6_text')}</p>
              <a href="https://github.com/juanpr24/BodyMetrics" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-[10px] font-bold bg-white text-gray-900 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                <span class="mr-1">🔗</span> {$t('welcome.github_link')}
              </a>
            </div>
          </div>
  
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto border-t border-gray-100 pt-8">
            <div class="bg-white p-6">
              <p class="text-sm font-bold text-gray-700 mb-4 text-left">{$t('welcome.cta')}</p>
              <div class="space-y-3">
                <input bind:value={newClientId} placeholder={$t('dashboard.client_id_placeholder')} class="w-full border border-gray-300 rounded px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                <input bind:value={newClientAlias} placeholder={$t('dashboard.client_alias_placeholder')} class="w-full border border-gray-300 rounded px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                <button on:click={createClient} disabled={!newClientId} class="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                  {$t('dashboard.create_btn')}
                </button>
                <p class="text-[10px] text-red-500 italic leading-tight mt-2 text-left">{$t('welcome.privacy_hint')}</p>
              </div>
            </div>
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col justify-center">
              <p class="text-sm font-bold text-gray-700 mb-4">{$t('welcome.cta_import')}</p>
              <label class="w-full flex flex-col items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-300 text-gray-600 font-bold py-6 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer">
                <span class="text-2xl">📂</span> 
                <span>{$t('welcome.btn_import')}</span>
                <input type="file" accept=".json" on:change={handleImportBackup} class="hidden" />
              </label>
            </div>
          </div>
        </div>
      {:else}
        {#if currentTab === 'inbox'}
          <div class="bg-white p-4 md:p-8 rounded-xl border-2 border-dashed border-gray-300 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:border-blue-400 hover:bg-gray-50 {isDragging ? 'ring-4 ring-blue-100 border-blue-500 bg-blue-50' : ''}">
            <div class="text-sm text-gray-600 flex flex-col gap-2 max-w-lg">
              <strong class="text-gray-800 text-lg flex items-center gap-2"><span>📥</span> {$t('upload.instruction_title')}</strong>
              <span class="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200 w-fit">{$t('upload.instruction_path')}</span>
            </div>
            <div class="flex flex-col items-center md:items-end gap-3">
              <span class="text-sm text-gray-400 font-medium italic hidden md:block">{$t('upload.drop_zone')}</span>
              <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-bold transition inline-flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <span>📂</span> {isProcessing ? $t('upload.processing') : $t('upload.browse')}
                <input 
                  type="file" 
                  multiple 
                  accept=".csv, text/csv, application/vnd.ms-excel, application/csv, text/x-csv, text/plain" 
                  on:change={(e)=>handleFiles((e.target as HTMLInputElement).files)} 
                  disabled={isProcessing} 
                  class="hidden" 
                />
              </label>
            </div>
            {#if errorMessage}<div class="w-full md:w-auto text-red-500 text-xs font-bold bg-red-50 px-3 py-2 rounded border border-red-100">{errorMessage}</div>{/if}
          </div>
        {/if}
        {#if currentTab === 'inbox'}
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {#if inboxRecords.length === 0}
              <div class="p-12 text-center text-gray-400 bg-gray-50"><div class="text-4xl mb-2 opacity-50">✓</div><p>{$t('dashboard.inbox_empty')}</p></div>
            {:else}
              <div class="block md:hidden bg-gray-50 p-2 space-y-3">
                {#each inboxRecords as rec}
                  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <div class="text-xs font-bold text-gray-500">{rec.date} {rec.time}</div>
                        <div class="text-xl font-black text-gray-800">
                            {rec.weight} <span class="text-sm font-normal text-gray-400">kg</span>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">Height: {rec.height}cm</div>
                      </div>
                      <div class="text-right">
                         <div class="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">{rec.bodyFat}% Fat</div>
                      </div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-gray-100">
                      <select class="w-full bg-blue-600 text-white font-bold text-sm py-3 px-4 rounded-lg focus:outline-none" value="" on:change={(e) => { assignRecord(rec.id, e.currentTarget.value); e.currentTarget.value = ""; }}>
                        <option value="" disabled selected class="bg-white text-gray-600">{$t('dashboard.assign_btn')}</option>
                        {#each clients as c}<option value={c.id} class="bg-white text-gray-800">{c.alias}</option>{/each}
                      </select>
                    </div>
                  </div>
                {/each}
              </div>

              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="bg-gray-50 text-gray-500 font-medium border-b"><tr><th class="px-6 py-3 w-32">{$t('analysis.date')}</th><th class="px-6 py-3 w-40">{$t('metrics.weight')}</th><th class="px-6 py-3">Info</th><th class="px-6 py-3 text-right w-64">{$t('dashboard.assign_btn')}</th></tr></thead>
                  <tbody class="divide-y divide-gray-100">
                    {#each inboxRecords as rec}
                      <tr class="hover:bg-blue-50 transition">
                        <td class="px-6 py-4 font-medium text-gray-800 whitespace-nowrap">{rec.date} <br><span class="text-xs text-gray-400 font-mono">{rec.time}</span></td>
                        <td class="px-6 py-4 font-bold text-lg whitespace-nowrap">{rec.weight} <span class="text-xs text-gray-400 font-normal">{$t('units.kg')}</span></td>
                        <td class="px-6 py-4">
                          <div class="flex gap-2 text-xs">
                             <span class="bg-gray-100 px-2 py-1 rounded text-gray-600 font-bold">{rec.bodyFat} {$t('units.percent')} {$t('metrics.body_fat')}</span>
                             <span class="bg-gray-100 px-2 py-1 rounded text-gray-600">{rec.gender === 'male' ? $t('common.male_short') : $t('common.female_short')} / {rec.age}{$t('common.year_short')}</span>
                             <span class="bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">{rec.height}cm</span>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-right"><select class="w-48 border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-blue-400 transition-colors" value="" on:change={(e) => { assignRecord(rec.id, e.currentTarget.value); e.currentTarget.value = ""; }}><option value="" disabled selected>{$t('dashboard.assign_btn')}</option>{#each clients as c}<option value={c.id}>{c.alias}</option>{/each}</select></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/if}
        {#if currentTab === 'clients'}
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[800px]">
            <div class="lg:col-span-1 flex flex-col gap-4 h-auto lg:h-full">
              <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                <h3 class="font-bold text-gray-700 text-xs uppercase mb-3 tracking-wide">{$t('dashboard.create_btn')}</h3>
                <div class="space-y-2"><input bind:value={newClientId} placeholder={$t('dashboard.client_id_placeholder')} class="w-full text-sm border rounded px-3 py-2 bg-gray-50 focus:bg-white transition-colors" /><input bind:value={newClientAlias} placeholder={$t('dashboard.client_alias_placeholder')} class="w-full text-sm border rounded px-3 py-2 bg-gray-50 focus:bg-white transition-colors" /><button on:click={createClient} disabled={!newClientId} class="w-full bg-gray-800 text-white text-sm font-bold py-2 rounded hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm">{$t('actions.save')}</button><p class="text-[9px] text-red-400 italic mt-1">{$t('welcome.privacy_hint')}</p></div>
              </div>
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col min-h-[200px] lg:min-h-0"><div class="p-2 border-b bg-gray-50"><input type="text" bind:value={clientSearchTerm} placeholder={$t('dashboard.filter_placeholder')} class="w-full text-sm border rounded px-3 py-1.5 bg-white focus:ring-1 focus:ring-blue-500 outline-none" /></div>
                <div class="overflow-y-auto flex-1 p-2 space-y-1">{#each filteredClients as client}<button on:click={() => selectedClientId = client.id} class="w-full text-left px-3 py-3 rounded-md text-sm group hover:bg-blue-50 transition flex justify-between items-center {selectedClientId === client.id ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-300' : 'text-gray-700'}"><div class="truncate pr-2"><div class="font-bold truncate">{client.alias}</div><div class="text-[10px] opacity-60 font-mono">{client.id}</div></div><span class="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-500 font-mono">{PatientManager.getClientHistory(client.id, allRecords).length}</span></button>{/each}</div>
              </div>
            </div>
            
            <div class="lg:col-span-3 flex flex-col gap-6 h-full overflow-y-auto pr-1 pb-10">
              {#if !selectedClientId}
                <div class="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border-2 border-dashed border-gray-200 py-12"><p class="text-4xl mb-4 opacity-50">👤</p><p>{$t('dashboard.select_client_prompt')}</p></div>
              {:else}
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 flex-shrink-0">
                  <div class="flex justify-between items-start"><div><h2 class="text-2xl font-bold text-gray-800">{clients.find(c => c.id === selectedClientId)?.alias}</h2><p class="text-sm text-gray-400 font-mono mt-1">ID: {selectedClientId}</p></div><div class="flex gap-2"><button on:click={() => deleteClient(selectedClientId)} class="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded border border-transparent hover:border-red-100 transition">🗑 {$t('actions.delete')}</button><button on:click={exportClientData} class="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-green-700 shadow-sm transition">📊 {$t('actions.export_csv')}</button></div></div>
                  <div class="flex flex-wrap items-center gap-2 border-t pt-3"><span class="text-xs font-bold text-gray-400 uppercase mr-1">{$t('dashboard.filters.title')}</span><button on:click={() => currentFilter = 'all'} class="px-2 py-1 text-[10px] font-bold rounded border transition {currentFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100'}">{$t('dashboard.filters.all')}</button><button on:click={() => currentFilter = '1m'} class="px-2 py-1 text-[10px] font-bold rounded border transition {currentFilter === '1m' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100'}">{$t('dashboard.filters.last_month')}</button><button on:click={() => currentFilter = '3m'} class="px-2 py-1 text-[10px] font-bold rounded border transition {currentFilter === '3m' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100'}">{$t('dashboard.filters.last_3_months')}</button><button on:click={() => currentFilter = '6m'} class="px-2 py-1 text-[10px] font-bold rounded border transition {currentFilter === '6m' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100'}">{$t('dashboard.filters.last_6_months')}</button><button on:click={() => currentFilter = '1y'} class="px-2 py-1 text-[10px] font-bold rounded border transition {currentFilter === '1y' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100'}">{$t('dashboard.filters.last_year')}</button><div class="flex items-center gap-1 ml-auto border rounded px-2 py-0.5 bg-gray-50"><span class="text-[10px] text-gray-500">{$t('dashboard.filters.from')}</span><input type="date" bind:value={customDateStart} on:change={() => currentFilter = 'custom'} class="text-[10px] bg-transparent outline-none" /><span class="text-[10px] text-gray-500">{$t('dashboard.filters.to')}</span><input type="date" bind:value={customDateEnd} on:change={() => currentFilter = 'custom'} class="text-[10px] bg-transparent outline-none" /></div></div>
                </div>
                <div class="w-full flex-shrink-0 bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-inner overflow-x-auto scrollbar-thin">
                  {#if displayedHistory.length === 0}<p class="text-sm text-gray-400 text-center py-2">{$t('dashboard.no_data_client')}</p>{:else}<div class="flex gap-3">{#each displayedHistory as rec}<button on:click={() => selectedRecordId = rec.id} class="flex-shrink-0 w-32 p-3 rounded-lg border text-left transition-all relative overflow-hidden {selectedRecordId === rec.id || (!selectedRecordId && rec === currentRecord) ? 'border-blue-600 bg-white ring-2 ring-blue-500 shadow-md z-10 transform scale-105' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm opacity-80 hover:opacity-100'}"><div class="text-[10px] text-gray-500 uppercase font-bold mb-1 leading-tight">{rec.date} <br><span class="font-normal opacity-75 text-[9px]">{rec.time}</span></div><div class="font-black text-gray-800 text-xl">{rec.weight}<span class="text-sm font-normal text-gray-400 ml-0.5">{$t('units.kg')}</span></div><div class="text-xs font-medium mt-2 flex justify-between"><span class="text-blue-600">{rec.bodyFat}%</span><span class="text-gray-400">{rec.bmi}</span></div></button>{/each}</div>{/if}
                </div>
                
                {#if currentRecord}
                  <div class="flex justify-between items-center -mt-2 mb-4 border-b border-gray-100 pb-3">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">{$t('dashboard.latest_reading')}</span>
                      <span class="text-xs font-mono text-gray-300">|</span>
                      <span class="text-xs font-bold text-gray-600">{currentRecord.date} {currentRecord.time}</span>
                    </div>
                    <button on:click={unassignCurrentRecord} class="text-xs text-red-500 hover:text-white border border-red-200 hover:bg-red-500 px-3 py-1 rounded transition-colors flex items-center gap-1 font-medium">
                      <span>↩️</span> {$t('dashboard.detach_record')}
                    </button>
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="h-full min-h-[350px] lg:min-h-[500px]">
                      <BodyMap record={currentRecord} />
                    </div>
                    <div class="flex flex-col gap-4">
                      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-2">
                        <div class="flex flex-col items-center">
                          <span class="text-[10px] font-bold text-gray-400 uppercase">{$t('metrics.weight')}</span>
                          <span class="text-3xl font-black text-gray-800">{currentRecord.weight}<span class="text-sm font-medium text-gray-400 ml-1">{$t('units.kg')}</span></span>
                        </div>
                        <div class="w-px h-8 bg-gray-100"></div>
                        <div class="flex flex-col items-center">
                          <span class="text-[10px] font-bold text-gray-400 uppercase">{$t('metrics.bmi')}</span>
                          <span class="text-2xl font-black {getStatusColor('bmi', currentRecord.bmi).replace('bg-', 'text-').replace('-100', '-600')}">
                            {currentRecord.bmi}
                          </span>
                        </div>
                        <div class="w-px h-8 bg-gray-100"></div>
                        <div class="flex flex-col items-center">
                          <span class="text-[10px] font-bold text-gray-400 uppercase">{$t('metrics.dci')}</span>
                          <span class="text-2xl font-bold text-green-600">{currentRecord.dci}<span class="text-xs font-medium text-green-400 ml-1">kcal</span></span>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-yellow-500 border-gray-100">
                          <span class="text-[10px] font-bold text-gray-500 uppercase block mb-1">{$t('metrics.body_fat')}</span>
                          <span class="text-xl font-black text-gray-800">{currentRecord.bodyFat}<span class="text-xs text-gray-400 font-medium ml-1">{$t('units.percent')}</span></span>
                        </div>
                        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-blue-500 border-gray-100">
                          <span class="text-[10px] font-bold text-gray-500 uppercase block mb-1">{$t('metrics.muscle_mass')}</span>
                          <span class="text-xl font-black text-gray-800">{currentRecord.muscleMass}<span class="text-xs text-gray-400 font-medium ml-1">{$t('units.kg')}</span></span>
                        </div>
                        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 {getStatusColor('water', currentRecord.waterPercentage).replace('bg-', 'border-')} border-gray-100">
                          <span class="text-[10px] font-bold text-gray-500 uppercase block mb-1">{$t('metrics.water')}</span>
                          <span class="text-xl font-black text-gray-800">{currentRecord.waterPercentage}<span class="text-xs text-gray-400 font-medium ml-1">{$t('units.percent')}</span></span>
                        </div>
                        <div class="bg-white p-3 rounded-xl shadow-sm border-l-4 border-gray-400 border-gray-100">
                          <span class="text-[10px] font-bold text-gray-500 uppercase block mb-1">{$t('metrics.bone_mass')}</span>
                          <span class="text-xl font-black text-gray-800">{currentRecord.boneMass}<span class="text-xs text-gray-400 font-medium ml-1">{$t('units.kg')}</span></span>
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div class="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <p class="text-[9px] font-bold text-gray-400 uppercase">{$t('metrics.visceral_fat')}</p>
                          <div class="flex items-end justify-between mt-1">
                            <span class="text-xs text-gray-400">{$t('dashboard.target')}: 1-12</span>
                            <span class="text-lg font-black {getStatusColor('visceral', currentRecord.visceralFat).replace('bg-', 'text-').replace('-100', '-600')}">{currentRecord.visceralFat}</span>
                          </div>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                          <p class="text-[9px] font-bold text-gray-400 uppercase">{$t('metrics.metabolic_age')}</p>
                          <div class="flex items-end justify-between mt-1">
                            <span class="text-xs text-gray-400">{$t('dashboard.actual_age')}: {currentRecord.age}</span>
                            <span class="text-lg font-black {getStatusColor('meta', currentRecord.metabolicAge).replace('bg-', 'text-').replace('-100', '-600')}">{currentRecord.metabolicAge}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {#if chartData}
                    <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
                      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                        <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">{$t('dashboard.evolution_chart')} ({chartData.pointsData.length})</h3>
                        <select bind:value={selectedChartMetric} class="w-full sm:w-auto min-w-[240px] border border-gray-300 rounded px-3 py-1.5 text-sm font-medium bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm">
                          {#each chartOptions as option}<option value={option.key}>{$t(option.label)}</option>{/each}
                        </select>
                      </div>
                      <div role="img" aria-label="Evolution Chart" class="h-64 sm:h-72 w-full relative group" on:mouseleave={onChartLeave}>
                        <svg viewBox="-12 -5 115 120" preserveAspectRatio="none" class="w-full h-full overflow-visible" style="font-family: ui-sans-serif, system-ui, sans-serif;">
                          <defs><linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color={activeChartColor} stop-opacity="0.2"/><stop offset="100%" stop-color={activeChartColor} stop-opacity="0"/></linearGradient></defs>
                          {#each chartData.gridLines as grid}<line x1="0" y1={grid.y} x2="100" y2={grid.y} stroke="#e5e7eb" stroke-width="0.5" /><text x="-3" y={grid.y + 1.5} font-size="3.0" font-weight="bold" fill="#374151" text-anchor="end" class="font-sans">{grid.label}</text>{/each}
                          <polyline points={chartData.areaPath} fill="url(#chartGradient)" />
                          <polyline fill="none" stroke={activeChartColor} stroke-width="1.5" points={chartData.polyline} vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
                          {#each chartData.pointsData as p, i}
                            <circle cx={p.x} cy={p.y} r={hoveredIndex === i ? 3 : 1} fill={activeChartColor} stroke="white" stroke-width="0.5" class="transition-all duration-150 cursor-pointer" />
                            <rect role="presentation" x={p.x - 2} y="0" width="4" height="100" fill="transparent" on:mouseenter={() => onPointEnter(i, { ...p, unitKey: activeChartUnitKey })} />
                            {#if p.showLabel}<text x={p.x} y="112" font-size="3.2" font-weight="bold" fill="#374151" text-anchor="middle" class="font-sans">{p.date.slice(0,5)}</text>{/if}
                          {/each}
                        </svg>
                        {#if hoveredPointData}
                          <div class="absolute bg-gray-900 text-white text-sm rounded px-3 py-2 pointer-events-none transform shadow-xl z-30 min-w-[120px] text-center transition-transform duration-100" style="left: {hoveredPointData.x}%; top: {hoveredPointData.isTop ? hoveredPointData.y + 5 : hoveredPointData.y - 8}%; transform: translate({hoveredPointData.isRightSide ? '-100%' : hoveredPointData.x < 20 ? '0%' : '-50%'}, {hoveredPointData.isTop ? '0%' : '-100%'});">
                            <div class="font-black text-xl leading-none mb-1">{hoveredPointData.val} <span class="text-sm font-normal opacity-80">{$t(`units.${hoveredPointData.unitKey}`)}</span></div>
                            <div class="text-xs font-mono text-gray-300 border-t border-gray-700 pt-1 mt-1">{hoveredPointData.date}</div>
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if}
                {/if}
              {/if}
            </div>
          </div>
        {/if}
        {#if currentTab === 'settings'}
          <div class="max-w-2xl mx-auto space-y-8">
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r shadow-sm"><h3 class="text-sm font-bold text-yellow-800 uppercase tracking-wide mb-2">{$t('settings.privacy_warning_title')}</h3><div class="text-sm text-yellow-800 leading-relaxed"><p class="mb-2 font-medium">{$t('settings.privacy_warning_text')}</p><ul class="list-disc list-inside space-y-1 text-yellow-700 ml-2"><li>{$t('settings.privacy_points.1')}</li><li>{$t('settings.privacy_points.2')}</li><li>{$t('settings.privacy_points.3')}</li></ul></div></div>
            <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-200"><h3 class="text-lg font-bold text-gray-800 mb-2">{$t('settings.backup_section')}</h3><p class="text-gray-500 text-sm mb-2">{$t('settings.backup_desc')}</p><div class="grid gap-4"><button on:click={() => PatientManager.exportBackup()} class="flex items-center justify-center gap-3 w-full bg-gray-800 text-white py-4 rounded-lg hover:bg-black transition font-bold shadow-md"><span>💾</span> {$t('settings.btn_export')}</button><div class="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer group"><input type="file" accept=".json" on:change={handleImportBackup} class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div class="text-gray-500 group-hover:text-blue-600 font-medium flex flex-col items-center gap-2"><span class="text-2xl">📂</span> {$t('settings.btn_import')}</div></div></div><div class="mt-12 pt-8 border-t border-red-100"><button on:click={deleteAllData} class="flex items-center justify-center gap-2 w-full text-red-600 text-sm font-bold hover:text-red-800 hover:bg-red-50 py-4 border border-red-100 rounded transition"><span>🗑️</span> {$t('settings.delete_all_btn')}</button></div></div>
          </div>
        {/if}
      {/if}
    </main>
  </div>
{/if}

<style>
  .scrollbar-thin::-webkit-scrollbar { height: 8px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: #f9fafb; border-radius: 4px; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 4px; border: 2px solid #f9fafb; }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover { background-color: #9ca3af; }
  
  @media print {
    header, input[type="file"], button, .bg-blue-50, .border-dashed { display: none !important; }
    .shadow-sm { box-shadow: none !important; border: 1px solid #eee; }
    :global(body) { background: white; }
  }
</style>