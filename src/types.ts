/**
 * Core types for BodyMetrics application
 */

export interface Client {
  id: string;        // Unique Identifier (e.g., "cli001")
  alias: string;     // Display name or reference code (e.g., "Ref: 123")
  notes?: string;    // Private notes for the dietitian
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
  weight: number;       // Wk
  bmi: number;          // MI
  bodyFat: number;      // FW
  muscleMass: number;   // mW
  boneMass: number;     // bW
  visceralFat: number;  // IF
  waterPercentage: number; // ww
  metabolicAge: number; // rA
  dci: number;          // rD
  
  // Segmentals
  fatArmR: number;      // Fr
  fatArmL: number;      // Fl
  fatLegR: number;      // FR
  fatLegL: number;      // FL
  fatTrunk: number;     // FT
  muscleArmR: number;   // mr
  muscleArmL: number;   // ml
  muscleLegR: number;   // mR
  muscleLegL: number;   // mL
  muscleTrunk: number;  // mT
  
  // NEW PROPERTY: Source file name
  sourceFile: string;
}