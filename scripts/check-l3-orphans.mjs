// Check which L3Structures lack L3Functions in M081 vs M066
const BASE = 'http://localhost:3000';

async function check(fmeaId) {
  const [l3sRes, l3fRes] = await Promise.all([
    fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${fmeaId}`),
    fetch(`${BASE}/api/fmea/pipeline-verify?fmeaId=${fmeaId}`),
  ]);
  const data = (await l3sRes.json());
  const step1 = data.steps.find(s => s.step === 1);
  console.log(`\n${fmeaId}: L3=${step1.details.L3} L3F=${step1.details.L3F}`);
  if (step1.parentChild) {
    for (const pc of step1.parentChild) {
      if (pc.missingChildren?.length > 0) {
        console.log(`  ${pc.parent} → ${pc.child}: ${pc.missingChildren.length} missing`);
        for (const mc of pc.missingChildren.slice(0, 10)) {
          console.log(`    - ${mc.parentName} (${mc.parentId})`);
        }
      }
    }
  }
}

await check('pfm26-m066');
await check('pfm26-m081');
