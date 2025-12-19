import { register, init, getLocaleFromNavigator } from 'svelte-i18n';
import { browser } from '$app/environment';

register('en', () => import('$lib/locales/en.json'));
register('es', () => import('$lib/locales/es.json'));

init({
	fallbackLocale: 'en',
	initialLocale: browser ? getLocaleFromNavigator() || 'es' : 'es'
});
