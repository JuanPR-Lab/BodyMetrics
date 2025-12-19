export function formatText(text: string): string {
	if (!text) return '';
	return text
		.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-800">$1</strong>')
		.replace(
			/`(.*?)`/g,
			'<code class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-xs border border-indigo-100 font-bold">$1</code>'
		)
		.replace(/\n/g, '<br>');
}
