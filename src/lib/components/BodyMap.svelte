<script lang="ts">
  import { t } from 'svelte-i18n';
  import type { TanitaRecord } from '$lib/utils/csvSDparser';
  
  export let record: TanitaRecord | null = null;

  const fmt = (n: number, unit: string) => (n ? `${n.toFixed(1)}${unit}` : '--');
</script>

<div class="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
  {#if !record}
    <p class="text-gray-400 italic text-sm">{$t('dashboard.no_data')}</p>
  {:else}
    <h3 class="text-lg font-bold mb-4 text-gray-700">{$t('segments.title')}</h3>
    
    <svg viewBox="0 0 400 500" class="w-full max-w-md h-auto font-sans">
      <defs>
        <style>
          .segment-box { fill: #f9fafb; stroke: #9ca3af; stroke-width: 2; }
          .segment-text { font-size: 14px; text-anchor: middle; fill: #374151; }
          .label-fat { fill: #ef4444; font-weight: bold; font-size: 13px; }
          .label-muscle { fill: #3b82f6; font-weight: bold; font-size: 13px; }
          .segment-title { font-size: 11px; fill: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        </style>
      </defs>

      <circle cx="200" cy="50" r="25" class="fill-gray-100 stroke-gray-400" stroke-width="2" />

      <rect x="20" y="100" width="100" height="120" rx="8" class="segment-box" />
      <text x="70" y="125" class="segment-text segment-title">{$t('segments.left_arm')}</text>
      <text x="70" y="155" class="segment-text label-fat">{$t('segments.fat')}: {fmt(record.fatArmL, '%')}</text>
      <text x="70" y="180" class="segment-text label-muscle">{$t('segments.muscle')}: {fmt(record.muscleArmL, 'kg')}</text>

      <rect x="130" y="100" width="140" height="180" rx="8" class="segment-box" />
      <text x="200" y="125" class="segment-text segment-title">{$t('segments.trunk')}</text>
      <text x="200" y="165" class="segment-text label-fat" style="font-size: 15px;">{$t('segments.fat')}: {fmt(record.fatTrunk, '%')}</text>
      <text x="200" y="195" class="segment-text label-muscle" style="font-size: 15px;">{$t('segments.muscle')}: {fmt(record.muscleTrunk, 'kg')}</text>
      <text x="200" y="240" class="segment-text text-xs text-gray-400">{$t('segments.visceral')}: {record.visceralFat}</text>

      <rect x="280" y="100" width="100" height="120" rx="8" class="segment-box" />
      <text x="330" y="125" class="segment-text segment-title">{$t('segments.right_arm')}</text>
      <text x="330" y="155" class="segment-text label-fat">{$t('segments.fat')}: {fmt(record.fatArmR, '%')}</text>
      <text x="330" y="180" class="segment-text label-muscle">{$t('segments.muscle')}: {fmt(record.muscleArmR, 'kg')}</text>

      <rect x="80" y="300" width="100" height="150" rx="8" class="segment-box" />
      <text x="130" y="325" class="segment-text segment-title">{$t('segments.left_leg')}</text>
      <text x="130" y="360" class="segment-text label-fat">{$t('segments.fat')}: {fmt(record.fatLegL, '%')}</text>
      <text x="130" y="390" class="segment-text label-muscle">{$t('segments.muscle')}: {fmt(record.muscleLegL, 'kg')}</text>

      <rect x="220" y="300" width="100" height="150" rx="8" class="segment-box" />
      <text x="270" y="325" class="segment-text segment-title">{$t('segments.right_leg')}</text>
      <text x="270" y="360" class="segment-text label-fat">{$t('segments.fat')}: {fmt(record.fatLegR, '%')}</text>
      <text x="270" y="390" class="segment-text label-muscle">{$t('segments.muscle')}: {fmt(record.muscleLegR, 'kg')}</text>

      <line x1="120" y1="140" x2="130" y2="140" stroke="#d1d5db" stroke-width="2" />
      <line x1="270" y1="140" x2="280" y2="140" stroke="#d1d5db" stroke-width="2" />
      <line x1="160" y1="280" x2="160" y2="300" stroke="#d1d5db" stroke-width="2" />
      <line x1="240" y1="280" x2="240" y2="300" stroke="#d1d5db" stroke-width="2" />
    </svg>
    
    <div class="flex gap-6 mt-6 text-xs justify-center uppercase tracking-wide text-gray-500">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-red-500 rounded-full"></div>
        <span>{$t('segments.fat')} (%)</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
        <span>{$t('segments.muscle')} (kg)</span>
      </div>
    </div>
  {/if}
</div>