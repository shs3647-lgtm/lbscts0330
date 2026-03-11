const http = require('http');

// 브라우저가 PFD 워크시트를 열 때 실제로 호출하는 API를 그대로 테스트
const pfdNo = 'pfd26-p001-l39';

// Step 1: GET /api/pfd/{pfdNo} — 브라우저 PFD 데이터 로드
const req = http.request({
  hostname: 'localhost', port: 3000,
  path: `/api/pfd/${pfdNo}`, method: 'GET',
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`=== 브라우저 PFD 로드 (GET /api/pfd/${pfdNo}) ===`);
    console.log(`status: ${res.statusCode}`);
    const json = JSON.parse(body);
    console.log(`success: ${json.success}`);

    if (!json.success) {
      console.log(`ERROR: ${json.error}`);
      return;
    }

    const data = json.data;
    console.log(`pfdNo: ${data.pfdNo}`);
    console.log(`fmeaId: ${data.fmeaId}`);
    console.log(`subject: ${data.subject}`);

    const items = data.items || [];
    console.log(`\n=== items 현황 ===`);
    console.log(`총 건수: ${items.length}`);

    if (items.length === 0) {
      console.log('❌ 아이템 0건 — 브라우저에 빈 테이블 표시됨!');
    } else {
      console.log('✅ 아이템 있음 — 브라우저에 데이터 표시되어야 함');

      // 공정별 분포
      const byProcess = {};
      items.forEach(item => {
        const key = `${item.processNo}-${item.processName}`;
        byProcess[key] = (byProcess[key] || 0) + 1;
      });
      console.log(`\n공정별 분포 (${Object.keys(byProcess).length}개 공정):`);
      Object.entries(byProcess).forEach(([k, v]) => console.log(`  ${k}: ${v}건`));

      // 첫 5건 상세 — 브라우저 렌더링에 필요한 필드 확인
      console.log('\n=== 렌더링 필드 확인 (first 5) ===');
      items.slice(0, 5).forEach((item, i) => {
        console.log(`[${i}] id=${item.id ? '✅' : '❌'} processNo="${item.processNo}" processName="${item.processName}" partName="${item.partName}" equipment="${item.equipment}" productChar="${item.productChar}" processChar="${item.processChar}" sortOrder=${item.sortOrder}`);
      });
    }
  });
});
req.end();
