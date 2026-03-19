import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db',
});

async function main() {
  await client.connect();
  const schema = 'pfmea_pfm26_m066';

  // First find the actual legacy ID
  const allLegacy = await client.query(
    `SELECT id FROM "${schema}".fmea_legacy_data LIMIT 10`
  );
  console.log('Legacy IDs:', allLegacy.rows.map(r => r.id));
  
  const fmeaId = allLegacy.rows.length > 0 ? allLegacy.rows[0].id : 'pfm26-m066';
  console.log('Using fmeaId:', fmeaId);
  
  const legacyRes = await client.query(
    `SELECT id, data FROM "${schema}".fmea_legacy_data WHERE id = $1`, [fmeaId]
  );
  if (legacyRes.rows.length === 0) {
    console.log('Legacy data not found');
    await client.end();
    return;
  }

  const legacy = legacyRes.rows[0].data;
  const l2 = legacy.l2 || [];
  let totalRemoved = 0;

  for (const proc of l2) {
    const fcs = proc.failureCauses || [];
    if (fcs.length === 0) continue;

    const seen = new Set();
    const deduped = [];
    for (const fc of fcs) {
      const key = (fc.name || '').trim();
      if (seen.has(key)) {
        console.log(`  중복 FC 삭제: 공정 ${proc.name || proc.processNo}, FC: ${key.substring(0, 60)}`);
        totalRemoved++;
        continue;
      }
      seen.add(key);
      deduped.push(fc);
    }
    proc.failureCauses = deduped;
  }

  // Also dedup failureLinks
  const fLinks = legacy.failureLinks || [];
  const flSeen = new Set();
  const dedupedLinks = [];
  for (const fl of fLinks) {
    const key = fl.fcText ? `${fl.fcText}` : fl.fcId;
    if (flSeen.has(key)) {
      console.log(`  중복 FL 삭제: fcText: ${(fl.fcText || fl.fcId || '').substring(0, 60)}`);
      totalRemoved++;
      continue;
    }
    flSeen.add(key);
    dedupedLinks.push(fl);
  }
  legacy.failureLinks = dedupedLinks;

  console.log(`\n총 ${totalRemoved}건 중복 제거`);
  console.log(`FC 후: ${l2.reduce((s, p) => s + (p.failureCauses || []).length, 0)}`);
  console.log(`FL 후: ${dedupedLinks.length}`);

  if (totalRemoved > 0) {
    await client.query(
      `UPDATE "${schema}".fmea_legacy_data SET data = $1 WHERE id = $2`,
      [JSON.stringify(legacy), fmeaId]
    );
    console.log('Legacy data 업데이트 완료');
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
