<script lang="ts">
  import { t } from 'svelte-i18n';
  import { Scale, Activity, Droplets, Dumbbell, Flame, Clock, TrendingUp, Calendar, ArrowDownToLine } from 'lucide-svelte';
  import BodyMap from '$lib/components/BodyMap.svelte';
  import type { BioMetricRecord } from '$lib/utils/csvSDparser';

  export let records: BioMetricRecord[] = [];
  export let clientName: string = "Patient";
  export let readonly: boolean = false;

  let selectedRecordId: string | null = null;
  let selectedChartMetric: string = 'weight';

  // Sort chronologically
  $: sortedRecords = [...records].sort((a, b) => 
    new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()
  );

  // Determine current record (selected or latest)
  $: currentRecord = selectedRecordId 
    ? sortedRecords.find(r => r.id === selectedRecordId) || sortedRecords[sortedRecords.length - 1]
    : sortedRecords[sortedRecords.length - 1];

  // Simple Chart Logic
  $: chartPoints = sortedRecords.map((r, i) => ({
     val: Number(r[selectedChartMetric as keyof BioMetricRecord]) || 0,
     date: r.date,
     x: (i / (sortedRecords.length - 1 || 1)) * 100
  }));
  
  $: maxVal = Math.max(...chartPoints.map(p => p.val)) * 1.1;
  $: minVal = Math.min(...chartPoints.map(p => p.val)) * 0.9;
  $: range = maxVal - minVal || 1;
  
  $: polylinePoints = chartPoints.map(p => 
     `${p.x},${100 - ((p.val - minVal) / range) * 100}`
  ).join(' ');
</script>

<div class="flex flex-col gap-6 h-full pb-12">
  
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
    <div class="flex items-center gap-3">
       <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
         <Activity size={20} />
       </div>
       <div>
         <h2 class="text-xl font-bold text-slate-800">{clientName}</h2>
         <p class="text-xs text-slate-500 font-medium">
           {sortedRecords.length} measurements • Last: {currentRecord?.date}
         </p>
       </div>
    </div>
    
    {#if !readonly}
       {/if}
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
    
    <div class="xl:col-span-1 grid grid-cols-2 gap-3 content-start">
        
        <div class="bg-white p-4 rounded-xl border-l-4 border-slate-800 shadow-sm transition-transform hover:scale-[1.02]">
           <div class="flex items-center gap-2 mb-1 text-slate-500">
             <Scale size={14} />
             <span class="text-[10px] font-bold uppercase tracking-wider">{$t('metrics.weight')}</span>
           </div>
           <span class="text-2xl font-black text-slate-800">
             {currentRecord.weight}<span class="text-sm font-normal text-slate-400 ml-0.5">kg</span>
           </span>
        </div>

        <div class="bg-white p-4 rounded-xl border-l-4 border-slate-500 shadow-sm transition-transform hover:scale-[1.02]">
           <div class="flex items-center gap-2 mb-1 text-slate-500">
             <Activity size={14} />
             <span class="text-[10px] font-bold uppercase tracking-wider">{$t('metrics.bmi')}</span>
           </div>
           <span class="text-2xl font-black text-slate-800">
             {currentRecord.bmi}
           </span>
        </div>

        <div class="bg-white p-4 rounded-xl border-l-4 border-amber-500 shadow-sm transition-transform hover:scale-[1.02]">
           <div class="flex items-center gap-2 mb-1 text-amber-600">
             <Droplets size={14} />
             <span class="text-[10px] font-bold uppercase tracking-wider">{$t('metrics.body_fat')}</span>
           </div>
           <span class="text-2xl font-black text-slate-800">
             {currentRecord.bodyFat}<span class="text-sm font-normal text-slate-400 ml-0.5">%</span>
           </span>
        </div>

        <div class="bg-white p-4 rounded-xl border-l-4 border-indigo-500 shadow-sm transition-transform hover:scale-[1.02]">
           <div class="flex items-center gap-2 mb-1 text-indigo-600">
             <Dumbbell size={14} />
             <span class="text-[10px] font-bold uppercase tracking-wider">{$t('metrics.muscle_mass')}</span>
           </div>
           <span class="text-2xl font-black text-slate-800">
             {currentRecord.muscleMass}<span class="text-sm font-normal text-slate-400 ml-0.5">kg</span>
           </span>
        </div>
        
        <div class="bg-white p-4 rounded-xl border-l-4 border-cyan-500 shadow-sm col-span-2 flex justify-between">
           <div>
              <div class="flex items-center gap-2 mb-1 text-cyan-600">
                <Droplets size={14} />
                <span class="text-[10px] font-bold uppercase tracking-wider">{$t('metrics.water')}</span>
              </div>
              <span class="text-xl font-black text-slate-800">{currentRecord.waterPercentage}%</span>
           </div>
           <div class="text-right">
              <div class="flex items-center justify-end gap-2 mb-1 text-rose-500">
                <Flame size={14} />
                <span class="text-[10px] font-bold uppercase tracking-wider">Visceral</span>
              </div>
              <span class="text-xl font-black text-slate-800">{currentRecord.visceralFat}</span>
           </div>
        </div>

        <div class="bg-white p-4 rounded-xl border-l-4 border-emerald-500 shadow-sm col-span-2 flex justify-between">
           <div>
              <div class="flex items-center gap-2 mb-1 text-emerald-600">
                <Flame size={14} />
                <span class="text-[10px] font-bold uppercase tracking-wider">DCI (Kcal)</span>
              </div>
              <span class="text-xl font-black text-slate-800">{currentRecord.dci}</span>
           </div>
           <div class="text-right">
              <div class="flex items-center justify-end gap-2 mb-1 text-purple-600">
                <Clock size={14} />
                <span class="text-[10px] font-bold uppercase tracking-wider">Metabolic Age</span>
              </div>
              <span class="text-xl font-black text-slate-800">{currentRecord.metabolicAge}</span>
           </div>
        </div>
    </div>

    <div class="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
       <BodyMap record={currentRecord} />
    </div>

  </div>

  <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
            <TrendingUp class="text-indigo-600" size={20} />
            <h3 class="font-bold text-slate-800 uppercase tracking-wider">Progress Analysis</h3>
        </div>
        
        <div class="flex bg-slate-100 rounded-lg p-1">
            <button on:click={() => selectedChartMetric = 'weight'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {selectedChartMetric === 'weight' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}">Weight</button>
            <button on:click={() => selectedChartMetric = 'bodyFat'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {selectedChartMetric === 'bodyFat' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}">Fat %</button>
            <button on:click={() => selectedChartMetric = 'muscleMass'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {selectedChartMetric === 'muscleMass' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}">Muscle</button>
        </div>
      </div>
      
      <div class="h-48 w-full relative">
         <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full overflow-visible">
            <line x1="0" y1="0" x2="100" y2="0" stroke="#f1f5f9" stroke-width="1" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" stroke-width="1" />
            <line x1="0" y1="100" x2="100" y2="100" stroke="#f1f5f9" stroke-width="1" />
            
            <polyline 
              points={polylinePoints} 
              fill="none" 
              stroke="#4f46e5" 
              stroke-width="2" 
              vector-effect="non-scaling-stroke"
              stroke-linejoin="round" 
              stroke-linecap="round"
            />
            
            {#each chartPoints as p, i}
               <circle cx={p.x} cy={100 - ((p.val - minVal) / range) * 100} r="1.5" fill="#fff" stroke="#4f46e5" stroke-width="1" />
            {/each}
         </svg>
      </div>
      
      <div class="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {#each sortedRecords as rec}
          <button 
            on:click={() => selectedRecordId = rec.id || null} 
            class="flex-shrink-0 min-w-[100px] p-3 rounded-lg border text-left transition-all relative outline-none
            {currentRecord === rec 
              ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' 
              : 'border-slate-200 hover:border-indigo-300 bg-white'}"
          >
            <div class="flex items-center gap-1 text-xs text-slate-500 font-bold mb-1">
               <Calendar size={10} /> {rec.date}
            </div>
            <div class="text-lg font-black text-slate-800">
               {rec.weight}<span class="text-xs font-normal text-slate-400">kg</span>
            </div>
          </button>
        {/each}
      </div>
  </div>
</div>