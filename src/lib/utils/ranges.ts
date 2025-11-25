/**
 * ranges.ts
 * Logic to determine health status colors/labels based on Tanita manual standards.
 */

// Health Status Types
export type HealthStatus = 'under' | 'healthy' | 'over' | 'obese' | 'unknown';

// Color Mapping for Tailwind CSS
export const STATUS_COLORS: Record<HealthStatus, string> = {
  under: 'text-blue-500 bg-blue-100',      // Underfat / Low
  healthy: 'text-green-500 bg-green-100',  // Healthy / Standard
  over: 'text-yellow-500 bg-yellow-100',   // Overfat / High
  obese: 'text-red-500 bg-red-100',        // Obese / Very High
  unknown: 'text-gray-400 bg-gray-100'
};

/**
 * 1. VISCERAL FAT RATING
 * Source: Manual Page 34 (ES) / 47 (NL) / 10 (EN)
 * Range 1-12: Healthy (0)
 * Range 13-59: Excess (+)
 */
export const getVisceralFatStatus = (rating: number): HealthStatus => {
  if (rating >= 1 && rating <= 12) return 'healthy';
  if (rating >= 13) return 'obese'; // Using 'obese' color for Danger/Excess
  return 'unknown';
};

/**
 * 2. BODY FAT PERCENTAGE
 * Source: Manual Page 33 (ES) - Charts for Age/Gender
 * Simplified logic based on standard healthy ranges (Bio-impedance standards)
 * Note: The manual provides complex age-specific charts. 
 * This is a simplified approximation for Adult Standard Mode.
 */
export const getBodyFatStatus = (fat: number, gender: 'male' | 'female', age: number): HealthStatus => {
  // Children logic (5-17) is complex charts, falling back to general rules or ignoring for MVP
  // Adult Logic (18-99) based on Manual charts visual approximation:
  
  if (gender === 'female') {
    // Female Ranges approx
    if (age < 40) {
      if (fat < 21) return 'under';
      if (fat < 33) return 'healthy';
      if (fat < 39) return 'over';
      return 'obese';
    } else {
      // Age 40+ ranges shift slightly higher
      if (fat < 23) return 'under';
      if (fat < 35) return 'healthy';
      if (fat < 40) return 'over';
      return 'obese';
    }
  } else {
    // Male Ranges approx
    if (age < 40) {
      if (fat < 8) return 'under';
      if (fat < 20) return 'healthy';
      if (fat < 25) return 'over';
      return 'obese';
    } else {
      // Age 40+
      if (fat < 11) return 'under';
      if (fat < 22) return 'healthy';
      if (fat < 28) return 'over';
      return 'obese';
    }
  }
};

/**
 * 3. TOTAL BODY WATER
 * Source: Manual Page 34 (ES)
 * Female: 45 to 60%
 * Male: 50 to 65%
 */
export const getWaterStatus = (water: number, gender: 'male' | 'female'): HealthStatus => {
  if (gender === 'female') {
    if (water < 45) return 'under';
    if (water <= 60) return 'healthy';
    return 'over'; // Technically high water isn't usually "bad" in this context, but fits the range logic
  } else {
    if (water < 50) return 'under';
    if (water <= 65) return 'healthy';
    return 'over';
  }
};

/**
 * 4. BMI (Body Mass Index)
 * Source: Manual Page 37 (ES) - WHO Guidelines
 * 18.5 - 25 is optimal
 */
export const getBMIStatus = (bmi: number): HealthStatus => {
  if (bmi < 18.5) return 'under';
  if (bmi <= 25) return 'healthy';
  if (bmi <= 30) return 'over';
  return 'obese';
};

/**
 * 5. BASAL METABOLIC RATE (Metabolic Age)
 * Source: Manual Page 35 (ES)
 * If Metabolic Age < Actual Age = Good (Healthy)
 * If Metabolic Age > Actual Age = Needs Improvement (Over)
 */
export const getMetabolicAgeStatus = (metabolicAge: number, actualAge: number): HealthStatus => {
  if (metabolicAge <= actualAge) return 'healthy';
  return 'over';
};

// Physique Rating (1-9) is descriptive, doesn't strictly need a "Health Status" color, 
// but could be mapped if desired. For now we treat it as neutral data.