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
  const legacy = await pool.query(`SELECT data FROM "${SCHEMA}".fmea_legacy_data WHERE "fmeaId" = 'pfm26-m059' LIMIT 1`);
  if (legacy.rows.length === 0) {
    console.log('No legacy data found!');
    await pool.end();
    return;
  }
  
  const data = legacy.rows[0].data;
  const allL2 = data.l2 || [];
  
  let totalMissing = 0;
  const missingDetails = [];
  
  const procs = allL2.filter(p => isMeaningful(p.name));
  
  for (const proc of procs) {
    const allCauses = proc.failureCauses || [];
    
    // charIdsByName
    const charIdsByName = new Map();
    for (const we of (proc.l3 || [])) {
      for (const f of (we.functions || [])) {
        for (const pc of (f.processChars || [])) {
          const n = String(pc?.name || '').trim();
          const id = String(pc?.id || '').trim();
          if (!n || !id) continue;
          if (!charIdsByName.has(n)) charIdsByName.set(n, new Set());
          charIdsByName.get(n).add(id);
        }
      }
    }
    
    const workElements = (proc.l3 || []).filter(we => isMeaningful(we.name));
    for (const we of workElements) {
      const functions = we.functions || [];
      const hasMeaningfulFunc = functions.some(f => isMeaningful(f.name));
      let weHasAnyMeaningfulChar = false;
      
      for (const f of functions) {
        const hasChars = (f.processChars || []).some(c => isMeaningful(c.name));
        if (!isMeaningful(f.name) && !hasChars) continue;
        
        const displayedInFunc = new Set();
        for (const pc of (f.processChars || [])) {
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
            missingDetails.push({
              type: 'NO_FC',
              proc: `${proc.no}(${proc.name})`,
              we: we.name,
              pcName: charName,
              pcId: [...ids].join(','),
              fcCount: allCauses.length,
            });
          } else {
            for (const c of uniqueLinked) {
              if (isMissing(c.name)) {
                totalMissing++;
                missingDetails.push({
                  type: 'PLACEHOLDER',
                  proc: `${proc.no}(${proc.name})`,
                  we: we.name,
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
        missingDetails.push({
          type: 'NO_PC',
          proc: `${proc.no}(${proc.name})`,
          we: we.name,
        });
      }
    }
  }
  
  console.log(`=== Legacy JSON 기반 UI missingCount 시뮬레이션 ===`);
  console.log(`Total Missing: ${totalMissing}\n`);
  for (const d of missingDetails) {
    if (d.type === 'NO_FC') {
      console.log(`  ❌ NO_FC: 공정${d.proc} → WE="${d.we}" → PC="${d.pcName}" (pcIds: ${d.pcId}, allFCs: ${d.fcCount})`);
    } else if (d.type === 'PLACEHOLDER') {
      console.log(`  ⚠️ PLACEHOLDER: 공정${d.proc} → WE="${d.we}" → PC="${d.pcName}" → FC="${d.fcName}"`);
    } else {
      console.log(`  🔶 NO_PC: 공정${d.proc} → WE="${d.we}"`);
    }
  }
  
  // Show sample of legacy FC data
  if (missingDetails.length > 0) {
    const firstMissing = missingDetails.find(d => d.type === 'NO_FC');
    if (firstMissing) {
      const proc = allL2.find(p => `${p.no}(${p.name})` === firstMissing.proc);
      if (proc) {
        console.log(`\n=== 첫 번째 누락 공정의 FC 상세 ===`);
        console.log(`공정: ${proc.no}(${proc.name})`);
        console.log(`FC count: ${(proc.failureCauses || []).length}`);
        console.log(`FC processCharIds:`);
        for (const fc of (proc.failureCauses || []).slice(0, 5)) {
          console.log(`  fc="${fc.name}" pcId="${fc.processCharId}"`);
        }
        // Show processChars
        console.log(`\nprocessChars in l3:`);
        for (const we of (proc.l3 || [])) {
          for (const f of (we.functions || [])) {
            for (const pc of (f.processChars || [])) {
              console.log(`  we="${we.name}" pc="${pc.name}" pcId="${pc.id}"`);
            }
          }
        }
      }
    }
  }
  
  await pool.end();
}

main().catch(async e => { console.error(e); await pool.end(); });
