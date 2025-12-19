import {
	STATUS_COLORS,
	getBodyFatStatus,
	getVisceralFatStatus,
	getBMIStatus,
	getMetabolicAgeStatus
} from './ranges';
import type { BioMetricRecord } from './csvSDparser';

export const CHART_OPTIONS = [
	{ key: 'weight', label: 'metrics.weight', color: '#64748b', unitKey: 'kg' }, // Slate-500
	{ key: 'bmi', label: 'metrics.bmi', color: '#ec4899', unitKey: '' }, // Pink-500
	{ key: 'bodyFat', label: 'metrics.body_fat', color: '#f59e0b', unitKey: 'percent' },
	{ key: 'muscleMass', label: 'metrics.muscle_mass', color: '#6366f1', unitKey: 'kg' },
	{ key: 'boneMass', label: 'metrics.bone_mass', color: '#9ca3af', unitKey: 'kg' },
	{ key: 'dci', label: 'metrics.dci', color: '#10b981', unitKey: 'kcal' },
	{ key: 'metabolicAge', label: 'metrics.metabolic_age', color: '#a855f7', unitKey: 'years' },
	{ key: 'visceralFat', label: 'metrics.visceral_fat', color: '#d97706', unitKey: 'rating' }
] as const;

/**
 * Determine the status color class for a given metric type and value.
 * Requires the full record for gender/age context.
 */
export function getStatusColor(type: string, val: number, record?: BioMetricRecord | null): string {
	if (!record) return STATUS_COLORS.unknown;
	try {
		if (type === 'fat') return STATUS_COLORS[getBodyFatStatus(val, record.gender, record.age)];
		if (type === 'visceral') return STATUS_COLORS[getVisceralFatStatus(val)];
		if (type === 'bmi') return STATUS_COLORS[getBMIStatus(val)];
		if (type === 'meta') return STATUS_COLORS[getMetabolicAgeStatus(val, record.age)];
	} catch (e) {
		return STATUS_COLORS.unknown;
	}
	return STATUS_COLORS.unknown;
}
