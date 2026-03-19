/**
 * FMEA 파이프라인 완전성 Deep 검증 스크립트
 * - pipeline-verify는 카운트만 확인 → 이 스크립트는 실제 데이터 내용을 검증
 * - 체크리스트 80+ 항목 중 DB로 검증 가능한 모든 항목 실행
 */
import pg from 'pg';
const { Client } = pg;

const FMEA_ID = process.argv[2] || 'pfm26-m066';
const SCHEMA = `pfmea_${FMEA_ID.replace(/-/g, '_')}`;

const c = new Client({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
await c.connect();

const results = [];
let passCount = 0, failCount = 0, warnCount = 0;

function report(id, name, status, detail) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ id, name, status, detail });
  if (status === 'PASS') passCount++;
  else if (status === 'FAIL') failCount++;
  else warnCount++;
  console.log(`${icon} ${id} ${name}: ${detail}`);
}

async function q(sql) {
  const r = await c.query(sql);
  return r.rows;
}
async function q1(sql) {
  const rows = await q(sql);
  return rows[0];
}
async function cnt(sql) {
  const r = await q1(sql);
  return parseInt(r?.cnt || r?.count || 0);
}

console.log(`\n${'='.repeat(70)}`);
console.log(`  FMEA Deep Checklist Verification: ${FMEA_ID}`);
console.log(`  Schema: ${SCHEMA}`);
console.log(`${'='.repeat(70)}\n`);

// ═══════════════════════════════════════════════════════════════
// STAGE 0: Import 전처리 — 엑셀 파싱 전 데이터 존재 확인
// ═══════════════════════════════════════════════════════════════
console.log('\n── STAGE 0: Import 전처리 ──');

// S0-01: PfmeaMasterDataset 존재
const dataset = await q1(`SELECT id, "fmeaId" FROM public.pfmea_master_datasets WHERE "fmeaId" = '${FMEA_ID}' LIMIT 1`);
report('S0-01', 'MasterDataset 존재', dataset ? 'PASS' : 'FAIL',
  dataset ? `id=${dataset.id.substring(0, 12)}...` : 'MasterDataset 없음 — Import 미실행');

// S0-02: FlatItem 수
if (dataset) {
  const flatCount = await cnt(`SELECT COUNT(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId" = '${dataset.id}'`);
  report('S0-02', 'FlatItem 수', flatCount >= 100 ? 'PASS' : 'FAIL', `${flatCount}건 (최소 100건 필요)`);

  // S0-03: FlatItem 코드별 분포
  const codeDist = await q(`SELECT "itemCode" as code, COUNT(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId" = '${dataset.id}' GROUP BY "itemCode" ORDER BY "itemCode"`);
  const codeMap = {};
  codeDist.forEach(r => { codeMap[r.code] = parseInt(r.cnt); });
  
  const criticalCodes = ['A1', 'A5', 'B4', 'C4'];
  for (const code of criticalCodes) {
    const val = codeMap[code] || 0;
    report(`S0-03-${code}`, `FlatItem ${code} 수`, val > 0 ? 'PASS' : 'FAIL', `${val}건`);
  }
  
  const optionalCodes = ['A3', 'A4', 'A6', 'B1', 'B2', 'B3', 'B5', 'C1', 'C2', 'C3'];
  for (const code of optionalCodes) {
    const val = codeMap[code] || 0;
    report(`S0-03-${code}`, `FlatItem ${code} 수`, val > 0 ? 'PASS' : 'WARN', `${val}건`);
  }

  // S0-04: 빈 value 항목
  const emptyVal = await cnt(`SELECT COUNT(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId" = '${dataset.id}' AND (value IS NULL OR TRIM(value) = '')`);
  report('S0-04', '빈 value FlatItem', emptyVal === 0 ? 'PASS' : 'WARN', `${emptyVal}건`);

  // S0-05: rowSpan ≥ 1
  const badRowSpan = await cnt(`SELECT COUNT(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId" = '${dataset.id}' AND ("rowSpan" < 1 OR "rowSpan" IS NULL)`);
  report('S0-05', 'rowSpan < 1 항목', badRowSpan === 0 ? 'PASS' : 'FAIL', `${badRowSpan}건`);
} else {
  report('S0-02', 'FlatItem 수', 'FAIL', 'Dataset 없음');
}

// S0-06: FmeaProject 존재
const proj = await q1(`SELECT "fmeaId", "fmeaType", status, step FROM public.fmea_projects WHERE "fmeaId" = '${FMEA_ID}' LIMIT 1`);
report('S0-06', 'FmeaProject 존재', proj ? 'PASS' : 'FAIL',
  proj ? `type=${proj.fmeaType} status=${proj.status} step=${proj.step}` : '프로젝트 미등록');

// ═══════════════════════════════════════════════════════════════
// STAGE 1: Legacy 데이터 존재
// ═══════════════════════════════════════════════════════════════
console.log('\n── STAGE 1: Legacy 데이터 ──');

const legacyRow = await q1(`SELECT data FROM public.fmea_legacy_data WHERE "fmeaId" = '${FMEA_ID}' LIMIT 1`);
const legacy = legacyRow?.data;
report('S1-01', 'Legacy 데이터 존재', legacy ? 'PASS' : 'FAIL', legacy ? 'data IS NOT NULL' : 'Legacy 없음');

if (legacy) {
  const l2Len = legacy.l2?.length || 0;
  report('S1-02', 'Legacy L2 공정 수', l2Len > 0 ? 'PASS' : 'FAIL', `${l2Len}개`);
  
  const l1Name = legacy.l1?.name || '';
  report('S1-03', 'L1 완제품명', l1Name.length > 0 ? 'PASS' : 'WARN', `"${l1Name.substring(0, 30)}"`);

  // Legacy 구조 카운트
  let legL3 = 0, legL2F = 0, legL3F = 0, legFM = 0, legFC = 0, legFE = 0, legFL = 0;
  for (const l2 of (legacy.l2 || [])) {
    legL3 += (l2.l3 || []).length;
    legL2F += (l2.functions || []).length;
    legFM += (l2.failureModes || []).length;
    legFC += (l2.failureCauses || []).length;
    for (const l3 of (l2.l3 || [])) {
      legL3F += (l3.functions || []).length;
      legFC += (l3.failureCauses || []).length;
    }
  }
  legFE = legacy.l1?.failureScopes?.length || 0;
  legFL = legacy.failureLinks?.length || 0;

  // riskData 분석
  const riskData = legacy.riskData || {};
  const rdKeys = Object.keys(riskData);
  const lessonOpt = rdKeys.filter(k => k.startsWith('lesson-opt-')).length;
  const detectionOpt = rdKeys.filter(k => k.startsWith('detection-opt-')).length;
  const preventionOpt = rdKeys.filter(k => k.startsWith('prevention-opt-')).length;
  const riskSOD = rdKeys.filter(k => k.match(/^risk-.*-[SOD]$/)).length;
  const preventionKeys = rdKeys.filter(k => k.startsWith('prevention-') && !k.startsWith('prevention-opt-')).length;
  const detectionKeys = rdKeys.filter(k => k.startsWith('detection-') && !k.startsWith('detection-opt-')).length;

  report('S1-04', 'Legacy riskData 키 수', rdKeys.length > 100 ? 'PASS' : 'WARN', `${rdKeys.length}개`);
  report('S1-05', 'Legacy lesson-opt-*', lessonOpt > 0 ? 'PASS' : 'WARN', `${lessonOpt}건`);
  report('S1-06', 'Legacy detection-opt-*', detectionOpt > 0 ? 'PASS' : 'WARN', `${detectionOpt}건`);
  report('S1-07', 'Legacy prevention-opt-*', preventionOpt > 0 ? 'PASS' : 'WARN', `${preventionOpt}건`);
  report('S1-08', 'Legacy risk-*-S/O/D', riskSOD > 0 ? 'PASS' : 'WARN', `${riskSOD}건 (${riskSOD/3}세트)`);
  report('S1-09', 'Legacy prevention-* (PC)', preventionKeys > 0 ? 'PASS' : 'WARN', `${preventionKeys}건`);
  report('S1-10', 'Legacy detection-* (DC)', detectionKeys > 0 ? 'PASS' : 'WARN', `${detectionKeys}건`);

  // ═══════════════════════════════════════════════════════════════
  // STAGE 2: 파싱 — Atomic vs Legacy 교차 검증 (내용 기반)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n── STAGE 2: 파싱 교차 검증 (Atomic vs Legacy) ──');

  // 프로젝트 스키마 존재 확인
  const schemaExists = await q1(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${SCHEMA}'`);
  if (!schemaExists) {
    report('S2-00', '프로젝트 스키마 존재', 'FAIL', `${SCHEMA} 스키마 없음`);
  } else {
    const atomicL2 = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l2_structures`);
    const atomicL3 = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l3_structures`);
    const atomicL1F = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l1_functions`);
    const atomicL2F = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l2_functions`);
    const atomicL3F = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l3_functions`);
    const atomicFM = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_modes`);
    const atomicFC = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_causes`);
    const atomicFE = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_effects`);
    const atomicFL = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_links`);
    const atomicRA = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses`);
    const atomicOpt = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.optimizations`);

    report('S2-01', 'L2 Atomic↔Legacy', atomicL2 === l2Len ? 'PASS' : 'FAIL', `Atomic=${atomicL2} Legacy=${l2Len}`);
    report('S2-02', 'L3 Atomic↔Legacy', atomicL3 === legL3 ? 'PASS' : 'FAIL', `Atomic=${atomicL3} Legacy=${legL3}`);
    report('S2-03', 'FM Atomic↔Legacy', atomicFM === legFM ? 'PASS' : 'FAIL', `Atomic=${atomicFM} Legacy=${legFM}`);
    report('S2-04', 'FE Atomic↔Legacy', atomicFE === legFE ? 'PASS' : 'FAIL', `Atomic=${atomicFE} Legacy=${legFE}`);
    report('S2-05', 'FL Atomic↔Legacy', atomicFL === legFL ? 'PASS' : 'WARN', `Atomic=${atomicFL} Legacy=${legFL}`);
    report('S2-06', 'L3F Atomic↔Legacy', atomicL3F === legL3F ? 'PASS' : 'WARN', `Atomic=${atomicL3F} Legacy=${legL3F} (L3F vs PC 차이 가능)`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 3: UUID 검증 — 형식 + 결정론적 + 고아
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── STAGE 3: UUID 검증 ──');

    // S3-01: L2 UUID 형식
    const badL2Id = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l2_structures WHERE id NOT LIKE 'PF-L2-%'`);
    report('S3-01', 'L2 UUID 형식 (PF-L2-*)', badL2Id === 0 ? 'PASS' : 'FAIL', `비정규 ${badL2Id}건`);

    // S3-02: L3 UUID 형식
    const badL3Id = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l3_structures WHERE id NOT LIKE 'PF-L3-%'`);
    report('S3-02', 'L3 UUID 형식 (PF-L3-*)', badL3Id === 0 ? 'PASS' : 'WARN', `비정규 ${badL3Id}건`);

    // S3-03: FM UUID 형식
    const badFMId = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_modes WHERE id NOT LIKE 'PF-L2-%-M-%'`);
    report('S3-03', 'FM UUID 형식', badFMId === 0 ? 'PASS' : 'WARN', `비정규 ${badFMId}건`);

    // S3-04: FE UUID 형식
    const badFEId = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_effects WHERE id NOT LIKE 'PF-FE-%'`);
    report('S3-04', 'FE UUID 형식 (PF-FE-*)', badFEId === 0 ? 'PASS' : 'WARN', `비정규 ${badFEId}건`);

    // S3-05: 고아 L3Structure (L3Function 없는)
    const orphanL3S = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l3_structures ls WHERE NOT EXISTS (SELECT 1 FROM ${SCHEMA}.l3_functions lf WHERE lf."l3StructId" = ls.id)`);
    report('S3-05', '고아 L3Structure (L3F 없음)', orphanL3S === 0 ? 'PASS' : 'FAIL', `${orphanL3S}건`);

    // S3-06: 고아 FC (processCharId NULL)
    const orphanFC = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_causes WHERE "processCharId" IS NULL`);
    report('S3-06', 'FC processCharId NULL', orphanFC === 0 ? 'PASS' : 'WARN', `${orphanFC}건`);

    // S3-07: L2 UUID 중복
    const dupL2 = await cnt(`SELECT COUNT(*) as cnt FROM (SELECT id FROM ${SCHEMA}.l2_structures GROUP BY id HAVING COUNT(*) > 1) t`);
    report('S3-07', 'L2 UUID 중복', dupL2 === 0 ? 'PASS' : 'FAIL', `${dupL2}건`);

    // S3-08: FM UUID 중복
    const dupFM = await cnt(`SELECT COUNT(*) as cnt FROM (SELECT id FROM ${SCHEMA}.failure_modes GROUP BY id HAVING COUNT(*) > 1) t`);
    report('S3-08', 'FM UUID 중복', dupFM === 0 ? 'PASS' : 'FAIL', `${dupFM}건`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 4: FK 정합성 — 실제 JOIN으로 고아 검증
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── STAGE 4: FK 정합성 (실제 JOIN) ──');

    // S4-01: FM.productCharId → L2Function/L3Function
    const fmNoPC = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_modes WHERE "productCharId" IS NULL OR "productCharId" = ''`);
    report('S4-01', 'FM.productCharId NULL/empty', fmNoPC === 0 ? 'PASS' : 'FAIL', `${fmNoPC}건`);

    // S4-02: FL.fmId → FailureMode 실존
    const flOrphanFM = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_links fl LEFT JOIN ${SCHEMA}.failure_modes fm ON fl."fmId" = fm.id WHERE fm.id IS NULL`);
    report('S4-02', 'FL→FM orphan', flOrphanFM === 0 ? 'PASS' : 'FAIL', `${flOrphanFM}건`);

    // S4-03: FL.feId → FailureEffect 실존
    const flOrphanFE = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_links fl LEFT JOIN ${SCHEMA}.failure_effects fe ON fl."feId" = fe.id WHERE fe.id IS NULL`);
    report('S4-03', 'FL→FE orphan', flOrphanFE === 0 ? 'PASS' : 'FAIL', `${flOrphanFE}건`);

    // S4-04: FL.fcId → FailureCause 실존
    const flOrphanFC = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_links fl LEFT JOIN ${SCHEMA}.failure_causes fc ON fl."fcId" = fc.id WHERE fc.id IS NULL`);
    report('S4-04', 'FL→FC orphan', flOrphanFC === 0 ? 'PASS' : 'FAIL', `${flOrphanFC}건`);

    // S4-05: RA.linkId → FailureLink 실존
    const raOrphan = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses ra LEFT JOIN ${SCHEMA}.failure_links fl ON ra."linkId" = fl.id WHERE fl.id IS NULL`);
    report('S4-05', 'RA→FL orphan', raOrphan === 0 ? 'PASS' : 'FAIL', `${raOrphan}건`);

    // S4-06: Opt.riskId → RiskAnalysis 실존
    const optOrphan = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.optimizations o LEFT JOIN ${SCHEMA}.risk_analyses ra ON o."riskId" = ra.id WHERE ra.id IS NULL`);
    report('S4-06', 'Opt→RA orphan', optOrphan === 0 ? 'PASS' : 'FAIL', `${optOrphan}건`);

    // S4-07: FC.l3StructId → L3Structure 실존
    const fcOrphanL3 = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_causes fc LEFT JOIN ${SCHEMA}.l3_structures ls ON fc."l3StructId" = ls.id WHERE ls.id IS NULL AND fc."l3StructId" IS NOT NULL`);
    report('S4-07', 'FC→L3Structure orphan', fcOrphanL3 === 0 ? 'PASS' : 'FAIL', `${fcOrphanL3}건`);

    // S4-08: FC.l2StructId → L2Structure 실존
    const fcOrphanL2 = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_causes fc LEFT JOIN ${SCHEMA}.l2_structures ls ON fc."l2StructId" = ls.id WHERE ls.id IS NULL AND fc."l2StructId" IS NOT NULL`);
    report('S4-08', 'FC→L2Structure orphan', fcOrphanL2 === 0 ? 'PASS' : 'FAIL', `${fcOrphanL2}건`);

    // S4-09: FE.l1FuncId → L1Function 실존
    const feOrphanL1F = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_effects fe LEFT JOIN ${SCHEMA}.l1_functions lf ON fe."l1FuncId" = lf.id WHERE lf.id IS NULL AND fe."l1FuncId" IS NOT NULL`);
    report('S4-09', 'FE→L1Function orphan', feOrphanL1F === 0 ? 'PASS' : 'FAIL', `${feOrphanL1F}건`);

    // S4-10: FailureLink (fmId, fcId) 복합키 중복
    const dupFL = await cnt(`SELECT COUNT(*) as cnt FROM (SELECT "fmId", "fcId" FROM ${SCHEMA}.failure_links GROUP BY "fmId", "fcId" HAVING COUNT(*) > 1) t`);
    report('S4-10', 'FL (fmId,fcId) 중복', dupFL === 0 ? 'PASS' : 'WARN', `${dupFL}건`);

    // S4-11: 미연결 FC (어떤 FL에도 없는 FC)
    const unlinkedFC = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_causes fc WHERE NOT EXISTS (SELECT 1 FROM ${SCHEMA}.failure_links fl WHERE fl."fcId" = fc.id)`);
    report('S4-11', '미연결 FC (FL 없음)', unlinkedFC === 0 ? 'PASS' : 'WARN', `${unlinkedFC}건`);

    // S4-12: FL 없는 RA (고아 RA)
    const flWithoutRA = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_links fl WHERE NOT EXISTS (SELECT 1 FROM ${SCHEMA}.risk_analyses ra WHERE ra."linkId" = fl.id)`);
    report('S4-12', 'FL without RA', flWithoutRA === 0 ? 'PASS' : 'FAIL', `${flWithoutRA}건`);

    // S4-13: RA = FL 수 일치
    report('S4-13', 'RA수=FL수', atomicRA === atomicFL ? 'PASS' : 'FAIL', `RA=${atomicRA} FL=${atomicFL}`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 5: RiskAnalysis 내용 검증
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── STAGE 5: RiskAnalysis 내용 검증 ──');

    // S5-01: DC NULL/empty
    const dcNull = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses WHERE "detectionControl" IS NULL OR TRIM("detectionControl") = ''`);
    report('S5-01', 'DC NULL/empty', dcNull === 0 ? 'PASS' : 'WARN', `${dcNull}건 / ${atomicRA}건`);

    // S5-02: PC NULL/empty
    const pcNull = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses WHERE "preventionControl" IS NULL OR TRIM("preventionControl") = ''`);
    report('S5-02', 'PC NULL/empty', pcNull === 0 ? 'PASS' : 'WARN', `${pcNull}건 / ${atomicRA}건`);

    // S5-03: Severity 0 건수
    const sev0 = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses WHERE severity = 0 OR severity IS NULL`);
    report('S5-03', 'Severity = 0', sev0 === 0 ? 'PASS' : 'WARN', `${sev0}건 / ${atomicRA}건`);

    // S5-04: Occurrence 0 건수
    const occ0 = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses WHERE occurrence = 0 OR occurrence IS NULL`);
    report('S5-04', 'Occurrence = 0', occ0 === 0 ? 'PASS' : 'WARN', `${occ0}건 / ${atomicRA}건`);

    // S5-05: Detection 0 건수
    const det0 = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses WHERE detection = 0 OR detection IS NULL`);
    report('S5-05', 'Detection = 0', det0 === 0 ? 'PASS' : 'WARN', `${det0}건 / ${atomicRA}건`);

    // S5-06: AP 비어있는 건수
    const apEmpty = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses WHERE ap IS NULL OR TRIM(ap) = ''`);
    report('S5-06', 'AP empty', apEmpty === 0 ? 'PASS' : 'WARN', `${apEmpty}건`);

    // S5-07: lldReference 건수
    const lldRef = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.risk_analyses WHERE "lldReference" IS NOT NULL AND TRIM("lldReference") != ''`);
    report('S5-07', 'RA.lldReference 존재', lldRef > 0 ? 'PASS' : 'WARN', `${lldRef}건 / ${atomicRA}건`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 6: Optimization 내용 검증
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── STAGE 6: Optimization 내용 검증 ──');

    // S6-01: lldOptReference 건수
    const lldOpt = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.optimizations WHERE "lldOptReference" IS NOT NULL AND TRIM("lldOptReference") != ''`);
    report('S6-01', 'Opt.lldOptReference', lldOpt > 0 ? 'PASS' : 'WARN', `${lldOpt}건 / ${atomicOpt}건`);

    // S6-02: detectionAction 건수
    const detAct = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.optimizations WHERE "detectionAction" IS NOT NULL AND TRIM("detectionAction") != ''`);
    report('S6-02', 'Opt.detectionAction', detAct > 0 ? 'PASS' : 'WARN', `${detAct}건 / ${atomicOpt}건`);

    // S6-03: recommendedAction 건수
    const recAct = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.optimizations WHERE "recommendedAction" IS NOT NULL AND TRIM("recommendedAction") != ''`);
    report('S6-03', 'Opt.recommendedAction', recAct > 0 ? 'PASS' : 'WARN', `${recAct}건 / ${atomicOpt}건`);

    // S6-04: responsible 건수
    const resp = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.optimizations WHERE responsible IS NOT NULL AND TRIM(responsible) != ''`);
    report('S6-04', 'Opt.responsible', resp > 0 ? 'PASS' : 'WARN', `${resp}건`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 7: Legacy ↔ Atomic 동기화 검증
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── STAGE 7: Legacy ↔ Atomic 동기화 ──');

    // S7-01: 프로젝트 스키마 riskData 키 수
    const projLegacy = await q1(`SELECT data->'riskData' as rd FROM ${SCHEMA}.fmea_legacy_data LIMIT 1`);
    const projRD = projLegacy?.rd || {};
    const projRDKeys = Object.keys(projRD);
    const projLesson = projRDKeys.filter(k => k.startsWith('lesson-opt-')).length;
    const projDetection = projRDKeys.filter(k => k.startsWith('detection-opt-')).length;
    const projPrevention = projRDKeys.filter(k => k.startsWith('prevention-opt-')).length;
    const projRisk = projRDKeys.filter(k => k.match(/^risk-.*-[SOD]$/)).length;

    report('S7-01', 'Project riskData 키 수', projRDKeys.length > 50 ? 'PASS' : 'WARN', `${projRDKeys.length}개`);
    report('S7-02', 'Project lesson-opt-*', projLesson > 0 ? 'PASS' : 'WARN', `${projLesson}건 (public=${lessonOpt})`);
    report('S7-03', 'Project detection-opt-*', projDetection > 0 ? 'PASS' : 'WARN', `${projDetection}건 (public=${detectionOpt})`);
    report('S7-04', 'Project prevention-opt-*', projPrevention > 0 ? 'PASS' : 'WARN', `${projPrevention}건 (public=${preventionOpt})`);
    report('S7-05', 'Project risk-*-S/O/D', projRisk > 0 ? 'PASS' : 'WARN', `${projRisk}건 (public=${riskSOD})`);

    // S7-06: Public vs Project lesson-opt 일치
    const lessonDiff = Math.abs(lessonOpt - projLesson);
    report('S7-06', 'Public↔Project lesson-opt 일치', lessonDiff <= 5 ? 'PASS' : 'FAIL', `차이=${lessonDiff}건`);

    // S7-07: Public vs Project detection-opt 일치
    const detDiff = Math.abs(detectionOpt - projDetection);
    report('S7-07', 'Public↔Project detection-opt 일치', detDiff <= 5 ? 'PASS' : 'FAIL', `차이=${detDiff}건`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 8: 구조 내용 검증 (빈 이름, 빈 함수)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── STAGE 8: 구조 내용 검증 ──');

    // S8-01: L2 빈 이름
    const emptyL2Name = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l2_structures WHERE name IS NULL OR TRIM(name) = ''`);
    report('S8-01', 'L2 빈 이름', emptyL2Name === 0 ? 'PASS' : 'FAIL', `${emptyL2Name}건`);

    // S8-02: L3 빈 이름 (placeholder 제외)
    const emptyL3Name = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l3_structures WHERE name IS NULL OR TRIM(name) = ''`);
    report('S8-02', 'L3 빈 이름', emptyL3Name === 0 ? 'PASS' : 'WARN', `${emptyL3Name}건 (수동모드 placeholder 가능)`);

    // S8-03: FM 빈 mode
    const emptyFMName = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_modes WHERE mode IS NULL OR TRIM(mode) = ''`);
    report('S8-03', 'FM 빈 mode', emptyFMName === 0 ? 'PASS' : 'FAIL', `${emptyFMName}건`);

    // S8-04: FC 빈 cause
    const emptyFCCause = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_causes WHERE cause IS NULL OR TRIM(cause) = ''`);
    report('S8-04', 'FC 빈 cause', emptyFCCause === 0 ? 'PASS' : 'WARN', `${emptyFCCause}건`);

    // S8-05: FE 빈 effect
    const emptyFEEffect = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.failure_effects WHERE effect IS NULL OR TRIM(effect) = ''`);
    report('S8-05', 'FE 빈 effect', emptyFEEffect === 0 ? 'PASS' : 'FAIL', `${emptyFEEffect}건`);

    // S8-06: L2Function 빈 이름
    const emptyL2FName = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l2_functions WHERE "functionName" IS NULL OR TRIM("functionName") = ''`);
    report('S8-06', 'L2Function 빈 이름', emptyL2FName === 0 ? 'PASS' : 'WARN', `${emptyL2FName}건`);

    // S8-07: L3Function 빈 이름
    const emptyL3FName = await cnt(`SELECT COUNT(*) as cnt FROM ${SCHEMA}.l3_functions WHERE "functionName" IS NULL OR TRIM("functionName") = ''`);
    report('S8-07', 'L3Function 빈 이름', emptyL3FName === 0 ? 'PASS' : 'WARN', `${emptyL3FName}건`);

    // ═══════════════════════════════════════════════════════════════
    // STAGE 9: 인프라/스키마 검증
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── STAGE 9: 인프라 검증 ──');

    // S9-01: lldReference 컬럼 존재
    const lldRefCol = await cnt(`SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema='${SCHEMA}' AND table_name='risk_analyses' AND column_name='lldReference'`);
    report('S9-01', 'RA.lldReference 컬럼', lldRefCol > 0 ? 'PASS' : 'FAIL', lldRefCol > 0 ? '존재' : '누락');

    // S9-02: lldOptReference 컬럼 존재
    const lldOptCol = await cnt(`SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema='${SCHEMA}' AND table_name='optimizations' AND column_name='lldOptReference'`);
    report('S9-02', 'Opt.lldOptReference 컬럼', lldOptCol > 0 ? 'PASS' : 'FAIL', lldOptCol > 0 ? '존재' : '누락');

    // S9-03: detectionAction 컬럼 존재
    const detActCol = await cnt(`SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema='${SCHEMA}' AND table_name='optimizations' AND column_name='detectionAction'`);
    report('S9-03', 'Opt.detectionAction 컬럼', detActCol > 0 ? 'PASS' : 'FAIL', detActCol > 0 ? '존재' : '누락');

    // S9-04: public vs project 컬럼 수 비교
    const pubColCount = await cnt(`SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema='public' AND table_name='risk_analyses'`);
    const projColCount = await cnt(`SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema='${SCHEMA}' AND table_name='risk_analyses'`);
    report('S9-04', 'RA 컬럼 수 일치', pubColCount === projColCount ? 'PASS' : 'WARN', `public=${pubColCount} project=${projColCount}`);

    // Summary table
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  Summary: ${FMEA_ID}`);
    console.log(`  Atomic DB: L2=${atomicL2} L3=${atomicL3} FM=${atomicFM} FC=${atomicFC} FE=${atomicFE}`);
    console.log(`  FK Chain: FL=${atomicFL} RA=${atomicRA} Opt=${atomicOpt}`);
    console.log(`  RA: DC_NULL=${dcNull} PC_NULL=${pcNull} S0=${sev0} O0=${occ0} D0=${det0}`);
    console.log(`  Opt: LLD=${lldOpt} DetAct=${detAct} RecAct=${recAct}`);
    console.log(`  Project riskData: keys=${projRDKeys.length} lesson=${projLesson} detect=${projDetection}`);
    console.log(`${'='.repeat(70)}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(70)}`);
console.log(`  FINAL REPORT: ${FMEA_ID}`);
console.log(`  ✅ PASS: ${passCount}  ❌ FAIL: ${failCount}  ⚠️ WARN: ${warnCount}`);
console.log(`  Total: ${passCount + failCount + warnCount} items`);
if (failCount === 0) {
  console.log(`  🎯 ALL CHECKS PASSED (${warnCount} warnings)`);
} else {
  console.log(`  🔴 ${failCount} FAILURES DETECTED — 수정 필요`);
}
console.log(`${'═'.repeat(70)}\n`);

// FAIL 항목 리스트
if (failCount > 0) {
  console.log('── FAIL 항목 상세 ──');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  ❌ ${r.id} ${r.name}: ${r.detail}`);
  });
}
if (warnCount > 0) {
  console.log('\n── WARN 항목 상세 ──');
  results.filter(r => r.status === 'WARN').forEach(r => {
    console.log(`  ⚠️ ${r.id} ${r.name}: ${r.detail}`);
  });
}

await c.end();
