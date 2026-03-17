import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const SCHEMA = 'pfmea_pfm26_m059';

async function main() {
  // FC의 processCharId가 실제 ProcessProductChar에 존재하는지 확인
  const fcs = await pool.query(`SELECT id, cause, "processCharId", "l2StructId" FROM "${SCHEMA}".failure_causes`);
  const pcs = await pool.query(`SELECT id, name, "l2StructId" FROM "${SCHEMA}".process_product_chars`);
  const l2s = await pool.query(`SELECT id, no, name FROM "${SCHEMA}".l2_structures`);
  
  const pcIdSet = new Set(pcs.rows.map(pc => pc.id));
  const pcById = new Map(pcs.rows.map(pc => [pc.id, pc]));
  const l2ById = new Map(l2s.rows.map(l2 => [l2.id, l2]));
  
  console.log(`Total FCs: ${fcs.rows.length}`);
  console.log(`Total PCs: ${pcs.rows.length}`);
  console.log(`Total L2:  ${l2s.rows.length}\n`);
  
  // FC processCharId → PC 매칭 현황
  let validPcId = 0, nullPcId = 0, invalidPcId = 0;
  const invalidFcs = [];
  for (const fc of fcs.rows) {
    if (!fc.processCharId) {
      nullPcId++;
    } else if (pcIdSet.has(fc.processCharId)) {
      validPcId++;
    } else {
      invalidPcId++;
      const l2 = l2ById.get(fc.l2StructId);
      invalidFcs.push({ fcId: fc.id, cause: fc.cause, pcId: fc.processCharId, l2No: l2?.no, l2Name: l2?.name });
    }
  }
  
  console.log(`FC processCharId 매칭:`);
  console.log(`  유효(PC존재):  ${validPcId}`);
  console.log(`  NULL:          ${nullPcId}`);
  console.log(`  무효(PC없음):  ${invalidPcId}\n`);
  
  if (invalidFcs.length > 0) {
    console.log(`=== processCharId가 잘못된 FC (PC 테이블에 없음) ===`);
    for (const fc of invalidFcs) {
      console.log(`  공정${fc.l2No}(${fc.l2Name}): FC="${fc.cause}" pcId=${fc.pcId}`);
    }
  }
  
  // PC별 FC 연결 현황 — 공정별 그룹핑
  const pcFcMap = new Map();
  for (const fc of fcs.rows) {
    if (fc.processCharId && pcIdSet.has(fc.processCharId)) {
      if (!pcFcMap.has(fc.processCharId)) pcFcMap.set(fc.processCharId, []);
      pcFcMap.get(fc.processCharId).push(fc);
    }
  }
  
  // 공정별 FC 없는 PC 카운트
  const missingByL2 = new Map();
  for (const pc of pcs.rows) {
    const linked = pcFcMap.get(pc.id) || [];
    if (linked.length === 0) {
      const l2 = l2ById.get(pc.l2StructId);
      const key = `${l2?.no || '?'}|${l2?.name || '?'}`;
      if (!missingByL2.has(key)) missingByL2.set(key, []);
      missingByL2.get(key).push(pc);
    }
  }
  
  console.log(`\n=== 공정별 FC 누락 ProcessChar ===`);
  let totalMissing = 0;
  for (const [key, pcList] of [...missingByL2.entries()].sort()) {
    console.log(`공정 ${key}: ${pcList.length}건 누락`);
    for (const pc of pcList) {
      console.log(`  PC id=${pc.id} name="${pc.name}"`);
    }
    totalMissing += pcList.length;
  }
  console.log(`\n전체 누락 PC: ${totalMissing}건`);
  
  // FC의 processCharId 패턴 확인
  console.log(`\n=== FC processCharId 패턴 (상위 10개) ===`);
  const pcIdPatterns = new Map();
  for (const fc of fcs.rows) {
    const pcId = fc.processCharId || 'NULL';
    pcIdPatterns.set(pcId, (pcIdPatterns.get(pcId) || 0) + 1);
  }
  const sorted = [...pcIdPatterns.entries()].sort((a, b) => b[1] - a[1]);
  for (const [pcId, count] of sorted.slice(0, 15)) {
    const inPC = pcIdSet.has(pcId) ? '✅' : '❌';
    const pcName = pcById.get(pcId)?.name || '';
    console.log(`  ${inPC} pcId=${pcId} (${count}건) ${pcName}`);
  }

  await pool.end();
}

main().catch(async e => { console.error(e); await pool.end(); });
