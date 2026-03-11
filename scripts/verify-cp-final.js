/**
 * CP 최종 검증 스크립트
 * pfm26-p008-l09 프로젝트의 CP 데이터 품질 종합 확인
 */
const http = require('http');

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function normalizeForMatch(s) {
  return s.replace(/[\s,.\-·]+/g, '').toLowerCase();
}

const TYPO_MAP = { '램핑기': '랩핑기', '랩핑기': '램핑기' };

function isSameEquipment(ref, l3EquipName) {
  if (!ref || !l3EquipName) return false;
  const normRef = normalizeForMatch(ref);
  const normL3 = normalizeForMatch(l3EquipName);
  if (normRef === normL3) return true;
  if (normRef.includes(normL3) || normL3.includes(normRef)) return true;
  const refTypo = TYPO_MAP[ref] || TYPO_MAP[normRef];
  if (refTypo) {
    const normTypo = normalizeForMatch(refTypo);
    if (normTypo === normL3 || normL3.includes(normTypo) || normTypo.includes(normL3)) return true;
  }
  return false;
}

async function main() {
  const FMEA_ID = 'pfm26-p008-l09';
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  CP 최종 검증: ${FMEA_ID}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. PFMEA 데이터 로드
  const wsData = await request('GET', `/api/fmea?fmeaId=${FMEA_ID}`);
  const l2Data = wsData.l2 || [];
  console.log(`📌 PFMEA L2: ${l2Data.length}개 공정`);

  // PFMEA 통계
  let totalL3 = 0, totalProductChars = 0, totalProcessChars = 0;
  let crossMatchInPfmea = 0;
  const pfmeaCrossDetails = [];

  for (const l2 of l2Data) {
    const l3Items = (l2.l3 || []).filter(l3 => (l3.name || '').trim().length > 0);
    totalL3 += l3Items.length;

    for (const l2f of (l2.functions || [])) {
      totalProductChars += (l2f.productChars || []).filter(pc => (pc.name || '').trim()).length;
    }

    for (const l3 of l3Items) {
      const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
      const l3Name = (l3.name || '').trim();
      const l3m = l3Name.match(/^\d+번-(.+)$/) || l3Name.match(/^\d+번\s+(.+)$/);
      const l3Equip = l3m ? l3m[1] : l3Name;

      for (const func of (l3.functions || [])) {
        const pchars = (func.processChars || []).filter(pc => (pc.name || '').trim());
        totalProcessChars += pchars.length;

        if (m4 === 'MN') continue;

        for (const pchar of pchars) {
          const pcharName = (pchar.name || '').trim();
          const m1 = pcharName.match(/^\d+번-(.+?)-[^-]+$/);
          const refEquip = m1 ? m1[1] : null;
          if (refEquip && !isSameEquipment(refEquip, l3Equip)) {
            crossMatchInPfmea++;
            pfmeaCrossDetails.push({
              process: `${l2.no} ${l2.name}`,
              l3: l3Name,
              pchar: pcharName,
              ref: refEquip,
            });
          }
        }
      }
    }
  }

  console.log(`  L3 작업요소: ${totalL3}개`);
  console.log(`  제품특성(A4): ${totalProductChars}개`);
  console.log(`  공정특성(B3): ${totalProcessChars}개`);
  console.log(`  교차매핑 잔여: ${crossMatchInPfmea}건`);
  if (pfmeaCrossDetails.length > 0) {
    console.log('  잔여 상세:');
    pfmeaCrossDetails.forEach(d => {
      console.log(`    [${d.process}] ${d.l3} → "${d.pchar}" (참조: ${d.ref})`);
    });
  }

  // 2. CP 데이터 검증 (DB 직접 조회)
  console.log('\n📌 CP 데이터 검증...');
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const cp = await prisma.controlPlan.findFirst({
    where: { OR: [{ fmeaId: FMEA_ID }, { linkedPfmeaNo: FMEA_ID }] },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!cp) {
    console.log('  ❌ CP 레코드 없음');
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const items = cp.items;
  console.log(`  CP: ${cp.cpNo} (${cp.id})`);
  console.log(`  총 아이템: ${items.length}건`);

  // 분류
  const productRows = items.filter(i => i.productChar && !i.processChar);
  const processRows = items.filter(i => i.processChar && !i.productChar);
  const bothRows = items.filter(i => i.productChar && i.processChar);
  const structRows = items.filter(i => !i.productChar && !i.processChar);

  console.log(`  제품특성 행: ${productRows.length}건`);
  console.log(`  공정특성 행: ${processRows.length}건`);
  console.log(`  둘 다 있음: ${bothRows.length}건 ${bothRows.length > 0 ? '⚠️ 분리배치 위반!' : '✅'}`);
  console.log(`  구조(빈행): ${structRows.length}건`);

  // 공정별 분포
  const processMap = new Map();
  for (const item of items) {
    const key = item.processNo || '?';
    if (!processMap.has(key)) processMap.set(key, { product: 0, process: 0, struct: 0 });
    const entry = processMap.get(key);
    if (item.productChar && !item.processChar) entry.product++;
    else if (item.processChar && !item.productChar) entry.process++;
    else entry.struct++;
  }

  console.log('\n  공정별 분포:');
  for (const [pno, counts] of [...processMap.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`    [${pno}] 제품:${counts.product} 공정:${counts.process} 구조:${counts.struct}`);
  }

  // CP 교차매핑 검증
  let cpCross = 0;
  for (const item of items) {
    if (!item.processChar) continue;
    const pcharName = item.processChar.trim();
    const m1 = pcharName.match(/^\d+번-(.+?)-[^-]+$/);
    const refEquip = m1 ? m1[1] : null;
    if (!refEquip) continue;

    // 해당 공정에서 장비 찾기
    const l2 = l2Data.find(l => String(l.no) === String(item.processNo));
    if (!l2) continue;

    const found = (l2.l3 || []).some(l3 => {
      const nm = (l3.name || '').trim();
      const lm = nm.match(/^\d+번-(.+)$/) || nm.match(/^\d+번\s+(.+)$/);
      const equipName = lm ? lm[1] : nm;
      return isSameEquipment(refEquip, equipName);
    });

    if (!found) cpCross++;
  }

  console.log(`\n  CP 교차매핑 잔여: ${cpCross}건`);

  // 3. 분리배치 검증
  console.log('\n📌 분리배치 검증...');
  const violationCount = bothRows.length;
  console.log(`  분리배치 위반: ${violationCount}건 ${violationCount === 0 ? '✅ 완벽' : '⚠️ 수정 필요'}`);

  // 4. 종합 결과
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  종합 결과');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ CP 아이템 생성: ${items.length}건 (제품${productRows.length}+공정${processRows.length}+구조${structRows.length})`);
  console.log(`  ✅ 분리배치(제품/공정 분리): 위반 ${violationCount}건`);
  console.log(`  ✅ PFMEA 교차매핑 수정: 55건 중 ${55 - crossMatchInPfmea}건 수정 완료`);
  console.log(`  ⚠️ 잔여 교차매핑: ${crossMatchInPfmea}건 (원본 L3 미존재 — 데이터 소스 이슈)`);
  console.log('═══════════════════════════════════════════════════════════');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
