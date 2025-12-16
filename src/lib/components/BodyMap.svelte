<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { t } from 'svelte-i18n';
  import { Info } from 'lucide-svelte';
  import type { BioMetricRecord } from '$lib/utils/csvSDparser';
  import { getBodyFatStatus, type HealthStatus } from '$lib/utils/ranges';

  // EVENT DISPATCHER
  const dispatch = createEventDispatcher();

  export let record: BioMetricRecord | null = null;

  // --- TYPES ---
  type ViewMode = 'fat' | 'muscle';
  type SegmentKey = 'armR' | 'armL' | 'trunk' | 'legR' | 'legL';

  // --- STATE ---
  let viewMode: ViewMode = 'fat';
  let hoveredSegment: SegmentKey | null = null;

  // --- HELPERS ---
  const formatVal = (val: number | undefined): string => {
    if (val === undefined || val === null || isNaN(val) || val === 0) return '--';
    return `${val}`;
  };

  // Manejador para teclado (Accesibilidad)
  // Permite activar el "hover" pulsando Enter o Espacio
  const handleSegmentKey = (e: KeyboardEvent, segment: SegmentKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      hoveredSegment = segment;
    }
  };

  // --- REACTIVE DATA ---
  $: data = record ? {
    fat: {
      armR: record.fatArmR, armL: record.fatArmL, trunk: record.fatTrunk,
      legR: record.fatLegR, legL: record.fatLegL, unit: '%'
    },
    muscle: {
      armR: record.muscleArmR, armL: record.muscleArmL, trunk: record.muscleTrunk,
      legR: record.muscleLegR, legL: record.muscleLegL, unit: 'kg'
    }
  } : null;

  $: currentData = data ? data[viewMode] : null;

  // --- VISCERAL FAT LOGIC ---
  $: visceralFat = record ? Number(record.visceralFat) : 0;
  $: isVisceralHealthy = visceralFat <= 12;
  
  // --- VISUAL STYLES (Colors) ---
  $: baseFill = viewMode === 'fat' ? '#fef3c7' : '#e0e7ff';
  $: activeFill = viewMode === 'fat' ? '#fbbf24' : '#818cf8';
  $: hoverFill = viewMode === 'fat' ? '#f59e0b' : '#6366f1';
  
  // --- TRAFFIC LIGHT LOGIC ---
  $: currentStatus = ((): HealthStatus | 'unknown' => {
    if (!record || viewMode !== 'fat') return 'unknown';

    let valToCheck = 0;
    
    if (hoveredSegment && currentData) {
      valToCheck = (currentData as any)[hoveredSegment] || 0;
    } else {
      valToCheck = record.bodyFat;
    }
    
    return getBodyFatStatus(valToCheck, record.gender, record.age);
  })();

  const getTrafficLightClass = (blockType: HealthStatus, activeStatus: string): string => {
    const isActive = blockType === activeStatus;
    switch (blockType) {
      case 'under':
        return isActive ? 'bg-blue-500 ring-2 ring-blue-400 scale-110 opacity-100 shadow-lg' : 'bg-blue-200 opacity-30';
      case 'healthy':
        return isActive ? 'bg-green-500 ring-2 ring-green-400 scale-110 opacity-100 shadow-lg' : 'bg-green-200 opacity-30';
      case 'over':
        return isActive ? 'bg-yellow-400 ring-2 ring-yellow-300 scale-110 opacity-100 shadow-lg' : 'bg-yellow-100 opacity-30';
      case 'obese':
        return isActive ? 'bg-red-500 ring-2 ring-red-400 scale-110 opacity-100 shadow-lg' : 'bg-red-200 opacity-30';
      default:
        return '';
    }
  };
</script>

<div class="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full relative">
  
  <div class="flex flex-col sm:flex-row justify-between items-center mb-2 z-10 border-b border-gray-100 pb-2">
    
    <div class="flex items-center gap-2 mb-2 sm:mb-0">
      <h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest">
        {$t('segments.title')}
      </h3>
      <button 
        on:click={() => dispatch('info')} 
        class="text-slate-300 hover:text-indigo-500 transition-colors"
        aria-label="Info Segmental"
      >
        <Info size={16} />
      </button>
    </div>

    <div class="flex bg-gray-50 p-1 rounded-lg border border-gray-200 shadow-inner" role="group" aria-label="View Mode">
      <button
        on:click={() => viewMode = 'fat'}
        aria-pressed={viewMode === 'fat'}
        class="text-[10px] font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all uppercase tracking-wide {viewMode === 'fat' ? 'bg-amber-400 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}"
      >
        {$t('segments.fat')}
      </button>
      <button
        on:click={() => viewMode = 'muscle'}
        aria-pressed={viewMode === 'muscle'}
        class="text-[10px] font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all uppercase tracking-wide {viewMode === 'muscle' ? 'bg-indigo-400 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}"
      >
        {$t('segments.muscle')}
      </button>
    </div>
  </div>

  <div class="flex-1 flex flex-col items-center justify-center relative min-h-[300px] sm:min-h-[400px] w-full">
    {#if !record}
      <div class="text-center opacity-50">
        <p class="text-4xl mb-2" aria-hidden="true">👤</p>
        <p class="text-xs font-medium text-gray-400">{$t('client_view.no_data_client')}</p>
      </div>
    {:else}
      
      <svg viewBox="-50 0 380 520" class="h-full w-full max-h-[400px] sm:max-h-[600px] drop-shadow-xl overflow-visible" aria-labelledby="body-map-title">
        <title id="body-map-title">{$t('segments.title')}</title>
        <defs>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="hover-glow" x="-50%" y="-50%" width="200%" height="200%">
             <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="rgba(0,0,0,0.3)" />
          </filter>
        </defs>

        <path d="M140,20 C128,20 120,32 120,50 C120,72 128,82 140,82 C152,82 160,72 160,50 C160,32 152,20 140,20 Z" fill="#e5e7eb" />

        <g 
          class="group cursor-pointer transition-all duration-200 ease-out origin-center focus:outline-none"
          tabindex="0"
          role="button" 
          aria-label={$t('segments.right_arm')}
          on:mouseenter={() => hoveredSegment = 'armR'}
          on:mouseleave={() => hoveredSegment = null}
          on:focus={() => hoveredSegment = 'armR'}
          on:blur={() => hoveredSegment = null}
          on:keydown={(e) => handleSegmentKey(e, 'armR')}
          style={hoveredSegment === 'armR' ? 'transform: scale(1.02); filter: url(#hover-glow);' : ''}
        >
          <path 
            d="M98,90 C90,95 75,110 65,160 C62,180 60,230 52,240 C45,250 50,265 62,260 C75,255 80,230 85,210 C90,180 105,130 118,105 L98,90 Z" 
            style="fill: {hoveredSegment === 'armR' ? hoverFill : activeFill}; stroke: white; stroke-width: 3px;"
            class="transition-colors duration-300"
          />
          <g transform="translate(-45, 130)">
             <line x1="85" y1="25" x2="105" y2="40" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />
             <rect x="0" y="0" width="85" height="50" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1" class="shadow-lg" fill-opacity="0.95"/>
             <text x="42" y="18" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle" class="uppercase tracking-wider">{$t('segments.right_arm')}</text>
             <text x="42" y="40" font-size="18" font-weight="900" fill="#1f2937" text-anchor="middle">
               {formatVal(currentData?.armR)}
               <tspan font-size="10" font-weight="bold" fill="#94a3b8" dy="0" dx="1">{currentData?.unit}</tspan>
             </text>
          </g>
        </g>

        <g 
          class="group cursor-pointer transition-all duration-200 ease-out origin-center focus:outline-none"
          tabindex="0"
          role="button" 
          aria-label={$t('segments.left_arm')}
          on:mouseenter={() => hoveredSegment = 'armL'}
          on:mouseleave={() => hoveredSegment = null}
          on:focus={() => hoveredSegment = 'armL'}
          on:blur={() => hoveredSegment = null}
          on:keydown={(e) => handleSegmentKey(e, 'armL')}
          style={hoveredSegment === 'armL' ? 'transform: scale(1.02); filter: url(#hover-glow);' : ''}
        >
          <path 
            d="M182,90 C190,95 205,110 215,160 C218,180 220,230 228,240 C235,250 230,265 218,260 C205,255 200,230 195,210 C190,180 175,130 162,105 L182,90 Z" 
            style="fill: {hoveredSegment === 'armL' ? hoverFill : activeFill}; stroke: white; stroke-width: 3px;"
            class="transition-colors duration-300"
          />
          <g transform="translate(235, 130)">
             <line x1="0" y1="25" x2="-25" y2="40" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />
             <rect x="0" y="0" width="85" height="50" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1" class="shadow-lg" fill-opacity="0.95"/>
             <text x="42" y="18" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle" class="uppercase tracking-wider">{$t('segments.left_arm')}</text>
             <text x="42" y="40" font-size="18" font-weight="900" fill="#1f2937" text-anchor="middle">
               {formatVal(currentData?.armL)}
               <tspan font-size="10" font-weight="bold" fill="#94a3b8" dy="0" dx="1">{currentData?.unit}</tspan>
             </text>
          </g>
        </g>

        <g 
          class="group cursor-pointer transition-all duration-200 ease-out origin-center focus:outline-none"
          tabindex="0"
          role="button" 
          aria-label={$t('segments.trunk')}
          on:mouseenter={() => hoveredSegment = 'trunk'}
          on:mouseleave={() => hoveredSegment = null}
          on:focus={() => hoveredSegment = 'trunk'}
          on:blur={() => hoveredSegment = null}
          on:keydown={(e) => handleSegmentKey(e, 'trunk')}
          style={hoveredSegment === 'trunk' ? 'transform: scale(1.02); filter: url(#hover-glow);' : ''}
        >
          <path 
            d="M120,85 C120,85 160,85 160,85 L182,100 C185,130 180,180 178,220 L190,245 L90,245 L102,220 C100,180 95,130 98,100 L120,85 Z" 
            style="fill: {hoveredSegment === 'trunk' ? hoverFill : activeFill}; stroke: white; stroke-width: 3px;"
            class="transition-colors duration-300"
          />
           <g transform="translate(100, 115)">
             <rect x="0" y="0" width="80" height="45" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1" class="shadow-lg" fill-opacity="0.95"/>
             <text x="40" y="16" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle" class="uppercase tracking-wider">{$t('segments.trunk')}</text>
             <text x="40" y="36" font-size="18" font-weight="900" fill="#1f2937" text-anchor="middle">
               {formatVal(currentData?.trunk)}
               <tspan font-size="10" font-weight="bold" fill="#94a3b8" dy="0" dx="1">{currentData?.unit}</tspan>
             </text>
          </g>
        </g>

        <g 
          class="group cursor-pointer transition-all duration-200 ease-out origin-center focus:outline-none"
          tabindex="0"
          role="button" 
          aria-label={$t('segments.right_leg')}
          on:mouseenter={() => hoveredSegment = 'legR'}
          on:mouseleave={() => hoveredSegment = null}
          on:focus={() => hoveredSegment = 'legR'}
          on:blur={() => hoveredSegment = null}
          on:keydown={(e) => handleSegmentKey(e, 'legR')}
          style={hoveredSegment === 'legR' ? 'transform: scale(1.02); filter: url(#hover-glow);' : ''}
        >
          <path 
            d="M90,248 L138,248 L135,340 C132,380 128,450 130,490 L100,490 C102,450 98,380 95,340 L90,248 Z" 
            style="fill: {hoveredSegment === 'legR' ? hoverFill : activeFill}; stroke: white; stroke-width: 3px;"
            class="transition-colors duration-300"
          />
           <g transform="translate(10, 310)">
             <line x1="80" y1="20" x2="95" y2="20" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />
             <rect x="0" y="0" width="80" height="45" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1" class="shadow-lg" fill-opacity="0.95"/>
             <text x="40" y="16" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle" class="uppercase tracking-wider">{$t('segments.right_leg')}</text>
             <text x="40" y="36" font-size="18" font-weight="900" fill="#1f2937" text-anchor="middle">
               {formatVal(currentData?.legR)}
               <tspan font-size="10" font-weight="bold" fill="#94a3b8" dy="0" dx="1">{currentData?.unit}</tspan>
             </text>
          </g>
        </g>

        <g 
          class="group cursor-pointer transition-all duration-200 ease-out origin-center focus:outline-none"
          tabindex="0"
          role="button" 
          aria-label={$t('segments.left_leg')}
          on:mouseenter={() => hoveredSegment = 'legL'}
          on:mouseleave={() => hoveredSegment = null}
          on:focus={() => hoveredSegment = 'legL'}
          on:blur={() => hoveredSegment = null}
          on:keydown={(e) => handleSegmentKey(e, 'legL')}
          style={hoveredSegment === 'legL' ? 'transform: scale(1.02); filter: url(#hover-glow);' : ''}
        >
          <path 
            d="M142,248 L190,248 L185,340 C182,380 178,450 180,490 L150,490 C152,450 148,380 145,340 L142,248 Z" 
            style="fill: {hoveredSegment === 'legL' ? hoverFill : activeFill}; stroke: white; stroke-width: 3px;"
            class="transition-colors duration-300"
          />
          <g transform="translate(190, 310)">
             <line x1="0" y1="20" x2="-15" y2="20" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />
             <rect x="0" y="0" width="80" height="45" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1" class="shadow-lg" fill-opacity="0.95"/>
             <text x="40" y="16" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle" class="uppercase tracking-wider">{$t('segments.left_leg')}</text>
             <text x="40" y="36" font-size="18" font-weight="900" fill="#1f2937" text-anchor="middle">
               {formatVal(currentData?.legL)}
               <tspan font-size="10" font-weight="bold" fill="#94a3b8" dy="0" dx="1">{currentData?.unit}</tspan>
             </text>
          </g>
        </g>

        {#if viewMode === 'fat' && visceralFat > 0}
            <g class="transition-all duration-500 ease-out hover:scale-105 origin-center">
                <ellipse 
                  cx="140" cy="235" rx="65" ry="30" 
                  fill="#ffffff"
                  stroke={isVisceralHealthy ? '#10b981' : '#f43f5e'} 
                  stroke-width="3" 
                  stroke-opacity="0.8"
                  fill-opacity={isVisceralHealthy ? '0.4' : '0.25'} 
                />
                
                <ellipse 
                  cx="140" cy="235" rx="50" ry="22" 
                  fill={isVisceralHealthy ? '#ecfdf5' : '#fff1f2'} 
                  stroke={isVisceralHealthy ? '#34d399' : '#f43f5e'} 
                  stroke-width="3"
                  fill-opacity="0.4"
                />

                <ellipse 
                  cx="140" cy="235" rx="20" ry="10" 
                  fill={isVisceralHealthy ? '#10b981' : '#f43f5e'} 
                />
                
                <rect x="90" y="265" width="100" height="14" rx="4" fill="white" fill-opacity="0.9" />

                <text x="140" y="275" font-size="10" font-weight="bold" fill="#64748b" text-anchor="middle" class="uppercase tracking-widest">
                  {$t('segments.visceral')}
                </text>
                
                <text x="140" y="240" font-size="14" font-weight="900" fill="white" text-anchor="middle" style="text-shadow: 0 1px 2px rgba(0,0,0,0.2)">
                    {visceralFat}
                </text>
            </g>
        {/if}

      </svg>
      
      {#if viewMode === 'fat'}
        <div
          class="absolute bottom-2 left-4 flex flex-col gap-1 w-36 bg-white/80 p-2 rounded-lg backdrop-blur-sm border border-gray-100 shadow-sm"
          role="region"
          aria-label="Health Status Indicator"
        >
           <div class="flex justify-between items-end h-3 mb-1 px-1">
              <div class="w-3 h-3 border-l-2 border-t-2 border-gray-600 bg-white rotate-45 transform transition-all duration-300
                {currentStatus === 'under' ? 'translate-x-2' : ''}
                {currentStatus === 'healthy' ? 'translate-x-[2.4rem]' : ''}
                {currentStatus === 'over' ? 'translate-x-[4.6rem]' : ''}
                {currentStatus === 'obese' ? 'translate-x-[6.8rem]' : ''}
                {currentStatus === 'unknown' ? 'opacity-0' : 'opacity-100'}
              "></div>
           </div>

           <div class="flex w-full h-3 rounded-full overflow-hidden shadow-inner bg-gray-100 gap-[2px]">
             <div class="flex-1 transition-all duration-300 {getTrafficLightClass('under', currentStatus)}"></div>
             <div class="flex-1 transition-all duration-300 {getTrafficLightClass('healthy', currentStatus)}"></div>
             <div class="flex-1 transition-all duration-300 {getTrafficLightClass('over', currentStatus)}"></div>
             <div class="flex-1 transition-all duration-300 {getTrafficLightClass('obese', currentStatus)}"></div>
           </div>

           <div class="flex justify-between text-[8px] text-gray-400 font-bold uppercase mt-1 px-1">
             <span>{$t('status.under')}</span>
             <span>{$t('status.over')}</span>
           </div>
         </div>
       {/if}

    {/if}
  </div>
</div>