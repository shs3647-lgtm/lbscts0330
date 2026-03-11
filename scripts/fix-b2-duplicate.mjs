import pg from 'pg';
const { Client } = pg;

const c = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db' });
await c.connect();

const fmeaId = 'pfm26-f001-l41';

// 1. 중복 확인
const dupes = await c.query(`
  SELECT "functionName", count(*) as cnt
  FROM public.l3_functions
  WHERE "fmeaId" = $1 AND "functionName" <> ''
  GROUP BY "functionName"
  HAVING count(*) > 1
`, [fmeaId]);

console.log('=== B2 중복 레코드 ===');
for (const d of dupes.rows) {
  console.log(`  x${d.cnt} "${d.functionName.slice(0, 60)}"`);

  // 해당 중복 레코드의 상세 정보
  const rows = await c.query(`
    SELECT id, "l3StructId", "functionName", "processChar"
    FROM public.l3_functions
    WHERE "fmeaId" = $1 AND "functionName" = $2
    ORDER BY "createdAt" ASC
  `, [fmeaId, d.functionName]);

  for (const r of rows.rows) {
    console.log(`    id=${r.id} l3StructId=${r.l3StructId} processChar="${(r.processChar||'').slice(0,40)}"`);
  }

  // Import에도 중복인지 확인
  const impR = await c.query(`
    SELECT count(*) as cnt FROM public.pfmea_master_flat_items fi
    JOIN public.pfmea_master_datasets ds ON fi."datasetId" = ds.id
    WHERE ds."fmeaId" = $1 AND ds."isActive" = true AND fi."itemCode" = 'B2' AND fi.value = $2
  `, [fmeaId, d.functionName]);
  console.log(`    Import 건수: ${impR.rows[0].cnt}`);
}

// 2. Import에 1건인데 DB에 2건인 항목 → DB에서 나중에 생성된 1건 삭제
console.log('\n=== 정리 대상 ===');
for (const d of dupes.rows) {
  const impR = await c.query(`
    SELECT count(*) as cnt FROM public.pfmea_master_flat_items fi
    JOIN public.pfmea_master_datasets ds ON fi."datasetId" = ds.id
    WHERE ds."fmeaId" = $1 AND ds."isActive" = true AND fi."itemCode" = 'B2' AND fi.value = $2
  `, [fmeaId, d.functionName]);

  const impCnt = parseInt(impR.rows[0].cnt);
  const dbCnt = parseInt(d.cnt);

  if (dbCnt > impCnt) {
    // DB가 더 많음 → (dbCnt - impCnt)건 삭제
    const toDelete = dbCnt - impCnt;
    console.log(`  "${d.functionName.slice(0,50)}" DB=${dbCnt} Import=${impCnt} → ${toDelete}건 삭제`);

    // 가장 나중에 생성된 레코드 삭제
    const deleteRows = await c.query(`
      SELECT id FROM public.l3_functions
      WHERE "fmeaId" = $1 AND "functionName" = $2
      ORDER BY "createdAt" DESC
      LIMIT $3
    `, [fmeaId, d.functionName, toDelete]);

    for (const dr of deleteRows.rows) {
      console.log(`    DELETE id=${dr.id}`);
      await c.query('DELETE FROM public.l3_functions WHERE id = $1', [dr.id]);
    }
  } else {
    console.log(`  "${d.functionName.slice(0,50)}" DB=${dbCnt} Import=${impCnt} → 삭제 불필요`);
  }
}

// 3. 정리 후 확인
const afterB2 = await c.query(`
  SELECT count(*) as cnt FROM public.l3_functions
  WHERE "fmeaId" = $1 AND "functionName" <> ''
`, [fmeaId]);
const afterB3 = await c.query(`
  SELECT count(*) as cnt FROM public.l3_functions
  WHERE "fmeaId" = $1 AND "processChar" <> ''
`, [fmeaId]);

console.log(`\n=== 정리 후 ===`);
console.log(`B2 DB total: ${afterB2.rows[0].cnt}`);
console.log(`B3 DB total: ${afterB3.rows[0].cnt}`);

await c.end();
