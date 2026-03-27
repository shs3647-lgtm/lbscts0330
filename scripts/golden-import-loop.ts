/**
 * @file golden-import-loop.ts
 * @description 골든 베이스라인 검증 반복 루프
 *
 * 1. 원본 엑셀 → import-excel-file API → DB 저장
 * 2. pipeline-verify → 골든 베이스라인 비교
 * 3. rebuild-atomic → DC/PC 동기화
 * 4. export-master → 마스터 JSON 재생성
 * 5. 결과 출력 + PASS/FAIL 판정
 *
 * 실행: npx tsx scripts/golden-import-loop.ts
 * 전제: dev 서버가 localhost:3000에서 실행 중이어야 함
 */

const FMEA_ID = 'pfm26-m002';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EXCEL_PATH = 'data/master-fmea/master_import_12inch_AuBump.xlsx';

// 골든 베이스라인 (CLAUDE.md 2026-03-17 확정)
const GOLDEN = {
  l2: 21,
  l3: 91,
  l1Func: 17,
  l2Func: 26,
  l3Func: 101,
  fm: 26,
  fe: 20,
  fc: 104,
  fl: 111,
  ra: 111,
};

interface ApiResult {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

async function apiCall(endpoint: string, method: string, body?: unknown): Promise<ApiResult> {
  const url = `${BASE_URL}${endpoint}`;
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status } as unknown as ApiResult;
  }
}

function printTable(title: string, rows: [string, string | number, string | number, string][]) {
  console.log(`\n┌─── ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}┐`);
  const colWidths = [18, 10, 10, 6];
  const header = ['항목', '실제값', '기대값', '판정'].map((h, i) => h.padEnd(colWidths[i])).join(' ');
  console.log(`│ ${header} │`);
  console.log(`├${'─'.repeat(52)}┤`);
  for (const [name, actual, expected, status] of rows) {
    const row = [
      name.padEnd(colWidths[0]),
      String(actual).padStart(colWidths[1]),
      String(expected).padStart(colWidths[2]),
      status.padEnd(colWidths[3]),
    ].join(' ');
    console.log(`│ ${row} │`);
  }
  console.log(`└${'─'.repeat(52)}┘`);
}

function judge(actual: number, expected: number, tolerance = 0): string {
  if (actual === expected) return 'PASS';
  if (tolerance > 0 && actual >= expected * (1 - tolerance)) return 'WARN';
  return 'FAIL';
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  골든 베이스라인 검증 루프 — ${FMEA_ID}`);
  console.log(`  서버: ${BASE_URL}`);
  console.log(`  엑셀: ${EXCEL_PATH}`);
  console.log(`  시각: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);

  // ── STEP 1: 서버사이드 엑셀 Import ──
  console.log('\n[STEP 1/5] 서버사이드 엑셀 Import...');
  const importResult = await apiCall('/api/fmea/import-excel-file', 'POST', {
    fmeaId: FMEA_ID,
    filePath: EXCEL_PATH,
    l1Name: 'au bump',
    masterJsonPath: `data/master-fmea/${FMEA_ID}-golden.json`,
  });

  if (!importResult.success) {
    console.error('  FAIL:', importResult.error || JSON.stringify(importResult).substring(0, 300));
    process.exit(1);
  }

  const parsing = importResult.parsing as Record<string, unknown>;
  const saveRes = importResult.saveResult as Record<string, unknown>;
  const diag = (saveRes?.diagnostics || {}) as Record<string, number>;

  console.log(`  파싱: rows=${parsing?.rows}, flatData=${parsing?.flatDataTotal}, chains=${parsing?.chainsTotal}`);
  console.log(`  항목별: ${JSON.stringify(parsing?.itemCounts)}`);
  console.log(`  저장: L2=${diag?.l2Count} L3=${diag?.l3Count} L1F=${diag?.l1FCount} L2F=${diag?.l2FCount} L3F=${diag?.l3FCount}`);
  console.log(`         FM=${diag?.fmCount} FE=${diag?.feCount} FC=${diag?.fcCount} FL=${diag?.linkCount} RA=${diag?.raCount}`);

  // ── STEP 2: rebuild-atomic ──
  console.log('\n[STEP 2/5] rebuild-atomic 실행...');
  const rebuildResult = await apiCall(`/api/fmea/rebuild-atomic?fmeaId=${FMEA_ID}`, 'POST');
  console.log(`  결과: ${rebuildResult.success ? 'OK' : 'FAIL'}`);
  if (rebuildResult.riskAnalyses !== undefined) {
    console.log(`  RiskAnalysis: ${rebuildResult.riskAnalyses}건`);
  }

  // ── STEP 3: pipeline-verify ──
  console.log('\n[STEP 3/5] 파이프라인 검증...');
  const verifyResult = await apiCall(`/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`, 'GET');

  if (verifyResult.steps) {
    const steps = verifyResult.steps as Array<{ status: string; name?: string }>;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const status = s.status === 'ok' ? 'OK' : s.status === 'warn' ? 'WARN' : 'ERROR';
      console.log(`  STEP ${i}: ${s.name || '?'} → ${status}`);
    }
    console.log(`  allGreen: ${verifyResult.allGreen ? 'YES' : 'NO'}`);
  }

  // ── STEP 4: export-master ──
  console.log('\n[STEP 4/5] export-master 실행...');
  const exportResult = await apiCall('/api/fmea/export-master', 'POST', { fmeaId: FMEA_ID });
  console.log(`  결과: ${exportResult.success ? 'OK' : 'FAIL'}`);

  // ── STEP 5: 골든 베이스라인 비교 ──
  console.log('\n[STEP 5/5] 골든 베이스라인 비교...');

  // DB 카운트 수집 (save 결과 + export 결과)
  const exp = (exportResult.stats || {}) as Record<string, number>;
  const actual = {
    l2: diag?.l2Count ?? exp?.l2Count ?? 0,
    l3: diag?.l3Count ?? exp?.l3Count ?? 0,
    l1Func: diag?.l1FCount ?? exp?.l1FuncCount ?? 0,
    l2Func: diag?.l2FCount ?? exp?.l2FuncCount ?? 0,
    l3Func: diag?.l3FCount ?? exp?.l3FuncCount ?? 0,
    fm: diag?.fmCount ?? exp?.fmCount ?? 0,
    fe: diag?.feCount ?? exp?.feCount ?? 0,
    fc: diag?.fcCount ?? exp?.fcCount ?? 0,
    fl: diag?.linkCount ?? exp?.linkCount ?? 0,
    ra: diag?.raCount ?? exp?.riskCount ?? 0,
  };

  const rows: [string, string | number, string | number, string][] = [
    ['L2 (공정)', actual.l2, GOLDEN.l2, judge(actual.l2, GOLDEN.l2)],
    ['L3 (작업요소)', actual.l3, GOLDEN.l3, judge(actual.l3, GOLDEN.l3)],
    ['L1Function', actual.l1Func, GOLDEN.l1Func, judge(actual.l1Func, GOLDEN.l1Func)],
    ['L2Function', actual.l2Func, GOLDEN.l2Func, judge(actual.l2Func, GOLDEN.l2Func)],
    ['L3Function', actual.l3Func, GOLDEN.l3Func, judge(actual.l3Func, GOLDEN.l3Func)],
    ['FM (고장형태)', actual.fm, GOLDEN.fm, judge(actual.fm, GOLDEN.fm)],
    ['FE (고장영향)', actual.fe, GOLDEN.fe, judge(actual.fe, GOLDEN.fe)],
    ['FC (고장원인)', actual.fc, GOLDEN.fc, judge(actual.fc, GOLDEN.fc)],
    ['FailureLink', actual.fl, GOLDEN.fl, judge(actual.fl, GOLDEN.fl)],
    ['RiskAnalysis', actual.ra, GOLDEN.ra, judge(actual.ra, GOLDEN.ra)],
  ];

  printTable('골든 베이스라인 비교', rows);

  const failCount = rows.filter(r => r[3] === 'FAIL').length;
  const warnCount = rows.filter(r => r[3] === 'WARN').length;
  const passCount = rows.filter(r => r[3] === 'PASS').length;

  console.log(`\n  종합: PASS=${passCount} WARN=${warnCount} FAIL=${failCount}`);

  if (failCount === 0 && warnCount === 0) {
    console.log('\n  ✅ 골든 베이스라인 100% 달성!');
  } else if (failCount === 0) {
    console.log('\n  ⚠️ 경고 항목 존재 — 허용 범위 내');
  } else {
    console.log('\n  ❌ 베이스라인 미달 — 코드 수정 필요');
    console.log('\n  FAIL 항목 분석:');
    for (const r of rows) {
      if (r[3] === 'FAIL') {
        const diff = Number(r[1]) - Number(r[2]);
        console.log(`    ${r[0]}: ${r[1]} (기대=${r[2]}, 차이=${diff > 0 ? '+' : ''}${diff})`);
      }
    }
  }

  // DC/PC 검증 (export-master 결과에서)
  if (exportResult.stats) {
    const stats = exportResult.stats as Record<string, number>;
    console.log(`\n  DC/PC 검증:`);
    console.log(`    DC (with value): ${stats.dcCount ?? '?'}`);
    console.log(`    PC (with value): ${stats.pcCount ?? '?'}`);
  }

  console.log(`\n[완료] ${new Date().toISOString()}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[golden-import-loop] 치명적 에러:', err);
  process.exit(1);
});
