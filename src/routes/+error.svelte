<script>
	import { page } from '$app/stores';
	import { AlertTriangle } from 'lucide-svelte';

	// Variables reactivas seguras:
	// Si $page.status no existe, muestra 'Error'.
	// Si $page.error.message no existe, muestra el texto genérico.
	$: errorCode = $page.status || 'Error';
	$: errorMessage = $page.error?.message || 'Algo ha salido mal / Something went wrong';
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
	<div class="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center border border-slate-100">
		<div class="mx-auto flex items-center justify-center bg-indigo-50 w-20 h-20 rounded-full mb-6">
			<AlertTriangle class="h-10 w-10 text-indigo-600" strokeWidth={2} />
		</div>

		<h1 class="text-5xl font-black text-slate-800 mb-2 tracking-tight">{errorCode}</h1>

		<p class="text-lg text-slate-500 mb-8 font-medium leading-relaxed">
			{errorMessage}
		</p>

		<button
			class="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-95"
			on:click={() => (window.location.href = '/')}
		>
			Volver al Inicio
		</button>
	</div>
</div>