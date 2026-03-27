// Compare L3Function distribution between M002 and M081
const BASE = 'http://localhost:3000';

async function getL3Data(fmeaId) {
  const [l3sRes, l3fRes, fcsRes] = await Promise.all([
    fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${fmeaId}`),
    fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${fmeaId}`),
    fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${fmeaId}`),
  ]);
  const data = await l3sRes.json();
  return data;
}

// Direct DB query via API
async function queryDB(fmeaId) {
  const res = await fetch(`${BASE}/api/fmea?fmeaId=${fmeaId}&format=legacy`);
  const data = await res.json();
  const legacy = data.data || data;
  
  const l2 = legacy.l2 || [];
  console.log(`\n=== ${fmeaId} ===`);
  
  let totalFuncs = 0, totalFCs = 0, totalWEs = 0;
  const weInfo = [];
  
  for (const proc of l2) {
    for (const we of (proc.l3 || [])) {
      const funcs = (we.functions || []);
      const fcs = (we.failureCauses || []);
      totalWEs++;
      totalFuncs += funcs.length;
      totalFCs += fcs.length;
      
      // Count processChars
      let pcCount = 0;
      for (const f of funcs) {
        pcCount += (f.processChars || []).length;
      }
      
      weInfo.push({
        proc: proc.no,
        m4: we.m4,
        name: (we.name || '').substring(0, 20),
        funcs: funcs.length,
        pcs: pcCount,
        fcs: fcs.length,
      });
    }
  }
  
  console.log(`WEs: ${totalWEs}, Functions: ${totalFuncs}, FCs: ${totalFCs}`);
  
  // Show WEs with 0 functions or 0 processChars
  const noFunc = weInfo.filter(w => w.funcs === 0);
  const noPC = weInfo.filter(w => w.pcs === 0 && w.funcs > 0);
  console.log(`WEs with 0 functions: ${noFunc.length}`);
  for (const w of noFunc) console.log(`  ${w.proc} [${w.m4}] "${w.name}" fcs=${w.fcs}`);
  console.log(`WEs with functions but 0 processChars: ${noPC.length}`);
  for (const w of noPC) console.log(`  ${w.proc} [${w.m4}] "${w.name}" funcs=${w.funcs} fcs=${w.fcs}`);
  
  // Show proc.failureCauses (not nested under WEs)
  let procLevelFCs = 0;
  for (const proc of l2) {
    const pfc = proc.failureCauses || [];
    procLevelFCs += pfc.length;
  }
  console.log(`Process-level FCs (not in WE): ${procLevelFCs}`);
}

await queryDB('pfm26-m002');
await queryDB('pfm26-m081');
