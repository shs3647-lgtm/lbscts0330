/**
 * 공정특성(processChars) 교차매핑 DB 직접 수정 스크립트
 *
 * legacyData를 직접 읽어 processChars를 올바른 L3로 재배치 후 DB 저장
 *
 * 패턴: "XX번-장비명-특성명" → 장비명으로 올바른 L3 찾아 이동
 */
const { Client } = require('pg');

const DB_URL = 'postgresql://postgres:postgres@localhost:5432/fmea_db';
const SCHEMA = 'pfmea_pfm26_p008_l09';
const FMEA_ID = 'pfm26-p008-l09';

// ── 유틸리티 함수 ──

/** 문자열 정규화: 공백/구두점 제거 + 소문자 */
function normalize(s) {
  return s.replace(/[\s,.\-_()·]/g, '').toLowerCase();
}

/** "XX번-장비명-특성명" → 장비명 추출 */
function extractEquipRef(pcName) {
  // "XX번-장비명-특성명"
  const m1 = pcName.match(/^\d+번[-\s]?(.+?)-[^-]+$/);
  if (m1) return m1[1];
  // "XX번-장비명" (하이픈 끝 없음)
  const m2 = pcName.match(/^\d+번[-\s]?(.+?)$/);
  if (m2) {
    const parts = m2[1].split('-');
    if (parts.length >= 2) return parts[0];
  }
  return null;
}

/** "XX번-장비명" → 장비명 추출 */
function extractEquipName(l3Name) {
  const m1 = l3Name.match(/^\d+번[-\s]?(.+)$/);
  if (m1) return m1[1];
  return l3Name;
}

/** 오타 매핑 */
const TYPO_MAP = {
  '램핑기': '랩핑기',
  '랩핑기': '램핑기',
  '양불마스터': '양,불 마스터',
  '양,불 마스터': '양불마스터',
  '양불 마스터': '양불마스터',
  '비전 양불 마스터': '양불마스터',
};

/** 퍼지 장비명 비교 */
function isSameEquip(ref, weName) {
  if (!ref || !weName) return false;
  const nRef = normalize(ref);
  const nWe = normalize(weName);
  if (nRef === nWe) return true;
  if (nRef.includes(nWe) || nWe.includes(nRef)) return true;
  // 오타 매핑
  for (const [k, v] of Object.entries(TYPO_MAP)) {
    const nk = normalize(k);
    const nv = normalize(v);
    if (nRef === nk && (nv === nWe || nWe.includes(nv))) return true;
    if (nWe === nk && (nv === nRef || nRef.includes(nv))) return true;
  }
  return false;
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('═══════════════════════════════════════════════');
  console.log('  공정특성 교차매핑 DB 직접 수정');
  console.log(`  프로젝트: ${FMEA_ID}`);
  console.log('═══════════════════════════════════════════════\n');

  // 1. legacyData 읽기
  const res = await client.query(
    `SELECT data FROM ${SCHEMA}.fmea_legacy_data WHERE "fmeaId" = $1`,
    [FMEA_ID]
  );
  if (res.rows.length === 0) {
    console.error('legacyData 없음!');
    await client.end();
    return;
  }

  const data = res.rows[0].data;
  const l2Data = data.l2 || [];
  console.log(`L2 공정: ${l2Data.length}개\n`);

  let totalFixed = 0;
  let totalSkipped = 0;

  // 2. 각 공정별 교차매핑 분석 및 수정
  for (const l2 of l2Data) {
    const l3List = (l2.l3 || []).filter(l3 => (l3.name || '').trim());
    if (l3List.length < 2) continue;

    // L3별 장비명 매핑 구축
    const l3EquipMap = []; // { idx, name, equipName }
    l3List.forEach((l3, idx) => {
      l3EquipMap.push({
        idx,
        name: l3.name || '',
        equipName: extractEquipName((l3.name || '').trim()),
      });
    });

    // 모든 processChars 수집 및 교차매핑 확인
    const moves = []; // { srcL3Idx, srcFuncIdx, srcCharIdx, targetL3Idx, pchar, pcName }

    l3List.forEach((l3, l3Idx) => {
      (l3.functions || []).forEach((func, fIdx) => {
        (func.processChars || []).forEach((pchar, cIdx) => {
          const pcName = typeof pchar === 'string' ? pchar : (pchar.name || '');
          if (!pcName.trim()) return;

          const equipRef = extractEquipRef(pcName.trim());
          if (!equipRef) return;

          const l3EquipName = extractEquipName((l3.name || '').trim());

          // 이미 올바른 L3인지
          if (isSameEquip(equipRef, l3EquipName)) return;

          // 올바른 L3 찾기
          let targetIdx = -1;
          for (const entry of l3EquipMap) {
            if (entry.idx === l3Idx) continue;
            if (isSameEquip(equipRef, entry.equipName)) {
              targetIdx = entry.idx;
              break;
            }
          }

          if (targetIdx === -1) {
            console.log(`  ⚠️ [${l2.no}] 대상 못찾음: "${pcName}" (ref=${equipRef})`);
            totalSkipped++;
            return;
          }

          moves.push({
            srcL3Idx: l3Idx,
            srcFuncIdx: fIdx,
            srcCharIdx: cIdx,
            targetL3Idx: targetIdx,
            pchar,
            pcName,
          });
        });
      });
    });

    if (moves.length === 0) continue;

    console.log(`[${l2.no}] ${l2.name}: 교차매핑 ${moves.length}건`);

    // 역순으로 제거 (인덱스 밀림 방지)
    const removeBySrc = new Map(); // "l3Idx-fIdx" → Set<charIdx>
    for (const mv of moves) {
      const key = `${mv.srcL3Idx}-${mv.srcFuncIdx}`;
      if (!removeBySrc.has(key)) removeBySrc.set(key, new Set());
      removeBySrc.get(key).add(mv.srcCharIdx);
    }

    // 제거
    for (const [key, charIdxSet] of removeBySrc) {
      const [l3Idx, fIdx] = key.split('-').map(Number);
      const func = l3List[l3Idx]?.functions?.[fIdx];
      if (func?.processChars) {
        func.processChars = func.processChars.filter((_, idx) => !charIdxSet.has(idx));
      }
    }

    // 대상 L3에 추가
    for (const mv of moves) {
      const targetL3 = l3List[mv.targetL3Idx];
      if (!targetL3.functions || targetL3.functions.length === 0) {
        targetL3.functions = [{ name: '', processChars: [] }];
      }
      const targetFunc = targetL3.functions[0];
      if (!targetFunc.processChars) targetFunc.processChars = [];
      targetFunc.processChars.push(mv.pchar);

      console.log(`  ✅ "${mv.pcName}" → ${targetL3.name}`);
      totalFixed++;
    }
  }

  console.log(`\n📊 수정: ${totalFixed}건, 스킵: ${totalSkipped}건`);

  if (totalFixed === 0) {
    console.log('수정할 항목 없음.');
    await client.end();
    return;
  }

  // 3. DB 저장
  console.log('\n📌 DB 저장...');
  const updatedData = { ...data, l2: l2Data };

  await client.query(
    `UPDATE ${SCHEMA}.fmea_legacy_data SET data = $1 WHERE "fmeaId" = $2`,
    [JSON.stringify(updatedData), FMEA_ID]
  );
  console.log('  ✅ fmea_legacy_data 업데이트 완료');

  // worksheet_data도 업데이트 (있으면)
  const wsRes = await client.query(
    `SELECT data FROM ${SCHEMA}.fmea_worksheet_data WHERE "fmeaId" = $1`,
    [FMEA_ID]
  );
  if (wsRes.rows.length > 0) {
    const wsData = wsRes.rows[0].data;
    if (wsData && wsData.l2) {
      wsData.l2 = l2Data;
      await client.query(
        `UPDATE ${SCHEMA}.fmea_worksheet_data SET data = $1 WHERE "fmeaId" = $2`,
        [JSON.stringify(wsData), FMEA_ID]
      );
      console.log('  ✅ fmea_worksheet_data 업데이트 완료');
    }
  }

  // 4. 검증
  console.log('\n📌 검증...');
  const verifyRes = await client.query(
    `SELECT data FROM ${SCHEMA}.fmea_legacy_data WHERE "fmeaId" = $1`,
    [FMEA_ID]
  );
  const verifyData = verifyRes.rows[0].data;
  let remaining = 0;

  for (const l2 of (verifyData.l2 || [])) {
    for (const l3 of (l2.l3 || [])) {
      const l3EquipName = extractEquipName((l3.name || '').trim());
      for (const func of (l3.functions || [])) {
        for (const pchar of (func.processChars || [])) {
          const pcName = typeof pchar === 'string' ? pchar : (pchar.name || '');
          const equipRef = extractEquipRef(pcName.trim());
          if (equipRef && !isSameEquip(equipRef, l3EquipName)) {
            remaining++;
            if (remaining <= 10) {
              console.log(`  ⚠️ 잔여: [${l2.no}] ${l3.name} → "${pcName}"`);
            }
          }
        }
      }
    }
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  수정: ${totalFixed}건 | 스킵: ${totalSkipped}건 | 잔여: ${remaining}건`);
  console.log('═══════════════════════════════════════════════');

  await client.end();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
