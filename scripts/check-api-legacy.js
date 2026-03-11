const http = require('http');
http.get('http://localhost:3000/api/fmea?fmeaId=pfm26-m001', (r) => {
  let d = '';
  r.on('data', (c) => d += c);
  r.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('=== Top-level keys ===');
      console.log(Object.keys(j).join(', '));
      console.log('\nhas legacy:', j.legacy ? 'YES' : 'NO');
      if (j.legacy) {
        console.log('legacy.failureL1Confirmed:', j.legacy.failureL1Confirmed);
        console.log('legacy.failureL2Confirmed:', j.legacy.failureL2Confirmed);
        console.log('legacy.failureL3Confirmed:', j.legacy.failureL3Confirmed);
        console.log('legacy.l2 count:', (j.legacy.l2 || []).length);
        console.log('legacy.l1.failureScopes count:', (j.legacy.l1 && j.legacy.l1.failureScopes || []).length);
      }
      console.log('\ntop failureL1Confirmed:', j.failureL1Confirmed);
      console.log('top confirmed:', JSON.stringify(j.confirmed));
    } catch (e) {
      console.log('err:', e.message, d.substring(0, 300));
    }
  });
}).on('error', (e) => console.log('err:', e.message));
