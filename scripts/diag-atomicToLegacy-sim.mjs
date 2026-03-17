/**
 * atomicToLegacy 변환을 정확히 시뮬레이션하여
 * UI가 보는 것과 동일한 데이터로 missingCount를 계산
 */
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const SCHEMA = 'pfmea_pfm26_m059';

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

async function main() {
  // Fetch EXACTLY what /api/fmea?format=atomic returns
  const resp = await fetch('http://localhost:3000/api/fmea?fmeaId=pfm26-m059&format=atomic');
  const apiData = await resp.json();
  
  console.log('=== API Response Summary ===');
  console.log(`l2Structures: ${apiData.l2Structures?.length}`);
  console.log(`l3Structures: ${apiData.l3Structures?.length}`);
  console.log(`l3Functions: ${apiData.l3Functions?.length}`);
  console.log(`failureCauses: ${apiData.failureCauses?.length}`);
  
  // Simulate atomicToLegacy.buildL3Functions
  const l3FuncsByL3Id = new Map();
  for (const f of apiData.l3Functions || []) {
    if (!l3FuncsByL3Id.has(f.l3StructId)) l3FuncsByL3Id.set(f.l3StructId, []);
    l3FuncsByL3Id.get(f.l3StructId).push(f);
  }
  
  const l3sByL2Id = new Map();
  for (const l3 of apiData.l3Structures || []) {
    if (!l3sByL2Id.has(l3.l2Id)) l3sByL2Id.set(l3.l2Id, []);
    l3sByL2Id.get(l3.l2Id).push(l3);
  }
  
  const fcsByL2Id = new Map();
  for (const fc of apiData.failureCauses || []) {
    if (!fcsByL2Id.has(fc.l2StructId)) fcsByL2Id.set(fc.l2StructId, []);
    fcsByL2Id.get(fc.l2StructId).push(fc);
  }
  
  // Build legacy structure exactly like atomicToLegacy
  const l2Array = [];
  for (const l2 of apiData.l2Structures || []) {
    const l3Structs = l3sByL2Id.get(l2.id) || [];
    
    const l3 = l3Structs.map(l3Struct => {
      const l3Funcs = l3FuncsByL3Id.get(l3Struct.id) || [];
      
      // buildL3Functions - group by functionName
      const funcGroups = new Map();
      for (const f of l3Funcs) {
        if (!funcGroups.has(f.functionName)) funcGroups.set(f.functionName, []);
        funcGroups.get(f.functionName).push(f);
      }
      
      const functions = [];
      funcGroups.forEach((funcs, funcName) => {
        const processChars = funcs.map(f => ({
          id: f.id,
          name: f.processChar,
          specialChar: f.specialChar,
        }));
        functions.push({ id: funcs[0].id, name: funcName, processChars });
      });
      
      return {
        id: l3Struct.id,
        m4: l3Struct.m4,
        name: l3Struct.name,
        order: l3Struct.order,
        functions,
        failureCauses: [],
      };
    });
    
    // FC (공정 레벨)
    const allFcs = (fcsByL2Id.get(l2.id) || []).map(fc => ({
      id: fc.id,
      name: fc.cause,
      occurrence: fc.occurrence,
      processCharId: fc.processCharId || '',
    }));
    
    l2Array.push({
      id: l2.id,
      no: l2.no,
      name: l2.name,
      order: l2.order,
      l3,
      failureCauses: allFcs,
    });
  }
  
  // Now simulate FailureL3Tab missingCount EXACTLY
  let totalMissing = 0;
  const missingList = [];
  
  const procs = l2Array.filter(p => isMeaningful(p.name));
  for (const proc of procs) {
    const allCauses = proc.failureCauses || [];
    
    // charIdsByName - scan ALL WEs in this process
    const charIdsByName = new Map();
    for (const we of proc.l3) {
      for (const f of we.functions) {
        for (const pc of f.processChars) {
          const n = String(pc?.name || '').trim();
          const id = String(pc?.id || '').trim();
          if (!n || !id) continue;
          if (!charIdsByName.has(n)) charIdsByName.set(n, new Set());
          charIdsByName.get(n).add(id);
        }
      }
    }
    
    const workElements = proc.l3.filter(we => isMeaningful(we.name));
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
          const linked = allCauses.filter(c => ids.has(String(c.processCharId || '').trim()));
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
              type: 'NO_FC',
              proc: `${proc.no}(${proc.name})`,
              we: `${we.name}[${we.m4}]`,
              pcName: charName,
              pcId: pc.id,
              allIds: [...ids].join(', '),
            });
          } else {
            for (const c of uniqueLinked) {
              if (isMissing(c.name)) {
                totalMissing++;
                missingList.push({
                  type: 'PLACEHOLDER',
                  proc: `${proc.no}(${proc.name})`,
                  we: `${we.name}[${we.m4}]`,
                  pcName: charName,
                  fcName: c.name,
                });
              }
            }
          }
        }
      }
      
      if (hasMeaningfulFunc && !weHasAnyMeaningfulChar) {
        totalMissing++;
        missingList.push({
          type: 'NO_PC',
          proc: `${proc.no}(${proc.name})`,
          we: `${we.name}[${we.m4}]`,
        });
      }
    }
  }
  
  console.log(`\n=== atomicToLegacy 기반 missingCount = ${totalMissing} ===`);
  for (const m of missingList) {
    if (m.type === 'NO_FC') {
      console.log(`  ❌ NO_FC: ${m.proc} → ${m.we} → PC="${m.pcName}" pcId=${m.pcId} (allIds: ${m.allIds})`);
    } else if (m.type === 'PLACEHOLDER') {
      console.log(`  ⚠️ PLACEHOLDER: ${m.proc} → ${m.we} → PC="${m.pcName}" → FC="${m.fcName}"`);
    } else {
      console.log(`  🔶 NO_PC: ${m.proc} → ${m.we}`);
    }
  }
  
  // 특별 진단: 4건 FC의 UI 매칭 시뮬
  console.log('\n=== 4건 FC 특별 진단 ===');
  const targets = [
    { label: 'C8', cause: '측정 오차', proc: 'IQA(수입검사)' },
    { label: 'C26', cause: 'Power 변동', proc: 'UBM Sputter' },
    { label: 'C28', cause: 'Target 소진', proc: 'UBM Sputter' },
    { label: 'C53', cause: '전류밀도 편차', proc: 'Au Plating' },
  ];
  
  for (const t of targets) {
    const proc = l2Array.find(p => p.name === t.proc);
    if (!proc) { console.log(`  ${t.label}: 공정 "${t.proc}" 없음`); continue; }
    
    const fc = proc.failureCauses.find(c => c.name === t.cause);
    if (!fc) { console.log(`  ${t.label}: FC "${t.cause}" 없음`); continue; }
    
    // Find which processChar this FC links to
    let foundPC = null;
    for (const we of proc.l3) {
      for (const f of we.functions) {
        for (const pc of f.processChars) {
          if (pc.id === fc.processCharId) {
            foundPC = { we: we.name, m4: we.m4, funcName: f.name?.slice(0,30), pcName: pc.name, pcId: pc.id };
          }
        }
      }
    }
    
    console.log(`  ${t.label} "${t.cause}" pcId=${fc.processCharId}`);
    if (foundPC) {
      console.log(`    → ✅ PC="${foundPC.pcName}" in WE="${foundPC.we}"[${foundPC.m4}]`);
      console.log(`    → func="${foundPC.funcName}..."`);
    } else {
      console.log(`    → ❌ processCharId가 어떤 processChar.id와도 매칭 안됨!`);
      // Show what processChars exist
      for (const we of proc.l3) {
        for (const f of we.functions) {
          for (const pc of f.processChars) {
            console.log(`      PC: id=${pc.id} name="${pc.name}" [${we.m4}]`);
          }
        }
      }
    }
  }

  await pool.end();
}

main().catch(async e => { console.error(e); await pool.end(); });
