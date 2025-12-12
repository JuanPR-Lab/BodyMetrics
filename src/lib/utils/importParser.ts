// src/lib/utils/importParser.ts
import Papa from 'papaparse';
import type { BioMetricRecord } from './csvSDparser';

/**
 * Mappings from CSV Headers (in local language) back to Internal Keys.
 * Since exports depend on user language, we rely on Index Order as a fallback 
 * or we can try to normalize.
 * * STRATEGY: Since export order is strict (defined in exporters.ts), 
 * we will use INDEX-BASED parsing to be language-agnostic.
 */
const KEY_ORDER: (keyof BioMetricRecord)[] = [
    'date', 'time', 'model', 
    'weight', 'bmi', 'bodyFat', 'muscleMass', 'visceralFat', 'waterPercentage', 
    'boneMass', 'metabolicAge', 'dci',
    'fatTrunk', 'fatArmR', 'fatArmL', 'fatLegR', 'fatLegL',
    'muscleTrunk', 'muscleArmR', 'muscleArmL', 'muscleLegR', 'muscleLegL'
];

export const parseClientCSV = (file: File): Promise<BioMetricRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      delimiter: ";", // Explicitly expect Semicolon
      header: true,   // We skip the header row manually to ignore language differences
      skipEmptyLines: true,
      encoding: "UTF-8", 
      complete: (results) => {
        try {
          const parsedData: BioMetricRecord[] = [];

          // results.data is an array of Objects (keyed by header name).
          // But since header names vary by language, we should use `results.meta.fields` 
          // to map columns by index if possible, OR parse as array (header: false).
          
          // Let's restart parsing as Array to be SAFE against language changes
          // Use a small internal recursive hack or just re-config:
          // (To keep it simple, I assume we stick to the code below)
          
          const rawRows = results.data as Record<string, string>[];
          const headers = results.meta.fields || [];

          // Validate Column Count matches roughly
          if (headers.length < 15) {
            throw new Error("Invalid Format: Not enough columns.");
          }

          for (const row of rawRows) {
            const newRecord: any = {};
            
            // Map by Index order defined in KEY_ORDER
            KEY_ORDER.forEach((key, index) => {
              const csvKey = headers[index]; // Get the actual header name (e.g. "Peso", "Weight")
              let rawVal = row[csvKey];

              if (!rawVal) return;

              // CLEANUP: 
              // 1. Remove quotes if Papa didn't
              // 2. Swap European Comma to Dot
              rawVal = rawVal.replace(/"/g, '').trim(); 
              
              if (key === 'date' || key === 'time' || key === 'model') {
                 newRecord[key] = rawVal;
              } else {
                 // Numeric conversion
                 const numStr = rawVal.replace(',', '.');
                 const val = parseFloat(numStr);
                 newRecord[key] = isNaN(val) ? 0 : val;
              }
            });

            if (newRecord.date && newRecord.weight) {
                parsedData.push(newRecord);
            }
          }
          
          resolve(parsedData);
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err)
    });
  });
};