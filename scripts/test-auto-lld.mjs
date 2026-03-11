/**
 * FMEA LLD 자동선택 E2E 검증 스크립트
 * 실행: node scripts/test-auto-lld.mjs
 *
 * 검증 항목:
 * 1. /api/lessons-learned API 정상 응답
 * 2. FMEA 프로젝트에 failureLinks 데이터 존재 확인
 * 3. processedFMGroups 생성 시뮬레이션
 * 4. 자동선택 후보 수집 로직 검증
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
  console.log('LLD 자동선택 E2E 검증');
  console.log('='.repeat(70));

  // ============ 1. LLD API 테스트 ============
  console.log('\n📌 1. /api/lessons-learned API 검증');

  let lldItems = [];
  try {
    const res = await fetch(`${API_BASE}/lessons-learned`);
    const data = await res.json();
    assert(res.ok, `API 응답 OK (status=${res.status})`);
    assert(data.success !== undefined, `응답에 success 필드 존재`);
    if (data.success && data.items) {
      lldItems = data.items;
      assert(Array.isArray(data.items), `items 배열 (${data.items.length}건)`);
      if (data.items.length > 0) {
        const first = data.items[0];
        assert(first.lldNo, `첫 항목 lldNo 존재: ${first.lldNo}`);
        assert(first.failureMode || first.improvement, `첫 항목 고장형태/개선대책 존재`);
        assert(first.category, `첫 항목 category 존재: ${first.category}`);
      }
    } else {
      console.log(`  ⚠️ LLD 데이터 없음 — 샘플 데이터 사용 예정`);
    }
  } catch (e) {
    console.log(`  ⚠️ LLD API 연결 실패: ${e.message}`);
    console.log(`  → 서버 실행 여부 확인: npm run dev`);
    process.exit(1);
  }

  // ============ 2. FMEA 프로젝트 데이터 확인 ============
  console.log('\n📌 2. FMEA 프로젝트 데이터 확인');

  let fmeaState = null;
  try {
    const res = await fetch(`${API_BASE}/fmea?id=${TEST_FMEA_ID}`);
    const data = await res.json();
    assert(data.success === true, `FMEA 조회 성공`);

    if (data.data) {
      fmeaState = data.data;

      // legacyData에서 failureLinks 확인
      const legacyData = fmeaState.legacyData;
      if (legacyData) {
        let parsed = legacyData;
        if (typeof legacyData === 'string') {
          try { parsed = JSON.parse(legacyData); } catch { parsed = {}; }
        }
        const failureLinks = parsed.failureLinks || [];
        assert(failureLinks.length > 0, `failureLinks 존재 (${failureLinks.length}건)`);

        if (failureLinks.length > 0) {
          const first = failureLinks[0];
          assert(first.fmId, `첫 링크 fmId 존재: ${first.fmId}`);
          assert(first.fcId, `첫 링크 fcId 존재: ${first.fcId}`);
          assert(first.feId, `첫 링크 feId 존재: ${first.feId}`);

          // fmId/fcId 비어있는 링크 카운트
          const emptyFmId = failureLinks.filter(l => !l.fmId).length;
          const emptyFcId = failureLinks.filter(l => !l.fcId).length;
          console.log(`  📊 fmId 빈 링크: ${emptyFmId}건, fcId 빈 링크: ${emptyFcId}건`);
          assert(emptyFmId < failureLinks.length, `유효한 fmId 링크 존재 (빈 것: ${emptyFmId}/${failureLinks.length})`);
          assert(emptyFcId < failureLinks.length, `유효한 fcId 링크 존재 (빈 것: ${emptyFcId}/${failureLinks.length})`);

          // ============ 3. processedFMGroups 시뮬레이션 ============
          console.log('\n📌 3. processedFMGroups 시뮬레이션');

          // FM별 그룹핑
          const fmMap = new Map();
          failureLinks.forEach(link => {
            if (!link.fmId) return;
            if (!fmMap.has(link.fmId)) {
              fmMap.set(link.fmId, {
                fmId: link.fmId,
                fmText: link.fmText || '',
                fes: new Map(),
                fcs: new Map(),
              });
            }
            const group = fmMap.get(link.fmId);
            if (link.feId && link.feText) {
              group.fes.set(link.feId, { text: link.feText, severity: link.feSeverity || 0 });
            }
            if (link.fcId && link.fcText) {
              group.fcs.set(link.fcId, { text: link.fcText });
            }
          });

          const fmGroups = Array.from(fmMap.entries()).map(([fmId, data]) => {
            const feList = Array.from(data.fes.entries());
            const fcList = Array.from(data.fcs.entries());
            const maxRows = Math.max(feList.length, fcList.length, 1);
            const rows = [];
            for (let i = 0; i < maxRows; i++) {
              const fe = feList[Math.min(i, feList.length - 1)];
              const fc = fcList[Math.min(i, fcList.length - 1)];
              rows.push({
                feId: fe ? fe[0] : '',
                fcId: fc ? fc[0] : '',
                fcText: fc ? fc[1].text : '',
              });
            }
            return { fmId, fmText: data.fmText, rows };
          });

          assert(fmGroups.length > 0, `FM 그룹 생성됨 (${fmGroups.length}개 FM)`);
          const totalRows = fmGroups.reduce((sum, g) => sum + g.rows.length, 0);
          assert(totalRows > 0, `총 FM-FC 행 (${totalRows}건)`);

          // ============ 4. 후보 수집 시뮬레이션 ============
          console.log('\n📌 4. 자동선택 후보 수집 시뮬레이션');

          // riskData 확인
          const riskData = parsed.riskData || {};
          let skippedNoId = 0;
          let skippedAllApplied = 0;
          let candidates = 0;

          fmGroups.forEach(fmGroup => {
            fmGroup.rows.forEach(row => {
              if (!row.fcId || !fmGroup.fmId) {
                skippedNoId++;
                return;
              }
              const uk = `${fmGroup.fmId}-${row.fcId}`;

              const existingLesson = ((riskData[`lesson-${uk}`] || '') + '').trim();
              const existingTarget = ((riskData[`lesson-target-${uk}`] || '') + '').trim();
              const prevApplied = existingLesson && (existingTarget === 'prevention' || existingTarget.includes('prevention'));
              const detApplied = existingLesson && (existingTarget === 'detection' || existingTarget.includes('detection'));

              if (prevApplied && detApplied) {
                skippedAllApplied++;
                return;
              }

              if (!prevApplied) candidates++;
              if (!detApplied) candidates++;
            });
          });

          console.log(`  📊 후보 수집 결과:`);
          console.log(`     totalRows:         ${totalRows}`);
          console.log(`     skippedNoId:       ${skippedNoId}`);
          console.log(`     skippedAllApplied: ${skippedAllApplied}`);
          console.log(`     candidates:        ${candidates}`);

          assert(candidates > 0, `후보 ${candidates}건 생성됨 (자동선택 가능)`);

          // 빈 fcId 비율 검사
          const emptyFcRows = fmGroups.reduce((sum, g) => sum + g.rows.filter(r => !r.fcId).length, 0);
          console.log(`     emptyFcId rows:    ${emptyFcRows}/${totalRows}`);
        }
      } else {
        console.log(`  ⚠️ legacyData 없음 — FMEA 프로젝트에 저장된 데이터 없음`);
      }
    }
  } catch (e) {
    console.log(`  ⚠️ FMEA 조회 실패: ${e.message}`);
  }

  // ============ 결과 ============
  console.log('\n' + '='.repeat(70));
  console.log(`총 ${passed + failed}건: ✅ ${passed} PASS, ❌ ${failed} FAIL`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\n💡 실패 항목 확인:');
    console.log('  - failureLinks 없으면: 고장분석(4단계) 먼저 완료 필요');
    console.log('  - fmId/fcId 빈 링크: 고장연결 데이터 재확인');
    console.log('  - candidates=0: riskData에 이미 lesson 적용됨');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('테스트 오류:', err);
  process.exit(1);
});
