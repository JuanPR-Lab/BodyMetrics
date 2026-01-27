<script lang="ts">
	import { t } from 'svelte-i18n';
	import { formatText } from '$lib/utils/format';

	import {
		Rocket,
		Download,
		Monitor,
		Users,
		FolderOpen,
		AlertTriangle,
		Activity,
		Lock,
		RotateCw,
		CircleHelp,
		Info,
		Github,
		Coffee,
		Heart,
		Zap
	} from 'lucide-svelte';
</script>

<div class="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
	<div class="text-center pt-4 mb-10">
		<h2 class="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
			{$t('help.page_title')}
		</h2>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div
			class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-center gap-2"
		>
			<Rocket class="text-indigo-600" size={24} />
			<h3 class="font-bold text-indigo-800 text-lg">{$t('help.section_starting')}</h3>
		</div>
		<div class="p-5 sm:p-6 space-y-6 text-sm text-slate-600 leading-relaxed">
			<div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
				<div class="flex items-center gap-2 mb-3">
					<div class="bg-white p-1.5 rounded-md shadow-sm text-indigo-600 border border-slate-100">
						<Download size={18} />
					</div>
					<h4 class="font-bold text-slate-800 text-base">{$t('help.starting_installation')}</h4>
				</div>
				<div class="text-sm text-slate-600 leading-7 whitespace-pre-line pl-1">
					{@html formatText($t('help.starting_installation_text'))}
				</div>
			</div>

			<div>
				<h4 class="font-bold text-indigo-600 text-base mb-2">{$t('help.starting_first_steps')}</h4>
				<p class="whitespace-pre-line text-slate-700">
					{@html formatText($t('help.starting_first_steps_text'))}
				</p>
			</div>

			<div class="bg-indigo-50/80 border border-indigo-100 rounded-xl p-5">
				<div class="flex items-center gap-2 mb-2">
					<div class="bg-white p-1.5 rounded-full shadow-sm text-indigo-600">
						<Monitor size={16} />
					</div>
					<h4 class="font-bold text-indigo-900 text-base">{$t('help.starting_requirements')}</h4>
				</div>
				<div class="text-sm text-indigo-800 leading-relaxed pl-1">
					{@html formatText($t('help.starting_requirements_text'))}
				</div>
			</div>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div
			class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-center gap-2"
		>
			<Users class="text-indigo-600" size={24} />
			<h3 class="font-bold text-indigo-800 text-lg">{$t('help.section_clients_buttons')}</h3>
		</div>
		<div class="p-5 sm:p-6 space-y-6 text-sm text-slate-600">
			<p class="whitespace-pre-line leading-relaxed">
				{@html formatText($t('help.clients_buttons_logic_text'))}
			</p>

			<div class="bg-amber-50 border border-amber-200 rounded-xl p-5">
				<div class="flex items-center gap-3 mb-3">
					<div class="bg-white p-2 rounded-full shadow-sm text-amber-600 flex-shrink-0">
						<AlertTriangle size={20} />
					</div>
					<h4 class="font-bold text-amber-900 text-base leading-tight">
						{$t('help.clients_infinite_trick')}
					</h4>
				</div>
				<div class="text-sm text-amber-900/90 leading-relaxed space-y-2 pl-1">
					{@html formatText($t('help.clients_infinite_trick_text'))}
				</div>
			</div>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div
			class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-center gap-2"
		>
			<FolderOpen class="text-indigo-600" size={24} />
			<h3 class="font-bold text-indigo-800 text-lg">{$t('help.section_files')}</h3>
		</div>
		<div class="p-5 sm:p-6 space-y-6 text-sm text-slate-600 leading-relaxed">
			<div>
				<h4 class="font-bold text-indigo-600 text-base mb-2">{$t('help.files_structure')}</h4>
				<p class="whitespace-pre-line text-slate-700">
					{@html formatText($t('help.files_structure_text'))}
				</p>
			</div>

			<div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
				<h4
					class="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider flex items-center gap-2"
				>
					<FolderOpen size={14} />
					{$t('help.files_where')}
				</h4>
				<p class="whitespace-pre-line text-sm text-slate-600">
					{@html formatText($t('help.files_where_text'))}
				</p>
			</div>

			<div class="bg-amber-50 border border-amber-200 rounded-xl p-5">
				<div class="flex items-center gap-3 mb-3">
					<div class="bg-white p-2 rounded-full shadow-sm text-amber-600 flex-shrink-0">
						<AlertTriangle size={20} />
					</div>
					<h4 class="font-bold text-amber-900 text-base leading-tight">
						{$t('help.files_troubleshooting')}
					</h4>
				</div>
				<div class="text-sm text-amber-900/90 leading-relaxed pl-1">
					{@html formatText($t('help.files_troubleshooting_text'))}
				</div>
			</div>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div
			class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-center gap-2"
		>
			<Activity class="text-indigo-600" size={24} />
			<h3 class="font-bold text-indigo-800 text-lg">{$t('help.section_interpretation')}</h3>
		</div>
		<div class="p-6 text-sm text-slate-600 leading-relaxed">
			<p class="whitespace-pre-line">{@html formatText($t('help.interpretation_text'))}</p>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div
			class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-center gap-2"
		>
			<Lock class="text-indigo-600" size={24} />
			<h3 class="font-bold text-indigo-800 text-lg">{$t('help.section_security')}</h3>
		</div>
		<div class="p-5 sm:p-6 space-y-6 text-sm text-slate-500">
			<div>
				<h4 class="font-bold text-indigo-600 text-base mb-2">
					{$t('help.security_transparency_title')}
				</h4>
				<p class="whitespace-pre-line text-slate-600 leading-relaxed">
					{@html formatText($t('help.security_transparency_text'))}
				</p>
			</div>
			<div>
				<h4 class="font-bold text-indigo-600 text-base mb-2">{$t('help.security_local_data')}</h4>
				<p class="whitespace-pre-line text-slate-600 leading-relaxed">
					{@html formatText($t('help.security_local_data_text'))}
				</p>
			</div>
			<div class="space-y-2 text-slate-600">
				<p class="whitespace-pre-line leading-relaxed">
					{@html formatText($t('help.security_link_text'))}
				</p>
				<p class="whitespace-pre-line leading-relaxed">
					{@html formatText($t('help.security_backups_text'))}
				</p>
			</div>

			<div class="bg-amber-50 border border-amber-200 rounded-xl p-5">
				<div class="flex items-center gap-3 mb-3">
					<div class="bg-white p-2 rounded-full shadow-sm text-amber-600 flex-shrink-0">
						<RotateCw size={20} />
					</div>
					<h4 class="font-bold text-amber-900 text-base leading-tight">
						{$t('help.security_manual_sync_title')}
					</h4>
				</div>
				<div class="text-sm text-amber-900/90 leading-relaxed pl-1">
					{@html formatText($t('help.security_manual_sync_text'))}
				</div>
			</div>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div
			class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-center gap-2"
		>
			<Monitor class="text-indigo-600" size={24} />
			<h3 class="font-bold text-indigo-800 text-lg">{$t('help.viewer_section_title')}</h3>
		</div>
		<div class="p-6 text-sm text-slate-600 leading-relaxed">
			<h4 class="font-bold text-indigo-600 text-base mb-2">{$t('help.viewer_title')}</h4>
			<p class="whitespace-pre-line">{@html formatText($t('help.viewer_text'))}</p>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
		<div
			class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-center gap-2"
		>
			<CircleHelp class="text-indigo-600" size={24} />
			<h3 class="font-bold text-indigo-800 text-lg">{$t('help.section_troubleshooting')}</h3>
		</div>
		<div class="p-6 space-y-6 text-sm text-slate-500">
			<div>
				<h4 class="font-bold text-indigo-600 text-base mb-1">
					{$t('help.troubleshooting_which_file')}
				</h4>
				<div class="text-slate-600 leading-relaxed">
					{@html formatText($t('help.troubleshooting_which_file_text'))}
				</div>
			</div>
			<div class="border-t border-slate-100 pt-4">
				<h4 class="font-bold text-indigo-600 text-base mb-1">
					{$t('help.troubleshooting_missing_data')}
				</h4>
				<div class="text-slate-600 leading-relaxed">
					{@html formatText($t('help.troubleshooting_missing_data_text'))}
				</div>
			</div>
			<div class="border-t border-slate-100 pt-4">
				<h4 class="font-bold text-indigo-600 text-base mb-1">{$t('help.troubleshooting_date')}</h4>
				<div class="text-slate-600 leading-relaxed">
					{@html formatText($t('help.troubleshooting_date_text'))}
				</div>
			</div>
		</div>
	</div>

	<div
		class="bg-gradient-to-br from-[#FF5E5B] to-[#FF8C8C] rounded-xl shadow-md text-white overflow-hidden"
	>
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

	<div
		class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-center p-6"
	>
		<div class="flex justify-center mb-4 text-indigo-600">
			<Info size={32} />
		</div>
		<h3 class="text-xl font-bold text-slate-800 mb-2">{$t('help.section_about')}</h3>
		<p class="text-sm text-slate-600 mx-auto mb-6">{$t('help.about_description')}</p>

		<div
			class="grid grid-cols-3 gap-0 text-xs text-slate-500 mb-8 border-t border-b border-slate-100 py-3 mx-auto divide-x divide-slate-100"
		>
			<div class="px-1 flex flex-col justify-center">
				<span class="block font-bold text-slate-700 mb-1">{$t('help.about_lbl_version')}</span>
				{$t('help.about_val_version')}
			</div>
			<div class="px-1 flex flex-col justify-center">
				<span class="block font-bold text-slate-700 mb-1">{$t('help.about_lbl_license')}</span>
				{$t('help.about_val_license')}
			</div>
			<div class="px-1 flex flex-col justify-center">
				<span class="block font-bold text-slate-700 mb-1 truncate w-full"
					>{$t('help.about_lbl_dev')}</span
				>
				<span class="truncate w-full">JuanPR-Lab</span>
			</div>
		</div>

		<a
			href="https://github.com/JuanPR-Lab/BodyMetrics"
			target="_blank"
			rel="noreferrer"
			class="inline-flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors"
		>
			<Github size={18} />
			{$t('help.about_github_btn')}
		</a>

		<p class="mt-6 text-[9px] text-slate-400 uppercase tracking-wide">
			{$t('help.about_disclaimer')}
		</p>
	</div>
</div>
