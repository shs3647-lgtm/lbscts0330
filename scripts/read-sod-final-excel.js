const XLSX = require('xlsx');

const filePath = 'D:\\00 SMART FMEA TUTOR\\DFMEA_PFMEA_SOD_AP_정오표반영_최종.xlsx';
const wb = XLSX.readFile(filePath);

console.log('시트 목록:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log('\n=== ' + name + ' === (rows: ' + (range.e.r+1) + ', cols: ' + (range.e.c+1) + ')');
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  data.forEach(function(row, i) {
    console.log('  row[' + i + ']:', JSON.stringify(row));
  });
});
