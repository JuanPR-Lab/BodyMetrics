// Updated import to use the new generic type
import type { BioMetricRecord } from './csvSDparser';

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

/**
 * Export data to CSV format optimized for Excel/LibreOffice (European Format).
 * Features:
 * - Uses semicolon (;) delimiter instead of comma.
 * - Replaces decimal dots (.) with commas (,).
 * - WRAPS ALL VALUES IN QUOTES to prevent column shifting issues.
 * - Adds BOM (\uFEFF) for correct UTF-8 character encoding.
 */
export const exportToCSV = (data: BioMetricRecord[], headersMap: Record<string, string>, filename = 'data.csv') => {
  if (!data || data.length === 0) return;

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
    const label = headersMap[col] || col; 
    return `"${String(label).replace(/"/g, '""')}"`;
  }).join(';');

  // 3. Build Data Rows
  const bodyRows = data.map(row => {
    return columns.map(col => {
      const val = row[col];
      
      if (val === undefined || val === null) return '""';

      // CRITICAL FIX: Wrap numbers in quotes too after converting dot to comma
      if (typeof val === 'number') {
        return `"${val.toString().replace('.', ',')}"`;
      }
      
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';');
  });

  // 4. Combine and Download with BOM
  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

export const exportToJSON = (data: BioMetricRecord[], filename = 'backup_full.json') => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
};

export const exportToXML = (data: BioMetricRecord[], filename = 'data.xml') => {
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<BodyMetrics>\n';
  data.forEach(record => {
    xmlContent += '  <Record>\n';
    Object.entries(record).forEach(([key, value]) => {
      xmlContent += `    <${key}>${value}</${key}>\n`;
    });
    xmlContent += '  </Record>\n';
  });
  xmlContent += '</BodyMetrics>';
  downloadFile(xmlContent, filename, 'application/xml');
};