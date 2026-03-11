/**
 * Rebuild atomic data from legacyData
 * legacyData는 완전하지만 atomic이 0인 경우 복구
 */
const PORT = process.env.PORT || 3000;
const fmeaId = process.argv[2] || 'pfm26-f001-l68-r03';

console.log(`Rebuilding atomic data for ${fmeaId} from legacyData...`);

// Step 1: Load legacyData via GET API
const getRes = await fetch(`http://localhost:${PORT}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
const legacyData = await getRes.json();
console.log('Loaded legacyData: l2 count =', Array.isArray(legacyData.l2) ? legacyData.l2.length : 0);
console.log('failureLinks count =', Array.isArray(legacyData.failureLinks) ? legacyData.failureLinks.length : 0);

if (!legacyData.l2 || legacyData.l2.length === 0) {
  console.log('No l2 data in legacyData, cannot rebuild');
  process.exit(1);
}

// Step 2: POST to /api/fmea with legacyData + forceOverwrite
const postBody = {
  ...legacyData,
  forceOverwrite: true,
  legacyData: legacyData,
};

// Need migrateToAtomicDB — call it via a simple server endpoint
// Instead, just POST the legacyData directly as it is — /api/fmea will save it
console.log('\nPOSTing legacyData to /api/fmea with forceOverwrite...');
const postRes = await fetch(`http://localhost:${PORT}/api/fmea`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(postBody),
});
const postResult = await postRes.json();
console.log('POST result:', JSON.stringify(postResult, null, 2).substring(0, 500));

// Step 3: Verify
console.log('\n--- Verify counts ---');
const verifyRes = await fetch(`http://localhost:${PORT}/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}`);
const verify = await verifyRes.json();
const allKeys = new Set([...Object.keys(verify.import || {}), ...Object.keys(verify.db || {})]);
for (const k of [...allKeys].sort()) {
  const i = (verify.import || {})[k] || 0;
  const db = (verify.db || {})[k] || 0;
  console.log(`  ${k.padEnd(6)} I=${String(i).padStart(3)}  DB=${String(db).padStart(3)}  ${i === db ? 'OK' : 'MISMATCH'}`);
}
console.log('linkDiag:', JSON.stringify(verify.linkDiag));
