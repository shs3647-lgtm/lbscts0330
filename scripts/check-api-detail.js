const http = require('http');
http.get('http://localhost:3000/api/fmea?fmeaId=pfm26-m001', (r) => {
  let d = '';
  r.on('data', (c) => d += c);
  r.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('_isLegacyDirect:', j._isLegacyDirect);
      console.log('_legacyVersion:', j._legacyVersion);
      console.log('_hasCandidates:', j._hasCandidates);
      console.log('has l1:', j.l1 ? 'YES' : 'NO');
      console.log('l1.failureScopes:', (j.l1 && j.l1.failureScopes || []).length);
      console.log('l2 processes:', (j.l2 || []).length);
      const fmTotal = (j.l2 || []).reduce((s, p) => s + (p.failureModes || []).length, 0);
      const fcTotal = (j.l2 || []).reduce((s, p) => s + (p.failureCauses || []).length, 0);
      console.log('FM total:', fmTotal);
      console.log('FC total:', fcTotal);
      console.log('--- confirmed flags ---');
      console.log('confirmed:', JSON.stringify(j.confirmed));
      console.log('structureConfirmed:', j.structureConfirmed);
      console.log('failureL1Confirmed:', j.failureL1Confirmed);
      console.log('failureL2Confirmed:', j.failureL2Confirmed);
      console.log('failureL3Confirmed:', j.failureL3Confirmed);
    } catch (e) {
      console.log('Parse error:', e.message, d.substring(0, 300));
    }
  });
}).on('error', (e) => console.log('Request error:', e.message));
