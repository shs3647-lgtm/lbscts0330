/**
 * @file create-m089-test.mjs
 * @description m089 테스트 프로젝트 생성 — 동일 processChar 공유 패턴 포함
 *
 * 테스트 목적: B2/B3 dedup 제거 후, 동일 processChar를 가진 다른 WE/기능이
 * 누락 없이 저장/렌더링되는지 검증
 *
 * 실행: node scripts/create-m089-test.mjs
 */
import pg from 'pg';
const { Client } = pg;

const FMEA_ID = 'pfm26-m089';
const SCHEMA = 'pfmea_pfm26_m089';

async function main() {
  const c = new Client('postgresql://postgres:1234@localhost:5432/fmea_db');
  await c.connect();

  // 1. 스키마 생성 (m066 복제)
  console.log('=== 1. 스키마 생성 ===');
  try {
    await c.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
    // 테이블 복제 (구조만)
    const tables = [
      'l1_structures','l2_structures','l3_structures',
      'l1_functions','l2_functions','l3_functions',
      'failure_effects','failure_modes','failure_causes',
      'failure_links','risk_analyses','optimizations',
      'fmea_legacy_data','fmea_confirmed_states',
    ];
    for (const t of tables) {
      try {
        await c.query(`CREATE TABLE IF NOT EXISTS "${SCHEMA}"."${t}" (LIKE public."${t}" INCLUDING ALL)`);
      } catch (e) {
        // 이미 존재하면 무시
        if (!e.message.includes('already exists')) console.log(`  WARN: ${t} — ${e.message.slice(0,50)}`);
      }
    }
    console.log('  스키마 + 테이블 생성 완료');
  } catch (e) { console.log('  스키마 생성:', e.message.slice(0,80)); }

  // 2. 기존 데이터 삭제 (재실행 대비)
  const delTables = ['optimizations','risk_analyses','failure_links','failure_causes','failure_modes','failure_effects','l3_functions','l3_structures','l2_functions','l2_structures','l1_functions','l1_structures','fmea_legacy_data'];
  for (const t of delTables) {
    try { await c.query(`DELETE FROM "${SCHEMA}"."${t}"`); } catch {}
  }

  // 3. 테스트 데이터 삽입
  console.log('\n=== 2. 테스트 데이터 삽입 ===');
  const fid = FMEA_ID;
  const now = new Date().toISOString();

  // L1 Structure
  await c.query(`INSERT INTO "${SCHEMA}".l1_structures (id, "fmeaId", name, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$4)`,
    ['L1-m089', fid, 'TEST 반도체 BGA 패키지', now]);

  // L2 Structures (3개 공정)
  const l2s = [
    { id: 'L2-010', no: '10', name: 'Sputter Deposition', order: 1 },
    { id: 'L2-020', no: '20', name: 'Electroplating', order: 2 },
    { id: 'L2-030', no: '30', name: 'Wet Etch', order: 3 },
  ];
  for (const l2 of l2s) {
    await c.query(`INSERT INTO "${SCHEMA}".l2_structures (id, "fmeaId", "l1Id", "no", name, "order", "createdAt", "updatedAt") VALUES ($1,$2,'L1-m089',$3,$4,$5,$6,$6)`,
      [l2.id, fid, l2.no, l2.name, l2.order, now]);
  }

  // L1 Functions
  const l1fs = [
    { id: 'L1F-01', name: '전기적 연결 신뢰성 확보', category: 'YP', req: 'BGA 접합부 저항 < 10mΩ' },
    { id: 'L1F-02', name: '기계적 강도 확보', category: 'SP', req: 'Ball Shear > 50gf' },
  ];
  for (const f of l1fs) {
    await c.query(`INSERT INTO "${SCHEMA}".l1_functions (id, "fmeaId", "functionName", category, requirement, "l1StructId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,'L1-m089',$6,$6)`,
      [f.id, fid, f.name, f.category, f.req, now]);
  }

  // L2 Functions (공정기능 + 제품특성)
  const l2fs = [
    { id: 'L2F-010', l2: 'L2-010', func: 'Cu/TiW 박막을 균일하게 증착한다', pc: '박막 두께 균일도', sc: '' },
    { id: 'L2F-020', l2: 'L2-020', func: 'Au Bump를 규격 높이로 도금한다', pc: 'Bump 높이', sc: 'Y' },
    { id: 'L2F-030', l2: 'L2-030', func: 'Seed Layer를 선택적으로 제거한다', pc: '식각 선택비', sc: '' },
  ];
  for (const f of l2fs) {
    await c.query(`INSERT INTO "${SCHEMA}".l2_functions (id, "fmeaId", "functionName", "productChar", "specialChar", "l2StructId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [f.id, fid, f.func, f.pc, f.sc, f.l2, now]);
  }

  // Failure Effects
  const fes = [
    { id: 'FE-01', effect: '전기적 Open 불량', severity: 9, category: 'YP', l1f: 'L1F-01' },
    { id: 'FE-02', effect: 'Bump 높이 불균일로 접합 불량', severity: 7, category: 'SP', l1f: 'L1F-02' },
    { id: 'FE-03', effect: '단락(Short) 발생', severity: 9, category: 'YP', l1f: 'L1F-01' },
  ];
  for (const fe of fes) {
    await c.query(`INSERT INTO "${SCHEMA}".failure_effects (id, "fmeaId", effect, severity, category, "l1FuncId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [fe.id, fid, fe.effect, fe.severity, fe.category, fe.l1f, now]);
  }

  // Failure Modes
  const fms = [
    { id: 'FM-01', mode: '막두께 불균일', l2: 'L2-010', l2f: 'L2F-010' },
    { id: 'FM-02', mode: 'Bump 높이 편차', l2: 'L2-020', l2f: 'L2F-020' },
    { id: 'FM-03', mode: '식각 잔류물', l2: 'L2-030', l2f: 'L2F-030' },
  ];
  for (const fm of fms) {
    await c.query(`INSERT INTO "${SCHEMA}".failure_modes (id, "fmeaId", mode, "l2StructId", "l2FuncId", "productCharId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [fm.id, fid, fm.mode, fm.l2, fm.l2f, fm.l2f, now]);
  }

  // ★★★ L3 Structures — 핵심 테스트: 동일 processChar를 가진 다른 WE ★★★
  const l3s = [
    // 공정 10 Sputter: IM 소재 3개 — Cu Target, Ti Target 모두 "Target 두께 잔량" 공유
    { id: 'L3-01', name: 'Cu Target', m4: 'IM', l2: 'L2-010', order: 1 },
    { id: 'L3-02', name: 'Ti Target', m4: 'IM', l2: 'L2-010', order: 2 },
    { id: 'L3-03', name: 'Sputter 장비', m4: 'MC', l2: 'L2-010', order: 3 },
    { id: 'L3-04', name: 'Sputter 작업자', m4: 'MN', l2: 'L2-010', order: 4 },
    // 공정 20 Plating: IM 소재 2개 — 도금액 농도 공유
    { id: 'L3-05', name: 'Au 도금액', m4: 'IM', l2: 'L2-020', order: 1 },
    { id: 'L3-06', name: 'Cu 도금액', m4: 'IM', l2: 'L2-020', order: 2 },
    { id: 'L3-07', name: 'Plating 장비', m4: 'MC', l2: 'L2-020', order: 3 },
    { id: 'L3-08', name: 'Plating 작업자', m4: 'MN', l2: 'L2-020', order: 4 },
    // 공정 30 Etch: IM 2개 — 에칭액 농도 공유
    { id: 'L3-09', name: 'Au Etchant', m4: 'IM', l2: 'L2-030', order: 1 },
    { id: 'L3-10', name: 'TiW Etchant', m4: 'IM', l2: 'L2-030', order: 2 },
    { id: 'L3-11', name: 'Etch 장비', m4: 'MC', l2: 'L2-030', order: 3 },
  ];
  for (const l3 of l3s) {
    await c.query(`INSERT INTO "${SCHEMA}".l3_structures (id, "fmeaId", "l1Id", name, m4, "l2Id", "order", "createdAt", "updatedAt") VALUES ($1,$2,'L1-m089',$3,$4,$5,$6,$7,$7)`,
      [l3.id, fid, l3.name, l3.m4, l3.l2, l3.order, now]);
  }

  // ★★★ L3 Functions — 핵심: 동일 processChar 공유 패턴 ★★★
  const l3fs = [
    // Cu Target + Ti Target → 동일 processChar "Target 두께 잔량(mm)"
    { id: 'L3F-01', l3: 'L3-01', l2: 'L2-010', func: 'Cu Target이 스퍼터링 소재를 공급하여 Cu 박막을 형성한다', pc: 'Target 두께 잔량(mm)', sc: '' },
    { id: 'L3F-02', l3: 'L3-02', l2: 'L2-010', func: 'Ti Target이 스퍼터링 소재를 공급하여 TiW 박막을 형성한다', pc: 'Target 두께 잔량(mm)', sc: '' },
    // Sputter 장비 — 고유 processChar
    { id: 'L3F-03', l3: 'L3-03', l2: 'L2-010', func: 'Sputter 장비가 DC Power를 인가하여 박막을 증착한다', pc: 'DC Power(kW)', sc: 'Y' },
    // Sputter 작업자(MN) — 동일 processChar "작업 숙련도" 가능
    { id: 'L3F-04', l3: 'L3-04', l2: 'L2-010', func: '작업자가 Recipe를 설정하여 증착 조건을 관리한다', pc: '작업 숙련도(등급)', sc: '' },
    // Au/Cu 도금액 → 동일 processChar "도금액 농도(g/L)"
    { id: 'L3F-05', l3: 'L3-05', l2: 'L2-020', func: 'Au 도금액이 Au 이온을 공급하여 Bump를 형성한다', pc: '도금액 농도(g/L)', sc: '' },
    { id: 'L3F-06', l3: 'L3-06', l2: 'L2-020', func: 'Cu 도금액이 Cu 이온을 공급하여 UBM층을 형성한다', pc: '도금액 농도(g/L)', sc: '' },
    // Plating 장비 — 고유
    { id: 'L3F-07', l3: 'L3-07', l2: 'L2-020', func: 'Plating 장비가 전류를 인가하여 도금 속도를 제어한다', pc: '전류밀도(mA/cm²)', sc: 'Y' },
    // Plating 작업자(MN) — 동일 processChar "작업 숙련도" (공정10과도 동일!)
    { id: 'L3F-08', l3: 'L3-08', l2: 'L2-020', func: '작업자가 도금 조건을 모니터링한다', pc: '작업 숙련도(등급)', sc: '' },
    // Au/TiW Etchant → 동일 processChar "H₂O₂ 농도(%)"
    { id: 'L3F-09', l3: 'L3-09', l2: 'L2-030', func: 'Au Etchant가 Au Seed를 선택 식각한다', pc: 'H₂O₂ 농도(%)', sc: '' },
    { id: 'L3F-10', l3: 'L3-10', l2: 'L2-030', func: 'TiW Etchant가 TiW Seed를 선택 식각한다', pc: 'H₂O₂ 농도(%)', sc: '' },
    // Etch 장비 — 고유
    { id: 'L3F-11', l3: 'L3-11', l2: 'L2-030', func: 'Etch 장비가 에칭액 온도를 제어한다', pc: 'Bath 온도(℃)', sc: '' },
  ];
  for (const f of l3fs) {
    await c.query(`INSERT INTO "${SCHEMA}".l3_functions (id, "fmeaId", "functionName", "processChar", "specialChar", "l3StructId", "l2StructId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
      [f.id, fid, f.func, f.pc, f.sc, f.l3, f.l2, now]);
  }

  // Failure Causes — 각 L3Function마다 1개 FC
  const fcs = [
    { id: 'FC-01', cause: 'Cu Target 소진', l3: 'L3-01', l3f: 'L3F-01', l2: 'L2-010' },
    { id: 'FC-02', cause: 'Ti Target 순도 불량', l3: 'L3-02', l3f: 'L3F-02', l2: 'L2-010' },
    { id: 'FC-03', cause: 'DC Power 이탈', l3: 'L3-03', l3f: 'L3F-03', l2: 'L2-010' },
    { id: 'FC-04', cause: '작업자 Recipe 오설정', l3: 'L3-04', l3f: 'L3F-04', l2: 'L2-010' },
    { id: 'FC-05', cause: 'Au 도금액 농도 저하', l3: 'L3-05', l3f: 'L3F-05', l2: 'L2-020' },
    { id: 'FC-06', cause: 'Cu 도금액 Fe 오염', l3: 'L3-06', l3f: 'L3F-06', l2: 'L2-020' },
    { id: 'FC-07', cause: '전류밀도 불균일', l3: 'L3-07', l3f: 'L3F-07', l2: 'L2-020' },
    { id: 'FC-08', cause: '작업자 모니터링 누락', l3: 'L3-08', l3f: 'L3F-08', l2: 'L2-020' },
    { id: 'FC-09', cause: 'Au Etchant H₂O₂ 농도 편차', l3: 'L3-09', l3f: 'L3F-09', l2: 'L2-030' },
    { id: 'FC-10', cause: 'TiW Etchant H₂O₂ 농도 부족', l3: 'L3-10', l3f: 'L3F-10', l2: 'L2-030' },
    { id: 'FC-11', cause: 'Bath 온도 제어 이탈', l3: 'L3-11', l3f: 'L3F-11', l2: 'L2-030' },
  ];
  for (const fc of fcs) {
    await c.query(`INSERT INTO "${SCHEMA}".failure_causes (id, "fmeaId", cause, "l3StructId", "l3FuncId", "l2StructId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [fc.id, fid, fc.cause, fc.l3, fc.l3f, fc.l2, now]);
  }

  // Failure Links — FM-FE-FC 연결
  const links = [
    { id: 'FL-01', fm: 'FM-01', fe: 'FE-01', fc: 'FC-01' },
    { id: 'FL-02', fm: 'FM-01', fe: 'FE-01', fc: 'FC-02' },
    { id: 'FL-03', fm: 'FM-01', fe: 'FE-01', fc: 'FC-03' },
    { id: 'FL-04', fm: 'FM-01', fe: 'FE-01', fc: 'FC-04' },
    { id: 'FL-05', fm: 'FM-02', fe: 'FE-02', fc: 'FC-05' },
    { id: 'FL-06', fm: 'FM-02', fe: 'FE-02', fc: 'FC-06' },
    { id: 'FL-07', fm: 'FM-02', fe: 'FE-02', fc: 'FC-07' },
    { id: 'FL-08', fm: 'FM-02', fe: 'FE-02', fc: 'FC-08' },
    { id: 'FL-09', fm: 'FM-03', fe: 'FE-03', fc: 'FC-09' },
    { id: 'FL-10', fm: 'FM-03', fe: 'FE-03', fc: 'FC-10' },
    { id: 'FL-11', fm: 'FM-03', fe: 'FE-03', fc: 'FC-11' },
  ];
  for (const lk of links) {
    await c.query(`INSERT INTO "${SCHEMA}".failure_links (id, "fmeaId", "fmId", "feId", "fcId", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$6)`,
      [lk.id, fid, lk.fm, lk.fe, lk.fc, now]);
  }

  // Risk Analyses
  const risks = [
    { id: 'RA-01', link: 'FL-01', s: 9, o: 4, d: 3, ap: 'H', pc: 'P:Target kWh 자동알람', dc: 'D:4-Point Probe 측정' },
    { id: 'RA-02', link: 'FL-02', s: 9, o: 3, d: 4, ap: 'H', pc: 'P:입고검사 CoA확인', dc: 'D:EDS 성분분석' },
    { id: 'RA-03', link: 'FL-03', s: 9, o: 3, d: 3, ap: 'H', pc: 'P:PM 주기관리', dc: 'D:SPC 모니터링' },
    { id: 'RA-04', link: 'FL-04', s: 9, o: 5, d: 7, ap: 'H', pc: 'P:작업표준서 교육', dc: 'D:육안검사' },
    { id: 'RA-05', link: 'FL-05', s: 7, o: 4, d: 4, ap: 'M', pc: 'P:도금액 자동분석', dc: 'D:XRF 두께측정' },
    { id: 'RA-06', link: 'FL-06', s: 7, o: 3, d: 4, ap: 'M', pc: 'P:ICP 분석 4hr주기', dc: 'D:ICP 분석' },
    { id: 'RA-07', link: 'FL-07', s: 7, o: 4, d: 3, ap: 'M', pc: 'P:전류분포 시뮬레이션', dc: 'D:3D Profiler' },
    { id: 'RA-08', link: 'FL-08', s: 7, o: 5, d: 7, ap: 'M', pc: 'P:숙련도 정기평가', dc: 'D:육안검사' },
    { id: 'RA-09', link: 'FL-09', s: 9, o: 3, d: 4, ap: 'H', pc: 'P:H₂O₂ 농도 정기측정', dc: 'D:Step Profiler' },
    { id: 'RA-10', link: 'FL-10', s: 9, o: 3, d: 4, ap: 'H', pc: 'P:H₂O₂ 농도 자동보충', dc: 'D:Step Profiler' },
    { id: 'RA-11', link: 'FL-11', s: 9, o: 4, d: 3, ap: 'H', pc: 'P:온도센서 이중화', dc: 'D:Bath 온도 실시간' },
  ];
  for (const r of risks) {
    await c.query(`INSERT INTO "${SCHEMA}".risk_analyses (id, "fmeaId", "linkId", severity, occurrence, detection, ap, "preventionControl", "detectionControl", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
      [r.id, fid, r.link, r.s, r.o, r.d, r.ap, r.pc, r.dc, now]);
  }

  // FmeaProject 등록 (public 스키마)
  try {
    await c.query(`INSERT INTO public.fmea_projects (id, "fmeaId", "projectName", "fmeaType", "productName", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 'TEST BGA 반도체 패키지', 'PFMEA', 'BGA Package', NOW(), NOW()) ON CONFLICT ("fmeaId") DO NOTHING`, [fid]);
    console.log('  FmeaProject 등록 완료');
  } catch (e) { console.log('  FmeaProject:', e.message.slice(0,60)); }

  // FmeaRegistration 등록
  try {
    await c.query(`INSERT INTO public.fmea_registrations (id, "fmeaId", "fmeaType", "productName", "processName", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 'PFMEA', 'BGA Package', 'BGA 패키지 공정', NOW(), NOW()) ON CONFLICT ("fmeaId") DO NOTHING`, [fid]);
    console.log('  FmeaRegistration 등록 완료');
  } catch (e) { console.log('  FmeaRegistration:', e.message.slice(0,60)); }

  // 검증
  console.log('\n=== 3. 검증 ===');
  const counts = ['l3_structures','l3_functions','failure_causes','failure_links','risk_analyses'];
  for (const t of counts) {
    const r = await c.query(`SELECT COUNT(*) AS cnt FROM "${SCHEMA}"."${t}"`);
    console.log(`  ${t}: ${r.rows[0].cnt}건`);
  }

  // 동일 processChar 공유 확인
  console.log('\n=== 동일 processChar 공유 패턴 ===');
  const shared = await c.query(`
    SELECT "processChar", COUNT(*) AS cnt, array_agg("functionName") AS funcs
    FROM "${SCHEMA}".l3_functions
    GROUP BY "processChar" HAVING COUNT(*) > 1
  `);
  shared.rows.forEach(r => console.log(`  "${r.processChar}" → ${r.cnt}건: ${r.funcs.map(f=>f.slice(0,30)).join(' | ')}`));

  await c.end();
  console.log('\n✅ m089 테스트 프로젝트 생성 완료');
}

main().catch(console.error);
