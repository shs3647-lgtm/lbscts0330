import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const SCHEMA = 'pfmea_pfm26_m059';

async function main() {
  const l3Funcs = await pool.query(`SELECT id, "functionName", "processChar", "l3StructId", "l2StructId" FROM "${SCHEMA}".l3_functions`);
  const fcs = await pool.query(`SELECT id, cause, "processCharId", "l3FuncId", "l2StructId" FROM "${SCHEMA}".failure_causes`);
  
  console.log(`L3Functions: ${l3Funcs.rows.length}`);
  console.log(`FailureCauses: ${fcs.rows.length}`);
  
  // L3Function ID patterns
  const l3FuncIdSet = new Set(l3Funcs.rows.map(f => f.id));
  console.log(`\n=== L3Function ID 샘플 (상위 5개) ===`);
  for (const f of l3Funcs.rows.slice(0, 5)) {
    console.log(`  id=${f.id} func="${f.functionName}" pc="${f.processChar}" l2Id=${f.l2StructId}`);
  }
  
  console.log(`\n=== FC processCharId 샘플 (상위 5개) ===`);
  for (const fc of fcs.rows.slice(0, 5)) {
    console.log(`  fcId=${fc.id} cause="${fc.cause}" pcId=${fc.processCharId} l3FuncId=${fc.l3FuncId}`);
  }
  
  // FC processCharId가 L3Function.id와 일치하는지 확인
  let pcIdMatchL3Func = 0;
  let l3FuncIdMatch = 0;
  for (const fc of fcs.rows) {
    if (l3FuncIdSet.has(fc.processCharId)) pcIdMatchL3Func++;
    if (l3FuncIdSet.has(fc.l3FuncId)) l3FuncIdMatch++;
  }
  console.log(`\nFC.processCharId → L3Function.id 매칭: ${pcIdMatchL3Func}/${fcs.rows.length}`);
  console.log(`FC.l3FuncId → L3Function.id 매칭: ${l3FuncIdMatch}/${fcs.rows.length}`);
  
  // L3Function을 processChar 기준 ID Map
  // UI에서 processChars[].id = L3Function.id
  // FC.processCharId가 L3Function.id와 매칭되어야 UI에서 연결됨
  
  // 현재: FC.processCharId = B3-style IDs (PF-L3-xxx-C-xxx)
  // UI 기대: processChars[].id = L3Function.id
  // 결론: FC.processCharId를 L3Function.id로 리매핑 필요
  
  // L3Function을 l2StructId + processChar(이름)으로 그룹핑
  const l3FuncByL2AndName = new Map();
  for (const f of l3Funcs.rows) {
    const key = `${f.l2StructId}::${(f.processChar || '').trim()}`;
    if (!l3FuncByL2AndName.has(key)) l3FuncByL3AndName = [];
    l3FuncByL2AndName.set(key, f);
  }
  
  // FC별로 매칭 시도
  const pcs = await pool.query(`SELECT id, name, "l2StructId" FROM "${SCHEMA}".process_product_chars`);
  const pcById = new Map(pcs.rows.map(pc => [pc.id, pc]));
  
  console.log(`\n=== FC processCharId → PC name → L3Function 리매핑 시도 ===`);
  let remappable = 0;
  for (const fc of fcs.rows.slice(0, 10)) {
    const pc = pcById.get(fc.processCharId);
    if (pc) {
      const key = `${fc.l2StructId}::${(pc.name || '').trim()}`;
      const l3Func = l3FuncByL2AndName.get(key);
      const status = l3Func ? '✅' : '❌';
      if (l3Func) remappable++;
      console.log(`  ${status} FC="${fc.cause}" pcId=${fc.processCharId} pcName="${pc?.name}" → l3FuncId=${l3Func?.id || 'NONE'}`);
    } else {
      console.log(`  ❌ FC="${fc.cause}" pcId=${fc.processCharId} → PC not found!`);
    }
  }

  await pool.end();
}

main().catch(async e => { console.error(e); await pool.end(); });
