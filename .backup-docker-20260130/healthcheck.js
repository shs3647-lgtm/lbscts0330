/**
 * Docker 헬스체크 스크립트
 * 애플리케이션의 상태를 확인하고 정상 작동 여부를 반환
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // 정상
  } else {
    process.exit(1); // 비정상
  }
});

req.on('error', (err) => {
  console.error('Health check failed:', err.message);
  process.exit(1); // 비정상
});

req.on('timeout', () => {
  console.error('Health check timeout');
  req.abort();
  process.exit(1); // 비정상
});

req.end();