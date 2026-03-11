const http = require('http');

const req = http.request({
  hostname: 'localhost', port: 3000,
  path: '/api/pfd/pfd26-p001-l50', method: 'GET',
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('status:', res.statusCode);
    const json = JSON.parse(body);
    console.log('success:', json.success);
    if (json.success) {
      console.log('fmeaId:', json.data?.fmeaId);
      console.log('pfdNo:', json.data?.pfdNo);
      console.log('items count:', json.data?.items?.length);
      // Check first 3 items
      (json.data?.items || []).slice(0, 3).forEach((item, i) => {
        console.log(`[${i}] desc="${(item.processDesc || '').substring(0, 40)}" prodChar="${(item.productChar || '').substring(0, 25)}" procChar="${(item.processChar || '').substring(0, 25)}"`);
      });
    } else {
      console.log('error:', json.error);
    }
  });
});
req.on('error', (e) => console.error('Request error:', e.message));
req.end();
