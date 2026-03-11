/**
 * Check all datasets for a fmeaId
 * Usage: node scripts/check-datasets.js [port]
 */
const BASE = `http://localhost:${process.argv[2] || '3000'}`;
const fmeaId = 'pfm26-f001-l68-r03';

async function main() {
  // List all datasets via master API
  const res = await fetch(`${BASE}/api/pfmea/master?action=list`);
  const data = await res.json();
  const datasets = (data.datasets || data || []).filter(d => d.fmeaId === fmeaId);

  console.log(`Datasets for ${fmeaId}: ${datasets.length}`);
  for (const ds of datasets) {
    console.log(`  ID: ${ds.id}, active: ${ds.isActive}, items: ${ds.itemCount || '?'}, version: ${ds.version}`);
  }

  // Also check all active datasets
  console.log('\nAll active datasets:');
  const allActive = (data.datasets || data || []).filter(d => d.isActive);
  for (const ds of allActive) {
    console.log(`  ${ds.fmeaId} ID=${ds.id} items=${ds.itemCount || '?'}`);
  }
}

main().catch(err => console.error('Error:', err.message));
