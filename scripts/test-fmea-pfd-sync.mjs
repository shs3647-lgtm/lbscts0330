/**
 * FMEA→PFD 연동 통합 테스트 스크립트
 * 실행: node scripts/test-fmea-pfd-sync.mjs
 *
 * 검증 항목:
 * 1. create-pfd API: DB에서 L2Function/L3Function 읽어서 PFD 생성
 * 2. sync-from-fmea API: 완전한 DB 객체 반환
 * 3. PFD GET API: 렌더링 데이터 완전성
 * 4. redirect URL fmeaId 파라미터 일치
 */

const API_BASE = 'http://localhost:3000/api';
const TEST_FMEA_ID = 'pfm26-p001-l50';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('FMEA→PFD 연동 통합 테스트');
  console.log('='.repeat(70));

  // ============ 1. create-pfd API 테스트 ============
  console.log('\n📌 1. create-pfd API (FMEA→PFD 생성)');

  // 1a. fmeaId 없으면 400
  try {
    const res = await fetch(`${API_BASE}/pfmea/create-pfd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(res.status === 400, 'fmeaId 없으면 400 에러');
  } catch (e) {
    console.log(`  ⚠️ 서버 연결 실패: ${e.message}`);
    process.exit(1);
  }

  // 1b. create-pfd 실행 (DB에서 L2/L3 직접 조회)
  const createRes = await fetch(`${API_BASE}/pfmea/create-pfd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: TEST_FMEA_ID }),
  });
  const createData = await createRes.json();

  assert(createData.success === true, `create-pfd 성공 (success=${createData.success})`);
  assert(createData.data?.itemCount > 0, `아이템 생성됨 (${createData.data?.itemCount}건)`);
  assert(createData.data?.pfdNo, `pfdNo 반환됨 (${createData.data?.pfdNo})`);

  // ★★★ 핵심: redirectUrl에 fmeaId 파라미터 사용 (fromFmea 아님) ★★★
  const redirectUrl = createData.data?.redirectUrl || '';
  assert(redirectUrl.includes('fmeaId='), `redirectUrl에 fmeaId= 파라미터 포함: ${redirectUrl}`);
  assert(!redirectUrl.includes('fromFmea='), `redirectUrl에 fromFmea= 없음`);

  // ============ 2. DB에서 PFD 아이템 조회 (특성 데이터 검증) ============
  console.log('\n📌 2. PFD 아이템 특성 데이터 검증');

  const pfdNo = createData.data?.pfdNo || TEST_FMEA_ID.replace(/^pfm/i, 'pfd');
  const getRes = await fetch(`${API_BASE}/pfd/${pfdNo}`);
  const getData = await getRes.json();

  assert(getData.success === true, `PFD GET 성공`);
  const items = getData.data?.items || [];
  assert(items.length > 0, `PFD 아이템 존재 (${items.length}건)`);

  // 구조 데이터 (processNo, processName)
  const withProcessNo = items.filter(i => i.processNo?.trim());
  assert(withProcessNo.length > 0, `processNo 있는 아이템 (${withProcessNo.length}건)`);

  // ★★★ 핵심: 특성 데이터가 빈값이 아닌 아이템 존재 확인 ★★★
  const withProductChar = items.filter(i => i.productChar?.trim());
  const withProcessChar = items.filter(i => i.processChar?.trim());
  const withProcessDesc = items.filter(i => i.processDesc?.trim());
  const withEquipment = items.filter(i => i.equipment?.trim());
  const withProductSC = items.filter(i => i.productSC?.trim());
  const withProcessSC = items.filter(i => i.processSC?.trim());

  console.log(`  📊 특성 데이터 현황:`);
  console.log(`     productChar: ${withProductChar.length}건`);
  console.log(`     processChar: ${withProcessChar.length}건`);
  console.log(`     processDesc: ${withProcessDesc.length}건`);
  console.log(`     equipment:   ${withEquipment.length}건`);
  console.log(`     productSC:   ${withProductSC.length}건`);
  console.log(`     processSC:   ${withProcessSC.length}건`);

  // ★ 핵심 어서션: 빈행 아님 (최소한 processDesc 또는 productChar 또는 processChar 중 하나 있어야 함)
  const hasCharData = withProductChar.length > 0 || withProcessChar.length > 0 || withProcessDesc.length > 0;
  assert(hasCharData, `특성 데이터 존재 (빈행 아님!): productChar=${withProductChar.length}, processChar=${withProcessChar.length}, processDesc=${withProcessDesc.length}`);

  assert(withEquipment.length > 0, `설비(equipment) 데이터 존재 (${withEquipment.length}건)`);

  // fmeaL2Id 추적 필드 확인
  const withFmeaL2Id = items.filter(i => i.fmeaL2Id);
  assert(withFmeaL2Id.length > 0, `fmeaL2Id 추적 필드 존재 (${withFmeaL2Id.length}건)`);

  // ============ 3. sync-from-fmea API 테스트 ============
  console.log('\n📌 3. sync-from-fmea API (FMEA→PFD 동기화)');

  const syncRes = await fetch(`${API_BASE}/pfd/sync-from-fmea`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: TEST_FMEA_ID }),
  });
  const syncData = await syncRes.json();

  assert(syncData.success === true, `sync-from-fmea 성공`);
  assert(syncData.data?.itemCount > 0, `동기화 아이템 수 (${syncData.data?.itemCount}건)`);

  const syncItems = syncData.data?.items || [];
  assert(syncItems.length > 0, `응답 items 배열 존재 (${syncItems.length}건)`);

  if (syncItems.length > 0) {
    const first = syncItems[0];
    // ★★★ 핵심: 완전한 DB 객체 반환 (수동 구성 제한 객체 아님) ★★★
    assert(first.id !== undefined, `응답 items[0].id 존재`);
    assert(first.pfdId !== undefined, `응답 items[0].pfdId 존재`);
    assert(first.fmeaL2Id !== undefined, `응답 items[0].fmeaL2Id 존재 (이전 버그: 누락됐었음)`);
    assert(first.isDeleted !== undefined, `응답 items[0].isDeleted 존재 (DB 완전객체 증명)`);
    assert(first.createdAt !== undefined || first.sortOrder !== undefined, `응답 items[0] DB 필드 포함`);
  }

  // ============ 4. DB 일치 검증 ============
  console.log('\n📌 4. sync 후 DB 일치 검증');

  const dbRes2 = await fetch(`${API_BASE}/pfd/${pfdNo}`);
  const dbData2 = await dbRes2.json();
  const dbItems = (dbData2.data?.items || []).filter(i => !i.isDeleted);

  assert(dbItems.length === syncItems.length, `DB 아이템 수 일치: sync=${syncItems.length}, DB=${dbItems.length}`);

  // 첫 아이템 필드 비교
  if (dbItems.length > 0 && syncItems.length > 0) {
    assert(
      dbItems[0].processNo === syncItems[0].processNo,
      `processNo 일치: DB="${dbItems[0].processNo}" == sync="${syncItems[0].processNo}"`
    );
    assert(
      dbItems[0].processName === syncItems[0].processName,
      `processName 일치: DB="${dbItems[0].processName}" == sync="${syncItems[0].processName}"`
    );
  }

  // ============ 결과 ============
  console.log('\n' + '='.repeat(70));
  console.log(`총 ${passed + failed}건: ✅ ${passed} PASS, ❌ ${failed} FAIL`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('테스트 오류:', err);
  process.exit(1);
});
