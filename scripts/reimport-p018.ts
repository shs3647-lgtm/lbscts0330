/**
 * @file reimport-p018.ts
 * @description pfm26-p018-i18을 position-parser로 Re-import하는 스크립트
 *
 * ★ 왜 Re-import가 필요한가?
 *   기존 데이터는 레거시 파서(buildAtomicFromFlat)로 Import되어 B3(공정특성) 55건이 빈값
 *   → position-parser는 엑셀 행/셀 위치 기반으로 직접 파싱하므로 B3 데이터가 정확히 들어감
 *
 * ★ 흐름:
 *   1. m102-position-based.json 읽기 (원본 Import 데이터)
 *   2. position-parser.parsePositionBasedJSON() 호출 (빈 행 자동 정제 포함)
 *   3. save-position-import API 호출 (DB 저장 + 2차 빈 셀 검증)
 *   4. DB에서 재조회하여 processChar 0건 누락 확인
 *
 * ★ 금지 사항:
 *   - 레거시 파서(buildAtomicFromFlat, convertLegacyParseResult) 사용 금지
 *   - 카테시안 복제(A4 distribute) 사용 금지
 *   - 문자열 이름 비교로 FK 매칭 금지
 *
 * 실행: npx tsx scripts/reimport-p018.ts
 *
 * @created 2026-03-25
 */

import * as fs from 'fs';
import * as path from 'path';

const FMEA_ID = 'pfm26-p018-i18';
const JSON_PATH = path.join(__dirname, '..', 'data', 'master-fmea', 'm102-position-based.json');
const API_URL = 'http://localhost:3000/api/fmea/save-position-import';

async function main() {
  console.log('=== Re-import: position-parser 경로 ===');
  console.log('fmeaId:', FMEA_ID);
  console.log('source:', JSON_PATH);

  // 1. JSON 읽기
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  const json = JSON.parse(raw);

  // 2. position-parser로 파싱
  const { parsePositionBasedJSON } = await import('../src/lib/fmea/position-parser');
  const atomicData = parsePositionBasedJSON(json);

  // 3. B3(processChar) 확인
  const l3f = atomicData.l3Functions;
  const pcFilled = l3f.filter((f: any) => f.processChar && f.processChar.trim() !== '').length;
  const pcEmpty = l3f.filter((f: any) => !f.processChar || f.processChar.trim() === '').length;
  console.log(`\nL3Function: ${l3f.length}건 (processChar 채워짐=${pcFilled}, 비어있음=${pcEmpty})`);
  
  if (pcEmpty > 5) {
    console.error(`⚠️ processChar 비어있는 L3Function이 ${pcEmpty}건 — 파싱 확인 필요`);
  }

  // 4. save-position-import API 호출
  console.log('\n→ save-position-import API 호출...');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmeaId: FMEA_ID,
      atomicData,
      force: true,
    }),
  });

  const result = await res.json();
  if (result.success) {
    console.log('✅ Re-import 성공!');
    console.log('atomicCounts:', JSON.stringify(result.atomicCounts, null, 2));
  } else {
    console.error('❌ Re-import 실패:', result.error || result);
  }

  // 5. 검증: API에서 데이터 다시 읽어서 processChar 확인
  console.log('\n→ 검증...');
  const verifyRes = await fetch(`http://localhost:3000/api/fmea?fmeaId=${FMEA_ID}&format=atomic`);
  const verifyData = await verifyRes.json();
  const vl3f = verifyData.l3Functions || [];
  const vPcFilled = vl3f.filter((f: any) => f.processChar && f.processChar.trim() !== '').length;
  const vPcEmpty = vl3f.filter((f: any) => !f.processChar || f.processChar.trim() === '').length;
  console.log(`검증: L3Function ${vl3f.length}건 (processChar 채워짐=${vPcFilled}, 비어있음=${vPcEmpty})`);
  
  if (vPcEmpty === 0) {
    console.log('🎉 processChar 누락 0건 — 완전 해결!');
  } else {
    console.log(`⚠️ 아직 ${vPcEmpty}건 비어있음 — 추가 조사 필요`);
  }
}

main().catch(console.error);
