import { browser } from '$app/environment';

/**
 * Global application settings using Svelte 5 Runes.
 * This object is shared across all components.
 */
export const settings = $state({
    // Default value
    unit: 'kg' as 'kg' | 'lb' | 'st-lb',

    /**
     * Updates the unit and persists it to localStorage
     */
    setUnit(newUnit: 'kg' | 'lb' | 'st-lb') {
        console.log("Setting unit to:", newUnit); // Chivato para la consola
        this.unit = newUnit;
        
        if (browser) {
            localStorage.setItem('bm_user_unit', newUnit);
        }
    }
});

// Initialize state from localStorage (Client-side only)
if (browser) {
    const saved = localStorage.getItem('bm_user_unit');
    if (saved) {
        settings.unit = saved as any;
    }
}