/**
 * Formats raw text into HTML-ready strings.
 * Supports basic Markdown-like syntax:
 * - **bold** -> <strong>
 * - `code` -> <code>
 * - \n -> <br>
 */
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

/**
 * Supported weight units for Tanita scales
 */
export type WeightUnit = 'kg' | 'lb' | 'st-lb';

/**
 * Converts and formats weight values from Kilograms (base unit) 
 * to the user's preferred unit system.
 * * @param kg - The weight value in kilograms (from Tanita SD card)
 * @param unit - Target unit: 'kg', 'lb', or 'st-lb'
 * @returns A formatted string with the converted value
 */
export function formatWeight(kg: number | undefined | null, unit: WeightUnit = 'kg'): string {
    // Handle empty or invalid data
    if (kg === undefined || kg === null || isNaN(kg) || kg === 0) return '--';

    const KG_TO_LB = 2.20462;

    switch (unit) {
        case 'lb':
            return (kg * KG_TO_LB).toFixed(1);

        case 'st-lb': {
            const totalLbs = kg * KG_TO_LB;
            const stones = Math.floor(totalLbs / 14);
            const lbs = (totalLbs % 14).toFixed(1);
            // Returns format like "11st 7.5lb"
            return `${stones}st ${lbs}lb`;
        }

        case 'kg':
        default:
            return kg.toFixed(1);
    }
}