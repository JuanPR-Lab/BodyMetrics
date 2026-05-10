<script lang="ts">
    import { createEventDispatcher, tick } from 'svelte';
    import { t } from 'svelte-i18n';
    import type { BioMetricRecord } from '$lib/utils/csvSDparser';
    import type { Client } from '$lib/utils/patientManager';
    import { Inbox, FolderOpen, Upload, AlertTriangle, Clock } from 'lucide-svelte';
    import { settings } from '$lib/utils/settings.svelte';
    import { formatWeight } from '$lib/utils/format';

    // Componentes de UI
    import Card from '$lib/components/ui/Card.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';

    export let inboxRecords: BioMetricRecord[] = [];
    export let clients: Client[] = [];

    // --- OBJETO DE ESTILOS ---
    const STYLES = {
        card: "bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center transition-all hover:bg-slate-50",
        button: "py-2.5 rounded-lg font-bold text-sm transition-all",
        badge: "text-xs text-slate-400 font-bold uppercase tracking-wider mt-1"
    };

    let selectedInboxMeasurements: string[] = [];
    let assignmentSearchTerms: Record<string, string> = {};
    let bulkAssignSearch = '';
    let isProcessing = false;
    let errorMessage = '';
    let fileInput: HTMLInputElement;

    const dispatch = createEventDispatcher();

    // --- LÓGICA DE FILTRADO ---
    $: filteredAssignmentClients = (searchTerm: string) => {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase().trim();
        return clients.filter((c) => c.alias.toLowerCase().includes(term));
    };
    $: filteredBulkClients = filteredAssignmentClients(bulkAssignSearch);

    // --- IDENTIFICACIÓN DE ORIGEN ---
    const getButtonKey = (fileName: string): string => {
        const CSV_BUTTON_MAP: Record<string, string> = {
            'data1.csv': 'BUTTON_1', 'data5.csv': 'BUTTON_1',
            'data2.csv': 'BUTTON_2', 'data6.csv': 'BUTTON_2',
            'data3.csv': 'BUTTON_3', 'data7.csv': 'BUTTON_3',
            'data4.csv': 'BUTTON_4', 'data8.csv': 'BUTTON_4'
        };
        const internalKey = CSV_BUTTON_MAP[fileName.toLowerCase()] || 'UNKNOWN_SOURCE';
        return `dashboard.${internalKey.toLowerCase()}`;
    };

    // --- SELECCIÓN ---
    const toggleInboxSelection = (recordId: string) => {
        const index = selectedInboxMeasurements.indexOf(recordId);
        if (index === -1) {
            selectedInboxMeasurements = [...selectedInboxMeasurements, recordId];
        } else {
            selectedInboxMeasurements = selectedInboxMeasurements.filter((id) => id !== recordId);
        }
    };

    const selectAllInboxMeasurements = () => {
        if (selectedInboxMeasurements.length === inboxRecords.length && inboxRecords.length > 0) {
            selectedInboxMeasurements = [];
        } else {
            selectedInboxMeasurements = inboxRecords.map((r) => r.id);
        }
    };

    // --- GESTIÓN DE ARCHIVOS ---
    const handleFiles = async (files: FileList | File[] | null) => {
        if (!files || files.length === 0) return;
        const filesArray = Array.from(files);
        const validFiles: File[] = [];
        const ignoredFiles: File[] = [];
        
        filesArray.forEach(file => {
            const fileName = file.name.toUpperCase();
            if (fileName.includes('DATA') && fileName.endsWith('.CSV')) {
                validFiles.push(file);
            } else {
                ignoredFiles.push(file);
            }
        });
        
        if (validFiles.length === 0 && ignoredFiles.length > 0) {
            // Use the dedicated translation for invalid CSV uploads in the Inbox
            dispatch('error', {
                message: $t('alerts.invalid_csv_file'),
                isIgnoredFile: true
            });
            return;
        }
        
        dispatch('filesSelected', { files: validFiles });
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
    };

    const assignRecord = (recordId: string, clientId: string) => {
        dispatch('assignRecord', { recordId, clientId, isBulk: false });
        assignmentSearchTerms[recordId] = '';
    };

    const assignBulkMeasurements = (clientId: string) => {
        if (!clientId) return;
        const count = selectedInboxMeasurements.length;
        dispatch('assignBulkRecords', { recordIds: selectedInboxMeasurements, clientId, count });
        selectedInboxMeasurements = [];
        bulkAssignSearch = '';
    };

    // --- FOCO AUTOMÁTICO ---
    $: handleSelectionFocus(selectedInboxMeasurements);

    async function handleSelectionFocus(ids: string[]) {
        await tick();
        if (ids.length === 1) {
            const id = ids[0];
            const desktopInput = document.getElementById(`assign-input-desktop-${id}`) as HTMLInputElement;
            const mobileInput = document.getElementById(`assign-input-mobile-${id}`) as HTMLInputElement;

            if (window.innerWidth >= 1024 && desktopInput) {
                desktopInput.focus();
            } else if (mobileInput) {
                mobileInput.focus();
            }
        } else if (ids.length > 1) {
            const el = document.getElementById('bulk-assign-input');
            el?.focus();
        }
    }
</script>

<svelte:window onkeydown={(e) => {
    if (e.key === 'Escape' && selectedInboxMeasurements.length > 0) {
        selectedInboxMeasurements = [];
    }
}} />

<div class="space-y-6">
    <Card class="max-w-5xl mx-auto space-y-4 animate-fade-in pb-8">
        <div class="text-center pt-4 space-y-4">
            <h2 class="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                {$t('upload.instruction_title')}
            </h2>
            <div class="flex flex-col items-center gap-1">
                <p class="text-sm text-slate-500 font-medium">{$t('upload.instruction_text')}</p>
                <div class="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full font-mono text-[10px] sm:text-xs text-slate-600 shadow-sm">
                    <FolderOpen size={16} class="text-indigo-500" />
                    <span class="font-bold tracking-wide">{$t('upload.instruction_path')}</span>
                </div>
            </div>
        </div>

        <div class="max-w-3xl mx-auto px-2 relative">
            <div
                class="border-2 border-dashed border-indigo-200 rounded-2xl p-5 sm:p-8 text-center bg-indigo-50/30 transition-all hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer flex flex-col items-center justify-center gap-3"
                role="button"
                tabindex="0"
                ondrop={handleDrop}
                ondragover={(e) => e.preventDefault()}
                ondragenter={(e) => e.preventDefault()}
            >
                {#if isProcessing}
                    <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <h3 class="text-sm font-bold text-indigo-600 animate-pulse">{$t('upload.processing')}...</h3>
                {:else}
                    <div class="p-4 rounded-full bg-white/50 mb-2 transition-transform duration-300">
                        <Upload size={32} class="text-indigo-600" strokeWidth={1.5} />
                    </div>
                    <div class="flex flex-col gap-1">
                        <span class="font-bold text-lg text-indigo-700">{$t('upload.btn_load')}</span>
                        <span class="text-sm text-indigo-400 font-medium">{$t('upload.drag_instruction')}</span>
                    </div>
                {/if}
            </div>
            
            <input
                bind:this={fileInput}
                type="file"
                multiple
                accept=".csv, text/csv"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isProcessing}
                onclick={(e) => (e.currentTarget.value = '')}
                onchange={(e) => handleFiles(e.currentTarget.files)}
            />
        </div>

        {#if errorMessage}
            <div class="mt-4 sm:mt-6 mx-auto max-w-lg bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm">
                <AlertTriangle class="text-rose-600 flex-shrink-0" size={20} />
                <div>
                    <h4 class="font-bold text-rose-700 text-sm">{$t('common.error')}</h4>
                    <p class="text-sm text-rose-600">{errorMessage}</p>
                </div>
            </div>
        {/if}
    </Card>

    <div class="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[120px] mt-3 sm:mt-4">
        {#if inboxRecords.length === 0}
            <div class="p-4 text-center h-full flex flex-col justify-center items-center py-12">
                <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Inbox class="text-slate-300" size={40} strokeWidth={1.5} />
                </div>
                <h3 class="text-slate-400 font-bold text-lg">{$t('dashboard.inbox_empty')}</h3>
            </div>
        {:else}
            <div class="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 shadow-sm rounded-t-xl">
                <div class="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        <label class="flex items-center gap-2 cursor-pointer select-none group">
                            <input
                                type="checkbox"
                                checked={selectedInboxMeasurements.length === inboxRecords.length && inboxRecords.length > 0}
                                onchange={selectAllInboxMeasurements}
                                class="h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-all cursor-pointer"
                            />
                            <span class="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                {selectedInboxMeasurements.length > 0
                                    ? `${selectedInboxMeasurements.length} ${$t('dashboard.records_selected')}`
                                    : $t('dashboard.multi_assignment')}
                            </span>
                        </label>
                    </div>

                    {#if selectedInboxMeasurements.length > 1}
                        <div class="flex gap-2 w-full sm:w-auto animate-fade-in">
                            <Button onclick={() => (selectedInboxMeasurements = [])} variant="secondary" size="sm">
                                {$t('actions.cancel')}
                            </Button>

                            <div class="relative flex-1 sm:w-64">
                                <input
                                    id="bulk-assign-input"
                                    type="text"
                                    disabled={clients.length === 0}
                                    placeholder={clients.length === 0 ? $t('dashboard.no_clients_created') : $t('dashboard.assign_btn')}
                                    class="w-full text-sm border border-indigo-300 rounded-lg px-3 py-1.5 shadow-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                                    bind:value={bulkAssignSearch}
                                    onkeydown={(e) => {
                                        if (e.key === 'Enter' && filteredBulkClients.length > 0) {
                                            assignBulkMeasurements(filteredBulkClients[0].id);
                                        }
                                    }}
                                />
                                {#if bulkAssignSearch && clients.length > 0}
                                    <div class="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                                        {#each filteredBulkClients as c}
                                            <button 
                                                class="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors"
                                                onclick={() => assignBulkMeasurements(c.id)}
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

                    <div class="hidden lg:flex px-6 py-3 bg-slate-100/50 text-slate-500 font-semibold uppercase text-[11px] tracking-wider border-t border-slate-200">
                        <div class="w-12 text-center"></div>
                        <div class="w-40 px-2">{$t('analysis.date')}</div>
                        <div class="w-40 px-2">{$t('metrics.weight')}</div>
                        <!-- key_data column removed -->
                        <div class="w-40 px-2">{$t('dashboard.source_file')}</div>
                        <div class="w-72 px-2 text-right">{$t('dashboard.action')}</div>
                    </div>
            </div>

            <div class="block lg:hidden bg-slate-50/50 p-3 space-y-3 rounded-b-xl">
                {#each inboxRecords as rec (rec.id)}
                    <div class="bg-white p-4 rounded-xl shadow-sm border transition-all duration-200 relative
                        {selectedInboxMeasurements.includes(rec.id) ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'}">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 pt-1">
                                <input
                                    type="checkbox"
                                    checked={selectedInboxMeasurements.includes(rec.id)}
                                    onchange={() => toggleInboxSelection(rec.id)}
                                    class="h-6 w-6 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start gap-1 mb-2">
                                    <div>
                                        <div class="font-bold text-slate-800 text-base leading-tight">{rec.date}</div>
                                        <div class="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                            <Clock size={12} /> {rec.time}
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-xl font-black text-slate-800 leading-none">
                                            {formatWeight(rec.weight, settings.unit)}
                                            <span class="text-xs font-medium text-slate-400 ml-0.5">{$t('units.' + settings.unit)}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Height, gender and age badges removed for cleaner UI -->

                                <div class="mb-3">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{$t('dashboard.source_file')}</span>
                                    <div class="text-xs font-bold text-indigo-700 bg-indigo-50/80 px-2 py-1.5 rounded-lg mt-1 inline-block">
                                        {$t(getButtonKey(rec.sourceFile).toLowerCase())}
                                    </div>
                                </div>

                                <div class="pt-3 border-t border-slate-100">
                                    <div class="relative">
                                        {#if selectedInboxMeasurements.length <= 1}
                                            <input
                                                id="assign-input-mobile-{rec.id}"
                                                type="text"
                                                disabled={clients.length === 0}
                                                placeholder={clients.length === 0 ? $t('dashboard.no_clients_created') : $t('dashboard.assign_btn')}
                                                class="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none transition-colors bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                                                bind:value={assignmentSearchTerms[rec.id]}
                                                onkeydown={(e) => {
                                                    if (e.key === 'Enter' && filteredAssignmentClients(assignmentSearchTerms[rec.id]).length > 0) {
                                                        assignRecord(rec.id, filteredAssignmentClients(assignmentSearchTerms[rec.id])[0].id);
                                                    }
                                                }}
                                            />
                                            {#if assignmentSearchTerms[rec.id] && clients.length > 0}
                                                <div class="absolute bottom-full left-0 right-0 mb-2 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                                                    {#each filteredAssignmentClients(assignmentSearchTerms[rec.id]) as c}
                                                        <button 
                                                            class="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-0"
                                                            onclick={() => assignRecord(rec.id, c.id)}
                                                        >
                                                            {c.alias}
                                                        </button>
                                                    {/each}
                                                </div>
                                            {/if}
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="hidden lg:block rounded-b-xl overflow-hidden">
                <div class="divide-y divide-slate-100">
                    {#each inboxRecords as rec (rec.id)}
                        <div class="flex items-center px-6 py-4 hover:bg-slate-50/80 transition-colors {selectedInboxMeasurements.includes(rec.id) ? 'bg-indigo-50/40' : ''}">
                            <div class="w-12 text-center">
                                <input
                                    type="checkbox"
                                    checked={selectedInboxMeasurements.includes(rec.id)}
                                    onchange={() => toggleInboxSelection(rec.id)}
                                            class="h-5 w-5 text-indigo-600 rounded border border-slate-300 bg-slate-100 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            <div class="w-40 px-2 font-bold text-slate-700">
                                <div class="text-base font-bold text-slate-800">{rec.date}</div>
                                <div class="text-sm text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                    <Clock size={10} /> {rec.time}
                                </div>
                            </div>

                            <div class="w-40 px-2 font-bold text-slate-700">
                                <span class="text-base font-black text-slate-800">{formatWeight(rec.weight, settings.unit)}</span>
                                <span class="text-sm text-slate-500 font-medium ml-0.5">{$t('units.' + settings.unit)}</span>
                            </div>

                            <!-- Key data column removed to free space -->

                            <div class="w-40 px-2 truncate">
                                <span class="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                    {$t(getButtonKey(rec.sourceFile).toLowerCase())}
                                </span>
                            </div>

                            <div class="w-72 px-2 text-right">
                                <div class="relative w-full max-w-[260px] ml-auto">
                                    {#if selectedInboxMeasurements.length <= 1}
                                        <input
                                            id="assign-input-desktop-{rec.id}"
                                            type="text"
                                            disabled={clients.length === 0}
                                            placeholder={clients.length === 0 ? $t('dashboard.no_clients_created') : $t('dashboard.assign_btn')}
                                            class="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none transition-shadow bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                                            bind:value={assignmentSearchTerms[rec.id]}
                                            onkeydown={(e) => {
                                                if (e.key === 'Enter' && filteredAssignmentClients(assignmentSearchTerms[rec.id]).length > 0) {
                                                    assignRecord(rec.id, filteredAssignmentClients(assignmentSearchTerms[rec.id])[0].id);
                                                }
                                            }}
                                        />
                                        {#if assignmentSearchTerms[rec.id] && clients.length > 0}
                                            <div class="absolute top-full right-0 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 text-left">
                                                {#each filteredAssignmentClients(assignmentSearchTerms[rec.id]) as c}
                                                    <button 
                                                        class="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors"
                                                        onclick={() => assignRecord(rec.id, c.id)}
                                                    >
                                                        {c.alias}
                                                    </button>
                                                {/each}
                                            </div>
                                        {/if}
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fade-in 0.3s ease-out forwards;
    }
</style>
