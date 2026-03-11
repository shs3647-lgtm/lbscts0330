const http = require('http');

// PFD 워크시트가 데이터를 로드할 때 호출하는 API 확인
const pfdNo = 'pfd26-p001-l39';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/pfd/${pfdNo}`,
  method: 'GET',
};

console.log(`[TEST] GET /api/pfd/${pfdNo}`);

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`\n[RESPONSE] status: ${res.statusCode}`);
    try {
      const data = JSON.parse(body);
      if (data.registration) {
        console.log(`registration.pfdNo: ${data.registration.pfdNo}`);
        console.log(`registration.subject: ${data.registration.subject}`);
        console.log(`registration.linkedPfmeaNo: ${data.registration.linkedPfmeaNo}`);
      }
      if (data.items) {
        console.log(`items count: ${data.items.length}`);
        console.log('\nFirst 3 items:');
        data.items.slice(0, 3).forEach((item, i) => {
          console.log(`  [${i}] no="${item.processNo}" name="${item.processName}" part="${item.partName}" equip="${item.equipment}" prodChar="${item.productChar}" procChar="${item.processChar}"`);
        });
      } else {
        console.log('No items in response. Keys:', Object.keys(data));
        console.log('Raw (first 500):', JSON.stringify(data).substring(0, 500));
      }
    } catch (e) {
      console.log('Parse error. Raw:', body.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
