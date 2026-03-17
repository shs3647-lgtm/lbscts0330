/**
 * @file roundtrip-verify.ts
 * @description 라운드트립 검증: Excel 생성 → 역임포트 → 파이프라인 검증
 *
 * Usage: npx tsx scripts/roundtrip-verify.ts [fmeaId] [port]
 * Default: fmeaId=pfm26-m066, port=3000
 *
 * 4단계:
 *  1. generate-roundtrip-excel API로 Excel 생성
 *  2. reverse-import API로 역임포트 (flatData + chains 재생성)
 *  3. pipeline-verify API로 5단계 검증 (autoFix=true)
 *  4. 결과 출력 (ALL GREEN / 상세 에러)
 */
import * as fs from 'fs';
import * as path from 'path';

const FMEA_ID = process.argv[2] || 'pfm26-m066';
const PORT = process.argv[3] || '3000';
const BASE_URL = `http://localhost:${PORT}`;

const OUTPUT_DIR = path.resolve(__dirname, '..', 'data', 'master-fmea');
const EXCEL_PATH = path.join(OUTPUT_DIR, `${FMEA_ID}-roundtrip.xlsx`);

type StepStatus = 'ok' | 'warn' | 'error' | 'fixed';

interface VerifyStep {
  step: number;
  name: string;
  status: StepStatus;
  details: Record<string, number | string>;
  issues: string[];
  fixed: string[];
}

interface PipelineResult {
  fmeaId: string;
  steps: VerifyStep[];
  allGreen: boolean;
  loopCount: number;
  timestamp: string;
}

function statusIcon(status: StepStatus): string {
  switch (status) {
    case 'ok': return '✅';
    case 'warn': return '⚠️';
    case 'error': return '❌';
    case 'fixed': return '🔧';
    default: return '❓';
  }
}

async function main() {
  const startTime = Date.now();

  console.info(`\n${'═'.repeat(60)}`);
  console.info(`  Roundtrip Verification Pipeline`);
  console.info(`  fmeaId: ${FMEA_ID}`);
  console.info(`  server: ${BASE_URL}`);
  console.info(`${'═'.repeat(60)}\n`);

  // ──── STEP 1: Excel 생성 ────
  console.info('━━━ STEP 1: Excel 생성 ━━━');
  const excelUrl = `${BASE_URL}/api/fmea/generate-roundtrip-excel?fmeaId=${encodeURIComponent(FMEA_ID)}`;

  let excelBuffer: Buffer;
  try {
    const res = await fetch(excelUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      const body = await res.text();
      console.error(`  ❌ Excel 생성 실패: ${res.status}`);
      console.error(`  ${body.substring(0, 300)}`);
      process.exit(1);
    }
    const arrayBuffer = await res.arrayBuffer();
    excelBuffer = Buffer.from(arrayBuffer);

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(EXCEL_PATH, excelBuffer);

    console.info(`  ✅ Excel 생성 완료: ${(excelBuffer.length / 1024).toFixed(1)} KB`);
    console.info(`  📄 ${EXCEL_PATH}`);

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.default.Workbook();
    await wb.xlsx.load(excelBuffer as any);
    let totalRows = 0;
    wb.eachSheet((ws) => { totalRows += Math.max(0, ws.rowCount - 1); });
    console.info(`  📊 총 데이터행: ${totalRows}\n`);
  } catch (err) {
    console.error(`  ❌ Excel 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // ──── STEP 2: Reverse Import ────
  console.info('━━━ STEP 2: Reverse Import (역임포트) ━━━');
  const reverseUrl = `${BASE_URL}/api/fmea/reverse-import?fmeaId=${encodeURIComponent(FMEA_ID)}`;

  try {
    const res = await fetch(reverseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resave: false }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json();

    if (!data.success) {
      console.error(`  ❌ Reverse Import 실패: ${data.error}`);
      process.exit(1);
    }

    console.info(`  ✅ Reverse Import 완료`);
    console.info(`  flatData: ${data.flatDataCount}건`);
    console.info(`  chains: ${data.chainsCount}건`);

    if (data.roundTrip) {
      const rt = data.roundTrip;
      console.info(`  라운드트립: ${rt.success ? '✅ PASS' : '❌ FAIL'} — ${rt.summary || ''}`);
      if (rt.mismatches && rt.mismatches.length > 0) {
        console.info(`  불일치: ${rt.mismatches.length}건`);
        for (const mm of rt.mismatches.slice(0, 5)) {
          console.info(`    - ${mm.field}: DB=${mm.dbValue} vs Build=${mm.buildValue}`);
        }
        if (rt.mismatches.length > 5) {
          console.info(`    ... 외 ${rt.mismatches.length - 5}건`);
        }
      }
    }

    if (data.buildDiagnostics) {
      const diag = data.buildDiagnostics;
      if (diag.warnings?.length > 0) {
        console.info(`  ⚠️ 빌드 경고: ${diag.warnings.length}건`);
        for (const w of diag.warnings.slice(0, 3)) {
          console.info(`    - ${w}`);
        }
      }
    }
    console.info('');
  } catch (err) {
    console.error(`  ❌ Reverse Import 실패: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // ──── STEP 3: Pipeline Verify ────
  console.info('━━━ STEP 3: Pipeline Verify (5단계 검증) ━━━');
  const verifyUrl = `${BASE_URL}/api/fmea/pipeline-verify`;

  let pipelineResult: PipelineResult | null = null;
  try {
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: FMEA_ID, autoFix: true }),
      signal: AbortSignal.timeout(120000),
    });

    const data = await res.json();

    if (!data.success) {
      console.error(`  ❌ Pipeline Verify 실패: ${data.error}`);
      process.exit(1);
    }

    pipelineResult = data as PipelineResult;
    console.info(`  검증 루프: ${pipelineResult.loopCount}회\n`);

    // 5단계 결과 테이블
    console.info('┌──────┬──────────────┬────────┬───────────────────────────────────┐');
    console.info('│ Step │ 이름         │ 상태   │ 상세                              │');
    console.info('├──────┼──────────────┼────────┼───────────────────────────────────┤');

    for (const step of pipelineResult.steps) {
      const icon = statusIcon(step.status);
      const detailStr = Object.entries(step.details)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
        .substring(0, 35);
      console.info(`│  ${step.step}   │ ${step.name.padEnd(12)} │ ${icon}     │ ${detailStr.padEnd(33)} │`);

      if (step.issues.length > 0) {
        for (const issue of step.issues) {
          console.info(`│      │              │        │  ⚠ ${issue.substring(0, 29).padEnd(29)} │`);
        }
      }
      if (step.fixed.length > 0) {
        for (const fix of step.fixed.slice(0, 3)) {
          console.info(`│      │              │        │  🔧 ${fix.substring(0, 28).padEnd(28)} │`);
        }
        if (step.fixed.length > 3) {
          console.info(`│      │              │        │  ... 외 ${step.fixed.length - 3}건                      │`);
        }
      }
    }
    console.info('└──────┴──────────────┴────────┴───────────────────────────────────┘');
    console.info('');
  } catch (err) {
    console.error(`  ❌ Pipeline Verify 실패: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // ──── STEP 4: 결과 요약 ────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const allGreen = pipelineResult?.allGreen ?? false;

  console.info(`${'═'.repeat(60)}`);
  if (allGreen) {
    console.info(`  🟢 ALL GREEN — 라운드트립 검증 통과!`);
  } else {
    console.info(`  🔴 ISSUES DETECTED — 상세 내용 확인 필요`);
    const errorSteps = pipelineResult?.steps.filter(s => s.status === 'error') || [];
    const warnSteps = pipelineResult?.steps.filter(s => s.status === 'warn') || [];
    if (errorSteps.length > 0) {
      console.info(`  에러 단계: ${errorSteps.map(s => `Step${s.step}(${s.name})`).join(', ')}`);
    }
    if (warnSteps.length > 0) {
      console.info(`  경고 단계: ${warnSteps.map(s => `Step${s.step}(${s.name})`).join(', ')}`);
    }
  }
  console.info(`  소요 시간: ${elapsed}s`);
  console.info(`${'═'.repeat(60)}\n`);

  process.exit(allGreen ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ 예기치 않은 오류:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
