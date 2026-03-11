const http = require('http');
const options = { hostname: 'localhost', port: 3000, path: '/api/fmea?fmeaId=pfm26-m001', method: 'GET' };
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('status:', res.statusCode);
      console.log('success:', json.success);
      console.log('_isLegacyDirect:', json._isLegacyDirect);
      console.log('has l1:', json.l1 ? 'YES' : 'NO');
      console.log('l1.name:', json.l1 && json.l1.name);
      console.log('l1.failureScopes count:', (json.l1 && json.l1.failureScopes || []).length);
      console.log('l2 count:', (json.l2 || []).length);
      var fmTotal = (json.l2 || []).reduce(function(s,p) { return s + (p.failureModes || []).length; }, 0);
      var fcTotal = (json.l2 || []).reduce(function(s,p) { return s + (p.failureCauses || []).length; }, 0);
      console.log('FM total:', fmTotal);
      console.log('FC total:', fcTotal);
      console.log('confirmed:', JSON.stringify(json.confirmed));
      console.log('failureL1Confirmed:', json.failureL1Confirmed);
      console.log('failureL2Confirmed:', json.failureL2Confirmed);
      console.log('failureL3Confirmed:', json.failureL3Confirmed);
    } catch(e) { console.log('Parse error:', e.message, 'Raw:', data.substring(0, 500)); }
  });
});
req.on('error', function(e) { console.log('Request error:', e.message); });
req.end();
