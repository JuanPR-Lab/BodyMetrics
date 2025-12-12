import type { BioMetricRecord } from './csvSDparser';

// Helper: Download blob logic
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper: Get YYYY-MM-DD string
const getTodayStr = () => new Date().toISOString().split('T')[0];

/**
 * EXPORT 1: Client Data (CSV)
 * optimized for Excel/LibreOffice (European Format).
 */
export const exportToCSV = (
  data: BioMetricRecord[], 
  headersMap: Record<string, string>, 
  clientName: string = 'Client'
) => {
  if (!data || data.length === 0) return;

  // Logic: Sanitize filename
  const cleanName = clientName.replace(/[^a-z0-9]/gi, '_');
  const filename = `BodyMetrics_${cleanName}_${getTodayStr()}.csv`;

  // 1. Define strict column order
  const columns: (keyof BioMetricRecord)[] = [
    'date', 'time', 'model', 
    'weight', 'bmi', 'bodyFat', 'muscleMass', 'visceralFat', 'waterPercentage', 
    'boneMass', 'metabolicAge', 'dci',
    'fatTrunk', 'fatArmR', 'fatArmL', 'fatLegR', 'fatLegL',
    'muscleTrunk', 'muscleArmR', 'muscleArmL', 'muscleLegR', 'muscleLegL'
  ];

  // 2. Build Header Row (Quoted & Semicolon separated)
  const headerRow = columns.map(col => {
    // Fallback to internal key if translation is missing
    const label = headersMap[col] || col; 
    return `"${String(label).replace(/"/g, '""')}"`;
  }).join(';');

  // 3. Build Data Rows
  const bodyRows = data.map(row => {
    return columns.map(col => {
      const val = row[col];
      
      if (val === undefined || val === null) return '""';

      // FORMAT: Number -> String with Comma (European)
      if (typeof val === 'number') {
        return `"${val.toString().replace('.', ',')}"`;
      }
      
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';');
  });

  // 4. Add BOM (Byte Order Mark) for UTF-8 Excel compatibility
  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

/**
 * EXPORT 2: Full Backup (JSON)
 * Used to restore app state.
 */
export const exportToJSON = (data: BioMetricRecord[], filenameArg?: string) => {
  const filename = filenameArg || `BodyMetrics_Backup_${getTodayStr()}.json`;
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
};