/**
 * @migration migrate-specialchar
 * @description Master DB의 specialChar를 기준으로 legacyData의 specialChar를 일괄 보충
 *
 * 배경:
 *   useSpecialCharSync 런타임 폴백 훅이 제거되었으므로,
 *   기존에 specialChar 없이 저장된 legacyData를 1회 마이그레이션으로 보충합니다.
 *   이후에는 legacyData의 specialChar만 Single Source of Truth로 사용합니다.
 *
 * 처리:
 *   1. 모든 PFMEA dataset 목록 조회
 *   2. 각 dataset의 Master flatItems에서 A4/B3 specialChar 맵 구성
 *   3. legacyData 로드 → productChars/processChars에 specialChar 보충 (비어있는 것만)
 *   4. 변경된 legacyData를 /api/fmea POST로 저장
 *
 * 실행 조건: 앱 서버가 localhost:3000에서 실행 중이어야 함
 * 실행: node scripts/migrate-specialchar.js
 */

const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse error: ${d.substring(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse error: ${d.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function migrateFmea(fmeaId) {
  // 1. Master DB flatItems 조회 → specialChar 맵 구성
  const masterRes = await apiGet(`/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`);
  const flatItems = masterRes?.dataset?.flatItems || [];

  const scMap = new Map();
  for (const item of flatItems) {
    if (!item.specialChar?.trim()) continue;
    if (item.itemCode === 'A4' || item.itemCode === 'B3') {
      scMap.set(`${item.processNo}|${item.itemCode}|${item.value}`, item.specialChar.trim());
    }
  }

  if (scMap.size === 0) {
    return { updated: 0, reason: 'Master DB에 SC 없음' };
  }

  // 2. legacyData 로드
  const legacy = await apiGet(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
  const l2 = legacy?.l2 || legacy?.fmeaData?.l2;
  if (!Array.isArray(l2) || l2.length === 0) {
    return { updated: 0, reason: 'legacyData L2 없음' };
  }

  // 3. productChars (A4) + processChars (B3) specialChar 보충
  let patchCount = 0;
  const patchedL2 = l2.map(proc => {
    const procNo = String(proc.no || '').trim();

    const patchedFunctions = (proc.functions || []).map(fn => {
      const patchedPC = (fn.productChars || []).map(c => {
        if (c.specialChar?.trim()) return c;
        const sc = scMap.get(`${procNo}|A4|${c.name}`);
        if (sc) { patchCount++; return { ...c, specialChar: sc }; }
        return c;
      });
      return { ...fn, productChars: patchedPC };
    });

    const patchedL3 = (proc.l3 || []).map(we => {
      const patchedWeFns = (we.functions || []).map(fn => {
        const patchedPRC = (fn.processChars || []).map(c => {
          if (c.specialChar?.trim()) return c;
          const sc = scMap.get(`${procNo}|B3|${c.name}`);
          if (sc) { patchCount++; return { ...c, specialChar: sc }; }
          return c;
        });
        return { ...fn, processChars: patchedPRC };
      });
      return { ...we, functions: patchedWeFns };
    });

    return { ...proc, functions: patchedFunctions, l3: patchedL3 };
  });

  if (patchCount === 0) {
    return { updated: 0, reason: 'legacyData에 이미 SC 존재하거나 매칭 없음' };
  }

  // 4. 변경된 legacyData 저장
  const updatedLegacy = { ...legacy };
  if (updatedLegacy.fmeaData) {
    delete updatedLegacy.fmeaData;
  }
  updatedLegacy.l2 = patchedL2;

  const saveRes = await apiPost('/api/fmea', {
    fmeaId: fmeaId.toLowerCase(),
    l1Structures: [],
    l2Structures: [],
    l3Structures: [],
    l2Functions: [],
    l3Functions: [],
    failureEffects: [],
    failureModes: [],
    failureCauses: [],
    failureLinks: [],
    riskAnalyses: [],
    legacyData: updatedLegacy,
    forceOverwrite: true,
  });

  if (saveRes?.success === false) {
    return { updated: patchCount, reason: `저장 실패: ${saveRes.error || 'unknown'}`, error: true };
  }

  return { updated: patchCount };
}

async function main() {
  console.log('=== specialChar 마이그레이션 (Master DB → legacyData) ===');
  console.log(`서버: ${BASE}\n`);

  const allRes = await apiGet('/api/pfmea/master');
  const datasets = allRes?.datasets || [];
  console.log(`전체 dataset: ${datasets.length}개\n`);

  let totalPatched = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const ds of datasets) {
    if (!ds.fmeaId) continue;
    const label = `${ds.fmeaId} (${ds.name || 'unnamed'})`;
    try {
      const result = await migrateFmea(ds.fmeaId);
      if (result.error) {
        console.log(`  ❌ ${label}: ${result.reason}`);
        errorCount++;
      } else if (result.updated > 0) {
        console.log(`  ✅ ${label}: ${result.updated}건 보충`);
        totalPatched += result.updated;
        successCount++;
      } else {
        console.log(`  ⏭️  ${label}: ${result.reason}`);
        skipCount++;
      }
    } catch (e) {
      console.log(`  ❌ ${label}: ${e.message}`);
      errorCount++;
    }
  }

  console.log('\n=== 결과 ===');
  console.log(`성공: ${successCount}개 FMEA (총 ${totalPatched}건 보충)`);
  console.log(`건너뜀: ${skipCount}개`);
  console.log(`실패: ${errorCount}개`);
  console.log('\n이후에는 legacyData의 specialChar만 Single Source of Truth로 사용됩니다.');
}

main().catch(e => { console.error('마이그레이션 실패:', e); process.exit(1); });
