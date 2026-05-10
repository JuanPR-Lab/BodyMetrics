/**
 * Core types for BodyMetrics application
 */

export interface Client {
	id: string; // Unique Identifier (e.g., "cli001")
	alias: string; // Display name or reference code (e.g., "Ref: 123")
	notes?: string; // Private notes for the dietitian
	createdAt: number; // Timestamp
}

export interface BioMetricRecord {
	id: string;
	date: string;
	time: string;
	model: string;
	gender: 'male' | 'female';
	age: number;
	height: number;
	activityLevel: number;
	weight: number; // Wk
	bmi: number | null; // MI
	bodyFat: number | null; // FW
	muscleMass: number | null; // mW
	boneMass: number | null; // bW
	visceralFat: number | null; // IF
	waterPercentage: number | null; // ww
	metabolicAge: number | null; // rA
	dci: number | null; // rD

	// Segmentals
	fatArmR: number | null; // Fr
	fatArmL: number | null; // Fl
	fatLegR: number | null; // FR
	fatLegL: number | null; // FL
	fatTrunk: number | null; // FT
	muscleArmR: number | null; // mr
	muscleArmL: number | null; // ml
	muscleLegR: number | null; // mR
	muscleLegL: number | null; // mL
	muscleTrunk: number | null; // mT

	// NEW PROPERTY: Source file name
	sourceFile: string;
}
