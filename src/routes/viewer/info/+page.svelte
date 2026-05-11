<script lang="ts">
	import { t } from 'svelte-i18n';
	import { formatText } from '$lib/utils/format';
	import { Upload, Download, Heart, Coffee, Zap } from 'lucide-svelte';
	import '$lib/i18n';
</script>

<div class="max-w-4xl mx-auto p-4 sm:p-6">
	<h1 class="text-2xl font-bold text-slate-800 mb-2">Bienvenido a BodyMetrics Viewer</h1>
	<p class="text-slate-600 mb-8">Una herramienta gratuita y privada para visualizar tus mediciones de composición corporal desde la báscula Tanita.</p>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="bg-indigo-100 p-2 rounded-lg">
					<Upload class="text-indigo-600" size={24} />
				</div>
				<h3 class="font-bold text-slate-800 text-lg">Cómo empezar</h3>
			</div>
			<ol class="space-y-3 text-sm text-slate-600">
				<li class="flex items-start gap-2">
					<span class="bg-slate-100 text-slate-800 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</span>
					<span>Extrae la tarjeta SD de tu báscula Tanita y conéctala a tu ordenador.</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="bg-slate-100 text-slate-800 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</span>
					<span>Navega a la carpeta <code class="bg-slate-100 px-1 rounded">/TANITA/GRAPHV1/DATA/</code> y busca archivos que empiecen por <strong>BM_</strong>.</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="bg-slate-100 text-slate-800 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</span>
					<span>Ve a la pestaña <a href="/viewer/carga" class="text-indigo-600 font-semibold hover:underline">Carga</a> y sube el archivo CSV.</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="bg-slate-100 text-slate-800 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">4</span>
					<span>Visualiza tus datos en la pestaña <a href="/viewer/visor" class="text-indigo-600 font-semibold hover:underline">Visor</a>.</span>
				</li>
			</ol>
		</div>

		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="bg-emerald-100 p-2 rounded-lg">
					<Download class="text-emerald-600" size={24} />
				</div>
				<h3 class="font-bold text-slate-800 text-lg">Privacidad y seguridad</h3>
			</div>
			<ul class="space-y-3 text-sm text-slate-600">
				<li class="flex items-start gap-2">
					<span class="text-emerald-500 font-bold">✓</span>
					<span><strong>Datos locales:</strong> Tus mediciones nunca salen de tu navegador.</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-emerald-500 font-bold">✓</span>
					<span><strong>Sin registro:</strong> No necesitas crear una cuenta.</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-emerald-500 font-bold">✓</span>
					<span><strong>Control total:</strong> Puedes borrar los datos cuando quieras.</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-emerald-500 font-bold">✓</span>
					<span><strong>Código abierto:</strong> Revisa el código en <a href="https://github.com/juanprlab/BodyMetrics" target="_blank" class="text-indigo-600 font-semibold hover:underline">GitHub</a>.</span>
				</li>
			</ul>
		</div>
	</div>

	<div class="bg-gradient-to-br from-[#FF5E5B] to-[#FF8C8C] rounded-xl shadow-md text-white overflow-hidden mb-10">
		<div class="p-6 sm:p-8">
			<div class="flex items-center gap-3 mb-6">
				<div class="bg-white/20 p-2 rounded-full">
					<Heart size={24} strokeWidth={2.5} class="fill-transparent stroke-white" />
				</div>
				<h3 class="font-bold text-xl">{$t('help.section_support')}</h3>
			</div>

			<div class="text-sm text-white/95 font-medium leading-relaxed mb-8 max-w-2xl">
				<p>{@html formatText($t('help.support_description'))}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div
					class="bg-white/10 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 border border-white/20 hover:bg-white/20 transition-colors"
				>
					<a
						href="https://ko-fi.com/juanprlab"
						target="_blank"
						rel="noopener noreferrer"
						class="flex-1 inline-flex justify-center bg-white text-[#FF5E5B] font-bold text-xs py-2 px-3 rounded-lg shadow-sm hover:bg-slate-50 transition-colors items-center gap-2 h-fit"
					>
						<Coffee size={16} />
						{$t('help.kofi_btn')}
					</a>
					<div class="bg-white p-1.5 rounded-lg shadow-sm flex-shrink-0">
						<img src="/qrcode_kofi.webp" alt="Ko-fi QR" class="w-24 h-24 object-contain" />
					</div>
				</div>

				<div
					class="bg-white/10 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 border border-white/20 hover:bg-white/20 transition-colors"
				>
					<a
						href="https://coinos.io/juanprlab"
						target="_blank"
						rel="noopener noreferrer"
						class="flex-1 inline-flex justify-center bg-white text-amber-600 font-bold text-xs py-2 px-3 rounded-lg shadow-sm hover:bg-slate-50 transition-colors items-center gap-2 h-fit"
					>
						<Zap size={16} class="fill-current" />
						{$t('help.coinos_btn')}
					</a>
					<div class="bg-white p-1.5 rounded-lg shadow-sm flex-shrink-0">
						<img src="/qrcode_coinos.webp" alt="Coinos QR" class="w-24 h-24 object-contain" />
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="text-center text-sm text-slate-500 pt-4 border-t border-slate-200">
		<p>BodyMetrics Viewer es una versión simplificada de la aplicación profesional para dietistas.</p>
		<p class="mt-1">Si eres profesional de la salud, visita la <a href="/" class="text-indigo-600 font-semibold hover:underline">versión completa</a>.</p>
	</div>
</div>
