const http = require('http');

// 아직 PFD가 없는 FMEA로 테스트 (신규 PFD 생성 케이스)
const fmeaId = 'pfm26-p001-l50';

const postData = JSON.stringify({ fmeaId });

const req = http.request({
  hostname: 'localhost', port: 3000,
  path: '/api/pfd/sync-from-fmea',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`status: ${res.statusCode}`);
    try {
      const data = JSON.parse(body);
      console.log(`success: ${data.success}`);
      if (data.success) {
        console.log(`pfdNo: ${data.data.pfdNo}`);
        console.log(`itemCount: ${data.data.itemCount}`);
        console.log(`First 3 items:`);
        (data.data.items || []).slice(0, 3).forEach((item, i) => {
          console.log(`  [${i}] no="${item.processNo}" name="${item.processName}" part="${item.partName}"`);
        });
      } else {
        console.log(`error: ${data.error}`);
      }
    } catch (e) {
      console.log('Raw:', body.substring(0, 300));
    }
  });
});

req.write(postData);
req.end();
