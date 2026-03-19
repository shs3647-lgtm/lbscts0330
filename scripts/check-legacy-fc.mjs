// Check legacy FC properties for M081 to understand matching issues
const BASE = 'http://localhost:3000';

async function main() {
  // Get M081 legacy data
  const res = await fetch(`${BASE}/api/fmea?fmeaId=pfm26-m081&format=legacy`);
  const data = await res.json();
  const legacy = data.data || data;
  
  // Check FC properties
  const l2 = legacy.l2 || [];
  let totalFCs = 0;
  const fcSample = [];
  
  for (const proc of l2) {
    const fcs = proc.failureCauses || [];
    for (const fc of fcs.slice(0, 3)) {
      fcSample.push({
        name: (fc.name || '').substring(0, 30),
        m4: fc.m4,
        processCharId: fc.processCharId ? fc.processCharId.substring(0, 30) : null,
        l3Id: fc.l3Id || fc.weId || fc.workElementId || null,
        parentItemId: fc.parentItemId || null,
        l3FuncId: fc.l3FuncId || null,
      });
    }
    totalFCs += fcs.length;
    
    // Also check WE functions
    const l3 = proc.l3 || [];
    for (const we of l3.slice(0, 2)) {
      const funcs = we.functions || [];
      console.log(`  Process ${proc.no} WE "${(we.name || '').substring(0, 20)}" m4=${we.m4} funcs=${funcs.length} fcs=${(we.failureCauses || []).length}`);
    }
  }
  
  console.log('\nTotal FCs:', totalFCs);
  console.log('\nSample FC properties:');
  for (const s of fcSample.slice(0, 5)) {
    console.log(JSON.stringify(s));
  }
  
  // Check which m4 values have multiple WEs in same process
  const m4Groups = {};
  for (const proc of l2) {
    for (const we of (proc.l3 || [])) {
      const key = `${proc.no}|${we.m4 || 'NO_M4'}`;
      m4Groups[key] = (m4Groups[key] || 0) + 1;
    }
  }
  const multiM4 = Object.entries(m4Groups).filter(([, v]) => v > 1);
  console.log('\nProcesses with multiple WEs of same m4:', multiM4.length);
  for (const [k, v] of multiM4) {
    console.log(`  ${k}: ${v} WEs`);
  }
}

main().catch(console.error);
