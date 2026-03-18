/**
 * @file seed-m069.ts
 * @description pfm26-m069 시드 스크립트 — 마스터 JSON → DB 전체 시드
 *
 * 마스터 JSON(data/master-fmea/pfm26-m069.json)을 읽어
 * 1) FmeaProject + FmeaRegistration 생성
 * 2) PfmeaMasterDataset + PfmeaMasterFlatItem 시드
 * 3) Atomic DB (L1~L3, FM/FE/FC, FailureLink, RiskAnalysis 등) 시드
 * 4) LegacyData 시드
 * 5) pipeline-verify 검증
 *
 * 실행: npx tsx scripts/seed-m069.ts
 * 전제: dev 서버가 localhost:3000에서 실행 중이어야 함
 */

import * as fs from 'fs';
import * as path from 'path';

const FMEA_ID = 'pfm26-m069';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MASTER_JSON_PATH = path.resolve(__dirname, '../data/master-fmea/pfm26-m069.json');

interface MasterJSON {
  version: number;
  fmeaId: string;
  exportedAt: string;
  atomicDB: {
    fmeaId: string;
    savedAt: string;
    l1Structure: any;
    l2Structures: any[];
    l3Structures: any[];
    l1Functions: any[];
    l2Functions: any[];
    l3Functions: any[];
    failureEffects: any[];
    failureModes: any[];
    failureCauses: any[];
    failureLinks: any[];
    failureAnalyses: any[];
    riskAnalyses: any[];
    optimizations: any[];
    processProductChars?: any[];
  };
  flatData: any[];
  chains: any[];
  stats: {
    fmeaId: string;
    l2Count: number;
    l3Count: number;
    fmCount: number;
    feCount: number;
    fcCount: number;
    linkCount: number;
    riskCount: number;
    chainCount: number;
    flatDataCount: number;
    flatBreakdown: Record<string, number>;
  };
}

async function apiCall(endpoint: string, method: string, body?: unknown): Promise<any> {
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
    return { raw: text, status: res.status };
  }
}

function printTable(title: string, rows: [string, string | number][]) {
  console.log(`\n=== ${title} ===`);
  const maxKey = Math.max(...rows.map(([k]) => k.length));
  for (const [key, val] of rows) {
    console.log(`  ${key.padEnd(maxKey + 2)} ${val}`);
  }
}

async function main() {
  console.log(`\n[seed-m069] pfm26-m069 시드 시작 (${new Date().toISOString()})`);
  console.log(`  마스터 JSON: ${MASTER_JSON_PATH}`);
  console.log(`  서버: ${BASE_URL}`);

  // 0. 마스터 JSON 로드
  if (!fs.existsSync(MASTER_JSON_PATH)) {
    console.error(`[ERROR] 마스터 JSON 파일이 없습니다: ${MASTER_JSON_PATH}`);
    process.exit(1);
  }

  const master: MasterJSON = JSON.parse(fs.readFileSync(MASTER_JSON_PATH, 'utf-8'));
  printTable('마스터 JSON 통계', [
    ['fmeaId', master.fmeaId],
    ['L2 공정', master.stats.l2Count],
    ['L3 작업요소', master.stats.l3Count],
    ['FM 고장형태', master.stats.fmCount],
    ['FE 고장영향', master.stats.feCount],
    ['FC 고장원인', master.stats.fcCount],
    ['FailureLink', master.stats.linkCount],
    ['RiskAnalysis', master.stats.riskCount],
    ['chains', master.stats.chainCount],
    ['flatData 합계', master.stats.flatDataCount],
  ]);

  // 1. 프로젝트 등록
  console.log('\n[Step 1/5] 프로젝트 등록...');
  const l1Name = master.atomicDB.l1Structure?.name || 'Au Bump';
  const projectResult = await apiCall('/api/fmea/projects', 'POST', {
    fmeaId: FMEA_ID,
    fmeaType: 'M',
    fmeaInfo: {
      companyName: 'LB세미콘',
      engineeringLocation: '용인',
      customerName: '',
      modelYear: '2026',
      subject: `${l1Name || 'Au Bump'}+PFMEA`,
      fmeaStartDate: '2026-01-10',
      fmeaProjectName: `${l1Name || 'Au Bump'} PFMEA`,
      designResponsibility: '제조기술팀',
      confidentialityLevel: '사내',
      fmeaResponsibleName: '',
      partName: l1Name || 'Au Bump',
    },
  });
  console.log(`  결과: ${projectResult.success ? 'OK' : 'FAIL'} — ${projectResult.message || ''}`);

  // 2. flatData → PfmeaMasterDataset + PfmeaMasterFlatItem 시드
  console.log('\n[Step 2/5] flatData 시드 (save-from-import)...');
  const saveImportResult = await apiCall('/api/fmea/save-from-import', 'POST', {
    fmeaId: FMEA_ID,
    flatData: master.flatData,
    l1Name: l1Name || 'Au Bump',
    failureChains: master.chains,
  });
  console.log(`  결과: ${saveImportResult.success ? 'OK' : 'FAIL'}`);
  if (saveImportResult.error) {
    console.error(`  에러: ${saveImportResult.error}`);
  }
  if (saveImportResult.diagnostics) {
    const diag = saveImportResult.diagnostics;
    console.log(`  L2=${diag.l2Count || '?'}, FM=${diag.fmCount || '?'}, FC=${diag.fcCount || '?'}, Links=${diag.linkCount || '?'}`);
  }

  // 3. Atomic DB 직접 저장 (마스터 JSON의 atomicDB 사용)
  console.log('\n[Step 3/5] Atomic DB 저장...');
  const atomicPayload = {
    ...master.atomicDB,
    forceOverwrite: true,
  };
  const atomicResult = await apiCall('/api/fmea', 'POST', atomicPayload);
  console.log(`  결과: ${atomicResult.success ? 'OK' : 'FAIL'} — ${atomicResult.message || ''}`);
  if (atomicResult.error) {
    console.error(`  에러: ${atomicResult.error}`);
  }

  // 4. rebuild-atomic (RiskAnalysis DC/PC 동기화)
  console.log('\n[Step 4/5] rebuild-atomic 실행...');
  const rebuildResult = await apiCall(`/api/fmea/rebuild-atomic?fmeaId=${FMEA_ID}`, 'POST');
  console.log(`  결과: ${rebuildResult.success ? 'OK' : 'FAIL'}`);
  if (rebuildResult.riskAnalyses !== undefined) {
    console.log(`  RiskAnalysis: ${rebuildResult.riskAnalyses}건`);
  }

  // 5. pipeline-verify 검증
  console.log('\n[Step 5/5] 파이프라인 검증...');
  const verifyResult = await apiCall(`/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`, 'GET');

  if (verifyResult.steps) {
    const stepNames = ['IMPORT', '파싱', 'UUID', 'FK', 'WS'];
    const stepRows: [string, string][] = verifyResult.steps.map((s: any, i: number) => {
      const status = s.status === 'ok' ? 'OK' : s.status === 'warn' ? 'WARN' : 'ERROR';
      return [`STEP ${i + 1} (${stepNames[i] || '?'})`, status];
    });
    printTable('파이프라인 검증 결과', [
      ...stepRows,
      ['allGreen', verifyResult.allGreen ? 'YES' : 'NO'],
    ]);
  } else {
    console.log('  검증 결과를 파싱할 수 없습니다:', JSON.stringify(verifyResult).substring(0, 200));
  }

  // 6. export-master (마스터 JSON 재생성)
  console.log('\n[Bonus] export-master 실행...');
  const exportResult = await apiCall('/api/fmea/export-master', 'POST', { fmeaId: FMEA_ID });
  console.log(`  결과: ${exportResult.success ? 'OK' : 'FAIL'}`);
  if (exportResult.stats) {
    printTable('Export 통계', [
      ['L2', exportResult.stats.l2Count],
      ['L3', exportResult.stats.l3Count],
      ['FM', exportResult.stats.fmCount],
      ['FE', exportResult.stats.feCount],
      ['FC', exportResult.stats.fcCount],
      ['FailureLink', exportResult.stats.linkCount],
      ['RiskAnalysis', exportResult.stats.riskCount],
      ['chains', exportResult.stats.chainCount],
    ]);
  }

  console.log(`\n[seed-m069] 완료 (${new Date().toISOString()})`);
}

main().catch((err) => {
  console.error('[seed-m069] 치명적 에러:', err);
  process.exit(1);
});
