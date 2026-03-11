/**
 * PFD 데이터 확인 스크립트
 */
const http = require('http');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

async function main() {
  // PFD 목록 조회
  const list = await apiGet('/api/pfd');
  console.log('=== PFD 목록 ===');
  if (list.data && Array.isArray(list.data)) {
    list.data.forEach(p => {
      console.log(`  ${p.pfdNo} | ${p.subject || '(제목없음)'} | items: ${p.itemCount || p._count?.items || '?'} | status: ${p.status}`);
    });
  } else {
    console.log('  데이터 없음 또는 응답:', JSON.stringify(list).slice(0, 200));
  }

  // 최신 PFD 조회
  const latest = await apiGet('/api/pfd?latest=true');
  console.log('\n=== 최신 PFD ===');
  if (latest.data) {
    const p = Array.isArray(latest.data) ? latest.data[0] : latest.data;
    if (p) {
      console.log(`  pfdNo: ${p.pfdNo}`);
      console.log(`  subject: ${p.subject}`);
      console.log(`  status: ${p.status}`);
      console.log(`  items: ${p.itemCount || p._count?.items || '?'}`);
    }
  }
}

main().catch(console.error);
