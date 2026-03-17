import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const SCHEMA = 'pfmea_pfm26_m059';

const TARGET_FCS = [
  { label: 'C8', cause: '측정 오차', proc: 'IQA(수입검사)' },
  { label: 'C26', cause: 'Power 변동', proc: 'UBM Sputter' },
  { label: 'C28', cause: 'Target 소진', proc: 'UBM Sputter' },
  { label: 'C53', cause: '전류밀도 편차', proc: 'Au Plating' },
];

async function main() {
  const l2s = await pool.query(`SELECT id, no, name FROM "${SCHEMA}".l2_structures ORDER BY "order"`);
  const l3s = await pool.query(`SELECT id, "l2Id", m4, name FROM "${SCHEMA}".l3_structures ORDER BY "order"`);
  const l3Funcs = await pool.query(`SELECT id, "l3StructId", "l2StructId", "functionName", "processChar", "specialChar" FROM "${SCHEMA}".l3_functions`);
  const fcs = await pool.query(`SELECT id, cause, "processCharId", "l3FuncId", "l2StructId", "l3StructId", occurrence FROM "${SCHEMA}".failure_causes`);
  const fms = await pool.query(`SELECT id, mode, "l2StructId", "productCharId" FROM "${SCHEMA}".failure_modes`);
  const links = await pool.query(`SELECT id, "fmId", "feId", "fcId" FROM "${SCHEMA}".failure_links`);

  const l2ById = new Map(l2s.rows.map(l => [l.id, l]));
  const l3FuncIdSet = new Set(l3Funcs.rows.map(f => f.id));

  console.log('=== 4건 FC 상세 진단 ===\n');

  for (const target of TARGET_FCS) {
    const fc = fcs.rows.find(f => f.cause === target.cause && l2ById.get(f.l2StructId)?.name === target.proc);
    if (!fc) {
      console.log(`❌ ${target.label} "${target.cause}" [${target.proc}]: DB에서 찾을 수 없음!\n`);
      continue;
    }

    const l2 = l2ById.get(fc.l2StructId);
    const pcMatchesL3Func = l3FuncIdSet.has(fc.processCharId);
    
    // 같은 공정의 L3Functions (= UI processChars)
    const procL3Funcs = l3Funcs.rows.filter(f => f.l2StructId === fc.l2StructId);
    
    // 이 FC의 processCharId가 가리키는 L3Function
    const targetL3Func = l3Funcs.rows.find(f => f.id === fc.processCharId);
    
    // 같은 공정의 L3Structs
    const procL3Structs = l3s.rows.filter(s => s.l2Id === fc.l2StructId);
    
    // 이 FC의 l3StructId가 가리키는 L3Struct
    const fcL3Struct = procL3Structs.find(s => s.id === fc.l3StructId);

    // FailureLink 연결 확인
    const fcLink = links.rows.find(l => l.fcId === fc.id);
    
    console.log(`--- ${target.label}: "${target.cause}" [${l2?.no} ${l2?.name}] ---`);
    console.log(`  FC id:           ${fc.id}`);
    console.log(`  processCharId:   ${fc.processCharId} ${pcMatchesL3Func ? '✅ L3Func존재' : '❌ L3Func없음'}`);
    console.log(`  l3FuncId:        ${fc.l3FuncId}`);
    console.log(`  l3StructId:      ${fc.l3StructId} (${fcL3Struct?.name || 'NOT FOUND'}, m4=${fcL3Struct?.m4 || '?'})`);
    console.log(`  FailureLink:     ${fcLink ? `linkId=${fcLink.id} fmId=${fcLink.fmId}` : '❌ 없음'}`);
    
    if (targetL3Func) {
      console.log(`  → L3Func:        id=${targetL3Func.id} func="${targetL3Func.functionName?.slice(0,30)}" pc="${targetL3Func.processChar}"`);
    }
    
    // 같은 공정의 모든 processChars 나열
    console.log(`  공정 내 L3Functions (=processChars):`);
    const byM4 = new Map();
    for (const f of procL3Funcs) {
      const l3 = procL3Structs.find(s => s.id === f.l3StructId);
      const m4 = l3?.m4 || '?';
      if (!byM4.has(m4)) byM4.set(m4, []);
      byM4.get(m4).push({ ...f, m4 });
    }
    for (const [m4, funcs] of byM4) {
      for (const f of funcs) {
        const isTarget = f.id === fc.processCharId;
        const marker = isTarget ? ' ← FC가 가리킴' : '';
        // 이 processChar에 연결된 FC 찾기
        const linkedFcs = fcs.rows.filter(c => c.processCharId === f.id);
        console.log(`    ${isTarget ? '→' : ' '} [${m4}] id=${f.id} pc="${f.processChar}" (FC ${linkedFcs.length}건)${marker}`);
      }
    }
    
    console.log('');
  }

  // 전체 missingCount 시뮬레이션 재확인
  console.log('\n=== UI missingCount 정밀 시뮬레이션 ===');
  
  const isMeaningful = (name) => {
    if (typeof name !== 'string') return false;
    const n = name.trim();
    if (!n) return false;
    if (n.includes('클릭하여')) return false;
    if (n === '요구사항 선택') return false;
    if (n.startsWith('(기능분석에서')) return false;
    return true;
  };

  const isMissing = (name) => {
    if (name === null || name === undefined) return true;
    if (!name) return true;
    const str = String(name);
    const trimmed = str.trim();
    if (trimmed === '' || trimmed === '-') return true;
    if (trimmed.length > 20) return false;
    if (str.includes('클릭')) return true;
    if (str.includes('추가')) return true;
    if (str.includes('선택')) return true;
    if (str.includes('입력')) return true;
    if (str.includes('필요')) return true;
    return false;
  };

  // atomicToLegacy 시뮬레이션 — buildL3Functions 로직 정확 복제
  let totalMissing = 0;
  const missingList = [];

  for (const l2 of l2s.rows) {
    if (!isMeaningful(l2.name)) continue;

    const allFCs = fcs.rows.filter(fc => fc.l2StructId === l2.id).map(fc => ({
      id: fc.id, name: fc.cause, processCharId: fc.processCharId || '', occurrence: fc.occurrence,
    }));

    const procL3Structs = l3s.rows.filter(s => s.l2Id === l2.id);
    
    // charIdsByName (전체 공정 범위)
    const charIdsByName = new Map();
    
    // buildL3Functions 시뮬: L3Struct별 → L3Func 그룹화 → processChars
    const weList = [];
    for (const l3Struct of procL3Structs) {
      const l3FuncsForStruct = l3Funcs.rows.filter(f => f.l3StructId === l3Struct.id);
      const funcGroups = new Map();
      for (const f of l3FuncsForStruct) {
        if (!funcGroups.has(f.functionName)) funcGroups.set(f.functionName, []);
        funcGroups.get(f.functionName).push(f);
      }
      
      const functions = [];
      for (const [funcName, funcs] of funcGroups) {
        const processChars = funcs.map(f => ({ id: f.id, name: f.processChar, specialChar: f.specialChar }));
        functions.push({ id: funcs[0].id, name: funcName, processChars });
        
        for (const pc of processChars) {
          const n = String(pc.name || '').trim();
          const id = String(pc.id || '').trim();
          if (!n || !id) continue;
          if (!charIdsByName.has(n)) charIdsByName.set(n, new Set());
          charIdsByName.get(n).add(id);
        }
      }
      
      weList.push({ id: l3Struct.id, name: l3Struct.name, m4: l3Struct.m4, functions });
    }
    
    // missingCount 로직
    const workElements = weList.filter(we => isMeaningful(we.name));
    for (const we of workElements) {
      const hasMeaningfulFunc = we.functions.some(f => isMeaningful(f.name));
      let weHasAnyMeaningfulChar = false;

      for (const f of we.functions) {
        const hasChars = f.processChars.some(c => isMeaningful(c.name));
        if (!isMeaningful(f.name) && !hasChars) continue;

        const displayedInFunc = new Set();
        for (const pc of f.processChars) {
          if (!isMeaningful(pc.name)) continue;
          weHasAnyMeaningfulChar = true;
          const charName = String(pc.name || '').trim();
          if (displayedInFunc.has(charName)) continue;
          displayedInFunc.add(charName);

          const ids = charIdsByName.get(charName) || new Set([String(pc.id)]);
          const linked = allFCs.filter(c => ids.has(String(c.processCharId || '').trim()));
          const seenNames = new Set();
          const uniqueLinked = linked.filter(c => {
            const n = String(c?.name || '').trim();
            if (!n) return true;
            if (seenNames.has(n)) return false;
            seenNames.add(n);
            return true;
          });

          if (uniqueLinked.length === 0) {
            totalMissing++;
            missingList.push({
              proc: `${l2.no}(${l2.name})`,
              we: we.name,
              m4: we.m4,
              pcName: charName,
              pcIds: [...ids].join(', '),
              allFcCount: allFCs.length,
            });
          } else {
            for (const c of uniqueLinked) {
              if (isMissing(c.name)) {
                totalMissing++;
                missingList.push({
                  proc: `${l2.no}(${l2.name})`,
                  we: we.name,
                  pcName: charName,
                  fcName: c.name,
                  type: 'PLACEHOLDER',
                });
              }
            }
          }
        }
      }

      if (hasMeaningfulFunc && !weHasAnyMeaningfulChar) {
        totalMissing++;
        missingList.push({ proc: `${l2.no}(${l2.name})`, we: we.name, type: 'NO_PC' });
      }
    }
  }

  console.log(`Total Missing: ${totalMissing}`);
  for (const m of missingList) {
    if (m.type === 'NO_PC') {
      console.log(`  🔶 NO_PC: 공정${m.proc} → WE="${m.we}"`);
    } else if (m.type === 'PLACEHOLDER') {
      console.log(`  ⚠️ PLACEHOLDER: 공정${m.proc} → PC="${m.pcName}" → FC="${m.fcName}"`);
    } else {
      console.log(`  ❌ NO_FC: 공정${m.proc} → WE="${m.we}"[${m.m4}] → PC="${m.pcName}" (ids: ${m.pcIds}) [allFCs=${m.allFcCount}]`);
    }
  }

  await pool.end();
}

main().catch(async e => { console.error(e); await pool.end(); });
