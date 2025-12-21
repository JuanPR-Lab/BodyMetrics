<script lang="ts">
    import type { HTMLButtonAttributes } from 'svelte/elements';
    import type { Snippet } from 'svelte';

    // Extendemos los atributos estándar de HTML para aceptar onclick, class, etc.
    interface Props extends HTMLButtonAttributes {
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        size?: 'sm' | 'md' | 'lg';
        fullWidth?: boolean;
        children?: Snippet;
    }

    // Recuperamos las props y el resto lo guardamos en 'rest'
    let {
        variant = 'primary',
        size = 'md',
        fullWidth = false,
        children,
        class: className = '',
        ...rest
    }: Props = $props();

    const baseStyles =
        'inline-flex items-center justify-center font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm',
        secondary:
            'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200',
        danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-red-500 shadow-sm',
        ghost: 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };
</script>

<button
    class="{baseStyles} {variants[variant]} {sizes[size]} {fullWidth ? 'w-full' : ''} {className}"
    {...rest}
>
    {#if children}
        {@render children()}
    {/if}
</button>