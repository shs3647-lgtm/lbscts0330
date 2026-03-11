const http = require('http');

const fmeaId = 'pfm26-p001-l39';

const postData = JSON.stringify({ fmeaId });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pfd/sync-from-fmea',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log(`[TEST] POST /api/pfd/sync-from-fmea { fmeaId: "${fmeaId}" }`);

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`\n[RESPONSE] status: ${res.statusCode}`);
    try {
      const data = JSON.parse(body);
      console.log(`success: ${data.success}`);
      if (data.success) {
        console.log(`pfdNo: ${data.data.pfdNo}`);
        console.log(`pfdId: ${data.data.pfdId}`);
        console.log(`fmeaId: ${data.data.fmeaId}`);
        console.log(`itemCount: ${data.data.itemCount}`);
        console.log(`syncedAt: ${data.data.syncedAt}`);
        console.log(`redirectUrl: ${data.data.redirectUrl}`);
        console.log(`\nFirst 5 items:`);
        (data.data.items || []).slice(0, 5).forEach((item, i) => {
          console.log(`  [${i}] processNo="${item.processNo}" processName="${item.processName}" partName="${item.partName}" equipment="${item.equipment}" productChar="${item.productChar}" processChar="${item.processChar}"`);
        });
      } else {
        console.log(`error: ${data.error}`);
      }
    } catch (e) {
      console.log('Raw response:', body.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();
