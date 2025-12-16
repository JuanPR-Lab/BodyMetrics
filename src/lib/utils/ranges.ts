/**
 * ranges.ts
 * Logic to determine health status colors/labels based on Tanita Manual standards.
 * Calibrated with exact user values (Integers) for ages 5-99.
 */

export type HealthStatus = 'under' | 'healthy' | 'over' | 'obese' | 'excess' | 'unknown';

export const STATUS_COLORS: Record<HealthStatus, string> = {
  under: 'text-blue-500 bg-blue-50',       // Under (Blue)
  healthy: 'text-emerald-500 bg-emerald-50', // Healthy (Green)
  over: 'text-amber-500 bg-amber-50',      // High/Overweight (Yellow)
  obese: 'text-rose-500 bg-rose-50',       // Obese (Red)
  excess: 'text-rose-500 bg-rose-50',      // Excess (Red) - For Visceral
  unknown: 'text-slate-400 bg-slate-100'
};

// SPECIFIC TABLE (5-19 YEARS)
// Values: [Min -> Healthy, Healthy Limit -> Over, Over Limit -> Obese]
// Example Female 5 years (13, 21, 25): <13 Under, 13-20 Healthy, 21-24 Over, >=25 Obese.
const SPECIFIC_FAT_RANGES = {
  female: {
    5:  { min: 13, healthyLimit: 21, overLimit: 25 },
    6:  { min: 13, healthyLimit: 22, overLimit: 26 },
    7:  { min: 14, healthyLimit: 24, overLimit: 28 },
    8:  { min: 14, healthyLimit: 25, overLimit: 29 },
    9:  { min: 15, healthyLimit: 26, overLimit: 30 },
    10: { min: 15, healthyLimit: 27, overLimit: 31 },
    11: { min: 15, healthyLimit: 28, overLimit: 32 },
    12: { min: 15, healthyLimit: 28, overLimit: 32 },
    13: { min: 15, healthyLimit: 28, overLimit: 32 },
    14: { min: 15, healthyLimit: 29, overLimit: 33 },
    15: { min: 15, healthyLimit: 29, overLimit: 33 },
    16: { min: 15, healthyLimit: 29, overLimit: 33 },
    17: { min: 15, healthyLimit: 29, overLimit: 34 },
    18: { min: 16, healthyLimit: 30, overLimit: 35 },
    19: { min: 18, healthyLimit: 31, overLimit: 36 }
  },
  male: {
    5:  { min: 11, healthyLimit: 18, overLimit: 22 },
    6:  { min: 11, healthyLimit: 19, overLimit: 23 },
    7:  { min: 12, healthyLimit: 19, overLimit: 24 },
    8:  { min: 12, healthyLimit: 20, overLimit: 25 },
    9:  { min: 12, healthyLimit: 21, overLimit: 26 },
    10: { min: 12, healthyLimit: 22, overLimit: 27 },
    11: { min: 12, healthyLimit: 22, overLimit: 27 },
    12: { min: 11, healthyLimit: 22, overLimit: 27 },
    13: { min: 11, healthyLimit: 21, overLimit: 26 },
    14: { min: 10, healthyLimit: 20, overLimit: 25 },
    15: { min: 9,  healthyLimit: 20, overLimit: 24 },
    16: { min: 9,  healthyLimit: 19, overLimit: 23 },
    17: { min: 9,  healthyLimit: 19, overLimit: 23 },
    18: { min: 9,  healthyLimit: 19, overLimit: 23 },
    19: { min: 8,  healthyLimit: 19, overLimit: 23 }
  }
};

/**
 * 1. VISCERAL FAT RATING
 * 1-12: Healthy (Green)
 * 13-59: Excess (Red)
 */
export const getVisceralFatStatus = (rating: number): HealthStatus => {
  if (rating >= 1 && rating <= 12) return 'healthy';
  if (rating >= 13) return 'excess'; 
  return 'unknown';
};

/**
 * 2. BODY FAT PERCENTAGE
 * Exact Logic by Age (5-99 years)
 */
export const getBodyFatStatus = (fat: number, gender: 'male' | 'female', age: number): HealthStatus => {
  
  const safeAge = Math.floor(age);

  // --- SPECIAL CASE: UNDER 5 YEARS ---
  if (safeAge < 5) return 'unknown';

  // --- AGE 5 TO 19 (Year-by-Year Specific Table) ---
  if (safeAge <= 19) {
    // @ts-ignore
    const ranges = SPECIFIC_FAT_RANGES[gender][safeAge];
    
    // Fallback to 19 if range is missing
    const safeRanges = ranges || SPECIFIC_FAT_RANGES[gender][19];

    if (fat < safeRanges.min) return 'under';
    if (fat < safeRanges.healthyLimit) return 'healthy';
    if (fat < safeRanges.overLimit) return 'over';
    return 'obese';
  }

  // --- ADULTS (20-99 YEARS) ---
  if (gender === 'female') {
    // Female 20-39
    if (safeAge < 40) {
      if (fat < 20) return 'under';
      if (fat < 32) return 'healthy';
      if (fat < 38) return 'over';
      return 'obese';
    } 
    // Female 40-59
    else if (safeAge < 60) {
      if (fat < 22) return 'under';
      if (fat < 33) return 'healthy';
      if (fat < 39) return 'over';
      return 'obese';
    } 
    // Female 60-99
    else {
      if (fat < 23) return 'under';
      if (fat < 35) return 'healthy';
      if (fat < 41) return 'over';
      return 'obese';
    }

  } else {
    // Male 20-39
    if (safeAge < 40) {
      if (fat < 7) return 'under';
      if (fat < 19) return 'healthy';
      if (fat < 24) return 'over';
      return 'obese';
    } 
    // Male 40-59
    else if (safeAge < 60) {
      if (fat < 10) return 'under';
      if (fat < 21) return 'healthy';
      if (fat < 27) return 'over';
      return 'obese';
    } 
    // Male 60-99
    else {
      if (fat < 12) return 'under';
      if (fat < 24) return 'healthy';
      if (fat < 29) return 'over';
      return 'obese';
    }
  }
};

/**
 * 3. BMI (Body Mass Index)
 */
export const getBMIStatus = (bmi: number): HealthStatus => {
  if (bmi < 18.5) return 'under';
  if (bmi <= 25) return 'healthy';
  if (bmi <= 30) return 'over';
  return 'obese';
};

/**
 * 4. METABOLIC AGE
 */
export const getMetabolicAgeStatus = (metabolicAge: number, actualAge: number): HealthStatus => {
  if (metabolicAge <= actualAge) return 'healthy';
  return 'over';
};