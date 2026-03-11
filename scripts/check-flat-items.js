/**
 * Check flat items for a dataset via the HTTP API
 * Usage: node scripts/check-flat-items.js [port]
 */
const BASE = `http://localhost:${process.argv[2] || '3000'}`;
const fmeaId = 'pfm26-f001-l68-r03';

async function main() {
  // Use the master API to get dataset details
  const res = await fetch(`${BASE}/api/pfmea/master?action=detail&fmeaId=${fmeaId}`);
  const data = await res.json();
  const dataset = data.dataset || data;

  console.log('Dataset ID:', dataset.id);
  console.log('FmeaId:', dataset.fmeaId);

  // Check available keys
  console.log('Dataset keys:', Object.keys(dataset).join(', '));

  // Get flat items if available
  if (dataset.flatItems && Array.isArray(dataset.flatItems)) {
    const groups = {};
    for (const item of dataset.flatItems) {
      const code = item.itemCode;
      if (!(code in groups)) groups[code] = [];
      groups[code].push({ processNo: item.processNo, value: (item.value || '').substring(0, 50) });
    }
    for (const [code, vals] of Object.entries(groups)) {
      console.log(`${code} (${vals.length}):`);
      for (const v of vals) {
        console.log(`  pNo=${v.processNo} val=${v.value}`);
      }
    }
    console.log('\nTotal flatItems:', dataset.flatItems.length);
  } else {
    console.log('No flatItems in response');
  }

  // Also check failureChains count
  const chains = Array.isArray(dataset.failureChains) ? dataset.failureChains : [];
  console.log('FailureChains:', chains.length);
  if (chains.length > 0) {
    console.log('Chain sample:', JSON.stringify(chains[0]).substring(0, 200));
  }
}

main().catch(err => console.error('Error:', err.message));
