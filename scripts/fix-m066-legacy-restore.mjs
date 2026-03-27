import pg from 'pg';
import fs from 'fs';

const client = new pg.Client({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
await client.connect();

const schema = 'pfmea_pfm26_m002';

// Read master JSON (has original 105 chains)
const master = JSON.parse(fs.readFileSync('data/master-fmea/pfm26-m002.json', 'utf8'));
const chains = master.chains || [];
console.log('Master chains:', chains.length);

// Read current legacy
const legacyRes = await client.query(`SELECT id, data FROM "${schema}".fmea_legacy_data LIMIT 1`);
const fmeaId = legacyRes.rows[0].id;
const legacy = legacyRes.rows[0].data;
console.log('Current legacy FLs:', (legacy.failureLinks || []).length);

// Rebuild failureLinks from master chains
const newLinks = chains.map((chain, idx) => ({
  id: chain.linkId || `chain-${idx}`,
  fmId: chain.fmId || '',
  feId: chain.feId || '',
  fcId: chain.fcId || '',
  fmText: chain.fmValue || '',
  feText: chain.feValue || '',
  fcText: chain.fcValue || '',
  fcWorkElem: chain.workElement || '',
  fcProcess: chain.processNo || '',
  fmProcess: chain.processNo || '',
  feScope: chain.feCategory || '',
  severity: chain.severity || 0,
}));

legacy.failureLinks = newLinks;
console.log('Restored legacy FLs:', newLinks.length);

// Also restore riskData from chains
if (!legacy.riskData) legacy.riskData = {};
for (const chain of chains) {
  const uk = `${chain.fmId}-${chain.fcId}`;
  if (chain.severity) legacy.riskData[`risk-${uk}-S`] = chain.severity;
  if (chain.occurrence) legacy.riskData[`risk-${uk}-O`] = chain.occurrence;
  if (chain.detection) legacy.riskData[`risk-${uk}-D`] = chain.detection;
  if (chain.pcValue) legacy.riskData[`prevention-${uk}`] = chain.pcValue;
  if (chain.dcValue) legacy.riskData[`detection-${uk}`] = chain.dcValue;
}

await client.query(
  `UPDATE "${schema}".fmea_legacy_data SET data = $1 WHERE id = $2`,
  [JSON.stringify(legacy), fmeaId]
);
console.log('Legacy data restored');

await client.end();
