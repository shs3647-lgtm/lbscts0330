// analyze-chunks-all.js — 전체 라우트 First Load JS 분석
const fs = require('fs');
const path = require('path');

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

// Find all page manifests
const serverDir = '.next/server/app';
const manifests = [];

function findManifests(dir, routePrefix) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Strip route group parentheses
      const routePart = entry.name.startsWith('(') ? '' : '/' + entry.name;
      findManifests(full, routePrefix + routePart);
    } else if (entry.name === 'page_client-reference-manifest.js') {
      manifests.push({ path: full, route: routePrefix || '/' });
    }
  }
}
findManifests(serverDir, '');

// Analyze each manifest
const results = [];
for (const m of manifests) {
  const content = fs.readFileSync(m.path, 'utf-8');
  const chunkRefs = new Set();
  const regex = /static\/chunks\/([^"']+\.js)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    chunkRefs.add(match[1]);
  }

  let totalSize = 0;
  for (const chunk of chunkRefs) {
    totalSize += chunkSizes[chunk] || 0;
  }
  results.push({ route: m.route, size: Math.round(totalSize / 1024) });
}

// Sort by size descending
results.sort((a, b) => b.size - a.size);

// Print top 30
console.log('');
console.log('Top 30 heaviest routes (First Load JS):');
console.log('Route'.padEnd(45) + 'First Load JS');
console.log('-'.repeat(60));
for (const r of results.slice(0, 30)) {
  console.log(r.route.padEnd(45) + (r.size + ' KB').padStart(10));
}
console.log('-'.repeat(60));
console.log('Total routes:', results.length);
console.log('');
