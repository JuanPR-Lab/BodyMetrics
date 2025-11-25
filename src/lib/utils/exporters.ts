import type { TanitaRecord } from './csvSDparser';

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

export const exportToCSV = (data: TanitaRecord[], headersMap: Record<string, string>, filename = 'data.csv') => {
  if (!data || data.length === 0) return;

  const columns: (keyof TanitaRecord)[] = [
    'date', 'time', 'model', 
    'weight', 'bmi', 'bodyFat', 'muscleMass', 'visceralFat', 'waterPercentage', 
    'boneMass', 'metabolicAge', 'dci',
    'fatTrunk', 'fatArmR', 'fatArmL', 'fatLegR', 'fatLegL',
    'muscleTrunk', 'muscleArmR', 'muscleArmL', 'muscleLegR', 'muscleLegL'
  ];

  // Header with quotes
  const headerRow = columns.map(col => {
    const label = headersMap[col] || col; 
    return `"${String(label).replace(/"/g, '""')}"`;
  }).join(';');

  const bodyRows = data.map(row => {
    return columns.map(col => {
      const val = row[col];
      if (val === undefined || val === null) return '""';

      // FORCE QUOTES FOR NUMBERS TOO
      // This prevents Excel from splitting "64,5" into two columns
      if (typeof val === 'number') {
        return `"${val.toString().replace('.', ',')}"`;
      }
      
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';');
  });

  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n');
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

export const exportToJSON = (data: TanitaRecord[], filename = 'backup_full.json') => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
};

export const exportToXML = (data: TanitaRecord[], filename = 'data.xml') => {
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