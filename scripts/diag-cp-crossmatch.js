/**
 * CP 공정특성 교차매핑 진단
 * 공정번호 20(-수입검사)에서 equipment와 processChar가 불일치하는 원인 분석
 */
const http = require('http');

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const wsData = await request('GET', '/api/fmea?fmeaId=pfm26-p008-l09');
  const l2Data = wsData.l2 || [];

  // 공정 20번 분석 (수입검사 - 교차매핑 의심)
  const targetProcesses = ['20', '30', '80'];

  for (const targetNo of targetProcesses) {
    const l2 = l2Data.find(p => p.no === targetNo);
    if (!l2) continue;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`공정 [${l2.no}] ${l2.name}`);
    console.log(`${'═'.repeat(70)}`);

    // L2 Functions & ProductChars
    console.log(`\n  📌 L2 Functions (${(l2.functions || []).length}개):`);
    for (const func of (l2.functions || [])) {
      console.log(`    기능: "${func.name}"`);
      for (const pc of (func.productChars || [])) {
        console.log(`      → 제품특성: "${pc.name}" (특별특성: ${pc.specialChar || '-'})`);
      }
    }

    // L3 Work Elements & ProcessChars
    console.log(`\n  📌 L3 작업요소 (${(l2.l3 || []).length}개):`);
    for (const l3 of (l2.l3 || [])) {
      const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
      if (m4 === 'MN') {
        console.log(`    [MN] ${l3.name} — CP 제외`);
        continue;
      }

      console.log(`\n    [${m4}] ${l3.name} (ID: ${l3.id})`);

      // 방법 1: l3.functions[].processChars
      const funcs = l3.functions || [];
      console.log(`      Functions: ${funcs.length}개`);
      for (const func of funcs) {
        console.log(`        기능: "${func.name}"`);
        for (const pchar of (func.processChars || [])) {
          console.log(`          → 공정특성: "${pchar.name}" (특별특성: ${pchar.specialChar || '-'})`);
        }
      }

      // 방법 2: l3.processChars (폴백)
      if (l3.processChars?.length > 0) {
        console.log(`      l3.processChars 폴백: ${l3.processChars.length}개`);
        for (const pchar of l3.processChars) {
          console.log(`        → "${pchar.name}" (특별특성: ${pchar.specialChar || '-'})`);
        }
      }
    }
  }

  // 전체 공정 교차매핑 검사
  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 전체 공정 교차매핑 검사');
  console.log(`${'═'.repeat(70)}`);

  let crossMatchCount = 0;
  for (const l2 of l2Data) {
    for (const l3 of (l2.l3 || [])) {
      const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
      if (m4 === 'MN') continue;

      const workElement = (l3.name || '').trim();
      for (const func of (l3.functions || [])) {
        for (const pchar of (func.processChars || [])) {
          const pcharName = (pchar.name || '').trim();
          // 공정특성 이름에 다른 작업요소 이름이 포함된 경우 감지
          // 패턴: "XX번-다른장비명-특성" 형태
          const equipmentMatch = pcharName.match(/\d+번-(.+?)-/);
          if (equipmentMatch) {
            const refEquipment = equipmentMatch[1];
            if (!workElement.includes(refEquipment) && refEquipment !== workElement.replace(/^\d+번-/, '')) {
              crossMatchCount++;
              if (crossMatchCount <= 15) {
                console.log(`  ⚠️ [${l2.no}] ${workElement} → "${pcharName}" (참조: ${refEquipment})`);
              }
            }
          }
        }
      }
    }
  }

  if (crossMatchCount > 15) {
    console.log(`  ... 외 ${crossMatchCount - 15}건`);
  }
  console.log(`\n  총 교차매핑 의심: ${crossMatchCount}건`);
  console.log(`  (PFMEA 원본 데이터의 L3 → processChars 매핑 문제일 수 있음)`);
}

main().catch(console.error);
