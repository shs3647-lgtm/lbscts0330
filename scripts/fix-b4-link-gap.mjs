import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();
const fmeaId = 'pfm26-f001-l41';

// ─── 1. 누락 chain 데이터 ───
const missingChains = [
  {
    fmValue: '120번-HUD-암전류 부적합',
    feValue: 'C2-5:선별 부적합(외관,치수,조립성)으로 선별 재작업 발생',
    fcValue: '120번-마스터 유효기간 초과로 불량 마스터를 양품으로 판정함',
  },
  {
    fmValue: '120번-HUD-영상 미출력',
    feValue: 'C3-4:치수,기능 부적합으로 대책서 요구(선별없음)',
    fcValue: '120번-스캐너 인식오류',
  },
];

// ─── 2. Import chains에서 정확한 값 가져오기 ───
const dsR = await c.query(`SELECT id, "failureChains" FROM public.pfmea_master_datasets WHERE "fmeaId"=$1 AND "isActive"=true LIMIT 1`, [fmeaId]);
const dsId = dsR.rows[0]?.id;
const chains = Array.isArray(dsR.rows[0]?.failureChains) ? dsR.rows[0].failureChains : [];

// 정확한 chain 데이터 매칭
for (const mc of missingChains) {
  const matched = chains.find(ch =>
    (ch.fcValue || '').trim() === mc.fcValue
  );
  if (matched) {
    mc.processNo = matched.processNo || '';
    mc.m4 = matched.m4 || '';
    mc.feScope = matched.feScope || '';
    mc.fmValue = (matched.fmValue || '').trim();
    mc.feValue = (matched.feValue || '').trim();
    mc.fcValue = (matched.fcValue || '').trim();
    mc.pcValue = (matched.pcValue || '').trim();
    mc.dcValue = (matched.dcValue || '').trim();
    console.log(`✓ chain 매칭: processNo=${mc.processNo} m4=${mc.m4} FC="${mc.fcValue.slice(0,50)}"`);
  } else {
    console.log(`✗ chain 미발견: FC="${mc.fcValue.slice(0,50)}"`);
  }
}

// ─── 3. 워크시트 상태에서 FM/FE/FC ID 찾기 ───
// FM ID 조회 (FailureMode 테이블 — 컬럼: mode)
for (const mc of missingChains) {
  const exactFm = await c.query(`
    SELECT id, mode FROM public.failure_modes
    WHERE "fmeaId"=$1 AND mode=$2
  `, [fmeaId, mc.fmValue]);

  if (exactFm.rows.length > 0) {
    mc.fmId = exactFm.rows[0].id;
    console.log(`  FM found: id=${mc.fmId} "${exactFm.rows[0].mode.slice(0,50)}"`);
  } else {
    // 부분 매칭
    const fmR = await c.query(`
      SELECT id, mode FROM public.failure_modes
      WHERE "fmeaId"=$1 AND mode LIKE $2
    `, [fmeaId, `%${mc.fmValue.split('-').slice(-1)[0]}%`]);
    if (fmR.rows.length > 0) {
      mc.fmId = fmR.rows[0].id;
      console.log(`  FM fuzzy: id=${mc.fmId} "${fmR.rows[0].mode.slice(0,50)}"`);
    } else {
      console.log(`  FM NOT FOUND: "${mc.fmValue}"`);
    }
  }
}

// FE ID 조회 (FailureEffect 테이블 — 컬럼: effect, category)
for (const mc of missingChains) {
  const feR = await c.query(`
    SELECT id, effect, category FROM public.failure_effects
    WHERE "fmeaId"=$1 AND effect=$2
  `, [fmeaId, mc.feValue]);

  if (feR.rows.length > 0) {
    mc.feId = feR.rows[0].id;
    mc.feScope = feR.rows[0].category || mc.feScope;
    console.log(`  FE found: id=${mc.feId} category=${mc.feScope}`);
  } else {
    // 부분 매칭
    const fePartial = await c.query(`
      SELECT id, effect, category FROM public.failure_effects
      WHERE "fmeaId"=$1 AND effect LIKE $2
    `, [fmeaId, `%${mc.feValue.split(':').slice(-1)[0].slice(0,20)}%`]);
    if (fePartial.rows.length > 0) {
      mc.feId = fePartial.rows[0].id;
      mc.feScope = fePartial.rows[0].category || mc.feScope;
      console.log(`  FE fuzzy: id=${mc.feId} "${fePartial.rows[0].effect.slice(0,50)}"`);
    } else {
      console.log(`  FE NOT FOUND: "${mc.feValue}"`);
    }
  }
}

// ─── 4. 누락 FailureCause 레코드 생성 위한 정보 ───
// 공정 120번의 l3Structure 정보 확인
const l3Structs = await c.query(`
  SELECT ls.id as l3id, ls."l2Id", ls.name, ls.m4
  FROM public.l3_structures ls
  WHERE ls."fmeaId"=$1
  AND ls.name LIKE '120번%'
  ORDER BY ls.m4, ls.name
`, [fmeaId]);
console.log('\n=== 공정 120번 L3Structure ===');
l3Structs.rows.forEach(r => console.log(`  id=${r.l3id.slice(0,25)} l2=${r.l2Id.slice(0,25)} m4=${r.m4} name="${r.name.slice(0,50)}"`));

// 각 누락 FC에 해당하는 l3StructId 찾기 (같은 m4와 processNo 기반)
for (const mc of missingChains) {
  // Import chain의 m4 값으로 해당 l3Structure 찾기
  const matchL3 = l3Structs.rows.find(r => r.m4 === mc.m4);
  if (matchL3) {
    mc.l3StructId = matchL3.l3id;
    mc.l2StructId = matchL3.l2Id;
    console.log(`  L3 for FC "${mc.fcValue.slice(0,40)}": l3=${mc.l3StructId.slice(0,25)} m4=${mc.m4}`);
  }

  // l3FuncId 찾기 — 해당 l3StructId의 L3Function
  if (mc.l3StructId) {
    const l3Func = await c.query(`
      SELECT id FROM public.l3_functions
      WHERE "fmeaId"=$1 AND "l3StructId"=$2
      LIMIT 1
    `, [fmeaId, mc.l3StructId]);
    if (l3Func.rows.length > 0) {
      mc.l3FuncId = l3Func.rows[0].id;
    }
  }
}

// ─── 5. 실제 삽입 ───
console.log('\n=== 삽입 시작 ===');
const uid = () => 'id_fix_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);

for (const mc of missingChains) {
  if (!mc.l3StructId || !mc.l2StructId || !mc.l3FuncId) {
    console.log(`SKIP: 필수 ID 누락 — FC="${mc.fcValue.slice(0,40)}"`);
    continue;
  }

  // 5a. FailureCause 삽입
  const fcId = uid();
  await c.query(`
    INSERT INTO public.failure_causes
    (id, "fmeaId", "l3FuncId", "l3StructId", "l2StructId", cause, occurrence, "createdAt", "updatedAt", "rowSpan", "colSpan")
    VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW(), 1, 1)
  `, [fcId, fmeaId, mc.l3FuncId, mc.l3StructId, mc.l2StructId, mc.fcValue]);
  console.log(`  ✓ FailureCause: id=${fcId} cause="${mc.fcValue.slice(0,50)}"`);

  // 5b. FailureLink 삽입
  if (mc.fmId && mc.feId) {
    const linkId = uid();
    await c.query(`
      INSERT INTO public.failure_links
      (id, "fmeaId", "fmId", "feId", "fcId", "fmText", "feText", "fcText", "fmProcess", "feScope", "fcM4", "fcWorkElem", severity, "createdAt", "updatedAt", "rowSpan", "colSpan")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '', 0, NOW(), NOW(), 1, 1)
    `, [linkId, fmeaId, mc.fmId, mc.feId, fcId, mc.fmValue, mc.feValue, mc.fcValue, `공정${mc.processNo}`, mc.feScope, mc.m4]);
    console.log(`  ✓ FailureLink: id=${linkId}`);
  } else {
    console.log(`  SKIP FailureLink: fmId=${mc.fmId || 'NONE'} feId=${mc.feId || 'NONE'}`);
  }
}

// ─── 6. 검증 ───
const afterB4 = await c.query(`SELECT count(*) as cnt FROM public.failure_causes WHERE "fmeaId"=$1`, [fmeaId]);
const afterLink = await c.query(`SELECT count(*) as cnt FROM public.failure_links WHERE "fmeaId"=$1 AND "deletedAt" IS NULL`, [fmeaId]);
const impB4 = await c.query(`SELECT count(*) as cnt FROM public.pfmea_master_flat_items WHERE "datasetId"=$1 AND "itemCode"='B4' AND value<>''`, [dsId]);

console.log('\n=== 삽입 후 검증 ===');
console.log(`B4: Import=${impB4.rows[0].cnt}, DB=${afterB4.rows[0].cnt}`);
console.log(`Link: Import=${chains.length}, DB=${afterLink.rows[0].cnt}`);

await c.end();
