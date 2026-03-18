const BASE = 'http://localhost:3000';
const ID = 'pfm26-m069';

async function main() {
  const s3res = await fetch(BASE + '/api/fmea/pipeline-detail?fmeaId=' + ID + '&step=3');
  const s3 = await s3res.json();
  const l3Funcs = s3.data?.l3Functions || [];
  const l3s = s3.data?.l3 || [];
  const l2s = s3.data?.l2 || [];
  
  const l3Map = {};
  for (const l of l3s) l3Map[l.id] = l;
  const l2Map = {};
  for (const l of l2s) l2Map[l.id] = l;
  
  console.log('=== 7 Empty processChar L3Functions ===');
  let i = 0;
  for (const f of l3Funcs) {
    if (!f.processChar || !f.processChar.trim()) {
      i++;
      console.log(i + '. id=' + f.id);
      console.log('   functionName=' + (f.name || '(empty)'));
      console.log('   processChar=' + (f.processChar || '(empty)'));
    }
  }
  
  // Check legacy data for these - where are the empty PCs in the worksheet?
  const s5res = await fetch(BASE + '/api/fmea/pipeline-detail?fmeaId=' + ID + '&step=5');
  const s5 = await s5res.json();
  const procs = s5.data?.processes || [];
  
  console.log('\n=== Empty PCs in Legacy Worksheet ===');
  let emptyInLegacy = 0;
  for (const p of procs) {
    const items = p.pcItems || [];
    for (const pc of items) {
      if (pc.name === '(\ube48\uac12)' || !pc.name || pc.name.trim() === '') {
        emptyInLegacy++;
        console.log('  proc=' + p.processNo + ' pc.id=' + pc.id + ' name="' + (pc.name||'') + '" hasFC=' + pc.hasFC);
      }
    }
  }
  console.log('Total empty in legacy:', emptyInLegacy);

  // Run POST to auto-fix
  console.log('\n=== Running AUTO-FIX (POST) ===');
  const fixRes = await fetch(BASE + '/api/fmea/pipeline-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: ID }),
  });
  const fixData = await fixRes.json();
  console.log('allGreen:', fixData.allGreen, 'loop:', fixData.loopCount);
  for (const s of fixData.steps) {
    const issues = s.issues?.length > 0 ? ' ISSUES: ' + s.issues.join('; ') : '';
    const fixes = s.fixed?.length > 0 ? ' FIXED: ' + s.fixed.join('; ') : '';
    console.log('  S' + s.step + ' ' + s.name + ': ' + s.status + issues + fixes);
  }
}

main().catch(console.error);
