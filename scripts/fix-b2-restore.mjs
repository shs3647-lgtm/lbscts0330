import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

const fmeaId = 'pfm26-f001-l41';

// 현재 상태 확인
const b2Now = await c.query(`SELECT count(*) as cnt FROM public.l3_functions WHERE "fmeaId" = $1 AND "functionName" <> ''`, [fmeaId]);
const b3Now = await c.query(`SELECT count(*) as cnt FROM public.l3_functions WHERE "fmeaId" = $1 AND "processChar" <> ''`, [fmeaId]);
console.log(`현재: B2=${b2Now.rows[0].cnt}, B3=${b3Now.rows[0].cnt}`);

// 삭제된 레코드 복구 — 원본 l3StructId와 동일한 새 레코드 삽입
const existingRecord = await c.query(`
  SELECT "l3StructId", "fmeaId"
  FROM public.l3_functions
  WHERE "fmeaId" = $1 AND "functionName" = $2
  LIMIT 1
`, [fmeaId, '120번-EOL 검사지그-제품을 고정하여 정확한 위치에서 검사를 가능하게 한다']);

if (existingRecord.rows.length > 0) {
  const l3StructId = existingRecord.rows[0].l3StructId;
  console.log(`\n복구: l3StructId=${l3StructId}`);

  // 새 ID 생성
  const newId = 'id_restored_' + Date.now().toString(36);

  await c.query(`
    INSERT INTO public.l3_functions (id, "fmeaId", "l3StructId", "functionName", "processChar", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
  `, [
    newId,
    fmeaId,
    l3StructId,
    '120번-EOL 검사지그-제품을 고정하여 정확한 위치에서 검사를 가능하게 한다',
    '120번-EOL 검사기-교정상태'
  ]);
  console.log(`복구 완료: id=${newId}`);
}

// 복구 후 상태
const b2After = await c.query(`SELECT count(*) as cnt FROM public.l3_functions WHERE "fmeaId" = $1 AND "functionName" <> ''`, [fmeaId]);
const b3After = await c.query(`SELECT count(*) as cnt FROM public.l3_functions WHERE "fmeaId" = $1 AND "processChar" <> ''`, [fmeaId]);
console.log(`\n복구 후: B2=${b2After.rows[0].cnt}, B3=${b3After.rows[0].cnt}`);

// 이제 올바른 분석: Import B2 flatItems vs DB functionName(빈 processChar 포함)
// Import B2=129건. DB B2=130건. 차이 1건의 정체:
// → 같은 functionName이 서로 다른 processChar와 짝지어 2행 존재 (정상 데이터)

// 올바른 해결: DB B2 카운트를 "L3Function 행 수" 대신
// "고유 (l3StructId, functionName) 조합 수" 또는 Import와 동일한 기준으로 카운트

const distinctFuncByStruct = await c.query(`
  SELECT DISTINCT "l3StructId", "functionName"
  FROM public.l3_functions
  WHERE "fmeaId" = $1 AND "functionName" <> ''
`, [fmeaId]);
console.log(`\nDB B2 DISTINCT (l3StructId, functionName): ${distinctFuncByStruct.rows.length}`);

// functionName 자체 기준 (processChar 무관하게)
const distinctFunc = await c.query(`
  SELECT DISTINCT "functionName"
  FROM public.l3_functions
  WHERE "fmeaId" = $1 AND "functionName" <> ''
`, [fmeaId]);
console.log(`DB B2 DISTINCT functionName: ${distinctFunc.rows.length}`);

// Import B2 분석
const dsR = await c.query(`SELECT id FROM public.pfmea_master_datasets WHERE "fmeaId" = $1 AND "isActive" = true LIMIT 1`, [fmeaId]);
const dsId = dsR.rows[0]?.id;
if (dsId) {
  const impB2 = await c.query(`SELECT value FROM public.pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B2' AND value <> ''`, [dsId]);
  const impB3 = await c.query(`SELECT value FROM public.pfmea_master_flat_items WHERE "datasetId" = $1 AND "itemCode" = 'B3' AND value <> ''`, [dsId]);
  console.log(`\nImport B2 total: ${impB2.rows.length}`);
  console.log(`Import B3 total: ${impB3.rows.length}`);

  console.log('\n=== 정합성 비교 (모든 기준) ===');
  console.log(`B2: Import total=${impB2.rows.length} | DB count(*)=${b2After.rows[0].cnt} | DB DISTINCT(struct,func)=${distinctFuncByStruct.rows.length}`);
  console.log(`B3: Import total=${impB3.rows.length} | DB count(*)=${b3After.rows[0].cnt}`);
}

await c.end();
