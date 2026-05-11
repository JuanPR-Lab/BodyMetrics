<script lang="ts">
	import type { BioMetricRecord } from '$lib/utils/csvSDparser';
	import { CHART_OPTIONS } from '$lib/utils/constants';
	import { formatWeight } from '$lib/utils/format';
	import { settings } from '$lib/utils/settings.svelte';
	import BodyMap from '$lib/components/BodyMap.svelte';
	import { BarChart3, Scale, Activity, Droplets, Dumbbell, Bone, Flame, Clock } from 'lucide-svelte';

	const { records = [] } = $props<{ records: BioMetricRecord[] }>();

	// Derived booleans for each metric
	const hasWeight = $derived(records.some((r: BioMetricRecord) => r.weight != null && r.weight > 0));
	const hasBMI = $derived(records.some((r: BioMetricRecord) => r.bmi != null && r.bmi > 0));
	const hasBodyFat = $derived(records.some((r: BioMetricRecord) => r.bodyFat != null && r.bodyFat > 0));
	const hasMuscleMass = $derived(records.some((r: BioMetricRecord) => r.muscleMass != null && r.muscleMass > 0));
	const hasBoneMass = $derived(records.some((r: BioMetricRecord) => r.boneMass != null && r.boneMass > 0));
	const hasVisceralFat = $derived(records.some((r: BioMetricRecord) => r.visceralFat != null && r.visceralFat > 0));
	const hasWaterPercentage = $derived(records.some((r: BioMetricRecord) => r.waterPercentage != null && r.waterPercentage > 0));
	const hasMetabolicAge = $derived(records.some((r: BioMetricRecord) => r.metabolicAge != null && r.metabolicAge > 0));
	const hasDCI = $derived(records.some((r: BioMetricRecord) => r.dci != null && r.dci > 0));

	// Segmental data
	const hasSegmentalData = $derived(
		records.some((r: BioMetricRecord) =>
			(r.fatArmR != null || r.fatArmL != null || r.fatLegR != null || r.fatLegL != null || r.fatTrunk != null) ||
			(r.muscleArmR != null || r.muscleArmL != null || r.muscleLegR != null || r.muscleLegL != null || r.muscleTrunk != null)
		)
	);

	// Chart logic
	let selectedChartMetric = $state<keyof BioMetricRecord>('weight');
	let hoveredIndex = $state<number | null>(null);

	// Filter chart options to only those with data
	const availableChartOptions = $derived(
		CHART_OPTIONS.filter(opt => {
			if (opt.key === 'weight') return hasWeight;
			if (opt.key === 'bmi') return hasBMI;
			if (opt.key === 'bodyFat') return hasBodyFat;
			if (opt.key === 'muscleMass') return hasMuscleMass;
			if (opt.key === 'boneMass') return hasBoneMass;
			if (opt.key === 'visceralFat') return hasVisceralFat;
			if (opt.key === 'metabolicAge') return hasMetabolicAge;
			if (opt.key === 'dci') return hasDCI;
			return false;
		})
	);

	// Ensure selected metric is available
	$effect(() => {
		if (availableChartOptions.length > 0 && !availableChartOptions.some(opt => opt.key === selectedChartMetric)) {
			selectedChartMetric = availableChartOptions[0].key;
		}
	});

	// Prepare chart data (simplified)
	const chartData = $derived({
		pointsData: records
			.map((r: BioMetricRecord, i: number) => ({
				date: r.date,
				value: r[selectedChartMetric] as number | null,
				index: i
			}))
			.filter((p: { date: string; value: number | null; index: number }) => p.value != null && p.value > 0)
			.sort((a: { date: string; value: number | null; index: number }, b: { date: string; value: number | null; index: number }) => new Date(a.date).getTime() - new Date(b.date).getTime())
	});

	const activeChartColor = $derived(
		CHART_OPTIONS.find(o => o.key === selectedChartMetric)?.color || '#6366f1'
	);

	const activeChartUnitKey = $derived(
		CHART_OPTIONS.find(o => o.key === selectedChartMetric)?.unitKey || ''
	);

	// Helper to get latest record
	const latestRecord = $derived(records.length > 0 ? records[records.length - 1] : null);

	// Format value for display
	const formatMetric = (value: number | null, unitKey: string) => {
		if (value == null) return '–';
		if (unitKey === 'kg') return formatWeight(value, settings.unit);
		// For percentages, ratings, years, kcal, etc. just show one decimal
		return value.toFixed(1);
	};
</script>

<div class="space-y-8">
	<!-- Metrics Cards Grid -->
	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
		{#if hasWeight}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Scale class="text-slate-600" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">Peso</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.weight ?? null, 'kg')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Última medición</p>
			</div>
		{/if}

		{#if hasBMI}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Activity class="text-pink-500" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">IMC</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.bmi ?? null, '')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Índice de masa corporal</p>
			</div>
		{/if}

		{#if hasBodyFat}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Droplets class="text-amber-500" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">Grasa</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.bodyFat ?? null, 'percent')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Porcentaje corporal</p>
			</div>
		{/if}

		{#if hasMuscleMass}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Dumbbell class="text-indigo-500" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">Músculo</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.muscleMass ?? null, 'kg')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Masa muscular</p>
			</div>
		{/if}

		{#if hasBoneMass}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Bone class="text-slate-500" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">Hueso</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.boneMass ?? null, 'kg')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Masa ósea</p>
			</div>
		{/if}

		{#if hasVisceralFat}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Flame class="text-orange-500" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">Visceral</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.visceralFat ?? null, 'rating')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Grasa visceral</p>
			</div>
		{/if}

		{#if hasMetabolicAge}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Clock class="text-purple-500" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">Edad Metabólica</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.metabolicAge ?? null, 'years')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Comparación con edad real</p>
			</div>
		{/if}

		{#if hasDCI}
			<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
				<div class="flex items-center justify-between mb-2">
					<Flame class="text-emerald-500" size={20} />
					<span class="text-xs font-semibold text-slate-500 uppercase">DCI</span>
				</div>
				<p class="text-2xl font-bold text-slate-800">
					{formatMetric(latestRecord?.dci ?? null, 'kcal')}
				</p>
				<p class="text-xs text-slate-500 mt-1">Gasto calórico diario</p>
			</div>
		{/if}
	</div>

	<!-- Evolution Chart -->
	{#if availableChartOptions.length > 0 && chartData.pointsData.length > 0}
		<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
				<div class="flex items-center gap-2">
					<BarChart3 size={20} class="text-indigo-600" />
					<h3 class="font-bold text-slate-800">Evolución</h3>
				</div>
				<select
					bind:value={selectedChartMetric}
					class="w-full sm:w-auto min-w-[200px] border border-gray-300 rounded px-3 py-1.5 text-sm font-medium bg-white hover:border-indigo-500 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none cursor-pointer shadow-sm"
				>
					{#each availableChartOptions as option}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
			</div>
			<div class="h-64 w-full relative">
				<!-- Simplified chart visualization (placeholder) -->
				<div class="flex items-end h-48 gap-1">
					{#each chartData.pointsData as point, i}
						<div
							class="flex-1 bg-indigo-100 rounded-t transition-all hover:bg-indigo-200"
							style="height: {Math.max(10, (point.value! / Math.max(...chartData.pointsData.map((p: { value: number }) => p.value!))) * 100)}%"
							on:mouseenter={() => hoveredIndex = i}
							on:mouseleave={() => hoveredIndex = null}
						></div>
					{/each}
				</div>
				<div class="flex justify-between text-xs text-slate-500 mt-2">
					{#each chartData.pointsData as point}
						<div class="text-center">{point.date}</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Body Map -->
	{#if hasSegmentalData && latestRecord}
		<div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
			<h3 class="font-bold text-slate-800 mb-4">Mapa Corporal Segmentario</h3>
			<BodyMap record={latestRecord} />
		</div>
	{/if}
</div>
