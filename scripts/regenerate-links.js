/**
 * FailureLink 재생성 스크립트
 *
 * FC_고장사슬 시트 없이 Import된 프로젝트에 대해
 * 기존 FM/FC/FE 데이터에서 FailureLink를 자동 생성합니다.
 *
 * 사용법: node scripts/regenerate-links.js <fmeaId>
 * 예시:   node scripts/regenerate-links.js pfm26-p013-l15
 */
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const fmeaId = process.argv[2];
if (!fmeaId) {
  console.error('Usage: node scripts/regenerate-links.js <fmeaId>');
  process.exit(1);
}

// UID 생성
let _uid = 0;
function uid() {
  const ts = Date.now().toString(16);
  const r = Math.random().toString(16).slice(2, 10);
  return `regen_${ts}_${r}_${++_uid}`;
}

async function run() {
  console.log(`=== FailureLink 재생성: ${fmeaId} ===\n`);

  // 1. LegacyData 로드
  const legacy = await prisma.fmeaLegacyData.findUnique({
    where: { fmeaId },
  });

  if (!legacy) {
    console.error('FmeaLegacyData 없음. 프로젝트를 먼저 Import 해주세요.');
    await pool.end();
    return;
  }

  const ld = typeof legacy.data === 'string' ? JSON.parse(legacy.data) : legacy.data;
  const l1 = ld.l1;
  const l2 = ld.l2 || [];
  const fes = l1?.failureScopes || [];
  const existingLinks = ld.failureLinks || [];

  const fmTotal = l2.reduce((s, p) => s + (p.failureModes || []).length, 0);
  const fcTotal = l2.reduce((s, p) =>
    s + (p.failureCauses || []).length +
    (p.l3 || []).reduce((s2, we) => s2 + (we.failureCauses || []).length, 0), 0);

  console.log(`현재 상태:`);
  console.log(`  FE: ${fes.length}`);
  console.log(`  FM: ${fmTotal}`);
  console.log(`  FC: ${fcTotal}`);
  console.log(`  기존 링크: ${existingLinks.length}`);

  if (existingLinks.length > 0) {
    console.log(`\n⚠️ 이미 ${existingLinks.length}건의 링크가 있습니다. 덮어쓰기 합니다.`);
  }

  if (fes.length === 0) {
    console.error('\nFE(고장영향) 데이터가 0건입니다. 링크 생성 불가.');
    await pool.end();
    return;
  }

  // 2. 공정별 FM-FC 매칭 → FailureLink 생성
  const newLinks = [];

  for (const proc of l2) {
    const fms = proc.failureModes || [];
    const fcs = [
      ...(proc.failureCauses || []).map(fc => ({
        ...fc,
        m4: fc.m4 || '',
      })),
      ...(proc.l3 || []).flatMap(we =>
        (we.failureCauses || []).map(fc => ({
          ...fc,
          m4: we.m4 || we.fourM || '',
        }))
      ),
    ];

    if (fms.length === 0 || fcs.length === 0) continue;

    for (const fm of fms) {
      for (const fc of fcs) {
        // FE 순환 배분
        const feIdx = newLinks.length % fes.length;
        const fe = fes[feIdx];

        newLinks.push({
          id: uid(),
          fmId: fm.id,
          feId: fe.id,
          fcId: fc.id,
          fmText: fm.name || '',
          feText: fe.effect || fe.name || '',
          fcText: fc.name || '',
          fcM4: fc.m4 || '',
          fmProcess: proc.name || '',
          fmProcessNo: proc.no || '',
          feScope: fe.scope || '',
          severity: fe.severity || undefined,
        });
      }
    }
  }

  console.log(`\n생성할 링크: ${newLinks.length}건`);

  // 공정별 분포
  const byProcess = {};
  newLinks.forEach(l => {
    const key = l.fmProcessNo + ' ' + l.fmProcess;
    byProcess[key] = (byProcess[key] || 0) + 1;
  });
  Object.entries(byProcess).forEach(([k, v]) => console.log(`  ${k}: ${v}건`));

  if (newLinks.length === 0) {
    console.log('생성할 링크가 없습니다.');
    await pool.end();
    return;
  }

  // 3. LegacyData에 failureLinks 업데이트
  ld.failureLinks = newLinks;

  await prisma.fmeaLegacyData.update({
    where: { fmeaId },
    data: {
      data: ld,
    },
  });
  console.log(`\n✅ FmeaLegacyData 업데이트 완료!`);

  // 4. FmeaWorksheetData도 업데이트 (있으면)
  try {
    const wsData = await prisma.fmeaWorksheetData.findUnique({
      where: { fmeaId },
    });
    if (wsData) {
      await prisma.fmeaWorksheetData.update({
        where: { fmeaId },
        data: {
          failureLinks: newLinks,
        },
      });
      console.log('✅ FmeaWorksheetData 업데이트 완료!');
    }
  } catch (e) {
    console.log('FmeaWorksheetData 업데이트 스킵 (테이블 없음)');
  }

  console.log(`\n✅ ${newLinks.length}건의 FailureLink가 저장되었습니다.`);
  console.log(`브라우저에서 확인: http://localhost:3000/pfmea/worksheet?id=${fmeaId}`);

  await pool.end();
}

run().catch(err => {
  console.error('Error:', err.message);
  pool.end();
  process.exit(1);
});
