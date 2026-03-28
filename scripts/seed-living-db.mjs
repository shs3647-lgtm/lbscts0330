/**
 * @file seed-living-db.mjs
 * @description LLD (교훈 DB) + CIP (지속개선) + Lessons Learned 시딩
 *
 * 반도체 12inch Au Bump 공정 기반 실제 데이터
 * 실행: node scripts/seed-living-db.mjs
 */

import pg from 'pg';
const { Client } = pg;

const DB_URL = 'postgresql://postgres:1234@localhost:5432/fmea_db';

// ── LLD Filter Code (교훈 DB) ──
// 반도체 제조 공정 실제 교훈 데이터 (m002 Au Bump 기반)
const lldItems = [
  { lldNo: 'LLD26-001', classification: 'RMA', applyTo: 'prevention', processNo: '10', processName: 'Wafer Incoming', productName: '12inch Au Bump', failureMode: '이물 부착', cause: 'Wafer 표면 오염', improvement: 'Incoming 시 파티클 검사 강화 (0.3μm 이상)', preventionImprovement: 'Wafer 입고 전 클린룸 파티클 카운터 검증', detectionImprovement: 'AOI 자동검사 + 샘플링 현미경 확인', severity: 8, occurrence: 3, detection: 4, m4Category: 'IM', vehicle: '12inch', owner: 'QA팀', sourceType: 'manual' },
  { lldNo: 'LLD26-002', classification: 'ABN', applyTo: 'detection', processNo: '20', processName: 'Sputter', productName: '12inch Au Bump', failureMode: '막두께 불균일', cause: 'Target 소진', improvement: 'Target 수명 관리 시스템 도입 (kWh 기준)', preventionImprovement: 'PM 주기 단축 (500→400 wafer)', detectionImprovement: 'In-line 막두께 측정 (5-point → 9-point)', severity: 7, occurrence: 4, detection: 3, m4Category: 'MC', vehicle: '12inch', owner: '설비팀', sourceType: 'manual' },
  { lldNo: 'LLD26-003', classification: 'CIP', applyTo: 'prevention', processNo: '20', processName: 'Sputter', productName: '12inch Au Bump', failureMode: '접착력 불량', cause: '진공도 불량', improvement: '진공 펌프 PM 주기 관리 + Leak 체크 자동화', preventionImprovement: '진공도 실시간 모니터링 + 경보 시스템', detectionImprovement: '접착력 테스트 (Pull test) 주기 강화', severity: 9, occurrence: 2, detection: 5, m4Category: 'MC', vehicle: '12inch', owner: '공정팀', sourceType: 'manual' },
  { lldNo: 'LLD26-004', classification: 'ECN', applyTo: 'detection', processNo: '30', processName: 'Photo', productName: '12inch Au Bump', failureMode: 'CD 불량', cause: 'Exposure 조건 이탈', improvement: 'Dose/Focus 자동보정 시스템 적용', preventionImprovement: 'Recipe 잠금 + 변경이력 관리', detectionImprovement: 'CD-SEM 전수검사 (기존 샘플링→전수)', severity: 8, occurrence: 3, detection: 2, m4Category: 'MC', vehicle: '12inch', owner: '공정팀', sourceType: 'manual' },
  { lldNo: 'LLD26-005', classification: 'FieldIssue', applyTo: 'prevention', processNo: '40', processName: 'Plating', productName: '12inch Au Bump', failureMode: 'Bump 높이 불균일', cause: '도금액 조성 변동', improvement: '도금액 실시간 분석 시스템 (ICP-OES 연동)', preventionImprovement: '도금액 자동 보충 시스템 + SPC 관리', detectionImprovement: '3D 프로파일러 측정 (매 lot)', severity: 7, occurrence: 5, detection: 3, m4Category: 'MC', vehicle: '12inch', owner: '공정팀', sourceType: 'manual' },
  { lldNo: 'LLD26-006', classification: 'RMA', applyTo: 'detection', processNo: '40', processName: 'Plating', productName: '12inch Au Bump', failureMode: 'Void 발생', cause: '전류밀도 불균일', improvement: 'Anode 형상 최적화 + 교반 속도 조절', preventionImprovement: '전류밀도 시뮬레이션 기반 조건 설정', detectionImprovement: 'X-ray 검사 전수 적용', severity: 9, occurrence: 3, detection: 2, m4Category: 'MC', vehicle: '12inch', owner: 'QA팀', sourceType: 'manual' },
  { lldNo: 'LLD26-007', classification: 'ABN', applyTo: 'prevention', processNo: '50', processName: 'Strip/Etch', productName: '12inch Au Bump', failureMode: 'Under-etch', cause: '에칭액 농도 저하', improvement: '에칭액 수명 관리 + 자동 농도 보정', preventionImprovement: '에칭액 온도/농도 실시간 모니터링', detectionImprovement: '에칭 후 단면 SEM 검사', severity: 6, occurrence: 4, detection: 4, m4Category: 'MC', vehicle: '12inch', owner: '공정팀', sourceType: 'manual' },
  { lldNo: 'LLD26-008', classification: 'CIP', applyTo: 'detection', processNo: '50', processName: 'Strip/Etch', productName: '12inch Au Bump', failureMode: 'Residue 잔류', cause: 'Strip 시간 부족', improvement: 'Strip 공정 조건 재설정 (시간 +30%)', preventionImprovement: 'Strip 완료 센서 설치', detectionImprovement: 'UV 검사 + 잔류물 분석 추가', severity: 5, occurrence: 3, detection: 3, m4Category: 'MC', vehicle: '12inch', owner: '공정팀', sourceType: 'manual' },
  { lldNo: 'LLD26-009', classification: 'DevIssue', applyTo: 'prevention', processNo: '60', processName: 'Inspection', productName: '12inch Au Bump', failureMode: '검사 누락', cause: 'AOI 알고리즘 미감지', improvement: 'AOI 알고리즘 업데이트 + Golden sample 추가', preventionImprovement: 'AOI Recipe 주기적 검증 (월 1회)', detectionImprovement: '수동 현미경 확인 (AOI Pass 중 랜덤 샘플)', severity: 8, occurrence: 2, detection: 5, m4Category: 'IM', vehicle: '12inch', owner: 'QA팀', sourceType: 'manual' },
  { lldNo: 'LLD26-010', classification: 'RMA', applyTo: 'prevention', processNo: '70', processName: 'Packing', productName: '12inch Au Bump', failureMode: '출하 혼입', cause: '라벨 오부착', improvement: '바코드 스캔 검증 + MES 연동', preventionImprovement: '라벨 발행 시 MES 자동 검증', detectionImprovement: '출하 전 더블체크 (QA + 물류)', severity: 7, occurrence: 2, detection: 2, m4Category: 'MN', vehicle: '12inch', owner: '물류팀', sourceType: 'manual' },
  { lldNo: 'LLD26-011', classification: 'ABN', applyTo: 'detection', processNo: '20', processName: 'Sputter', productName: '12inch Au Bump', failureMode: '파티클 오염', cause: 'Chamber 오염', improvement: 'Dry clean 주기 강화 + Particle monitor 설치', preventionImprovement: 'Chamber 벽면 Shield 교체 주기 관리', detectionImprovement: 'Particle counter 실시간 모니터링', severity: 7, occurrence: 4, detection: 3, m4Category: 'MC', vehicle: '12inch', owner: '설비팀', sourceType: 'manual' },
  { lldNo: 'LLD26-012', classification: 'CIP', applyTo: 'prevention', processNo: '30', processName: 'Photo', productName: '12inch Au Bump', failureMode: 'Overlay 불량', cause: 'Stage 정밀도 저하', improvement: 'Stage 교정 주기 단축 + Baseline 관리', preventionImprovement: 'Overlay mark 검증 자동화', detectionImprovement: 'Overlay 측정 point 확대 (4→9 point)', severity: 8, occurrence: 3, detection: 3, m4Category: 'MC', vehicle: '12inch', owner: '설비팀', sourceType: 'manual' },
];

// ── Lessons Learned (레거시 LLD) ──
const lessonsItems = [
  { lldNo: 'LL26-001', vehicle: '12inch Au Bump', failureMode: '막두께 불균일', cause: 'Target 교체 지연', category: '예방관리', improvement: 'Target 수명 kWh 자동 알람 시스템 도입', status: 'G', location: 'Sputter' },
  { lldNo: 'LL26-002', vehicle: '12inch Au Bump', failureMode: 'Bump void', cause: '도금액 Fe 오염', category: '검출관리', improvement: 'ICP 분석 주기 8hr→4hr 단축', status: 'G', location: 'Plating' },
  { lldNo: 'LL26-003', vehicle: '12inch Au Bump', failureMode: 'CD shift', cause: 'PR 두께 변동', category: '예방관리', improvement: 'Coat 두께 SPC 관리 한계선 강화 (±3%→±2%)', status: 'Y', location: 'Photo' },
  { lldNo: 'LL26-004', vehicle: '12inch Au Bump', failureMode: '이물 부착', cause: 'FOUP 내부 오염', category: '예방관리', improvement: 'FOUP 세정 주기 200→100 lot으로 단축', status: 'G', location: 'Transport' },
  { lldNo: 'LL26-005', vehicle: '12inch Au Bump', failureMode: '접착력 불량', cause: '표면 산화', category: '검출관리', improvement: 'Pre-clean RF power 모니터링 강화', status: 'Y', location: 'Sputter' },
  { lldNo: 'LL26-006', vehicle: '12inch Au Bump', failureMode: '에칭 불량', cause: '온도 제어 이탈', category: '예방관리', improvement: '에칭 Bath 온도 센서 이중화', status: 'G', location: 'Etch' },
  { lldNo: 'LL26-007', vehicle: '12inch Au Bump', failureMode: 'Scratch', cause: 'Handling 충격', category: '검출관리', improvement: 'Robot arm 속도 제한 + 가감속 프로파일 최적화', status: 'R', location: 'Transfer' },
  { lldNo: 'LL26-008', vehicle: '12inch Au Bump', failureMode: '출하 불량', cause: 'Test 누락', category: '검출관리', improvement: 'Final test 체크리스트 MES 연동 필수화', status: 'G', location: 'Inspection' },
];

// ── Continuous Improvement Plan (지속개선계획) ──
const cipItems = [
  { cipNo: 'CIP26-001', apLevel: 'H', failureMode: '막두께 불균일', cause: 'Target 소진', improvement: 'Target kWh 자동 알람 + 교체 스케줄 자동화', s: 7, o: 4, d: 3, status: 'Y', fmeaId: 'pfm26-m002' },
  { cipNo: 'CIP26-002', apLevel: 'H', failureMode: 'Bump void', cause: '전류밀도 불균일', improvement: 'Anode 형상 개선 + 전류분포 시뮬레이션', s: 9, o: 3, d: 2, status: 'R', fmeaId: 'pfm26-m002' },
  { cipNo: 'CIP26-003', apLevel: 'H', failureMode: '접착력 불량', cause: '진공도 불량', improvement: '진공 펌프 이중화 + Leak rate 자동측정', s: 9, o: 2, d: 5, status: 'Y', fmeaId: 'pfm26-m002' },
  { cipNo: 'CIP26-004', apLevel: 'M', failureMode: 'CD 불량', cause: 'Exposure 이탈', improvement: 'APC (Advanced Process Control) 시스템 도입', s: 8, o: 3, d: 2, status: 'R', fmeaId: 'pfm26-m002' },
  { cipNo: 'CIP26-005', apLevel: 'M', failureMode: 'Bump 높이 불균일', cause: '도금액 조성 변동', improvement: '도금액 자동분석/보충 시스템 구축', s: 7, o: 5, d: 3, status: 'Y', fmeaId: 'pfm26-m002' },
  { cipNo: 'CIP26-006', apLevel: 'M', failureMode: '파티클 오염', cause: 'Chamber 오염', improvement: 'In-situ particle monitor 설치 (전 Chamber)', s: 7, o: 4, d: 3, status: 'R', fmeaId: 'pfm26-m002' },
  { cipNo: 'CIP26-007', apLevel: 'H', failureMode: '검사 누락', cause: 'AOI 알고리즘 미감지', improvement: 'AI 기반 결함 분류 시스템 (Deep Learning AOI)', s: 8, o: 2, d: 5, status: 'R', fmeaId: 'pfm26-m002' },
  { cipNo: 'CIP26-008', apLevel: 'L', failureMode: 'Residue 잔류', cause: 'Strip 시간 부족', improvement: 'Strip 완료 자동 감지 센서 도입', s: 5, o: 3, d: 3, status: 'G', fmeaId: 'pfm26-m002' },
];

async function main() {
  const c = new Client(DB_URL);
  await c.connect();
  console.log('Connected to DB');

  // 1. LLD Filter Code
  console.log('\n── LLD Filter Code 시딩 ──');
  for (const item of lldItems) {
    try {
      await c.query(`
        INSERT INTO public.lld_filter_code ("id","lldNo","classification","applyTo","processNo","processName","productName","failureMode","cause","improvement","preventionImprovement","detectionImprovement","severity","occurrence","detection","m4Category","vehicle","target","owner","status","sourceType","priority","createdAt","updatedAt")
        VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'제조',$17,$18,$19,0,NOW(),NOW())
        ON CONFLICT ("lldNo") DO NOTHING
      `, [item.lldNo, item.classification, item.applyTo, item.processNo, item.processName, item.productName, item.failureMode, item.cause, item.improvement, item.preventionImprovement, item.detectionImprovement, item.severity, item.occurrence, item.detection, item.m4Category, item.vehicle, item.owner, item.status || 'R', item.sourceType]);
      console.log(`  ✅ ${item.lldNo}: ${item.failureMode}`);
    } catch (e) { console.log(`  ❌ ${item.lldNo}: ${e.message.split('\n')[0]}`); }
  }

  // 2. Lessons Learned
  console.log('\n── Lessons Learned 시딩 ──');
  for (const item of lessonsItems) {
    try {
      await c.query(`
        INSERT INTO public.lessons_learned ("id","lldNo","vehicle","target","failureMode","cause","category","improvement","status","location","createdAt","updatedAt")
        VALUES (gen_random_uuid(), $1,$2,'제조',$3,$4,$5,$6,$7,$8,NOW(),NOW())
        ON CONFLICT ("lldNo") DO NOTHING
      `, [item.lldNo, item.vehicle, item.failureMode, item.cause, item.category, item.improvement, item.status, item.location]);
      console.log(`  ✅ ${item.lldNo}: ${item.failureMode}`);
    } catch (e) { console.log(`  ❌ ${item.lldNo}: ${e.message.split('\n')[0]}`); }
  }

  // 3. Continuous Improvement Plan
  console.log('\n── CIP 시딩 ──');
  for (const item of cipItems) {
    try {
      await c.query(`
        INSERT INTO public.continuous_improvement_plan ("id","cipNo","fmeaId","apLevel","category","failureMode","cause","improvement","s","o","d","status","createdAt","updatedAt")
        VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
        ON CONFLICT ("cipNo") DO NOTHING
      `, [item.cipNo, item.fmeaId, item.apLevel, item.apLevel === 'H' ? '긴급개선' : item.apLevel === 'M' ? '일반개선' : '모니터링', item.failureMode, item.cause, item.improvement, item.s, item.o, item.d, item.status]);
      console.log(`  ✅ ${item.cipNo}: ${item.failureMode}`);
    } catch (e) { console.log(`  ❌ ${item.cipNo}: ${e.message.split('\n')[0]}`); }
  }

  // 4. 최종 카운트
  console.log('\n── 최종 카운트 ──');
  const tables = ['lld_filter_code','lessons_learned','kr_industry_detection','kr_industry_prevention','pfmea_severity_criteria','pfmea_occurrence_criteria','pfmea_detection_criteria','continuous_improvement_plan','master_fmea_reference'];
  for (const t of tables) {
    try {
      const r = await c.query(`SELECT COUNT(*) AS cnt FROM public."${t}"`);
      console.log(`  ${t}: ${r.rows[0].cnt}건`);
    } catch { console.log(`  ${t}: ERROR`); }
  }

  await c.end();
  console.log('\n✅ 시딩 완료');
}

main().catch(console.error);
