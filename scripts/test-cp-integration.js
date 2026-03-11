/**
 * CP 연동 전체 프로세스 테스트 스크립트
 * 프로젝트: pfm26-p008-l09 (자체 변환 JD1, 천안공장, 4단계)
 */
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const FMEA_ID = 'pfm26-p008-l09';
const CP_NO = 'cp26-p008-l09';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data.substring(0, 500) });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CP 연동 전체 프로세스 테스트');
  console.log(`  프로젝트: ${FMEA_ID} | CP: ${CP_NO}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ============================================
  // STEP 1: PFMEA 워크시트 데이터 로드
  // ============================================
  console.log('📌 STEP 1: PFMEA 워크시트 데이터 로드...');
  const wsRes = await request('GET', `/api/fmea?fmeaId=${FMEA_ID}`);
  const wsData = wsRes.data;
  const l2Data = wsData.l2 || wsData.data?.l2 || [];
  if (!l2Data.length) {
    console.error('❌ 워크시트 데이터 로드 실패: l2Data가 비어있음');
    return;
  }
  console.log(`  ✅ L2 공정 수: ${l2Data.length}개`);

  // L2 데이터 요약
  let totalL3 = 0;
  let totalFunctions = 0;
  let totalProductChars = 0;
  let totalProcessChars = 0;
  const l2Summary = [];

  for (const l2 of l2Data) {
    const l3Count = (l2.l3 || []).length;
    const funcCount = (l2.functions || []).length;
    let pcCount = 0;
    let prCount = 0;

    for (const func of (l2.functions || [])) {
      pcCount += (func.productChars || []).length;
    }
    for (const l3 of (l2.l3 || [])) {
      for (const func of (l3.functions || [])) {
        prCount += (func.processChars || []).length;
      }
      // 폴백: l3.processChars
      if (prCount === 0 && l3.processChars) {
        prCount += l3.processChars.length;
      }
    }

    totalL3 += l3Count;
    totalFunctions += funcCount;
    totalProductChars += pcCount;
    totalProcessChars += prCount;

    l2Summary.push({
      no: l2.no,
      name: l2.name,
      l3: l3Count,
      funcs: funcCount,
      productChars: pcCount,
      processChars: prCount,
    });
  }

  console.log(`  ✅ L3 작업요소: ${totalL3}개`);
  console.log(`  ✅ L2 기능: ${totalFunctions}개`);
  console.log(`  ✅ 제품특성: ${totalProductChars}개`);
  console.log(`  ✅ 공정특성: ${totalProcessChars}개`);

  console.log('\n  📊 공정별 요약:');
  for (const s of l2Summary) {
    console.log(`    [${s.no}] ${s.name}: L3=${s.l3}, 기능=${s.funcs}, 제품특성=${s.productChars}, 공정특성=${s.processChars}`);
  }

  // ============================================
  // STEP 2: 4M 분류별 L3 분석
  // ============================================
  console.log('\n📌 STEP 2: 4M 분류별 L3 분석...');
  let mnCount = 0, mcCount = 0, imCount = 0, enCount = 0, noM4Count = 0;
  const mnItems = [];

  for (const l2 of l2Data) {
    for (const l3 of (l2.l3 || [])) {
      const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
      if (m4 === 'MN') { mnCount++; mnItems.push(`${l2.no}-${l3.name}`); }
      else if (m4 === 'MC' || m4 === 'MD' || m4 === 'JG') mcCount++;
      else if (m4 === 'IM') imCount++;
      else if (m4 === 'EN') enCount++;
      else noM4Count++;
    }
  }

  console.log(`  MN(사람): ${mnCount}개 ← CP 제외`);
  console.log(`  MC(설비): ${mcCount}개 ← CP 포함`);
  console.log(`  IM(부자재): ${imCount}개 ← CP 포함`);
  console.log(`  EN(환경): ${enCount}개 ← CP 포함`);
  if (noM4Count > 0) console.log(`  ⚠️ m4 없음: ${noM4Count}개`);
  console.log(`  → CP 예상 대상: ${mcCount + imCount + enCount + noM4Count}개 L3`);

  // ============================================
  // STEP 3: CP 생성 API 호출 (create-cp)
  // ============================================
  console.log('\n📌 STEP 3: CP 생성 API 호출...');

  // Registration에서 subject, customer 조회
  const regRes = await request('GET', `/api/pfmea/registration?fmeaId=${FMEA_ID}`);
  const regData = regRes.data?.data || regRes.data;
  const subject = regData?.subject || '자체 변환 JD1';
  const customer = regData?.customerName || '';

  const createRes = await request('POST', '/api/pfmea/create-cp', {
    fmeaId: FMEA_ID,
    cpNo: CP_NO,
    l2Data,
    subject,
    customer,
  });

  if (!createRes.data.success) {
    console.error('❌ CP 생성 실패:', createRes.data.error);
    console.error('   상세:', JSON.stringify(createRes.data).substring(0, 500));
    return;
  }

  console.log(`  ✅ CP 생성 성공!`);
  console.log(`  ✅ CP 번호: ${createRes.data.data.cpNo}`);
  console.log(`  ✅ 생성된 항목: ${createRes.data.data.itemCount}건`);

  // ============================================
  // STEP 4: 생성된 CP 데이터 검증
  // ============================================
  console.log('\n📌 STEP 4: 생성된 CP 데이터 검증...');

  const cpItemsRes = await request('GET', `/api/control-plan/${CP_NO}/items`);

  if (!cpItemsRes.data.success && !cpItemsRes.data.items) {
    // 직접 DB에서 조회하자
    console.log('  ℹ️ items API가 없으므로 DB에서 직접 조회합니다...');
  }

  // DB에서 직접 CP Items 조회 (Prisma 7 + pg adapter)
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const cp = await prisma.controlPlan.findUnique({
      where: { cpNo: CP_NO },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!cp) {
      console.error('❌ CP를 DB에서 찾을 수 없음');
      return;
    }

    const items = cp.items || [];
    console.log(`  ✅ DB에서 조회된 CP 항목: ${items.length}건`);

    // rowType별 통계
    const byType = {};
    const byProcess = {};
    const issues = [];

    for (const item of items) {
      // rowType 통계
      byType[item.rowType] = (byType[item.rowType] || 0) + 1;

      // 공정별 통계
      const pKey = `${item.processNo} ${item.processName}`;
      if (!byProcess[pKey]) byProcess[pKey] = { product: 0, process: 0, structure: 0, total: 0 };
      byProcess[pKey][item.rowType] = (byProcess[pKey][item.rowType] || 0) + 1;
      byProcess[pKey].total++;

      // 데이터 품질 검사
      if (!item.processNo) issues.push(`ID=${item.id}: 공정번호 누락`);
      if (!item.processName) issues.push(`ID=${item.id}: 공정명 누락`);
      if (item.rowType === 'product' && !item.productChar) {
        issues.push(`[${item.processNo}] 제품특성 행인데 productChar 빈값`);
      }
      if (item.rowType === 'process' && !item.processChar) {
        issues.push(`[${item.processNo}] 공정특성 행인데 processChar 빈값`);
      }
      if (item.rowType === 'process' && !item.equipment) {
        issues.push(`[${item.processNo}] 공정특성 행인데 equipment 빈값 (workElement: ${item.workElement})`);
      }
      // 분리배치 위반 검사
      if (item.productChar && item.processChar) {
        issues.push(`[${item.processNo}] ⚠️ 분리배치 위반! 같은 행에 제품특성+공정특성`);
      }
    }

    console.log(`\n  📊 rowType별 통계:`);
    for (const [type, count] of Object.entries(byType)) {
      console.log(`    ${type}: ${count}건`);
    }

    console.log(`\n  📊 공정별 CP 행 수:`);
    for (const [proc, counts] of Object.entries(byProcess)) {
      const c = counts;
      console.log(`    [${proc}] 총 ${c.total}건 (제품특성: ${c.product}, 공정특성: ${c.process}, 구조: ${c.structure})`);
    }

    // 이슈 보고
    if (issues.length > 0) {
      console.log(`\n  ⚠️ 데이터 품질 이슈 ${issues.length}건:`);
      for (const issue of issues.slice(0, 20)) {
        console.log(`    - ${issue}`);
      }
      if (issues.length > 20) {
        console.log(`    ... 외 ${issues.length - 20}건`);
      }
    } else {
      console.log('\n  ✅ 데이터 품질 이슈 없음!');
    }

    // ============================================
    // STEP 5: 클라이언트 동기화 시뮬레이션
    // ============================================
    console.log('\n📌 STEP 5: 클라이언트 동기화 (syncPfmeaToCP) 시뮬레이션...');

    // 클라이언트 동기화 로직과 서버 API 결과 비교
    let clientCpRowCount = 0;
    let clientProductChars = 0;
    let clientProcessChars = 0;

    for (const l2 of l2Data) {
      const l3Items = l2.l3 || [];
      for (const l3 of l3Items) {
        const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
        if (m4 === 'MN') continue;
        const name = (l3.name || '').trim();
        if (!name || name.includes('클릭') || name.includes('추가')) continue;
        clientCpRowCount++;

        // 클라이언트에서는 첫 번째 processChar만 가져옴
        const weFunctions = l3.functions || [];
        if (weFunctions[0]?.processChars?.[0]) clientProcessChars++;
      }

      // 클라이언트에서는 첫 번째 productChar만 가져옴
      const funcs = l2.functions || [];
      if (funcs[0]?.productChars?.[0]) clientProductChars++;
    }

    console.log(`  클라이언트 예상 CP 행: ${clientCpRowCount}건`);
    console.log(`  서버 생성 CP 행: ${items.length}건`);
    console.log(`  차이: ${Math.abs(clientCpRowCount - items.length)}건`);

    if (clientCpRowCount !== items.length) {
      console.log('  ⚠️ 클라이언트와 서버 CP 행 수 불일치!');
      console.log('  원인: 서버는 분리배치(제품특성/공정특성 별도 행) 적용, 클라이언트는 L3당 1행');
    }

    // ============================================
    // STEP 6: 연동 데이터 상세 검증
    // ============================================
    console.log('\n📌 STEP 6: 연동 데이터 상세 검증...');

    // 제품특성 행 검증
    const productItems = items.filter(i => i.rowType === 'product');
    console.log(`\n  📋 제품특성 행 (${productItems.length}건):`);
    for (const item of productItems.slice(0, 10)) {
      console.log(`    [${item.processNo}] ${item.processName}: "${item.productChar}" (특별특성: ${item.specialChar || '-'})`);
    }
    if (productItems.length > 10) console.log(`    ... 외 ${productItems.length - 10}건`);

    // 공정특성 행 검증
    const processItems = items.filter(i => i.rowType === 'process');
    console.log(`\n  📋 공정특성 행 (${processItems.length}건):`);
    for (const item of processItems.slice(0, 10)) {
      console.log(`    [${item.processNo}] ${item.equipment}: "${item.processChar}" (특별특성: ${item.specialChar || '-'})`);
    }
    if (processItems.length > 10) console.log(`    ... 외 ${processItems.length - 10}건`);

    // 구조 행 검증
    const structureItems = items.filter(i => i.rowType === 'structure');
    console.log(`\n  📋 구조 행 (${structureItems.length}건 — 특성 없는 L3):`);
    for (const item of structureItems.slice(0, 10)) {
      console.log(`    [${item.processNo}] ${item.processName} / ${item.equipment || item.workElement || '(없음)'}`);
    }
    if (structureItems.length > 10) console.log(`    ... 외 ${structureItems.length - 10}건`);

    // ============================================
    // STEP 7: sync-to-cp/all API 테스트
    // ============================================
    console.log('\n📌 STEP 7: sync-to-cp/all 통합 연동 API 테스트...');

    const syncRes = await request('POST', '/api/pfmea/sync-to-cp/all', {
      fmeaId: FMEA_ID,
      cpNo: CP_NO,
      l2Data,
      riskData: wsData.riskData || {},
    });

    if (!syncRes.data.success) {
      console.error('❌ 통합 연동 실패:', syncRes.data.error);
    } else {
      console.log(`  ✅ 통합 연동 성공!`);
      console.log(`  ✅ 총 항목: ${syncRes.data.data.totalItems}건`);
      console.log(`  ✅ 소요시간: ${syncRes.data.data.duration}ms`);

      if (syncRes.data.data.results) {
        console.log('  📊 단계별 결과:');
        for (const r of syncRes.data.data.results) {
          console.log(`    [${r.step}] ${r.name}: ${r.message}`);
        }
      }
    }

    // ============================================
    // STEP 8: 최종 CP 데이터 재검증
    // ============================================
    console.log('\n📌 STEP 8: 최종 CP 데이터 재검증...');

    const finalCp = await prisma.controlPlan.findUnique({
      where: { cpNo: CP_NO },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const finalItems = finalCp?.items || [];
    console.log(`  ✅ 최종 CP 항목: ${finalItems.length}건`);
    console.log(`  ✅ CP 상태: ${finalCp?.status}`);
    console.log(`  ✅ 동기화 상태: ${finalCp?.syncStatus}`);
    console.log(`  ✅ 마지막 동기화: ${finalCp?.lastSyncAt}`);

    // 최종 통계
    const finalByType = {};
    for (const item of finalItems) {
      finalByType[item.rowType] = (finalByType[item.rowType] || 0) + 1;
    }
    console.log('\n  📊 최종 rowType별 통계:');
    for (const [type, count] of Object.entries(finalByType)) {
      console.log(`    ${type}: ${count}건`);
    }

    // ============================================
    // 최종 보고
    // ============================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  CP 연동 테스트 최종 보고');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ✅ CP 생성: ${CP_NO}`);
    console.log(`  ✅ 총 CP 항목: ${finalItems.length}건`);
    console.log(`  ✅ 제품특성 행: ${finalByType['product'] || 0}건`);
    console.log(`  ✅ 공정특성 행: ${finalByType['process'] || 0}건`);
    console.log(`  ✅ 구조 행: ${finalByType['structure'] || 0}건`);

    if (issues.length > 0) {
      console.log(`\n  ⚠️ 발견된 이슈: ${issues.length}건 (위 상세 참조)`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ 에러:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
  }
}

main().catch(console.error);
