import Papa from 'papaparse';

export interface TanitaRecord {
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
}

const cleanStr = (val: any) => String(val || '').trim();
const safeFloat = (val: any) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};
const safeInt = (val: any) => {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
};

// Dictionary of keys we look for in the row
const KEYS = {
  DATE: 'DT', TIME: 'Ti', MODEL: 'MO', GENDER: 'GE', AGE: 'AG', HEIGHT: 'Hm', ACTIVITY: 'AL',
  WEIGHT: 'Wk', BMI: 'MI', FAT_TOTAL: 'FW', MUSCLE_TOTAL: 'mW', BONE: 'bW', VISCERAL: 'IF',
  WATER: 'ww', META_AGE: 'rA', DCI: 'rD',
  FAT_R_ARM: 'Fr', FAT_L_ARM: 'Fl', FAT_R_LEG: 'FR', FAT_L_LEG: 'FL', FAT_TRUNK: 'FT',
  MUS_R_ARM: 'mr', MUS_L_ARM: 'ml', MUS_R_LEG: 'mR', MUS_L_LEG: 'mL', MUS_TRUNK: 'mT'
};

const parseSingleFile = (file: File): Promise<TanitaRecord[]> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false, // IMPORTANT: We read as raw array of arrays
      skipEmptyLines: true,
      complete: (results) => {
        const records: TanitaRecord[] = [];

        // Iterate over every row found in the CSV
        results.data.forEach((row: any[]) => {
          if (!Array.isArray(row) || row.length < 5) return;

          // Helper to find value by key in this specific row
          // Strategy: Find the index of the KEY (e.g. 'Wk'), then take the value at index + 1
          const getValue = (key: string): string | null => {
            const idx = row.findIndex(cell => cleanStr(cell) === key);
            if (idx !== -1 && idx + 1 < row.length) {
              return cleanStr(row[idx + 1]);
            }
            return null;
          };

          // Must have Date, Time and Weight to be valid
          const dateVal = getValue(KEYS.DATE);
          const timeVal = getValue(KEYS.TIME);
          const weightVal = getValue(KEYS.WEIGHT);

          if (!dateVal || !weightVal) return;

          // Construct record
          records.push({
            id: `${dateVal}-${timeVal}`,
            date: dateVal,
            time: timeVal || '00:00',
            model: getValue(KEYS.MODEL) || 'BC-601',
            gender: getValue(KEYS.GENDER) === '2' ? 'female' : 'male', // 1=Male, 2=Female
            age: safeInt(getValue(KEYS.AGE)),
            height: safeFloat(getValue(KEYS.HEIGHT)),
            activityLevel: safeInt(getValue(KEYS.ACTIVITY)),

            weight: safeFloat(weightVal),
            bmi: safeFloat(getValue(KEYS.BMI)),
            bodyFat: safeFloat(getValue(KEYS.FAT_TOTAL)),
            muscleMass: safeFloat(getValue(KEYS.MUSCLE_TOTAL)),
            boneMass: safeFloat(getValue(KEYS.BONE)),
            visceralFat: safeInt(getValue(KEYS.VISCERAL)),
            waterPercentage: safeFloat(getValue(KEYS.WATER)),
            metabolicAge: safeInt(getValue(KEYS.META_AGE)),
            dci: safeInt(getValue(KEYS.DCI)),

            // Segmentals
            fatArmR: safeFloat(getValue(KEYS.FAT_R_ARM)),
            fatArmL: safeFloat(getValue(KEYS.FAT_L_ARM)),
            fatLegR: safeFloat(getValue(KEYS.FAT_R_LEG)),
            fatLegL: safeFloat(getValue(KEYS.FAT_L_LEG)),
            fatTrunk: safeFloat(getValue(KEYS.FAT_TRUNK)),

            muscleArmR: safeFloat(getValue(KEYS.MUS_R_ARM)),
            muscleArmL: safeFloat(getValue(KEYS.MUS_L_ARM)),
            muscleLegR: safeFloat(getValue(KEYS.MUS_R_LEG)),
            muscleLegL: safeFloat(getValue(KEYS.MUS_L_LEG)),
            muscleTrunk: safeFloat(getValue(KEYS.MUS_TRUNK)),
          });
        });

        resolve(records);
      },
      error: () => resolve([])
    });
  });
};

export const parseTanitaFiles = async (files: FileList | File[]): Promise<TanitaRecord[]> => {
  const fileArray = Array.from(files);
  const allPromises = fileArray.map(file => parseSingleFile(file));
  const results = await Promise.all(allPromises);
  
  const flatRecords = results.flat();
  
  // Deduplicate by ID (Date+Time)
  const uniqueRecords = Array.from(new Map(flatRecords.map(item => [item.id, item])).values());

  // Sort by Date/Time Descending
  uniqueRecords.sort((a, b) => {
    // Parse DD/MM/YYYY
    const parseDate = (d: string, t: string) => {
      const parts = d.split('/');
      if (parts.length !== 3) return 0;
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${t}`).getTime();
    };
    return parseDate(b.date, b.time) - parseDate(a.date, a.time);
  });

  return uniqueRecords;
};