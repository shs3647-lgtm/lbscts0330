/**
 * ID 생성 검증: 클린 DB에서 create-linked API 시뮬레이션
 */
const http = require('http');

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function verify() {
  console.log('=== ID Generation Verification (Clean DB) ===\n');

  // Test 1: next-id API for Part FMEA
  console.log('--- Test 1: /api/fmea/next-id?type=P&module=pfmea&linkGroup=0 ---');
  const nextId = await apiCall('GET', '/api/fmea/next-id?type=P&module=pfmea&linkGroup=0');
  console.log('Result:', JSON.stringify(nextId));
  console.log('Expected: pfm26-p001-S');
  console.log('Match:', nextId.nextId?.toLowerCase() === 'pfm26-p001-s' ? 'OK' : 'FAIL');

  // Test 2: next-id API for Family FMEA
  console.log('\n--- Test 2: /api/fmea/next-id?type=F&module=pfmea&linkGroup=0 ---');
  const nextIdF = await apiCall('GET', '/api/fmea/next-id?type=F&module=pfmea&linkGroup=0');
  console.log('Result:', JSON.stringify(nextIdF));
  console.log('Expected: pfm26-f001');
  console.log('Match:', nextIdF.nextId?.toLowerCase() === 'pfm26-f001' ? 'OK' : 'FAIL');

  // Test 3: create-linked API for Part FMEA (linked)
  console.log('\n--- Test 3: POST /api/project/create-linked (Part FMEA linked) ---');
  const createResult = await apiCall('POST', '/api/project/create-linked', {
    linkMode: 'linked',
    sourceApp: 'pfmea',
    linkedApps: { pfmea: true, dfmea: true, pfd: true, cp: true },
    fmeaType: 'P',
    productName: 'TEST',
    customer: 'TEST',
  });
  console.log('Result:', JSON.stringify(createResult, null, 2));
  console.log('Expected PFMEA ID: pfm26-p001-l01');
  console.log('PFMEA Match:', createResult.createdDocs?.pfmea === 'pfm26-p001-l01' ? 'OK' : 'FAIL - got ' + createResult.createdDocs?.pfmea);
  console.log('DFMEA Match:', createResult.createdDocs?.dfmea === 'dfm26-p001-l01' ? 'OK' : 'FAIL - got ' + createResult.createdDocs?.dfmea);
  console.log('PFD Match:', createResult.createdDocs?.pfd === 'pfd26-p001-l01' ? 'OK' : 'FAIL - got ' + createResult.createdDocs?.pfd);
  console.log('CP Match:', createResult.createdDocs?.cp === 'cp26-p001-l01' ? 'OK' : 'FAIL - got ' + createResult.createdDocs?.cp);
}

verify().catch(e => console.error('Error:', e.message));
