/**
 * CP 재생성 스크립트
 * 수정된 processChar 데이터로 CP를 재생성합니다.
 *
 * 순서:
 * 1. 기존 CP 데이터 삭제 (ControlPlanItem + ControlPlan)
 * 2. create-cp API 호출하여 재생성
 * 3. sync-to-cp/all API 호출하여 동기화
 * 4. 검증
 */
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const FMEA_ID = 'pfm26-p008-l09';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    };
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CP 재생성 (수정된 processChar 데이터)');
  console.log(`  프로젝트: ${FMEA_ID}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // STEP 1: 기존 CP 데이터 삭제
  console.log('📌 STEP 1: 기존 CP 데이터 삭제...');
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  let cpId = null;
  try {
    // CP 찾기
    const cp = await prisma.controlPlan.findFirst({
      where: { OR: [{ fmeaId: FMEA_ID }, { linkedPfmeaNo: FMEA_ID }] },
    });

    if (cp) {
      cpId = cp.id;
      // 기존 CP 아이템 삭제 (필드명: cpId)
      const deleted = await prisma.controlPlanItem.deleteMany({
        where: { cpId: cp.id },
      });
      console.log(`  ✅ 기존 CP 아이템 ${deleted.count}건 삭제`);
      console.log(`  CP ID: ${cp.id}, cpNo: ${cp.cpNo}`);
    } else {
      console.log('  ℹ️ 기존 CP 없음 — 새로 생성됩니다.');
    }
  } catch (e) {
    console.error('  ❌ 삭제 실패:', e.message);
  }

  await prisma.$disconnect();
  await pool.end();

  // STEP 1.5: PFMEA 워크시트 데이터 로드 (API에 전달할 l2Data)
  console.log('\n📌 STEP 1.5: PFMEA 워크시트 데이터 로드...');
  const wsRes = await request('GET', `/api/fmea?fmeaId=${FMEA_ID}`);
  const wsData = wsRes.data || wsRes;
  const l2Data = wsData.l2 || [];
  const riskData = wsData.riskData || {};
  console.log(`  ✅ L2: ${l2Data.length}개 공정 로드`);

  // STEP 2: create-cp API 호출 (l2Data 포함)
  console.log('\n📌 STEP 2: create-cp API 호출...');
  const cpNo = FMEA_ID.replace('pfm', 'cp');
  const createRes = await request('POST', '/api/pfmea/create-cp', {
    fmeaId: FMEA_ID,
    cpNo,
    l2Data,
  });

  if (createRes.status === 200 || createRes.status === 201) {
    const d = createRes.data;
    console.log(`  ✅ CP 생성 성공`);
    console.log(`  총 아이템: ${d.totalItems || d.data?.totalItems || '?'}건`);
    console.log(`  제품특성: ${d.productCharItems || d.data?.productCharItems || '?'}건`);
    console.log(`  공정특성: ${d.processCharItems || d.data?.processCharItems || '?'}건`);
    console.log(`  구조: ${d.structureItems || d.data?.structureItems || '?'}건`);
  } else {
    console.log(`  ⚠️ 응답 코드: ${createRes.status}`);
    console.log(`  응답:`, JSON.stringify(createRes.data).slice(0, 500));
  }

  // STEP 3: sync-to-cp/all API 호출 (l2Data, riskData 포함)
  console.log('\n📌 STEP 3: sync-to-cp/all API 호출...');
  const syncRes = await request('POST', '/api/pfmea/sync-to-cp/all', {
    fmeaId: FMEA_ID,
    cpNo,
    l2Data,
    riskData,
  });

  if (syncRes.status === 200) {
    const d = syncRes.data;
    console.log(`  ✅ 동기화 완료`);
    if (d.steps) {
      d.steps.forEach(s => console.log(`    ${s.step}: ${s.status} (${s.message || ''})`));
    }
    if (d.summary) {
      console.log(`  총 CP 행: ${d.summary.totalRows || '?'}`);
    }
  } else {
    console.log(`  ⚠️ 응답 코드: ${syncRes.status}`);
    console.log(`  응답:`, JSON.stringify(syncRes.data).slice(0, 500));
  }

  // STEP 4: 검증 — DB에서 CP 아이템 조회
  console.log('\n📌 STEP 4: 검증...');
  const pool2 = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });
  const adapter2 = new PrismaPg(pool2);
  const prisma2 = new PrismaClient({ adapter: adapter2 });

  try {
    const cp = await prisma2.controlPlan.findFirst({
      where: { OR: [{ fmeaId: FMEA_ID }, { linkedPfmeaNo: FMEA_ID }] },
      include: { items: true },
    });

    if (cp) {
      console.log(`  CP: ${cp.cpNo} (${cp.id})`);
      console.log(`  총 아이템: ${cp.items.length}건`);

      // 유형별 분류
      const product = cp.items.filter(i => i.productChar && !i.processChar);
      const process = cp.items.filter(i => i.processChar && !i.productChar);
      const both = cp.items.filter(i => i.productChar && i.processChar);
      const structure = cp.items.filter(i => !i.productChar && !i.processChar);

      console.log(`  제품특성만: ${product.length}건`);
      console.log(`  공정특성만: ${process.length}건`);
      console.log(`  둘 다 있음: ${both.length}건`);
      console.log(`  구조(빈행): ${structure.length}건`);

      // 교차매핑 검증 — processChar이 해당 공정의 올바른 L3에 매핑되었는지
      let crossCheck = 0;
      const wsData = await request('GET', `/api/fmea?fmeaId=${FMEA_ID}`);
      const l2Data = wsData.data?.l2 || wsData.l2 || [];

      for (const item of cp.items) {
        if (!item.processChar || !item.processNo) continue;
        const pcharName = item.processChar.trim();

        // 참조 장비 추출
        const m1 = pcharName.match(/^\d+번-(.+?)-[^-]+$/);
        let refEquip = null;
        if (m1) refEquip = m1[1];

        if (!refEquip) continue;

        // 해당 공정의 L3 중에서 매칭되는지 확인
        const l2 = l2Data.find(l => l.no === item.processNo || String(l.no) === String(item.processNo));
        if (!l2) continue;

        const l3Match = (l2.l3 || []).some(l3 => {
          const nm = (l3.name || '').trim();
          const m = nm.match(/^\d+번-(.+)$/) || nm.match(/^\d+번\s+(.+)$/);
          const equipName = m ? m[1] : nm;
          const normRef = refEquip.replace(/[\s,.\-·]+/g, '').toLowerCase();
          const normL3 = equipName.replace(/[\s,.\-·]+/g, '').toLowerCase();
          return normRef === normL3 || normRef.includes(normL3) || normL3.includes(normRef);
        });

        if (!l3Match) crossCheck++;
      }

      console.log(`  교차매핑 잔여: ${crossCheck}건`);
    } else {
      console.log('  ❌ CP 레코드 없음');
    }
  } catch (e) {
    console.error('  ❌ 검증 실패:', e.message);
  }

  await prisma2.$disconnect();
  await pool2.end();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  CP 재생성 완료');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
