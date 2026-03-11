/**
 * 공정특성(processChars) 교차매핑 수정 스크립트
 *
 * 문제: PFMEA 원본 데이터에서 L3 작업요소의 processChars가 다른 L3의 것으로 매핑됨
 * 예: 광택계에 "LED 점등검사기-점등상태"가 매핑, LED 점등검사기에 "광택계-광택"이 매핑
 *
 * 해결: processChar 이름에서 참조 장비명을 추출 → 올바른 L3로 이동
 *
 * 패턴: "XX번-장비명-특성명" → 장비명으로 올바른 L3 찾기
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

/**
 * processChar 이름에서 참조 장비명 추출
 * 패턴: "XX번-장비명-특성명" → "장비명" 반환
 * 패턴2: "XX번 장비명-특성" → "장비명" 반환 (공백 구분)
 */
function extractEquipmentRef(pcharName) {
  // "XX번-장비명-특성명" 패턴
  const m1 = pcharName.match(/^\d+번-(.+?)-[^-]+$/);
  if (m1) return m1[1];

  // "XX번-장비명 특성" 패턴 (마지막 하이픈 없음)
  const m2 = pcharName.match(/^\d+번-(.+?)$/);
  if (m2) {
    // "장비명-특성1,특성2" 형태에서 장비명 추출
    const parts = m2[1].split('-');
    if (parts.length >= 2) return parts[0];
  }

  return null;
}

/**
 * L3 이름에서 장비명 추출
 * 패턴: "XX번-장비명" → "장비명" 반환
 * 패턴2: "XX번 장비명" → "장비명" 반환
 */
function extractEquipmentName(l3Name) {
  // "XX번-장비명" 패턴
  const m1 = l3Name.match(/^\d+번-(.+)$/);
  if (m1) return m1[1];

  // "XX번 장비명" 패턴
  const m2 = l3Name.match(/^\d+번\s+(.+)$/);
  if (m2) return m2[1];

  return l3Name;
}

/**
 * 문자열 정규화: 공백, 쉼표, 마침표 등 구두점 제거 + 소문자
 */
function normalizeForMatch(s) {
  return s.replace(/[\s,.\-·]+/g, '').toLowerCase();
}

/**
 * 알려진 오타/이표기 매핑 (한글 발음 유사)
 */
const TYPO_MAP = {
  '램핑기': '랩핑기',  // 포장 공정에서 램핑기=랩핑기 (wrapping machine)
  '랩핑기': '램핑기',
};

/**
 * 두 문자열이 같은 장비를 참조하는지 확인 (퍼지 매칭)
 */
function isSameEquipment(ref, l3EquipName) {
  if (!ref || !l3EquipName) return false;
  const normRef = normalizeForMatch(ref);
  const normL3 = normalizeForMatch(l3EquipName);

  // 정확 매칭 (구두점/공백 무시)
  if (normRef === normL3) return true;

  // 부분 매칭 (참조가 장비명에 포함되거나 vice versa)
  if (normRef.includes(normL3) || normL3.includes(normRef)) return true;

  // 오타/이표기 매핑
  const refTypo = TYPO_MAP[ref] || TYPO_MAP[normalizeForMatch(ref)];
  if (refTypo) {
    const normTypo = normalizeForMatch(refTypo);
    if (normTypo === normL3 || normL3.includes(normTypo) || normTypo.includes(normL3)) return true;
  }
  const l3Typo = TYPO_MAP[l3EquipName] || TYPO_MAP[normalizeForMatch(l3EquipName)];
  if (l3Typo) {
    const normTypo = normalizeForMatch(l3Typo);
    if (normRef === normTypo || normRef.includes(normTypo) || normTypo.includes(normRef)) return true;
  }

  return false;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  공정특성(processChars) 교차매핑 수정');
  console.log(`  프로젝트: ${FMEA_ID}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // STEP 1: 워크시트 데이터 로드
  console.log('📌 STEP 1: 워크시트 데이터 로드...');
  const wsRes = await request('GET', `/api/fmea?fmeaId=${FMEA_ID}`);
  const wsData = wsRes.data;
  const l2Data = wsData.l2 || [];

  if (!l2Data.length) {
    console.error('❌ l2Data 비어있음');
    return;
  }
  console.log(`  ✅ L2 공정: ${l2Data.length}개\n`);

  // STEP 2: 교차매핑 분석 및 수정
  console.log('📌 STEP 2: 교차매핑 분석 및 수정...\n');

  let totalFixed = 0;
  let totalSkipped = 0;
  let totalCorrect = 0;

  for (const l2 of l2Data) {
    const l3Items = (l2.l3 || []).filter(l3 => {
      const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
      return m4 !== 'MN' && (l3.name || '').trim().length > 0;
    });

    if (l3Items.length < 2) continue;

    // L3별 장비명 맵 구축
    const l3EquipMap = new Map(); // equipmentName → l3 index
    l3Items.forEach((l3, idx) => {
      const equipName = extractEquipmentName((l3.name || '').trim());
      l3EquipMap.set(equipName, idx);
    });

    // 모든 L3의 processChars를 수집 (현재 할당 상태)
    // { l3Index, funcIndex, charIndex, pchar, refEquip }
    const allChars = [];

    l3Items.forEach((l3, l3Idx) => {
      const funcs = l3.functions || [];
      funcs.forEach((func, fIdx) => {
        const pchars = func.processChars || [];
        pchars.forEach((pchar, cIdx) => {
          const name = (pchar.name || '').trim();
          if (!name) return;

          const refEquip = extractEquipmentRef(name);
          const l3EquipName = extractEquipmentName((l3.name || '').trim());

          // 참조 장비가 현재 L3인지 확인
          const isCorrect = !refEquip || isSameEquipment(refEquip, l3EquipName);

          allChars.push({
            l3Idx, fIdx, cIdx, pchar,
            name, refEquip, l3EquipName,
            isCorrect,
            currentL3Name: l3.name,
          });
        });
      });
    });

    // 교차매핑된 항목 찾기
    const crossMatched = allChars.filter(c => !c.isCorrect && c.refEquip);

    if (crossMatched.length === 0) continue;

    console.log(`  [${l2.no}] ${l2.name}: 교차매핑 ${crossMatched.length}건`);

    // 올바른 L3 찾기 및 재배정
    for (const cm of crossMatched) {
      // refEquip로 올바른 L3 찾기
      let targetL3Idx = -1;
      for (const [equipName, idx] of l3EquipMap) {
        if (isSameEquipment(cm.refEquip, equipName)) {
          targetL3Idx = idx;
          break;
        }
      }

      if (targetL3Idx === -1) {
        console.log(`    ⚠️ 대상 L3 못찾음: "${cm.name}" (참조: ${cm.refEquip})`);
        totalSkipped++;
        continue;
      }

      if (targetL3Idx === cm.l3Idx) {
        totalCorrect++;
        continue;
      }

      const targetL3 = l3Items[targetL3Idx];
      console.log(`    ✅ "${cm.name}": ${cm.currentL3Name} → ${targetL3.name}`);

      // 현재 L3에서 제거
      const srcFunc = l3Items[cm.l3Idx].functions?.[cm.fIdx];
      if (srcFunc?.processChars) {
        srcFunc.processChars = srcFunc.processChars.filter(
          (pc, idx) => idx !== cm.cIdx
        );
      }

      // 대상 L3에 추가 (첫 번째 function에)
      if (!targetL3.functions || targetL3.functions.length === 0) {
        targetL3.functions = [{ name: '', processChars: [] }];
      }
      const targetFunc = targetL3.functions[0];
      if (!targetFunc.processChars) targetFunc.processChars = [];
      targetFunc.processChars.push(cm.pchar);

      totalFixed++;
    }
  }

  // 제거 후 빈 배열 정리 (인덱스 밀림 방지 위해 위에서 filter 사용)
  // 추가적으로, 이동된 processChar의 원본 인덱스가 변경되었으므로
  // 같은 L3 내에서 여러 건이 이동될 때 인덱스 충돌 방지를 위해
  // 위 루프에서 이미 filter를 사용했으므로 OK

  console.log(`\n  📊 결과: 수정 ${totalFixed}건, 스킵 ${totalSkipped}건, 이미 정확 ${totalCorrect}건`);

  if (totalFixed === 0) {
    console.log('\n  ℹ️ 수정할 항목 없음. 종료합니다.');
    return;
  }

  // STEP 3: 수정된 데이터 DB 직접 저장 (FmeaLegacyData + FmeaWorksheetData)
  console.log('\n📌 STEP 3: 수정된 워크시트 데이터 DB 직접 저장...');

  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public' });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 수정된 legacyData 구성
    const fixedLegacy = {
      ...wsData,
      l2: l2Data,
    };

    // FmeaLegacyData 업데이트 (Single Source of Truth)
    const existing = await prisma.fmeaLegacyData.findUnique({
      where: { fmeaId: FMEA_ID },
    });

    if (existing) {
      await prisma.fmeaLegacyData.update({
        where: { fmeaId: FMEA_ID },
        data: { data: fixedLegacy },
      });
      console.log(`  ✅ FmeaLegacyData 업데이트 성공`);
    } else {
      console.warn('  ⚠️ FmeaLegacyData 레코드 없음 — 새로 생성');
      await prisma.fmeaLegacyData.create({
        data: { fmeaId: FMEA_ID, data: fixedLegacy, version: '1.0.0' },
      });
    }

    // FmeaWorksheetData 업데이트 (워크시트 캐시)
    const wsRecord = await prisma.fmeaWorksheetData.findUnique({
      where: { fmeaId: FMEA_ID },
    });
    if (wsRecord) {
      const wsContent = typeof wsRecord.data === 'string' ? JSON.parse(wsRecord.data) : wsRecord.data;
      // wsContent에서 l2 업데이트
      if (wsContent.l2) {
        wsContent.l2 = l2Data;
        await prisma.fmeaWorksheetData.update({
          where: { fmeaId: FMEA_ID },
          data: { data: wsContent, updatedAt: new Date() },
        });
        console.log(`  ✅ FmeaWorksheetData 업데이트 성공`);
      }
    }

    await prisma.$disconnect();
    await pool.end();
    console.log('  ✅ DB 저장 완료');
  } catch (e) {
    console.error('  ❌ DB 저장 실패:', e.message);
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
    return;
  }

  // STEP 4: 검증 — 다시 로드하여 확인
  console.log('\n📌 STEP 4: 검증...');
  const verifyRes = await request('GET', `/api/fmea?fmeaId=${FMEA_ID}`);
  const verifyData = verifyRes.data;
  const verifyL2 = verifyData.l2 || [];

  let remainingCross = 0;
  for (const l2 of verifyL2) {
    for (const l3 of (l2.l3 || [])) {
      const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
      if (m4 === 'MN') continue;
      const l3EquipName = extractEquipmentName((l3.name || '').trim());

      for (const func of (l3.functions || [])) {
        for (const pchar of (func.processChars || [])) {
          const pcharName = (pchar.name || '').trim();
          const refEquip = extractEquipmentRef(pcharName);
          if (refEquip && !isSameEquipment(refEquip, l3EquipName)) {
            remainingCross++;
            if (remainingCross <= 5) {
              console.log(`  ⚠️ 미수정: [${l2.no}] ${l3.name} → "${pcharName}" (참조: ${refEquip})`);
            }
          }
        }
      }
    }
  }

  if (remainingCross > 5) console.log(`  ... 외 ${remainingCross - 5}건`);

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  최종 결과`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`  수정 완료: ${totalFixed}건`);
  console.log(`  스킵(대상 못찾음): ${totalSkipped}건`);
  console.log(`  잔여 교차매핑: ${remainingCross}건`);
  console.log(`═══════════════════════════════════════════════════════════`);
}

main().catch(console.error);
