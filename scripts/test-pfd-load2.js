const http = require('http');
const pfdNo = 'pfd26-p001-l39';

const req = http.request({
  hostname: 'localhost', port: 3000,
  path: `/api/pfd/${pfdNo}`, method: 'GET',
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`status: ${res.statusCode}`);
    const data = JSON.parse(body);
    if (data.data) {
      console.log(`pfdNo: ${data.data.pfdNo}`);
      console.log(`subject: ${data.data.subject}`);
      console.log(`items count: ${(data.data.items || []).length}`);
      if (data.data.items && data.data.items.length > 0) {
        console.log('\nFirst 3 items:');
        data.data.items.slice(0, 3).forEach((item, i) => {
          console.log(`  [${i}] no="${item.processNo}" name="${item.processName}" part="${item.partName}" equip="${item.equipment}"`);
        });
      }
    }
  });
});
req.end();
