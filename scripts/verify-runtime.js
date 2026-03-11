/**
 * @file verify-runtime.js
 * @description 런타임 검증 스크립트 — Gatekeeper + 4M 정렬 API 테스트
 *
 * 검증 항목:
 * 1. DB에 마스터 데이터 존재 여부 확인
 * 2. master-structure API의 4M 정렬 확인
 * 3. 워크시트 페이지 정상 로드 확인
 */

const http = require('http');

const BASE = 'http://localhost:3000';

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== 런타임 검증 시작 ===\n');

  // 1. 서버 정상 동작 확인
  console.log('1. 서버 상태 확인...');
  try {
    const res = await fetch(BASE);
    console.log(`   ✅ 서버 응답: ${res.status}\n`);
  } catch (e) {
    console.error('   ❌ 서버 연결 실패:', e.message);
    console.log('   → npm run dev 먼저 실행해주세요.\n');
    process.exit(1);
  }

  // 2. FMEA 마스터 데이터 API 확인
  console.log('2. FMEA 마스터 데이터 API 확인...');
  try {
    const res = await fetch(`${BASE}/api/pfmea/master`);
    if (res.status === 200) {
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || []);
      console.log(`   ✅ 마스터 데이터: ${items.length}건`);

      if (items.length > 0) {
        // itemCode별 분포
        const byCode = {};
        items.forEach(i => {
          const code = i.itemCode || 'unknown';
          byCode[code] = (byCode[code] || 0) + 1;
        });
        console.log('   📊 itemCode별 분포:', JSON.stringify(byCode));

        // m4 분포 (B1~B4)
        const m4Items = items.filter(i => i.m4);
        if (m4Items.length > 0) {
          const byM4 = {};
          m4Items.forEach(i => {
            const m4 = (i.m4 || '').toUpperCase();
            byM4[m4] = (byM4[m4] || 0) + 1;
          });
          console.log('   📊 4M 분포:', JSON.stringify(byM4));
        }
      }
    } else {
      console.log(`   ⚠️ API 응답: ${res.status}`);
    }
  } catch (e) {
    console.log(`   ⚠️ API 호출 실패: ${e.message}`);
  }
  console.log();

  // 3. master-structure API — 4M 정렬 확인
  console.log('3. master-structure API — 4M 정렬 확인...');
  try {
    const res = await fetch(`${BASE}/api/fmea/master-structure`);
    if (res.status === 200 && res.data) {
      const procs = res.data.processes || [];
      console.log(`   ✅ 공정 수: ${procs.length}`);

      const M4_ORDER = { MN: 0, MC: 1, IM: 2, EN: 3 };
      let allSorted = true;

      for (const proc of procs) {
        const wes = proc.workElements || [];
        if (wes.length <= 1) continue;

        const m4List = wes.map(we => (we.m4 || '').toUpperCase());
        const orders = m4List.map(m => M4_ORDER[m] ?? 99);

        for (let i = 1; i < orders.length; i++) {
          if (orders[i] < orders[i - 1]) {
            allSorted = false;
            console.log(`   ❌ 공정 "${proc.processNo}" 4M 정렬 위반: [${m4List.join(', ')}]`);
            break;
          }
        }
      }

      if (allSorted) {
        console.log('   ✅ 모든 공정의 4M이 MN→MC→IM→EN 순서로 정렬됨');
      }

      // 첫 3개 공정의 4M 목록 출력
      for (const proc of procs.slice(0, 3)) {
        const wes = proc.workElements || [];
        const m4List = wes.map(we => `${we.m4}(${we.name})`);
        console.log(`   📋 공정 ${proc.processNo}: [${m4List.join(', ')}]`);
      }
    } else {
      console.log(`   ⚠️ API 응답: ${res.status} (데이터 없음 또는 등록된 마스터 없음)`);
    }
  } catch (e) {
    console.log(`   ⚠️ master-structure API 호출 실패: ${e.message}`);
  }
  console.log();

  // 4. 워크시트 페이지 로드 확인
  console.log('4. 워크시트 페이지 로드 확인...');
  try {
    const res = await fetch(`${BASE}/pfmea/worksheet`);
    const html = typeof res.data === 'string' ? res.data : '';
    const hasError = html.includes('Error') || html.includes('error') || html.includes('500');
    if (res.status === 200) {
      console.log(`   ✅ 워크시트 페이지 정상 로드 (${res.status})`);
    } else {
      console.log(`   ⚠️ 워크시트 페이지 응답: ${res.status}`);
    }
  } catch (e) {
    console.log(`   ⚠️ 워크시트 페이지 로드 실패: ${e.message}`);
  }
  console.log();

  console.log('=== 런타임 검증 완료 ===');
  console.log('\n📝 브라우저에서 추가 확인 사항:');
  console.log('  1. PFMEA 워크시트 열기 → 자동모드 토글 → F12 콘솔에서 [Gatekeeper] 로그 확인');
  console.log('  2. 3L기능/3L원인 탭에서 4M 순서가 MN→MC→IM→EN인지 확인');
  console.log('  3. 잘못된 공정번호 데이터가 있으면 alert으로 거부 사유 표시 확인');
}

main().catch(console.error);
