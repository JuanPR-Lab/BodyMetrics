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
    { key: 'weight', label: 'metrics.weight', color: '#475569', unitKey: 'kg' }, // Slate-600
    { key: 'bmi', label: 'metrics.bmi', color: '#64748b', unitKey: '' },         // Slate-500
    { key: 'bodyFat', label: 'metrics.body_fat', color: '#f59e0b', unitKey: 'percent' }, // Amber-500
    { key: 'muscleMass', label: 'metrics.muscle_mass', color: '#6366f1', unitKey: 'kg' }, // Indigo-500
    { key: 'waterPercentage', label: 'metrics.water', color: '#0ea5e9', unitKey: 'percent' }, // Sky-500
    { key: 'boneMass', label: 'metrics.bone_mass', color: '#94a3b8', unitKey: 'kg' },      // Gray-400
    { key: 'dci', label: 'metrics.dci', color: '#10b981', unitKey: 'kcal' }, // Emerald-500
    { key: 'metabolicAge', label: 'metrics.metabolic_age', color: '#8b5cf6', unitKey: 'years' }, // Violet-500
    { key: 'visceralFat', label: 'metrics.visceral_fat', color: '#d97706', unitKey: 'rating' } // Orange-600 (para destacarlo)
  ] as const;

 
  const STYLES = {
    // Quitamos el hover del fondo blanco, y ponemos texto blanco en el activo
    filterBtn: "px-3 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 transition-all bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 uppercase tracking-wide cursor-pointer shadow-sm",
    // Hacemos el estilo activo más simple y fuerte
    filterBtnActive: "!bg-indigo-600 !text-white !border-indigo-700 font-bold shadow-md", 
    // ...
    // Metric cards
    // Metric cards
// ELIMINAMOS el color de borde inicial (border-slate-100)
    cardMetric: "bg-white p-4 rounded-xl shadow-sm border-l-4 flex flex-col justify-between min-h-[80px] transition-all hover:shadow-md",   
    // Metric labels and values
    metricLabel: "text-[10px] font-bold text-slate-500 uppercase tracking-wider self-start",
    metricValueCard: "text-2xl font-black text-slate-800 leading-none self-end mt-1",
    
    // Main metric display
    metricColMain: "flex flex-col items-center justify-center px-3",
    metricValueLg: "text-3xl font-black text-slate-800 leading-none",
    metricValueMd: "text-2xl font-black leading-none",
    metricUnit: "text-sm font-medium text-slate-500 ml-1",
    divider: "w-px h-10 bg-slate-200 mx-2"
  };
  let promptInput: HTMLInputElement;
  // --- STATE ---
  let allRecords: BioMetricRecord[] = [];
  let clients: Client[] = [];
  
  // UI State
  let currentTab: 'inbox' | 'clients' | 'settings' | 'help' = 'inbox';
  let isProcessing = false;
  let errorMessage = '';
  let isDragging = false;
  let fileInput: HTMLInputElement;
  let isClientListOpen = false; // State for accordion

  // Selection & Filters
  let selectedClientId: string = '';
  let selectedRecordId: string = '';
  let selectedRecordIds: string[] = [];
  let isMultiSelectMode: boolean = false;
  let selectedInboxMeasurements: string[] = [];
  let clientSearchTerm = '';
  
  // Pagination state
  let currentPage = 1;
  let clientsPerPage = 10;
  let totalPages = 1;
  
  // Assignment search state
  let assignmentSearchTerms: Record<string, string> = {};
  let bulkAssignSearch = '';
  $: filteredAssignmentClients = (searchTerm: string) => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase().trim();
    return clients.filter(c => c.alias.toLowerCase().includes(term));
  };
  $: filteredBulkClients = filteredAssignmentClients(bulkAssignSearch);
  
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


  // Modal state
  let showModal = false;
  let modalTitle = '';
  let modalMessage = '';
  let modalType: 'confirm' | 'alert' | 'error' | 'success' | 'prompt' = 'alert';
  let modalConfirmCallback: (() => void) | null = null;
  let modalCancelCallback: (() => void) | null = null;
  let modalInputValue = '';
  // First-use guide
  let showFirstUseGuide = false;
  let currentGuideStep = 0;
  const guideSteps = [
    { tab: 'inbox', title: 'first_use.step_inbox_title', description: 'first_use.step_inbox_description' },
    { tab: 'clients', title: 'first_use.step_clients_title', description: 'first_use.step_clients_description' },
    { tab: 'settings', title: 'first_use.step_settings_title', description: 'first_use.step_settings_description' },
    { tab: 'help', title: 'first_use.step_help_title', description: 'first_use.step_help_description' }
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
  $: inboxRecords = allRecords
      .filter(r => !PatientManager.getClientForRecord(r.id))
      .sort((a, b) => getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time));
  $: filteredClients = clients.filter(c => {
    if (!clientSearchTerm) return true;
    const term = clientSearchTerm.toLowerCase().trim();
    return c.alias.toLowerCase().includes(term);
  }).sort((a, b) => {
    // Sort by alias alphabetically, numbers first
    const aAlias = a.alias.toLowerCase();
    const bAlias = b.alias.toLowerCase();
    
    // Check if both are numbers
    const aIsNumber = !isNaN(aAlias) && !isNaN(parseFloat(aAlias));
    const bIsNumber = !isNaN(bAlias) && !isNaN(parseFloat(bAlias));
    
    // Numbers come before text
    if (aIsNumber && !bIsNumber) return -1;
    if (!aIsNumber && bIsNumber) return 1;
    
    // If both are numbers, sort numerically
    if (aIsNumber && bIsNumber) {
      return parseFloat(aAlias) - parseFloat(bAlias);
    }
    
    // Otherwise sort alphabetically
    return aAlias.localeCompare(bAlias);
  });
  
  // Paginated clients
  $: {
    totalPages = Math.max(1, Math.ceil(filteredClients.length / clientsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
  }
  
  $: paginatedClients = filteredClients.slice(
    (currentPage - 1) * clientsPerPage,
    currentPage * clientsPerPage
  );

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
    // --- LÓGICA DE DETECCIÓN DE IDIOMA ---
    const savedLocale = localStorage.getItem('user_locale');
    
    if (savedLocale) {
        // 1. Si el usuario ya eligió un idioma antes, lo respetamos
        locale.set(savedLocale);
    } else {
        // 2. Si es la primera vez, detectamos el navegador
        // 'navigator.language' devuelve cosas como "es-ES", "es-MX", "en-US", "fr-FR"
        const browserLang = navigator.language || 'en';
        
        // Si empieza por 'es' (cualquier variante), ponemos español. Si no, inglés por defecto.
        if (browserLang.toLowerCase().startsWith('es')) {
            locale.set('es');
        } else {
            locale.set('en');
        }
    }
    refreshClients();
    const today = new Date().toISOString().split('T')[0];
    customDateEnd = today;
    
    // Check if first use (no clients and no associations)
    const hasClients = clients.length > 0;
    const hasAssociations = allRecords.some(r => PatientManager.getClientForRecord(r.id));
    
    if (!hasClients && !hasAssociations) {
      showFirstUseGuide = true;
      currentTab = 'inbox';
    } else if (clients.length === 0) {
      currentTab = 'help';
    }
  });

  // --- ACTIONS ---

  function refreshClients() {
    clients = PatientManager.getClients();
    allRecords = [...allRecords];
    
    // Check if we should hide the first-use guide
    if (showFirstUseGuide) {
      const hasClients = clients.length > 0;
      const hasAssociations = allRecords.some(r => PatientManager.getClientForRecord(r.id));
      if (hasClients || hasAssociations) {
        showFirstUseGuide = false;
      }
    }
  }

  function nextGuideStep() {
    if (currentGuideStep < guideSteps.length - 1) {
      // Avanzar paso normal
      currentGuideStep++;
      currentTab = guideSteps[currentGuideStep].tab as any;
    } else {
      // AL FINALIZAR:
      showFirstUseGuide = false; // 1. Cierra el modal
      currentTab = 'help';       // 2. Fuerza ir a Ayuda
      
      // Opcional: Hacer scroll arriba del todo para que empiecen a leer desde el principio
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function previousGuideStep() {
    if (currentGuideStep > 0) {
      currentGuideStep--;
      currentTab = guideSteps[currentGuideStep].tab as any;
    }
  }

  function skipGuide() {
    showFirstUseGuide = false;
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
      
      // ANTES: errorMessage = $t('upload.error');
      // AHORA: Usamos el modal unificado
      showAlert(
          $t('upload.error_title'), 
          $t('upload.error'), 
          'error'
      );
      
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
      // 1. Limpiamos espacios
      const newAlias = newClientCodeOrAlias ? newClientCodeOrAlias.trim() : '';
      
      if (!newAlias) return;

      const $t = get(t); 

      // 2. VALIDACIÓN DE DUPLICADOS (NUEVO)
      // Buscamos si ya existe alguien con ese mismo nombre (ignorando mayúsculas/minúsculas)
      const isTaken = clients.some(c => c.alias.toLowerCase() === newAlias.toLowerCase());

      if (isTaken) {
          // Si existe, lanzamos el error y paramos
          showAlert(
              $t('dashboard.client_exists_title'), 
              $t('dashboard.client_exists_message'), 
              'error'
          );
          return; 
      }

      // 3. Si no está repetido, creamos el cliente con ID único
      const uniqueId = Date.now().toString(); 
      const success = PatientManager.addClient(uniqueId, newAlias);

      if (success) {
        refreshClients();
        newClientCodeOrAlias = '';
        clientSearchTerm = '';
        currentTab = 'clients';
      } else {
        // Fallback de seguridad (por si fallara la escritura en disco, raro)
        showAlert($t('dashboard.client_exists_title'), $t('dashboard.client_exists_message'), 'error');
      }
    };

  const deleteClient = (id: string) => {
    const $t = get(t);
    showConfirm(
      $t('alerts.delete_client_title'),
      $t('alerts.delete_client_confirm'),
      () => {
        PatientManager.deleteClient(id);
        if (selectedClientId === id) selectedClientId = '';
        refreshClients();
      }
    );
  };

  const handleRenameClient = () => {
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const $t = get(t);
    
    showPrompt(
      $t('actions.rename'),
      '', 
      '', 
      () => {
        const newAlias = modalInputValue ? modalInputValue.trim() : '';
        
        // 1. Si está vacío, no hacemos nada (silencioso)
        if (!newAlias) return;

        // 2. VALIDACIÓN DE DUPLICADOS (Estricta)
        // Busca si el nombre existe en CUALQUIER cliente (incluido él mismo)
        const isTaken = clients.some(c => c.alias.toLowerCase() === newAlias.toLowerCase());

        if (isTaken) {
            // Usamos setTimeout para esperar a que cierre el modal de escritura
            setTimeout(() => {
                showAlert(
                    $t('dashboard.client_exists_rename_title'), // TÍTULO NUEVO: "Error al Renombrar"
                    $t('dashboard.client_exists_message'),      // MENSAJE COMÚN
                    'error'                                     // ICONO: 'error' (Rojo) para todo
                );
            }, 100);
            
            return; 
        }

        // 3. Ejecutar renombrado si no hay conflictos
        PatientManager.renameClient(selectedClientId, newAlias);
        refreshClients();
      }
    );
  };

  const assignRecord = (recordId: string, clientId: string, silent = false) => {
    if (!clientId) return;
    PatientManager.assignRecordToClient(recordId, clientId);
    if (!silent) {
        refreshClients();
        const $t = get(t);
        showAlert($t('alerts.success_title'), $t('alerts.link_success'), 'success');
    }
  };

  const unassignCurrentRecord = () => {
      if (!currentRecord) return;
      const $t = get(t);
      
      // *** CAMBIO AQUÍ ***
      showConfirm(
        $t('dashboard.detach_record_title'), // Título: "Unlink Measurement"
        $t('alerts.detach_record_confirm'),  // Nuevo texto de confirmación
        () => {
          PatientManager.unassignRecord(currentRecord.id);
          refreshClients();
          selectedRecordId = '';
        }
      );
    };
  
    const toggleMultiSelectMode = () => {
      isMultiSelectMode = !isMultiSelectMode;
      // Clear selections when toggling mode
      selectedRecordIds = [];
    };
  
    const toggleRecordSelection = (recordId: string) => {
      if (!isMultiSelectMode) return;
      
      const index = selectedRecordIds.indexOf(recordId);
      if (index === -1) {
        // Add to selection
        selectedRecordIds = [...selectedRecordIds, recordId];
      } else {
        // Remove from selection
        selectedRecordIds = selectedRecordIds.filter(id => id !== recordId);
      }
    };
  
    const unassignSelectedRecords = () => {
      if (selectedRecordIds.length === 0) return;
      
      const $t = get(t);
      showConfirm(
        $t('dashboard.detach_record_title'),
        $t('dashboard.detach_record') + '? (' + selectedRecordIds.length + ')',
        () => {
          selectedRecordIds.forEach(recordId => {
            PatientManager.unassignRecord(recordId);
          });
          
          refreshClients();
          selectedRecordIds = [];
        }
      );
    };

    const assignSelectedRecords = (clientId: string) => {
    if (!clientId) return;
    selectedRecordIds.forEach(recordId => assignRecord(recordId, clientId, true));
    refreshClients();
    selectedRecordIds = [];
    const $t = get(t);
    showAlert($t('alerts.success_title'), $t('alerts.link_multiple_success').replace('{n}', selectedRecordIds.length.toString()), 'success');
  };

    const toggleInboxSelection = (recordId: string) => {
      const index = selectedInboxMeasurements.indexOf(recordId);
      if (index === -1) {
        selectedInboxMeasurements = [...selectedInboxMeasurements, recordId];
      } else {
        selectedInboxMeasurements = selectedInboxMeasurements.filter(id => id !== recordId);
      }
    };

    const selectAllInboxMeasurements = () => {
      if (selectedInboxMeasurements.length === inboxRecords.length) {
        selectedInboxMeasurements = [];
      } else {
        selectedInboxMeasurements = inboxRecords.map(r => r.id);
      }
    };

    const assignBulkMeasurements = (clientId: string) => {
    if (!clientId) return;
    const count = selectedInboxMeasurements.length;
    selectedInboxMeasurements.forEach(recordId => assignRecord(recordId, clientId, true));
    
    refreshClients();
    selectedInboxMeasurements = [];
    bulkAssignSearch = '';
    const $t = get(t);
    showAlert($t('alerts.success_title'), $t('alerts.link_multiple_success').replace('{n}', count.toString()), 'success');
  };

  // Función corregida para el reseteo de fábrica
  const handleFactoryReset = () => {
    const $t = get(t);
    showConfirm(
      $t('alerts.reset_title'),
      $t('alerts.reset_confirm'),
      () => {
        // CORRECCIÓN AQUÍ: Llamamos al nombre real del método en PatientManager
        PatientManager.deleteAllData();
        
        // Limpiamos el estado local
        clients = [];
        selectedClientId = '';
        selectedRecordId = '';
        
        // Refrescamos la interfaz
        refreshClients();
        
        // Confirmamos éxito
        showAlert($t('alerts.success_title'), $t('alerts.reset_success'), 'success');
      }
    );
  };

  const exportClientData = () => {
    const $t = get(t);
    // Verificación de datos vacíos
    if (!clientHistory || clientHistory.length === 0) {
      showAlert($t('dashboard.no_data_title'), $t('dashboard.no_data_client'), 'error');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    const dateStr = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
    const filename = client ? `${client.alias.replace(/\s/g, '_')}_${dateStr}.csv` : `export_${dateStr}.csv`;
    
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
          showAlert($t('settings.import_success_title'), $t('settings.import_success'), 'success');
          refreshClients();
        } else {
          showAlert($t('settings.import_error_title'), $t('settings.import_error'), 'error');
        }
    } catch (error) {
        showAlert($t('settings.import_error_title'), $t('settings.import_error'), 'error');
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

  const switchLang = (lang: string) => {
      locale.set(lang);
      // Guardamos la preferencia para el futuro
      localStorage.setItem('user_locale', lang); 
  };
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

  // Modal functions
  const showAlert = (title: string, message: string, type: 'alert' | 'error' | 'success' = 'alert') => {
    modalTitle = title;
    modalMessage = message;
    modalType = type;
    modalConfirmCallback = null;
    modalCancelCallback = null;
    showModal = true;
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    modalTitle = title;
    modalMessage = message;
    modalType = 'confirm';
    modalConfirmCallback = onConfirm;
    modalCancelCallback = onCancel || null;
    showModal = true;
  };

  // Función para mostrar un modal con campo de texto
  const showPrompt = (title: string, message: string, initialValue: string, onConfirm: () => void) => {
    modalTitle = title;
    modalMessage = message;
    modalInputValue = initialValue; 
    modalType = 'prompt';
    modalConfirmCallback = onConfirm;
    modalCancelCallback = null;
    showModal = true;
    
    // Pone el foco después de que Svelte haya renderizado el modal
    setTimeout(() => {
      promptInput?.focus(); 
    }, 0); 
  };

  const handleModalConfirm = () => {
    if (modalConfirmCallback) modalConfirmCallback();
    showModal = false;
  };

  const handleModalCancel = () => {
    if (modalCancelCallback) modalCancelCallback();
    showModal = false;
  };
  // --- HELPER: SIMPLE MARKDOWN FORMATTING ---
  const formatText = (text: string) => {
    if (!text) return '';
    return text
      // 1. Reemplaza **texto** por negrita
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
      // 2. Reemplaza `texto` por estilo de código/archivo
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-200">$1</code>');
  };

</script>

{#if $isLocaleLoading}
  <div class="flex items-center justify-center h-screen text-gray-500 font-mono animate-pulse">Loading BodyMetrics...</div>
{:else}
  {#if showFirstUseGuide}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
        <div class="p-6">
          <div class="text-center mb-4">
            <div class="text-4xl mb-2">🎯</div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">{$t('first_use.title')}</h2>
            
            <p class="text-gray-600 text-sm">
               {$t('first_use.step_counter', { values: { current: currentGuideStep + 1, total: guideSteps.length } })}
            </p>
          </div>
          
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">{$t(guideSteps[currentGuideStep].title)}</h3>
            <p class="text-gray-600 text-sm leading-relaxed">{$t(guideSteps[currentGuideStep].description)}</p>
          </div>
          
          <div class="flex justify-between items-center mt-8">
            <button
              on:click={skipGuide}
              class="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
            >
              {$t('first_use.skip')}
            </button>
            
            <div class="flex gap-3">
              {#if currentGuideStep > 0}
                <button
                  on:click={previousGuideStep}
                  class="px-4 py-2 rounded-lg font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  {$t('first_use.previous')}
                </button>
              {/if}
              
              <button
                on:click={nextGuideStep}
                class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md shadow-indigo-200 transition-all transform active:scale-[0.98]"
              >
                {#if currentGuideStep === guideSteps.length - 1}
                  {$t('first_use.finish')}
                {:else}
                  {$t('first_use.next')}
                {/if}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <div
    role="application"
    class="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 select-none {showFirstUseGuide ? 'pointer-events-none' : ''}"
    on:dragover|preventDefault={() => isDragging = true}
    on:dragleave|preventDefault={() => isDragging = false}
    on:drop|preventDefault={handleDrop}
  >
    <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm transition-all backdrop-blur-sm bg-white/95">
      <div class="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        
        <div class="flex items-center gap-1.5 sm:gap-3">
          
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl shadow-md flex-shrink-0 overflow-hidden">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
               <rect x="0" y="0" width="512" height="512" rx="128" fill="#4f46e5"/>
               
               <g transform="translate(106, 60)">
                 <circle cx="150" cy="50" r="45" fill="white"/>
                 <rect x="110" y="120" width="80" height="260" rx="10" fill="white"/>
                 <rect x="40" y="120" width="60" height="180" rx="10" fill="white" opacity="0.9" transform="rotate(30, 100, 120)"/>
                 <rect x="200" y="120" width="60" height="180" rx="10" fill="white" opacity="0.9" transform="rotate(-30, 200, 120)"/>
               </g>
             </svg>
          </div>
          <div><h1 class="text-base sm:text-xl font-bold text-slate-800 leading-none">{$t('app.title')}</h1></div>
        </div>

      <div class="flex items-center gap-1.5 sm:gap-3">
          
          <span class="px-2 sm:px-3 py-1 bg-emerald-50 text-emerald-700 text-xs uppercase tracking-wider rounded-full font-semibold border border-emerald-200 shadow-sm flex items-center gap-1">
            <span>🔒</span>
            <span class="hidden sm:inline">{$t('app.privacy_badge')}</span>
          </span>

          <div class="flex items-center text-xs sm:text-sm font-semibold border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <button 
              on:click={() => switchLang('es')} 
              class="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-slate-50 border-r border-slate-200 transition-colors {get(locale) === 'es' ? 'bg-slate-100 text-slate-800' : 'text-slate-600'}"
            >
              ES
            </button>
            <button 
              on:click={() => switchLang('en')} 
              class="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-slate-50 transition-colors {get(locale) === 'en' ? 'bg-slate-100 text-slate-800' : 'text-slate-600'}"
            >
              EN
            </button>
          </div>

      </div>
      </div>
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0 sm:gap-8 overflow-x-auto no-scrollbar border-t border-slate-100">
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'inbox' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'inbox'}>
          📥 {$t('dashboard.tabs.inbox')}
          {#if inboxRecords.length > 0}
            <span class="bg-red-500 text-white text-[10px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full font-bold shadow-sm animate-pulse">{inboxRecords.length}</span>
          {/if}
        </button>
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'clients'}>
          👥 {$t('dashboard.tabs.clients')}
        </button>
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'settings'}>
          ⚙️ {$t('dashboard.tabs.settings')}
        </button>
        <button class="flex-1 text-center py-3 sm:py-3 border-b-2 font-medium text-sm sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-colors touch-manipulation {currentTab === 'help' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={() => currentTab = 'help'}>
          ℹ️ {$t('dashboard.tabs.help')}
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      
      {#if currentTab === 'help'}
        <div class="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
            
            <div class="text-center pt-4 sm:pt-8">
                <h2 class="text-2xl sm:text-4xl font-black text-slate-800">
                    {$t('help.page_title')}
                </h2>
            </div>

            <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h3 class="text-xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-3 text-center">
                    {$t('help.section_starting')}
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.starting_requirements')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.starting_requirements_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.starting_installation')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.starting_installation_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.starting_first_steps')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.starting_first_steps_text'))}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h3 class="text-xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-3 text-center">
                    {$t('help.section_clients_buttons')}
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.clients_creation')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.clients_creation_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.clients_buttons_logic')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.clients_buttons_logic_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <div class="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                            <h4 class="font-bold text-amber-700 text-sm uppercase tracking-wider mb-2">{$t('help.clients_infinite_trick')}</h4>
                            <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{@html formatText($t('help.clients_infinite_trick_text'))}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h3 class="text-xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-3 text-center">
                    {$t('help.section_files')}
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.files_where')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.files_where_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.files_structure')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.files_structure_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.files_troubleshooting')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.files_troubleshooting_text'))}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h3 class="text-xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-3 text-center">
                    {$t('help.section_interpretation')}
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.interpretation_main_metrics')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.interpretation_main_metrics_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.interpretation_segmental')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.interpretation_segmental_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.interpretation_health_states')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.interpretation_health_states_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.interpretation_export')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.interpretation_export_text'))}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h3 class="text-xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-3 text-center">
                    {$t('help.section_security')}
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.security_local_data')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.security_local_data_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.security_link')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.security_link_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.security_backups')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.security_backups_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-indigo-600 text-sm uppercase tracking-wider">{$t('help.security_restoration')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.security_restoration_text'))}</p>
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h3 class="text-xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-3 text-center">
                    {$t('help.section_troubleshooting')}
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="space-y-3">
                        <h4 class="font-bold text-rose-600 text-sm uppercase tracking-wider">{$t('help.troubleshooting_common')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.troubleshooting_common_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-rose-600 text-sm uppercase tracking-wider">{$t('help.troubleshooting_missing_data')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.troubleshooting_missing_data_text'))}</p>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-bold text-rose-600 text-sm uppercase tracking-wider">{$t('help.troubleshooting_date')}</h4>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{@html formatText($t('help.troubleshooting_date_text'))}</p>
                    </div>
                </div>
            </div>

            <div class="mt-8 sm:mt-12 bg-slate-900 text-slate-400 rounded-2xl p-6 sm:p-10 text-center shadow-lg">
                <h4 class="font-bold text-white text-lg mb-2">{$t('about.title')}</h4>
                <p class="text-xs sm:text-sm mb-6 max-w-4xl mx-auto leading-relaxed">{$t('about.description')}</p>
                <div class="flex flex-wrap justify-center gap-3 text-xs font-mono mb-8">
                    <span class="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{$t('about.version')}</span>
                    <span class="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{$t('about.license')}</span>
                    <span class="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{$t('about.developer')}</span>
                </div>
                
                <a href="https://github.com/JuanPR-Lab/BodyMetrics" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors shadow-md">
                    <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    {$t('about.github_btn')}
                </a>
                
                <p class="text-[10px] mt-8 opacity-30 uppercase tracking-widest">{$t('about.disclaimer')}</p>
            </div>
        </div>
      {/if}

      {#if currentTab === 'inbox'}
        <div class="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
          
          <div class="text-center pt-4 sm:pt-8 space-y-4">
            <h2 class="text-xl sm:text-3xl font-black text-slate-800">
              {$t('upload.instruction_title')}
            </h2>
            
            <div class="flex flex-col items-center gap-2">
                <p class="text-sm text-slate-500 font-medium">{$t('upload.instruction_text')}</p>
                <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full font-mono text-xs sm:text-sm text-slate-600 shadow-sm">
                    <span class="text-lg">📂</span>
                    <span class="font-bold tracking-wide">{$t('upload.instruction_path')}</span>
                </div>
            </div>
          </div>

          <div class="max-w-3xl mx-auto">
            
            <div class="relative group">
                <div class="border-2 border-dashed border-indigo-200 rounded-2xl p-8 sm:p-12 text-center bg-indigo-50/30 transition-all group-hover:bg-indigo-50 group-hover:border-indigo-400 cursor-pointer flex flex-col items-center justify-center gap-3">
                     
                     {#if isProcessing}
                        <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <h3 class="text-sm font-bold text-indigo-600 animate-pulse">{$t('upload.processing')}...</h3>
                     {:else}
                        <span class="text-4xl sm:text-5xl transition-transform group-hover:scale-110 mb-2">📥</span>
                        
                        <span class="font-bold text-base sm:text-lg text-indigo-700">
                            {$t('upload.btn_load')}
                        </span>
                        
                        <span class="text-xs sm:text-sm text-indigo-400 font-normal">
                            {$t('upload.drag_instruction')}
                        </span>
                     {/if}
                </div>

                <input
                    bind:this={fileInput}
                    type="file"
                    multiple
                    accept=".csv,text/csv,application/vnd.ms-excel"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isProcessing}
                    on:click={(e) => { e.currentTarget.value = ''; }}
                    on:change={(e)=>handleFiles((e.target as HTMLInputElement).files)}
                    on:drop|preventDefault={(e) => { isDragging = false; handleFiles(e.dataTransfer?.files || null); }}
                    on:dragover|preventDefault={() => isDragging = true}
                    on:dragleave|preventDefault={() => isDragging = false}
                />
            </div>

            {#if errorMessage}
              <div class="mt-4 sm:mt-6 mx-auto max-w-lg bg-rose-50 border-l-4 border-rose-500 p-3 sm:p-4 rounded-r-lg animate-pulse flex items-start gap-3 shadow-sm">
                <span class="text-lg sm:text-xl">⚠️</span>
                <div>
                  <h4 class="font-bold text-rose-700 text-xs sm:text-sm">Error</h4>
                  <p class="text-xs sm:text-sm text-rose-600">{errorMessage}</p>
                </div>
              </div>
            {/if}
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[150px] sm:min-h-[200px] mt-4 sm:mt-6">
            
            {#if inboxRecords.length === 0}
              <div class="p-4 sm:p-8 text-center h-full flex flex-col justify-center items-center py-6 sm:py-12">
                
                <div class="w-12 h-12 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-2 sm:mb-4">
                  <span class="text-xl sm:text-4xl opacity-30 grayscale">📭</span>
                </div>
                
                <h3 class="text-slate-400 font-medium text-xs sm:text-lg">{$t('dashboard.inbox_empty')}</h3>
              </div>
            {:else}
              
              <div class="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                <div class="flex items-center gap-3 w-full sm:w-auto">
                   <label class="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedInboxMeasurements.length === inboxRecords.length && inboxRecords.length > 0}
                        on:change={selectAllInboxMeasurements}
                        class="h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                      <span class="text-xs sm:text-sm font-bold text-slate-700">
                        {selectedInboxMeasurements.length > 0 
                          ? `${selectedInboxMeasurements.length} ${$t('dashboard.records_selected')}`
                          : $t('dashboard.multi_assignment')}
                      </span>
                   </label>
                </div>
                
                {#if selectedInboxMeasurements.length > 0}
                  <div class="flex gap-2 w-full sm:w-auto animate-fade-in">
                    <button
                      on:click={() => selectedInboxMeasurements = []}
                      class="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg bg-white transition-colors"
                    >
                      {$t('actions.cancel')}
                    </button>
                    <div class="relative flex-1 sm:w-64">
                      <input
                        type="text"
                        placeholder="{$t('dashboard.assign_btn')}"
                        class="w-full text-sm border border-indigo-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none"
                        bind:value={bulkAssignSearch}
                      />
                      {#if bulkAssignSearch}
                        <div class="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-30">
                          {#each filteredBulkClients as c}
                            <button
                              on:click={() => assignBulkMeasurements(c.id)}
                              class="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-50 last:border-0 font-medium text-slate-700"
                            >
                              {c.alias}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>

              <div class="block lg:hidden bg-slate-50/50 p-2 sm:p-3 space-y-2 sm:space-y-3">
                {#each inboxRecords as rec (rec.id)}
                  <div class="bg-white p-3 sm:p-4 rounded-xl shadow-sm border transition-all duration-200 relative
                    {selectedInboxMeasurements.includes(rec.id) 
                      ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500' 
                      : 'border-slate-200 hover:border-indigo-300'}"
                  >
                    <div class="flex items-start gap-6">
                       
                       <div class="flex-shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={selectedInboxMeasurements.includes(rec.id)}
                            on:change={() => toggleInboxSelection(rec.id)}
                            class="h-6 w-6 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                       </div>

                       <div class="flex-1 min-w-0">
                          <div class="flex justify-between items-center gap-2">
                             
                             <div class="flex-shrink-0 text-left">
                               <div class="font-bold text-slate-700 text-base leading-tight">{rec.date}</div>
                               <div class="text-xs text-slate-500 font-mono mt-0.5">{rec.time}</div>
                             </div>

                             <div class="flex items-baseline gap-0.5 flex-shrink-0 mx-auto">
                               <span class="text-xl font-black text-slate-800">{rec.weight}</span>
                               <span class="text-xs text-slate-500 font-medium">kg</span>
                             </div>

                             <div class="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span class="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-xs font-bold whitespace-nowrap">
                                    {rec.height}cm
                                  </span>
                                  
                                  <span class="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-xs font-medium whitespace-nowrap">
                                    {$t(rec.gender === 'male' ? 'common.male' : 'common.female')}
                                  </span>
                                  
                                  <span class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium whitespace-nowrap">
                                    {rec.age} {$t('units.years')}
                                  </span>
                             </div>
                          </div>

                          <div class="mt-2 pt-2 border-t border-slate-100">
                            {#if clients.length === 0}
                              <div class="text-xs text-slate-400 italic text-center py-1">{$t('dashboard.no_clients_created')}</div>
                            {:else}
                              <div class="relative">
                                <input
                                  type="text"
                                  placeholder="{$t('dashboard.assign_btn')}"
                                  class="w-full text-xs sm:text-sm border border-slate-200 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                  bind:value={assignmentSearchTerms[rec.id]}
                                />
                                {#if assignmentSearchTerms[rec.id]}
                                  <div class="absolute bottom-full left-0 right-0 mb-1 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                                    {#each filteredAssignmentClients(assignmentSearchTerms[rec.id]) as c}
                                      <button
                                        on:click={() => { assignRecord(rec.id, c.id); assignmentSearchTerms[rec.id] = ''; }}
                                        class="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                      >
                                        {c.alias}
                                      </button>
                                    {/each}
                                  </div>
                                {/if}
                              </div>
                            {/if}
                          </div>
                       </div>
                    </div>
                  </div>
                 {/each}
              </div>
              <div class="hidden lg:block overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                    <tr>
                      <th class="px-6 py-4 w-16 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInboxMeasurements.length === inboxRecords.length && inboxRecords.length > 0}
                          on:change={selectAllInboxMeasurements}
                          class="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                      </th>
                      <th class="px-6 py-4">{$t('analysis.date')}</th>
                      <th class="px-6 py-4">{$t('metrics.weight')}</th>
                      
                      <th class="px-6 py-4">{$t('dashboard.key_data')}</th>
                      
                      <th class="px-6 py-4 text-right w-64">{$t('dashboard.action')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    {#each inboxRecords as rec (rec.id)}
                      <tr class="hover:bg-slate-50/80 transition-colors {selectedInboxMeasurements.includes(rec.id) ? 'bg-indigo-50/40' : ''}">
                        <td class="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedInboxMeasurements.includes(rec.id)}
                            on:change={() => toggleInboxSelection(rec.id)}
                            class="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td class="px-6 py-4">
                           <div class="font-bold text-slate-700">{rec.date}</div>
                           <div class="text-xs text-slate-400 font-mono mt-0.5">{rec.time}</div>
                        </td>
                        <td class="px-6 py-4">
                           <span class="text-lg font-black text-slate-800">{rec.weight}</span> 
                           <span class="text-xs text-slate-500">kg</span>
                        </td>
                        <td class="px-6 py-4">
                           <div class="flex flex-wrap gap-2 text-xs">
                             <span class="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded font-bold">
                               {rec.height}cm
                             </span>
                             
                             <span class="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded font-medium">
                               {$t(rec.gender === 'male' ? 'common.male' : 'common.female')}
                             </span>

                             <span class="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded font-medium">
                               {rec.age} {$t('units.years')}
                             </span>
                           </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                          {#if clients.length === 0}
                            <span class="text-xs text-slate-400 italic pr-2">{$t('dashboard.no_clients_created')}</span>
                          {:else}
                            <div class="relative w-56 ml-auto">
                              <input
                                type="text"
                                placeholder="{$t('dashboard.assign_btn')}"
                                class="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                                bind:value={assignmentSearchTerms[rec.id]}
                              />
                              {#if assignmentSearchTerms[rec.id]}
                                <div class="absolute top-full right-0 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50 text-left">
                                  {#each filteredAssignmentClients(assignmentSearchTerms[rec.id]) as c}
                                    <button
                                      on:click={() => { assignRecord(rec.id, c.id); assignmentSearchTerms[rec.id] = ''; }}
                                      class="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                      {c.alias}
                                    </button>
                                  {/each}
                                </div>
                              {/if}
                            </div>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        </div>
      {/if}

        {#if currentTab === 'clients'}
          <div class="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 h-auto lg:h-[800px]">
            
            <div class="lg:col-span-1 flex flex-col gap-3 sm:gap-4 h-auto lg:h-full">
              <!-- Create New Client Form - Always visible -->
              <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                <h3 class="font-bold text-gray-700 text-xs uppercase mb-2 sm:mb-3 tracking-wide">{$t('dashboard.create_btn')}</h3>
                <div class="space-y-2">
                  <input bind:value={newClientCodeOrAlias} placeholder="{$t('dashboard.client_id_placeholder')}" class="w-full text-sm border border-gray-200 rounded px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"/>
                  <button on:click={createClient} disabled={!newClientCodeOrAlias} class="w-full bg-gray-800 text-white text-sm sm:text-sm font-bold py-2 sm:py-2 rounded hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm touch-manipulation">{$t('actions.save')}</button>
                </div>
              </div>
              
              <!-- Mobile: Accordion Client List -->
              <div class="lg:hidden bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
 <button
    on:click={() => isClientListOpen = !isClientListOpen}
    class="w-full flex items-center justify-center px-3 py-5 font-medium text-gray-700 hover:bg-gray-50 transition relative"
>
    <span class="text-indigo-600 text-lg absolute left-3 top-1/2 -translate-y-1/2">
        👥
    </span>

    <span class="text-sm font-bold text-gray-700 uppercase absolute left-1/2 -translate-x-1/2">
        {$t('dashboard.client_list_title')}
    </span>
    
    <span 
        class="text-gray-400 flex-shrink-0 transition-transform duration-300 absolute right-3 top-1/2 -translate-y-1/2 
        {isClientListOpen ? 'rotate-180' : ''}"
    >
        ▼
    </span>
</button>
  

   
                
                {#if isClientListOpen}
                  <div class="border-t border-gray-100">
                    <div class="p-2 border-b bg-gray-50">
                      <input type="text" bind:value={clientSearchTerm} placeholder={$t('dashboard.filter_placeholder')} class="w-full text-sm border rounded px-3 py-2 sm:py-1.5 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div class="max-h-[300px] overflow-y-auto p-1 sm:p-2 space-y-1">
                      {#each paginatedClients as client (client.id)}
                        <button
                          on:click={() => {
                            selectedClientId = client.id;
                            isClientListOpen = false; // Auto-collapse on selection
                          }}
                          class="w-full text-left px-3 py-3 rounded-lg text-sm group transition-all duration-150 flex justify-between items-center touch-manipulation border border-transparent hover:border-indigo-200 hover:shadow-sm {selectedClientId === client.id ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-white text-gray-700 hover:bg-indigo-50'}"
                        >
                          <div class="truncate pr-2 flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                            <div class="font-semibold truncate">{client.alias}</div>
                          </div>
                          <span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold min-w-[24px] text-center">
                            {PatientManager.getClientHistory(client.id, allRecords).length}
                          </span>
                        </button>
                      {/each}
                    </div>
                    
                    <!-- Mobile Pagination Controls -->
                    {#if filteredClients.length > clientsPerPage}
                      <div class="border-t border-gray-200 p-2 bg-gray-50 flex flex-col gap-2">
                        <div class="flex justify-between items-center">
                          <button
                            on:click={() => currentPage = Math.max(1, currentPage - 1)}
                            disabled={currentPage === 1}
                            class="px-2 py-1 text-xs font-medium rounded border border-gray-200 transition bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {$t('dashboard.pagination.previous')}
                          </button>
                          
                          <span class="text-xs text-gray-500 whitespace-nowrap">
                            {$t('dashboard.pagination.page_of', { values: { current: currentPage, total: totalPages } })}
                          </span>
                          
                          <button
                            on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
                            disabled={currentPage === totalPages}
                            class="px-2 py-1 text-xs font-medium rounded border border-gray-200 transition bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {$t('dashboard.pagination.next')}
                          </button>
                        </div>
                        
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
              
              <!-- Desktop: Fixed Height Sidebar with Scroll -->
              <div class="hidden lg:flex bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex-col h-[600px]">
                <div class="p-2 border-b bg-gray-50">
                  <input type="text" bind:value={clientSearchTerm} placeholder={$t('dashboard.filter_placeholder')} class="w-full text-sm sm:text-sm border rounded px-3 sm:px-3 py-2 sm:py-1.5 bg-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                </div>
                <div class="overflow-y-auto flex-1 p-1 sm:p-2 space-y-1">
                  {#each paginatedClients as client (client.id)}
                    <button on:click={() => selectedClientId = client.id} class="w-full text-left px-3 sm:px-3 py-3 sm:py-3 rounded-lg text-sm sm:text-sm group transition-all duration-150 flex justify-between items-center touch-manipulation border border-transparent hover:border-indigo-200 hover:shadow-sm {selectedClientId === client.id ? 'bg-indigo-50 text-indigo-800 border-indigo-300 shadow-sm' : 'bg-white text-gray-700 hover:bg-indigo-50'}">
                      <div class="truncate pr-2 flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
                        <div class="font-semibold truncate">{client.alias}</div>
                      </div>
                      <span class="text-[10px] sm:text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold min-w-[24px] text-center">
                         {PatientManager.getClientHistory(client.id, allRecords).length}
                      </span>
                    </button>
                  {/each}
                </div>
                
                <!-- Pagination Controls -->
                {#if filteredClients.length > clientsPerPage}
                  <div class="border-t border-gray-200 p-2 bg-gray-50 flex flex-col gap-2">
                    <div class="flex justify-between items-center">
                      <button
                        on:click={() => currentPage = Math.max(1, currentPage - 1)}
                        disabled={currentPage === 1}
                        class="px-2 py-1 text-xs font-medium rounded border border-gray-200 transition bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {$t('dashboard.pagination.previous')}
                      </button>
                      
                      <span class="text-xs text-gray-500 whitespace-nowrap">
                        {$t('dashboard.pagination.page_of', { values: { current: currentPage, total: totalPages } })}
                      </span>
                      
                      <button
                        on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
                        disabled={currentPage === totalPages}
                        class="px-2 py-1 text-xs font-medium rounded border border-gray-200 transition bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {$t('dashboard.pagination.next')}
                      </button>
                    </div>
                    
                  </div>
                {/if}
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
                  
                  <div class="flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-4 w-full">
                    
                    <div class="text-center sm:text-left">
                      <h2 class="text-2xl font-bold text-gray-800 break-words">
                        {clients.find(c => c.id === selectedClientId)?.alias}
                      </h2>
                    </div>

                    <div class="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                      
                      <button 
                        on:click={exportClientData} 
                        class="col-span-2 sm:w-auto justify-center text-emerald-600 hover:text-white border border-emerald-200 hover:bg-emerald-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        title="{$t('actions.export_csv')}"
                      >
                        <span>📊</span> 
                        <span>{$t('actions.export_csv')}</span>
                      </button>

                      <button 
                        on:click={handleRenameClient} 
                        class="col-span-1 sm:w-auto justify-center text-indigo-600 hover:text-white border border-indigo-200 hover:bg-indigo-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        title="{$t('actions.rename')}"
                      >
                        <span>✏️</span> 
                        <span>{$t('actions.rename')}</span>
                      </button>

                      <button 
                        on:click={() => deleteClient(selectedClientId)} 
                        class="col-span-1 sm:w-auto justify-center text-red-600 hover:text-white border border-red-200 hover:bg-red-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        title="{$t('actions.delete')}"
                      >
                        <span>🗑</span> 
                        <span>{$t('actions.delete')}</span>
                      </button>
                      
                    </div>
                  </div>

                  <div class="flex flex-col sm:flex-row items-center gap-3 border-t pt-3 w-full">
                    
                    <div class="flex flex-col sm:flex-row items-center sm:items-start w-full sm:w-auto gap-2 sm:gap-0">
                        
                        <div class="w-full sm:w-12 text-center sm:text-left flex-shrink-0 sm:pt-1 mb-1 sm:mb-0">
                            <span class="text-xs font-bold text-gray-400 uppercase">{$t('dashboard.filters.title')}</span>
                        </div>
                        
                        <div class="flex flex-wrap justify-center sm:justify-start gap-2 flex-grow px-10 sm:px-0">
                            <button on:click={() => currentFilter = 'all'} class="{STYLES.filterBtn} {currentFilter === 'all' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.all')}</button>
                            <button on:click={() => currentFilter = '1m'} class="{STYLES.filterBtn} {currentFilter === '1m' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_month')}</button>
                            <button on:click={() => currentFilter = '3m'} class="{STYLES.filterBtn} {currentFilter === '3m' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_3_months')}</button>
                            <button on:click={() => currentFilter = '6m'} class="{STYLES.filterBtn} {currentFilter === '6m' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_6_months')}</button>
                            <button on:click={() => currentFilter = '1y'} class="{STYLES.filterBtn} {currentFilter === '1y' ? STYLES.filterBtnActive : ''}">{$t('dashboard.filters.last_year')}</button>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-1 sm:ml-auto border rounded px-2 py-1 bg-gray-50 flex-shrink-0 mt-2 sm:mt-0">
                       <span class="text-xs text-gray-500 font-medium whitespace-nowrap">{$t('dashboard.filters.from')}</span>
                       <input type="date" bind:value={customDateStart} on:change={() => currentFilter = 'custom'} class="text-xs bg-transparent outline-none w-[120px]" placeholder="dd/mm/yyyy" />
                       <span class="text-gray-400 font-bold">→</span>
                       <span class="text-xs text-gray-500 font-medium whitespace-nowrap">{$t('dashboard.filters.to')}</span>
                       <input type="date" bind:value={customDateEnd} on:change={() => currentFilter = 'custom'} class="text-xs bg-transparent outline-none w-[120px]" placeholder="dd/mm/yyyy" />
                    </div>
                  </div>
                </div>

                <div class="w-full flex-shrink-0 bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-200 shadow-inner overflow-x-auto scrollbar-thin">
                  {#if displayedHistory.length === 0}
                    <p class="text-xs sm:text-sm text-gray-400 text-center py-2">{$t('dashboard.no_data_client')}</p>
                  {:else}
                    <div class="flex gap-2 sm:gap-3">
                      {#each displayedHistory as rec (rec.id)}
                        <button
  on:click={() => selectedRecordId = rec.id}
  class="flex-shrink-0 w-[85px] sm:w-[85px] p-2 rounded-lg border text-left transition-all touch-manipulation relative
  {selectedRecordId === rec.id ||
  (!selectedRecordId && rec === currentRecord)
    ? 'border-indigo-400 bg-indigo-50 shadow-md transform scale-105 z-10' 
    : 'bg-white border-gray-200 opacity-80 hover:opacity-100'
  }"
>
                           <div class="text-[12px] sm:text-[13px] text-gray-500 uppercase font-bold mb-1 leading-tight">{rec.date} <br><span class="font-normal opacity-75 text-[11px] sm:text-[12px]">{rec.time}</span></div>
<div class="font-black text-gray-800 text-lg sm:text-xl">{rec.weight}<span class="text-xs sm:text-sm font-normal text-gray-400 ml-0.5">{$t('units.kg')}</span></div>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
                
                {#if currentRecord}
                  <div class="flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-0 -mt-2 mb-4 border-b border-gray-100 pb-3 w-full">
                    
                    <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                      <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {$t('dashboard.latest_reading')}
                      </span>
                      
                      <span class="text-xs font-mono text-gray-300 hidden sm:inline">|</span>
                      
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-xs font-black text-gray-700">
                            {currentRecord.date}
                        </span>
                        <span class="text-[10px] font-medium text-gray-400">
                            {currentRecord.time}
                        </span>
                      </div>
                    </div>

                    <button 
                      on:click={unassignCurrentRecord} 
                      class="text-red-600 hover:text-white border border-red-200 hover:bg-red-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                      <span>↩️</span> {$t('dashboard.detach_record')}
                    </button>
                  </div>

               

<div class="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
  
  <div class="flex flex-col gap-3 sm:gap-4 xl:col-span-1"> 
    
    <div class="grid grid-cols-2 gap-3 sm:gap-4">
      
      <div class="{STYLES.cardMetric} border-slate-800">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">{$t('metrics.weight')}</span>
          <span class="text-xl font-black text-slate-800 leading-none self-end mt-1">
            {currentRecord.weight}<span class="text-xs font-normal text-slate-400 ml-0.5">{$t('units.kg')}</span>
          </span>
      </div>

      <div class="{STYLES.cardMetric} border-slate-500">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">{$t('metrics.bmi')}</span>
          <span class="text-xl font-black leading-none self-end mt-1 {getStatusColor('bmi', currentRecord.bmi).replace('bg-', 'text-').replace('-100', '-600')}">
            {currentRecord.bmi}
          </span>
      </div>

      <div class="{STYLES.cardMetric} border-amber-500">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">{$t('metrics.body_fat')}</span>
          <span class="text-xl font-black text-slate-800 leading-none self-end mt-1">
            {currentRecord.bodyFat}<span class="text-xs font-normal text-slate-400 ml-0.5">{$t('units.percent')}</span>
          </span>
      </div>

      <div class="{STYLES.cardMetric} border-indigo-500">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">{$t('metrics.muscle_mass')}</span>
          <span class="text-xl font-black text-slate-800 leading-none self-end mt-1">
            {currentRecord.muscleMass}<span class="text-xs font-normal text-slate-400 ml-0.5">{$t('units.kg')}</span>
          </span>
      </div>

      <div class="{STYLES.cardMetric} border-cyan-500">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">{$t('metrics.water')}</span>
          <span class="text-xl font-black text-slate-800 leading-none self-end mt-1">
            {currentRecord.waterPercentage}<span class="text-xs font-normal text-slate-400 ml-0.5">{$t('units.percent')}</span>
          </span>
      </div>

      <div class="{STYLES.cardMetric} border-gray-400">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">{$t('metrics.bone_mass')}</span>
          <span class="text-xl font-black text-slate-800 leading-none self-end mt-1">
            {currentRecord.boneMass}<span class="text-xs font-normal text-slate-400 ml-0.5">{$t('units.kg')}</span>
          </span>
      </div>

      <div class="{STYLES.cardMetric} border-emerald-500">
          <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">{$t('metrics.dci')}</span>
          <span class="text-xl font-black text-slate-800 leading-none self-end mt-1">
            {currentRecord.dci}<span class="text-xs font-normal text-slate-400 ml-0.5">kcal</span>
          </span>
      </div>

      <div class="{STYLES.cardMetric} border-purple-500">
          <div class="flex justify-between items-start">
             <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{$t('metrics.metabolic_age')}</span>
          </div>
          <span class="text-xl font-black leading-none self-end mt-1 {getStatusColor('meta', currentRecord.metabolicAge).replace('bg-', 'text-').replace('-100', '-600')}">
            {currentRecord.metabolicAge}<span class="text-xs font-normal text-slate-400 ml-0.5">{$t('units.years')}</span>
          </span>
      </div>

    </div>
  </div>

  <div class="xl:col-span-2 h-full min-h-[300px] sm:min-h-[350px] lg:min-h-[400px] xl:min-h-[500px]">
    <BodyMap record={currentRecord} />
  </div>

</div>

                  {#if chartData}
                    <div class="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm mt-4 sm:mt-6">
                      <div class="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
                         <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">{$t('dashboard.evolution_chart')} ({chartData.pointsData.length})</h3>
                         <select bind:value={selectedChartMetric} class="w-full sm:w-auto min-w-[200px] sm:min-w-[240px] border border-gray-300 rounded px-3 py-1.5 text-xs sm:text-sm font-medium bg-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none cursor-pointer shadow-sm">
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
                  {/if}
                {/if}
              {/if}
            </div>
          </div>
        {/if}

        {#if currentTab === 'settings'}
          <div class="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
            
            <div class="text-center pt-4 sm:pt-8 mb-4">
               <h2 class="text-2xl sm:text-3xl font-black text-slate-800">
                 {$t('settings.title')}
               </h2>
               </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                    <span class="text-3xl mb-1">👥</span>
                    <span class="text-2xl font-black text-indigo-600">{clients.length}</span>
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">{$t('settings.active_clients')}</span>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                    <span class="text-3xl mb-1">📊</span>
                    
                    <span class="text-2xl font-black text-indigo-600">
                        {PatientManager.getAssignmentCount()}
                    </span>
                    
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">{$t('settings.total_measurements')}</span>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-100">
                    <h3 class="font-bold text-slate-700 flex items-center gap-2">
                        <span>💾</span> {$t('settings.backup_section')}
                    </h3>
                </div>
                
                <div class="p-6 sm:p-8 space-y-6">
                    
                    <div>
                        <div class="relative flex py-2 items-center mb-4">
                            <div class="flex-grow border-t border-slate-200"></div>
                            <span class="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {$t('settings.section_save')}
                            </span>
                            <div class="flex-grow border-t border-slate-200"></div>
                        </div>

                        <button 
                            on:click={() => PatientManager.exportBackup()} 
                            class="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 sm:py-4 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-md shadow-indigo-200 active:scale-[0.98]"
                        >
                            <span class="text-lg">⬇️</span> {$t('settings.btn_export')}
                        </button>
                    </div>

                    <div>
                        <div class="relative flex py-2 items-center mb-4">
                            <div class="flex-grow border-t border-slate-200"></div>
                            <span class="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {$t('settings.section_restore')}
                            </span>
                            <div class="flex-grow border-t border-slate-200"></div>
                        </div>

                        <div class="relative group">
                            <div class="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center bg-indigo-50/30 transition-all group-hover:bg-indigo-50 group-hover:border-indigo-400 cursor-pointer">
                                 <div class="flex flex-col items-center gap-2 text-indigo-600 group-hover:text-indigo-700">
                                     <span class="text-3xl transition-transform group-hover:scale-110">📂</span>
                                     <span class="font-bold text-sm">{$t('settings.btn_import')}</span>
                                     <span class="text-xs text-indigo-400 font-normal">
                                        {$t('settings.drag_backup')}
                                     </span>
                                 </div>
                            </div>
                            <input 
                                type="file" 
                                accept=".json" 
                                on:change={handleImportBackup} 
                                on:click={(e) => { e.currentTarget.value = ''; }}
                                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                            />
                          </div>
                    </div>

                </div>
            </div>

            <div class="bg-rose-50/50 rounded-xl shadow-sm border border-rose-100 overflow-hidden">
                 <div class="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div class="text-center sm:text-left">
                         <h4 class="text-rose-700 font-bold text-sm uppercase">{$t('settings.danger_zone_title')}</h4>
                     </div>
                     <button 
                        on:click={handleFactoryReset} 
                        class="flex-shrink-0 bg-white border border-rose-200 text-rose-600 text-xs sm:text-sm font-bold px-5 py-3 rounded-lg hover:bg-rose-600 hover:text-white transition-colors shadow-sm whitespace-nowrap"
                     >
                        🗑️ {$t('settings.delete_all_btn')}
                     </button>
                 </div>
            </div>

          </div>
        {/if}

        <!-- Global Modal Component -->
        {#if showModal}
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div 
              class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto animate-slide-up" 
              on:keydown|stopPropagation
              role="dialog" 
              aria-modal="true"
              tabindex="-1"  >
              <div class="p-6">
                <div class="flex items-center gap-3 mb-4">
                  {#if modalType === 'error'}
                    <div class="bg-rose-100 text-rose-600 p-2 rounded-lg"><span class="text-xl">⚠️</span></div>
                  {:else if modalType === 'success'}
                    <div class="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><span class="text-xl">✅</span></div>
                  {:else if modalType === 'confirm'}
                    <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><span class="text-xl">❓</span></div>
                  
                  {:else if modalType === 'prompt'}
                    <div class="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><span class="text-xl">✏️</span></div>
                  
                  {:else}
                    <div class="bg-slate-100 text-slate-600 p-2 rounded-lg"><span class="text-xl">ℹ️</span></div>
                  {/if}
                  
                  <h3 class="text-lg font-bold text-slate-800">{modalTitle}</h3>
                </div>
                
                <div class="mb-6 space-y-3">
                  <p class="text-slate-600 text-sm leading-relaxed">{modalMessage}</p>
                  
                  {#if modalType === 'prompt'}
                    <div>
                        <input 
                            type="text" 
                            bind:this={promptInput}
                            bind:value={modalInputValue}
                            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            placeholder="{$t('dashboard.new_alias_placeholder')}" 
                            
                            on:keydown={(e) => e.key === 'Enter' && handleModalConfirm()} 
                        />
                    </div>
                  {/if}
                </div>
                
                <div class="flex justify-end gap-3">
                  {#if modalType === 'confirm' || modalType === 'prompt'}
                    <button
                      on:click={() => showModal = false}
                      class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {$t('actions.cancel')}
                    </button>
                    <button
                      on:click={handleModalConfirm}
                      class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                    >
                      {$t('actions.confirm')}
                    </button>
                  {:else}
                    <button
                      on:click={() => showModal = false}
                      class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                    >
                      {$t('actions.ok')}
                    </button>
                  {/if}
                </div>
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

  /* Animations */
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }

  @media print {
    header, input[type="file"], button, .bg-blue-50, .border-dashed { display: none !important; }
    .shadow-sm { box-shadow: none !important; border: 1px solid #eee; }
    :global(body) { background: white; }
  }
</style>