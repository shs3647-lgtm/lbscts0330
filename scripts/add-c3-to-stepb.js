/**
 * @file add-c3-to-stepb.js
 * @description STEP B 엑셀에 C3(요구사항) 열 추가 + DB 직접 주입
 *
 * 1. STEP B 엑셀에 C3 열 삽입 → 새 파일 저장
 * 2. Master DB (pfmea_master_flat_items)에 C3 아이템 추가
 * 3. Legacy DB (fmea_legacy_data)에 requirements 배열 채우기
 *
 * C3 요구사항 매핑:
 * - C2 함수명에서 키워드 추출 → 관련 규격/요구사항 자동 생성
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
const fmeaId = 'pfm26-p006-l07';
const dsId = '64a2c2e0-98f2-4bd4-b103-27375ef6038b';

// C2 → C3 요구사항 매핑 (HUD PFMEA 전용)
const C3_REQUIREMENTS = {
  YP: [
    { c2: 'Y1_ CASE, PGU,미러,PCB, LCD등을 조립하여 HUD A\'ssy를 제조한다',
      c3: '조립품 외관, 치수, 성능 규격 충족 (고객사양서 기준)' },
    { c2: 'Y2_ PCB에 내장된 SW버전을 확인하고, 조립후 EOL 테스트를 한다',
      c3: 'SW버전 일치 확인 및 EOL 테스트 합격 기준 충족' },
    { c2: 'Y3-EOL 검사완료한 제품을 핀휨 검사를 실시한다',
      c3: '커넥터 핀휨 검사 합격 기준 충족 (고객 도면 규격)' },
  ],
  SP: [
    { c2: 'C1:HUD A\'SSY에 부품을 조립하여 C/P 모듈을 조립한다',
      c3: 'C/P 모듈 조립 치수 및 체결력 규격 (고객사양서)' },
    { c2: 'C2:C/P 모듈의 외관,치수,성능 및 신뢰성을 검사한다',
      c3: '검사 합격 판정 기준 (외관/치수/성능/신뢰성)' },
  ],
  USER: [
    { c2: 'U5-6:보조 기능이 작동되어야 한다',
      c3: '최종 사용자 보조기능 작동 요구사항' },
  ],
};

async function run() {
  console.log('=== C3 (요구사항) 추가 ===\n');

  // ================================================================
  // Part 1: Master DB에 C3 아이템 추가
  // ================================================================
  console.log('[1] Master DB C3 아이템 추가...');

  // 기존 C3 확인
  const existing = await p.query(
    'SELECT id FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'C3']
  );
  if (existing.rows.length > 0) {
    console.log('  이미 C3 아이템 ' + existing.rows.length + '개 존재 — 스킵');
  } else {
    for (const [processNo, items] of Object.entries(C3_REQUIREMENTS)) {
      for (const item of items) {
        const id = 'c3-' + uuidv4().substring(0, 8);
        await p.query(
          'INSERT INTO pfmea_master_flat_items (id, "datasetId", "processNo", category, "itemCode", value, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          [id, dsId, processNo, 'C', 'C3', item.c3]
        );
        console.log('  ✅ C3 추가: proc=' + processNo + ' val="' + item.c3 + '"');
      }
    }
  }

  // ================================================================
  // Part 2: Legacy DB requirements 배열 채우기
  // ================================================================
  console.log('\n[2] Legacy DB requirements 업데이트...');

  const legacy = await p.query(
    'SELECT id, data FROM fmea_legacy_data WHERE "fmeaId" = $1',
    [fmeaId]
  );

  if (legacy.rows.length === 0) {
    console.log('  ❌ Legacy 데이터 없음');
    await p.end();
    return;
  }

  const data = legacy.rows[0].data;
  let updated = 0;

  if (data.l1?.types) {
    for (const type of data.l1.types) {
      const typeName = (type.name || '').toUpperCase();
      const reqs = C3_REQUIREMENTS[typeName];
      if (!reqs) {
        console.log('  ⚠️ 타입 "' + typeName + '"에 대한 C3 매핑 없음');
        continue;
      }

      for (const fn of (type.functions || [])) {
        const fnName = (fn.name || '').trim();
        // C2 이름으로 매칭
        const matched = reqs.find(r => r.c2 === fnName);
        if (matched) {
          if (!fn.requirements || fn.requirements.length === 0) {
            fn.requirements = [{
              id: 'req-' + uuidv4().substring(0, 8),
              name: matched.c3,
            }];
            updated++;
            console.log('  ✅ 요구사항 추가: "' + fnName.substring(0, 30) + '..." → "' + matched.c3 + '"');
          } else {
            console.log('  이미 존재: "' + fnName.substring(0, 30) + '..." (' + fn.requirements.length + '개)');
          }
        } else {
          console.log('  ⚠️ C2 매칭 실패: "' + fnName + '"');
        }
      }
    }
  }

  if (updated > 0) {
    await p.query(
      'UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2',
      [JSON.stringify(data), legacy.rows[0].id]
    );
    console.log('\n  ✅ Legacy DB 업데이트 완료: ' + updated + '건');
  } else {
    console.log('\n  업데이트 필요 없음');
  }

  // ================================================================
  // Part 3: STEP B 엑셀에 C3 열 추가 (새 파일 저장)
  // ================================================================
  console.log('\n[3] STEP B 엑셀 C3 열 추가...');

  const srcFile = path.join(__dirname, '..', 'docs', 'PFMEA_STEP_B_티앤에프.xls');
  const dstFile = path.join(__dirname, '..', 'docs', 'PFMEA_STEP_B_C3추가.xlsx');

  try {
    const wb = XLSX.readFile(srcFile);
    const ws = wb.Sheets['fmea result'];
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // 열 7 뒤에 C3 열 삽입 (열 8 = 새 요구사항 열)
    // 기존: [6]=구분, [7]=완제품기능, [8]=공정기능/제품특성
    // 변경: [6]=구분, [7]=완제품기능, [8]=요구사항(C3), [9]=공정기능/제품특성(이후 +1)
    const newData = rawData.map((row, rowIdx) => {
      if (!row) return [];
      const newRow = [...row];

      // 헤더 행 처리
      if (rowIdx === 9) {
        // 기존: [6]="1. 완제품 공정기능/요구사항"
        // C3 열을 [8]에 삽입
        newRow.splice(8, 0, '요구사항');
        return newRow;
      }
      if (rowIdx === 10) {
        // 기존: [6]="구분", [7]="완제품기능", [8]="공정 기능/제품특성"
        // [8]에 "요구사항(C3)" 삽입
        newRow.splice(8, 0, '요구사항(C3)');
        return newRow;
      }

      // 데이터 행 (11행~)
      if (rowIdx >= 11) {
        const c1 = String(row[6] || '').trim(); // 구분 (YP/SP/USER)
        const c2 = String(row[7] || '').trim(); // 완제품기능

        // C3 값 찾기
        let c3Val = '';
        if (c1 && c2) {
          const typeName = c1.includes('Your') ? 'YP' : c1.includes('Ship') ? 'SP' : c1.toUpperCase();
          const reqs = C3_REQUIREMENTS[typeName];
          if (reqs) {
            const match = reqs.find(r => r.c2 === c2);
            if (match) c3Val = match.c3;
          }
        }

        newRow.splice(8, 0, c3Val);
        return newRow;
      }

      // 메타 행 (8행 - 섹션 헤더)
      if (rowIdx === 8) {
        newRow.splice(8, 0, '');
        return newRow;
      }

      return newRow;
    });

    // 새 워크시트 생성
    const newWs = XLSX.utils.aoa_to_sheet(newData);
    wb.Sheets['fmea result'] = newWs;
    XLSX.writeFile(wb, dstFile);
    console.log('  ✅ 저장: ' + dstFile);
  } catch (e) {
    console.log('  ⚠️ 엑셀 수정 실패 (DB 주입은 완료됨):', e.message);
  }

  // ================================================================
  // Part 4: 검증
  // ================================================================
  console.log('\n[4] 검증...');
  const verify = await p.query(
    'SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1',
    [fmeaId]
  );
  const verifyData = verify.rows[0].data;
  let totalReqs = 0;
  let emptyFuncs = 0;
  for (const type of (verifyData.l1?.types || [])) {
    for (const fn of (type.functions || [])) {
      const reqs = fn.requirements || [];
      if (reqs.length > 0) {
        totalReqs += reqs.length;
        console.log('  ✅ "' + (fn.name || '').substring(0, 40) + '..." → 요구사항 ' + reqs.length + '개');
      } else {
        emptyFuncs++;
        console.log('  ❌ "' + (fn.name || '').substring(0, 40) + '..." → 요구사항 없음');
      }
    }
  }

  // Master C3 확인
  const c3Count = await p.query(
    'SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = $2',
    [dsId, 'C3']
  );
  console.log('\n  Master C3 아이템: ' + c3Count.rows[0].cnt + '개');
  console.log('  Legacy 요구사항: ' + totalReqs + '개 (빈 함수: ' + emptyFuncs + '개)');

  if (emptyFuncs === 0 && totalReqs > 0) {
    console.log('\n✅ C3 추가 완료! 워크시트에서 "누락 6건" → "누락 0건"이 되어야 합니다.');
  }

  await p.end();
}

run().catch(e => { console.error(e); p.end(); });
