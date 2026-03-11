// analyze-chunks.js — 라우트별 First Load JS 분석
const fs = require('fs');
const path = require('path');

const routes = [
  { name: 'pfmea/worksheet', dir: '(fmea-core)/pfmea/worksheet' },
  { name: 'pfmea/register', dir: '(fmea-core)/pfmea/register' },
  { name: 'pfmea/import', dir: '(fmea-core)/pfmea/import' },
  { name: 'pfmea/import/legacy', dir: '(fmea-core)/pfmea/import/legacy' },
  { name: 'pfmea/import/manual', dir: '(fmea-core)/pfmea/import/manual' },
  { name: 'pfmea/import/auto', dir: '(fmea-core)/pfmea/import/auto' },
  { name: 'dfmea/worksheet', dir: '(fmea-core)/dfmea/worksheet' },
  { name: 'dfmea/register', dir: '(fmea-core)/dfmea/register' },
  { name: 'control-plan/worksheet', dir: '(fmea-core)/control-plan/worksheet' },
  { name: 'control-plan/register', dir: '(fmea-core)/control-plan/register' },
  { name: 'control-plan/import', dir: '(fmea-core)/control-plan/import' },
  { name: 'pfd/worksheet', dir: '(fmea-core)/pfd/worksheet' },
  { name: 'pfd/register', dir: '(fmea-core)/pfd/register' },
  { name: 'pfd/import', dir: '(fmea-core)/pfd/import' },
];

const chunkDir = '.next/static/chunks/';

// Pre-compute all chunk sizes
const chunkSizes = {};
function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full);
    else if (entry.name.endsWith('.js')) {
      const rel = full.replace(/\\/g, '/').replace(chunkDir.replace(/\\/g, '/'), '');
      chunkSizes[rel] = fs.statSync(full).size;
    }
  }
}
walkDir(chunkDir);

const results = [];

for (const route of routes) {
  const manifestPath = path.join('.next/server/app', route.dir, 'page_client-reference-manifest.js');

  if (!fs.existsSync(manifestPath)) {
    results.push({ name: route.name, size: -1, chunks: 0, exceljs: false, xlsx: false, chartjs: false });
    continue;
  }

  const content = fs.readFileSync(manifestPath, 'utf-8');

  const chunkRefs = new Set();
  const regex = /static\/chunks\/([^"']+\.js)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    chunkRefs.add(match[1]);
  }

  let totalSize = 0;
  let hasExcelJS = false;
  let hasXlsx = false;
  let hasChartJS = false;

  for (const chunk of chunkRefs) {
    const size = chunkSizes[chunk] || 0;
    totalSize += size;

    const chunkPath = path.join(chunkDir, chunk);
    if (fs.existsSync(chunkPath)) {
      const head = fs.readFileSync(chunkPath, 'utf-8').slice(0, 5000);
      if (head.includes('exceljs') || head.includes('ExcelJS')) hasExcelJS = true;
      if (head.includes('xlsx') && !head.includes('exceljs')) hasXlsx = true;
      if (head.includes('chart.js') || head.includes('Chart.js')) hasChartJS = true;
    }
  }

  results.push({
    name: route.name,
    size: Math.round(totalSize / 1024),
    chunks: chunkRefs.size,
    exceljs: hasExcelJS,
    xlsx: hasXlsx,
    chartjs: hasChartJS,
  });
}

// Print table
console.log('');
console.log('Route'.padEnd(30) + 'First Load JS'.padStart(14) + '  Chunks'.padStart(8) + '  ExcelJS  xlsx  Chart.js');
console.log('-'.repeat(85));
for (const r of results) {
  if (r.size === -1) {
    console.log(r.name.padEnd(30) + '(not found)'.padStart(14));
    continue;
  }
  const sizeStr = (r.size + ' KB').padStart(14);
  const chunksStr = String(r.chunks).padStart(8);
  const ejs = r.exceljs ? 'YES' : 'NO ';
  const xl = r.xlsx ? 'YES' : 'NO ';
  const cj = r.chartjs ? 'YES' : 'NO ';
  console.log(r.name.padEnd(30) + sizeStr + chunksStr + '  ' + ejs.padEnd(10) + xl.padEnd(6) + cj);
}
console.log('');
