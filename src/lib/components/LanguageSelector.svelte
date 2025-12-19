<script lang="ts">
	import { onMount } from 'svelte';
	import { locale, t } from 'svelte-i18n';
	import { ChevronDown } from 'lucide-svelte';

	// Language configuration - easy to extend
	const LANGUAGES = [
		{ code: 'en', labelKey: 'languages.en' },
		{ code: 'es', labelKey: 'languages.es' }
	];

	// Current language state
	let currentLanguage: string = 'en';
	let isOpen: boolean = false;

	// Auto-detect browser language on mount
	onMount(() => {
		const savedLocale = localStorage.getItem('user_locale');
		if (savedLocale && LANGUAGES.some(lang => lang.code === savedLocale)) {
			currentLanguage = savedLocale;
			locale.set(savedLocale);
		} else {
			const browserLang = navigator.language || 'en';
			// Check if browser language starts with 'es' (any Spanish variant)
			if (browserLang.toLowerCase().startsWith('es')) {
				currentLanguage = 'es';
			} else {
				currentLanguage = 'en';
			}
			locale.set(currentLanguage);
		}
	});

	// Handle language change
	function handleLanguageChange(newLang: string) {
		currentLanguage = newLang;
		locale.set(newLang);
		localStorage.setItem('user_locale', newLang);
		isOpen = false; // Close the dropdown
	}

	// Toggle dropdown visibility
	function toggleDropdown() {
		isOpen = !isOpen;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: Event) {
		if (isOpen) {
			const target = event.target as HTMLElement;
			const dropdown = target.closest('.language-selector');
			if (!dropdown) {
				isOpen = false;
			}
		}
	}

	// Add event listener for closing dropdown when clicking outside
	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="language-selector relative">
	<button
		on:click={toggleDropdown}
		class="flex items-center gap-1 cursor-pointer hover:text-indigo-600 transition-colors"
		aria-label="Change language"
	>
		<span class="font-medium text-slate-700">
			{currentLanguage.toUpperCase()}
		</span>
		<ChevronDown
			size={16}
			class="text-slate-500 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
		/>
	</button>

	{#if isOpen}
		<ul
			class="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-md py-1 min-w-[120px] z-50 border border-slate-200"
			role="menu"
		>
			{#each LANGUAGES as language}
				<li role="none">
					<button
						on:click={() => handleLanguageChange(language.code)}
						class="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors {currentLanguage === language.code ? 'bg-indigo-50 text-indigo-600 font-medium' : ''}"
						role="menuitem"
					>
						{$t(language.labelKey)}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>