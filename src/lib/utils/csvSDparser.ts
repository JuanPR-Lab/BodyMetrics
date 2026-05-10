import Papa from 'papaparse';

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

const cleanStr = (val: any) => String(val || '').trim();
const safeFloat = (val: any) => {
	const n = parseFloat(val);
	return isNaN(n) ? 0 : n;
};
const safeInt = (val: any) => {
	const n = parseInt(val, 10);
	return isNaN(n) ? 0 : n;
};

// Dictionary of keys we look for in the row (Hardware specific codes)
const KEYS = {
	DATE: 'DT',
	TIME: 'Ti',
	MODEL: 'MO',
	GENDER: 'GE',
	AGE: 'AG',
	HEIGHT: 'Hm',
	ACTIVITY: 'AL',
	WEIGHT: 'Wk',
	BMI: 'MI',
	FAT_TOTAL: 'FW',
	MUSCLE_TOTAL: 'mW',
	BONE: 'bW',
	VISCERAL: 'IF',
	WATER: 'ww',
	META_AGE: 'rA',
	DCI: 'rD',
	FAT_R_ARM: 'Fr',
	FAT_L_ARM: 'Fl',
	FAT_R_LEG: 'FR',
	FAT_L_LEG: 'FL',
	FAT_TRUNK: 'FT',
	MUS_R_ARM: 'mr',
	MUS_L_ARM: 'ml',
	MUS_R_LEG: 'mR',
	MUS_L_LEG: 'mL',
	MUS_TRUNK: 'mT'
};

  const parseSingleFile = (file: File): Promise<BioMetricRecord[]> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const records: BioMetricRecord[] = [];
          // Determine if file is manual export by checking first cell of first row
          const firstRow = results.data[0] as any[];
          const isManual = Array.isArray(firstRow) && typeof firstRow[0] === 'string' && firstRow[0].startsWith('BM>');

          // Fixed column order matching exporter (model excluded)
          const manualOrder: (keyof BioMetricRecord)[] = [
            'date', 'time', 'weight', 'bmi', 'bodyFat', 'muscleMass', 'visceralFat', 'waterPercentage',
            'boneMass', 'metabolicAge', 'dci', 'fatTrunk', 'fatArmR', 'fatArmL', 'fatLegR', 'fatLegL',
            'muscleTrunk', 'muscleArmR', 'muscleArmL', 'muscleLegR', 'muscleLegL'
          ];

          results.data.forEach((row: any) => {
            if (!Array.isArray(row) || row.length < 5) return;

            if (isManual) {
              // Manual parser: positional mapping with proper cleaning
              // Clean first cell and remove possible "BM>" prefix
              let firstCell = cleanStr(row[0]);
              // Header rows start with the magic string "BM>" – skip them
              if (firstCell.startsWith('BM>')) return;
              // Remove the prefix if present (e.g., "BM>29/05/2026")
              const dateVal = firstCell.replace('BM>', '').trim();
              const timeVal = cleanStr(row[1]);

              // Helper to parse numeric cells, returning null for empty values
              const parseNum = (cell: any) => {
                const str = cleanStr(cell);
                if (str === '') return null;
                const normalized = str.replace(',', '.');
                const n = parseFloat(normalized);
                return isNaN(n) ? null : n;
              };

              // Map the remaining columns (starting at index 2) using the defined order
              const [weightVal, bmiVal, bodyFatVal, muscleMassVal, visceralVal, waterVal,
                boneVal, metabolicAgeVal, dciVal, fatTrunkVal, fatArmRVal, fatArmLVal,
                fatLegRVal, fatLegLVal, muscleTrunkVal, muscleArmRVal, muscleArmLVal,
                muscleLegRVal, muscleLegLVal] = [
                parseNum(row[2]), parseNum(row[3]), parseNum(row[4]), parseNum(row[5]),
                parseNum(row[6]), parseNum(row[7]), parseNum(row[8]), parseNum(row[9]),
                parseNum(row[10]), parseNum(row[11]), parseNum(row[12]), parseNum(row[13]),
                parseNum(row[14]), parseNum(row[15]), parseNum(row[16]), parseNum(row[17]),
                parseNum(row[18]), parseNum(row[19]), parseNum(row[20])
              ];

              if (!dateVal || weightVal === null) return;

              const record: BioMetricRecord = {
                id: `${dateVal}-${timeVal || '00:00'}`,
                date: dateVal,
                time: timeVal || '00:00',
                model: 'Manual-Export',
                gender: 'male', // default, manual files are language‑agnostic
                age: 0,
                height: 0,
                activityLevel: 0,
                weight: weightVal,
                bmi: bmiVal,
                bodyFat: bodyFatVal,
                muscleMass: muscleMassVal,
                boneMass: boneVal,
                visceralFat: visceralVal,
                waterPercentage: waterVal,
                metabolicAge: metabolicAgeVal,
                dci: dciVal,
                fatTrunk: fatTrunkVal,
                fatArmR: fatArmRVal,
                fatArmL: fatArmLVal,
                fatLegR: fatLegRVal,
                fatLegL: fatLegLVal,
                muscleTrunk: muscleTrunkVal,
                muscleArmR: muscleArmRVal,
                muscleArmL: muscleArmLVal,
                muscleLegR: muscleLegRVal,
                muscleLegL: muscleLegLVal,
                sourceFile: file.name
              };
              records.push(record);
            } else {
              // Existing Tanita parser (key‑based)
              const getValue = (key: string): string | null => {
                const idx = row.findIndex((cell) => cleanStr(cell) === key);
                if (idx !== -1 && idx + 1 < row.length) {
                  return cleanStr(row[idx + 1]);
                }
                return null;
              };

              const dateVal = getValue(KEYS.DATE);
              const timeVal = getValue(KEYS.TIME);
              const weightVal = getValue(KEYS.WEIGHT);
              if (!dateVal || !weightVal) return;

              records.push({
                id: `${dateVal}-${timeVal}`,
                date: dateVal,
                time: timeVal || '00:00',
                model: getValue(KEYS.MODEL) || 'Generic-Scale',
                gender: getValue(KEYS.GENDER) === '2' ? 'female' : 'male',
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
                sourceFile: file.name
              });
            }
          });
          resolve(records);
        },
        error: () => resolve([])
      });
    });
  };

// Renamed function to be generic
export const parseScaleFiles = async (files: FileList | File[]): Promise<BioMetricRecord[]> => {
	const fileArray = Array.from(files);
	const allPromises = fileArray.map((file) => parseSingleFile(file));
	const results = await Promise.all(allPromises);

	const flatRecords = results.flat();

	// Deduplicate by ID (Date+Time)
	const uniqueRecords = Array.from(new Map(flatRecords.map((item) => [item.id, item])).values());

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
