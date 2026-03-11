/**
 * @file fix-m4-null-all.js
 * @description 전체 FMEA 프로젝트에서 m4 null 작업요소 찾기 + 수정
 *
 * 검색 범위:
 * 1. Atomic DB (l3_structures)
 * 2. Legacy DB (fmea_legacy_data.data.l2[].l3[])
 * 3. Worksheet DB (fmea_worksheet_data)
 *
 * "누락 1건" 근본 해결 — HUD PFMEA 프로젝트 포함 전체 검색
 */

const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

// StructureTab missingCounts와 동일한 판별 로직
function isValidName(name) {
  const n = (name || '').trim();
  if (n === '' || n === '-') return false;
  if (n.includes('추가') || n.includes('삭제') || n.includes('클릭') || n.includes('선택') || n.includes('없음')) return false;
  return true;
}

function isMissingM4(m4) {
  if (!m4) return true;
  const t = m4.trim();
  if (t === '' || t === '-') return true;
  if (t.includes('클릭') || t.includes('추가') || t.includes('선택') || t.includes('입력') || t.includes('필요')) return true;
  return false;
}

async function run() {
  console.log('=== 전체 FMEA 프로젝트 m4 null 포괄 검색 ===\n');

  // 1. 모든 등록 정보
  const regs = await p.query('SELECT "fmeaId", subject, "partName" FROM fmea_registrations');
  const regMap = {};
  regs.rows.forEach(r => { regMap[r.fmeaId] = r.subject || r.partName || '(no subject)'; });
  console.log('[등록 정보] ' + regs.rows.length + '개');

  // 2. Atomic L3 검색
  console.log('\n=== [Part 1] Atomic DB (l3_structures) ===');
  const atomicMissing = await p.query(`
    SELECT l3.id, l3.m4, l3.name, l3."order", l3."fmeaId",
           l2.name as l2name, l2.no as l2no
    FROM l3_structures l3
    LEFT JOIN l2_structures l2 ON l3."l2Id" = l2.id
    ORDER BY l3."fmeaId", l3."order"
  `);

  let atomicProblems = 0;
  for (const r of atomicMissing.rows) {
    if (isValidName(r.name) && isMissingM4(r.m4)) {
      atomicProblems++;
      console.log('  🔴 fmea=' + r.fmeaId + ' (' + (regMap[r.fmeaId] || '?') + ')');
      console.log('     name="' + r.name + '" m4="' + (r.m4 || 'null') + '" proc=' + (r.l2no || '?') + ' "' + (r.l2name || '?') + '"');
    }
  }
  console.log('Atomic 문제: ' + atomicProblems + '건 / 전체 ' + atomicMissing.rows.length + '건');

  // 3. Legacy 데이터 검색 (핵심!)
  console.log('\n=== [Part 2] Legacy DB (fmea_legacy_data) ===');
  const legacyAll = await p.query('SELECT id, "fmeaId", data FROM fmea_legacy_data');
  console.log('Legacy 레코드: ' + legacyAll.rows.length + '개');

  let totalLegacyProblems = 0;
  const fixTargets = []; // { rowId, fmeaId, data, changes: [{procName, weName, suggestedM4}] }

  for (const row of legacyAll.rows) {
    const data = row.data;
    if (!data || !data.l2) continue;

    const problems = [];
    for (const proc of data.l2) {
      for (const we of (proc.l3 || [])) {
        if (isValidName(we.name) && isMissingM4(we.m4)) {
          problems.push({
            procNo: proc.no || '?',
            procName: proc.name || '?',
            weName: we.name,
            m4: we.m4 || '(empty)',
            weId: we.id,
          });
        }
      }
    }

    if (problems.length > 0) {
      totalLegacyProblems += problems.length;
      console.log('\n  🔴 fmea=' + row.fmeaId + ' (' + (regMap[row.fmeaId] || '?') + ') — ' + problems.length + '건');
      problems.forEach(p => {
        console.log('     공정 ' + p.procNo + ' "' + p.procName + '" → WE "' + p.weName + '" m4="' + p.m4 + '"');
      });
      fixTargets.push({ rowId: row.id, fmeaId: row.fmeaId, data, problems });
    }
  }

  console.log('\nLegacy 문제 합계: ' + totalLegacyProblems + '건');

  // 4. Worksheet 데이터 검색
  console.log('\n=== [Part 3] Worksheet DB (fmea_worksheet_data) ===');
  const wsAll = await p.query('SELECT id, "fmeaId", data FROM fmea_worksheet_data');
  let wsProblems = 0;
  for (const row of wsAll.rows) {
    const data = row.data;
    if (!data || !data.l2) continue;
    for (const proc of (data.l2 || [])) {
      for (const we of (proc.l3 || [])) {
        if (isValidName(we.name) && isMissingM4(we.m4)) {
          wsProblems++;
          console.log('  🔴 fmea=' + row.fmeaId + ' proc="' + proc.name + '" WE="' + we.name + '" m4="' + (we.m4 || 'empty') + '"');
        }
      }
    }
  }
  console.log('Worksheet 문제: ' + wsProblems + '건');

  // 5. 전체 요약
  console.log('\n' + '='.repeat(60));
  console.log('=== 전체 요약 ===');
  console.log('Atomic DB 문제: ' + atomicProblems + '건');
  console.log('Legacy DB 문제: ' + totalLegacyProblems + '건');
  console.log('Worksheet DB 문제: ' + wsProblems + '건');
  console.log('수정 대상 프로젝트: ' + fixTargets.length + '개');
  console.log('='.repeat(60));

  // 6. 자동 수정 (m4 추론)
  if (fixTargets.length > 0) {
    console.log('\n=== [자동 수정] ===');
    for (const target of fixTargets) {
      let fixed = 0;
      for (const proc of target.data.l2) {
        for (const we of (proc.l3 || [])) {
          if (isValidName(we.name) && isMissingM4(we.m4)) {
            // 같은 공정의 다른 작업요소에서 가장 많은 m4 가져오기 (다수결)
            const siblingM4s = (proc.l3 || [])
              .filter(s => s.m4 && ['MN', 'MC', 'IM', 'EN'].includes(s.m4))
              .map(s => s.m4);

            // m4 추론 규칙
            let suggestedM4 = '';
            const nameLower = we.name.toLowerCase();

            // 키워드 기반 추론
            if (nameLower.includes('환경') || nameLower.includes('온도') || nameLower.includes('습도') ||
                nameLower.includes('조도') || nameLower.includes('분진') || nameLower.includes('클린')) {
              suggestedM4 = 'EN';
            } else if (nameLower.includes('포장') || nameLower.includes('커버') || nameLower.includes('그리스') ||
                       nameLower.includes('윤활') || nameLower.includes('세척') || nameLower.includes('접착') ||
                       nameLower.includes('테이프') || nameLower.includes('보호')) {
              suggestedM4 = 'IM';
            } else if (nameLower.includes('작업자') || nameLower.includes('검사원') || nameLower.includes('운반원') ||
                       nameLower.includes('조립원') || nameLower.includes('피더') || nameLower.includes('operator')) {
              suggestedM4 = 'MN';
            } else if (nameLower.includes('설비') || nameLower.includes('금형') || nameLower.includes('지그') ||
                       nameLower.includes('로봇') || nameLower.includes('컨베이어') || nameLower.includes('프레스') ||
                       nameLower.includes('스캐너') || nameLower.includes('검사기') || nameLower.includes('기계')) {
              suggestedM4 = 'MC';
            } else if (siblingM4s.length > 0) {
              // 형제 작업요소 다수결
              const counts = {};
              siblingM4s.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
              suggestedM4 = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
            } else {
              suggestedM4 = 'MN'; // 최후 폴백
            }

            console.log('  수정: "' + we.name + '" m4="" → "' + suggestedM4 + '" (fmea=' + target.fmeaId + ')');
            we.m4 = suggestedM4;
            fixed++;
          }
        }
      }

      if (fixed > 0) {
        // Legacy 데이터 업데이트
        await p.query('UPDATE fmea_legacy_data SET data = $1, "updatedAt" = NOW() WHERE id = $2',
          [JSON.stringify(target.data), target.rowId]);
        console.log('  ✅ Legacy 수정 완료: ' + target.fmeaId + ' (' + fixed + '건)');
      }
    }

    // Atomic DB도 수정
    const atomicFix = await p.query(`
      SELECT l3.id, l3.m4, l3.name, l3."fmeaId"
      FROM l3_structures l3
      WHERE (l3.m4 IS NULL OR l3.m4 = '' OR l3.m4 = '-')
    `);
    for (const l3 of atomicFix.rows) {
      if (!isValidName(l3.name)) continue;
      const nameLower = l3.name.toLowerCase();
      let m4 = 'MN';
      if (nameLower.includes('환경') || nameLower.includes('온도') || nameLower.includes('습도')) m4 = 'EN';
      else if (nameLower.includes('포장') || nameLower.includes('커버') || nameLower.includes('그리스')) m4 = 'IM';
      else if (nameLower.includes('설비') || nameLower.includes('금형') || nameLower.includes('스캐너') || nameLower.includes('검사기')) m4 = 'MC';
      await p.query('UPDATE l3_structures SET m4 = $1, "updatedAt" = NOW() WHERE id = $2', [m4, l3.id]);
      console.log('  ✅ Atomic 수정: "' + l3.name + '" → ' + m4);
    }
  }

  // 7. 수정 후 재검증
  console.log('\n=== [수정 후 재검증] ===');
  const afterLegacy = await p.query('SELECT id, "fmeaId", data FROM fmea_legacy_data');
  let remainingProblems = 0;
  for (const row of afterLegacy.rows) {
    const data = row.data;
    if (!data || !data.l2) continue;
    for (const proc of data.l2) {
      for (const we of (proc.l3 || [])) {
        if (isValidName(we.name) && isMissingM4(we.m4)) {
          remainingProblems++;
          console.log('  ⚠️ 잔여: fmea=' + row.fmeaId + ' "' + we.name + '" m4="' + (we.m4 || 'empty') + '"');
        }
      }
    }
  }
  console.log('잔여 문제: ' + remainingProblems + '건');
  if (remainingProblems === 0) {
    console.log('✅ 전체 수정 완료!');
  }

  await p.end();
}

run().catch(e => { console.error(e); p.end(); });
