const http = require('http');

// 에러 케이스 1: fmeaId 없음
function test(label, payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
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
        const data = JSON.parse(body);
        console.log(`[${label}] status=${res.statusCode} success=${data.success} error="${data.error || ''}"` );
        resolve();
      });
    });
    req.write(postData);
    req.end();
  });
}

(async () => {
  await test('no fmeaId', {});
  await test('empty fmeaId', { fmeaId: '' });
  await test('nonexistent fmeaId', { fmeaId: 'pfm-does-not-exist' });
})();
