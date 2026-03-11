require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  const FID = 'pfm26-p002-i57';

  const ws = await prisma.fmeaWorksheetData.findFirst({ where: { fmeaId: FID } });
  if (ws === null) { console.log('NO DATA'); await pool.end(); return; }

  // L1
  const l1 = typeof ws.l1Data === 'string' ? JSON.parse(ws.l1Data) : ws.l1Data;
  if (Array.isArray(l1)) {
    console.log('=== L1 (' + l1.length + ') ===');
    l1.forEach(l => {
      console.log('  cat:', l.category);
      if (Array.isArray(l.functions)) l.functions.forEach(f => console.log('    func:', f.fieldType, '|', f.name));
      if (Array.isArray(l.failureEffects)) l.failureEffects.forEach(f => console.log('    FE:', (f.name||f.effect||'?').slice(0,35), '|S:', f.severity));
    });
  }

  // L2
  const l2 = typeof ws.l2Data === 'string' ? JSON.parse(ws.l2Data) : ws.l2Data;
  if (Array.isArray(l2)) {
    console.log('\n=== L2 (' + l2.length + ') ===');
    l2.forEach(l => {
      console.log('  ', l.processNo, '|', l.name);
      if (Array.isArray(l.functions)) l.functions.forEach(f => console.log('    func:', f.fieldType, '|', f.name, '|sc:', f.specialChar || ''));
      if (Array.isArray(l.failureModes)) l.failureModes.forEach(f => console.log('    FM:', f.name || f.mode));
      if (Array.isArray(l.l3)) l.l3.forEach(l3 => {
        console.log('    L3:', l3.fourM || l3.m4 || '?', '|', l3.name);
        if (Array.isArray(l3.functions)) l3.functions.forEach(f => console.log('      func:', f.fieldType, '|', f.name, '|sc:', f.specialChar || ''));
        if (Array.isArray(l3.failureCauses)) l3.failureCauses.forEach(f => console.log('      FC:', f.name || f.cause));
      });
    });
  }

  // FailureLinks
  const fl = typeof ws.failureLinks === 'string' ? JSON.parse(ws.failureLinks) : ws.failureLinks;
  if (Array.isArray(fl)) {
    console.log('\n=== FailureLinks JSON (' + fl.length + ') ===');
    fl.forEach(l => {
      console.log(' ', l.feScope||'?', '|FE:', (l.feText||'?').slice(0,30), '|S:', l.severity, '|Proc:', l.fmProcess, '|FM:', (l.fmText||'?').slice(0,20), '|', l.fcM4||'?', '|WE:', (l.fcWorkElem||'?').slice(0,15), '|FC:', (l.fcText||'?').slice(0,25));
    });
  }

  // DB FailureLinks
  const dbLinks = await prisma.failureLink.findMany({ where: { fmeaId: FID } });
  console.log('\n=== DB FailureLinks (' + dbLinks.length + ') ===');
  dbLinks.forEach(l => {
    console.log(' ', l.feScope||'?', '|FE:', (l.feText||'?').slice(0,30), '|S:', l.severity, '|Proc:', l.fmProcess, '|FM:', (l.fmText||'?').slice(0,20), '|', l.fcM4||'?', '|WE:', (l.fcWorkElem||'?').slice(0,15), '|FC:', (l.fcText||'?').slice(0,25));
  });

  // RiskData
  const rd = typeof ws.riskData === 'string' ? JSON.parse(ws.riskData) : ws.riskData;
  if (rd && typeof rd === 'object') {
    const rkeys = Object.keys(rd);
    console.log('\n=== RiskData (' + rkeys.length + ') ===');
    rkeys.forEach(k => {
      const v = rd[k];
      if (v && typeof v === 'object') {
        console.log(' Key:', k.slice(0,60));
        console.log('   PC:', (v.preventionControl||'').slice(0,35), '|DC:', (v.detectionControl||'').slice(0,35));
        console.log('   O:', v.occurrence, '|D:', v.detection, '|AP:', v.actionPriority);
      }
    });
  }

  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
