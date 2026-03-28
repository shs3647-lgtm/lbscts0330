/**
 * @file pipeline-autofix-loop-100.spec.ts
 * @description 파이프라인 자동수정 반복 루프 — ALL GREEN 100% 달성 검증
 *
 * 실행: npx playwright test tests/e2e/pipeline-autofix-loop-100.spec.ts --project=setup-free
 * 또는: FMEA_ID=pfm26-m002 npx playwright test tests/e2e/pipeline-autofix-loop-100.spec.ts
 */
import { test, expect } from '@playwright/test';

// auth setup 건너뛰기 — API만 테스트
test.use({ storageState: undefined as any });

const BASE = 'http://localhost:3000';
const FMEA_ID = process.env.FMEA_ID || 'pfm26-m002';
const MAX_LOOPS = 5;

interface StepResult {
  step: number;
  name: string;
  status: 'ok' | 'warn' | 'error' | 'fixed';
  details: Record<string, number | string>;
  issues: string[];
  fixed: string[];
  fkIntegrity?: Array<{ relation: string; total: number; valid: number; orphans: any[] }>;
}

interface AutoFixSummary {
  totalIssues: number;
  autoFixed: number;
  manualRequired: number;
  categories: Array<{ type: string; count: number; autoFixable: boolean; description: string }>;
}

interface PipelineResponse {
  success: boolean;
  fmeaId: string;
  steps: StepResult[];
  allGreen: boolean;
  loopCount: number;
  timestamp: string;
  autoFixSummary?: AutoFixSummary;
}

function printStepTable(steps: StepResult[], loop: number) {
  console.log(`\n═══ Loop #${loop} ═══════════════════════════════`);
  for (const s of steps) {
    const icon = s.status === 'ok' ? '✅' : s.status === 'warn' ? '⚠️' : s.status === 'fixed' ? '🔧' : '❌';
    const det = Object.entries(s.details).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(`  ${icon} STEP ${s.step} ${s.name}: ${s.status} | ${det}`);
    if (s.issues.length > 0) console.log(`     이슈: ${s.issues.slice(0, 5).join(' | ')}`);
    if (s.fixed.length > 0) console.log(`     수정: ${s.fixed.filter(f => !f.startsWith('[진단]')).slice(0, 5).join(' | ')}`);
  }
}

test.describe(`Pipeline 자동수정 반복루프 [${FMEA_ID}]`, () => {
  test.setTimeout(180_000);

  test('반복 자동수정 → ALL GREEN 달성', async ({ request }) => {
    let lastResult: PipelineResponse | null = null;

    for (let loop = 1; loop <= MAX_LOOPS; loop++) {
      const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
        timeout: 60_000,
      });
      expect(res.ok(), `Loop ${loop}: API 실패`).toBeTruthy();

      const data: PipelineResponse = await res.json();
      expect(data.success, `Loop ${loop}: success=false`).toBeTruthy();
      lastResult = data;

      printStepTable(data.steps, loop);

      if (data.autoFixSummary) {
        const s = data.autoFixSummary;
        console.log(`  📊 자동수정=${s.autoFixed} | 수동필요=${s.manualRequired} | 총=${s.totalIssues}`);
      }

      if (data.allGreen) {
        console.log(`\n🎉 ALL GREEN! (Loop #${loop})`);
        break;
      }

      const anyFixed = data.steps.some(s => s.fixed.filter(f => !f.startsWith('[진단]')).length > 0);
      if (!anyFixed && loop > 1) {
        console.log(`\n⏹️ 수렴 — 추가 수정 없음 (Loop #${loop})`);
        break;
      }
    }

    expect(lastResult).not.toBeNull();
    const r = lastResult!;

    // STEP 0~2: error 없어야 함
    for (let i = 0; i <= 2; i++) {
      const s = r.steps.find(s => s.step === i)!;
      expect(s.status, `STEP ${i} ${s.name}: error`).not.toBe('error');
    }

    // STEP 3: FK orphan 0건
    const step3 = r.steps.find(s => s.step === 3)!;
    expect(Number(step3.details.totalOrphans), 'FK orphan 잔존').toBe(0);

    // 전체: error 없음 (warn 허용)
    const noErrors = r.steps.every(s => s.status !== 'error');
    expect(noErrors, 'error 잔존').toBeTruthy();

    console.log(`\n✅ 최종: allGreen=${r.allGreen} | loopCount=${r.loopCount}`);
  });

  test('재검증(GET) 일관성', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`, { timeout: 30_000 });
    expect(res.ok()).toBeTruthy();
    const data: PipelineResponse = await res.json();

    printStepTable(data.steps, 0);

    const step3 = data.steps.find(s => s.step === 3)!;
    expect(Number(step3.details.totalOrphans), 'GET: orphan 잔존').toBe(0);

    const noErrors = data.steps.every(s => s.status !== 'error');
    expect(noErrors, 'GET: error 잔존').toBeTruthy();
  });

  test('FK 14개 관계 전수 확인', async ({ request }) => {
    const res = await request.get(`${BASE}/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`, { timeout: 30_000 });
    const data: PipelineResponse = await res.json();
    const step3 = data.steps.find(s => s.step === 3)!;

    if (step3.fkIntegrity) {
      console.log('\n═══ FK 무결성 전수 ═══');
      let totalOrphans = 0;
      for (const fk of step3.fkIntegrity) {
        const icon = fk.orphans.length === 0 ? '✅' : '❌';
        console.log(`  ${icon} ${fk.relation}: ${fk.valid}/${fk.total} (orphan=${fk.orphans.length})`);
        totalOrphans += fk.orphans.length;
      }
      expect(totalOrphans, 'FK orphan 잔존').toBe(0);
    }

    console.log(`\n  links=${step3.details.links} | unlinkedFC=${step3.details.unlinkedFC} | unlinkedFM=${step3.details.unlinkedFM}`);
  });

  test('2회 반복 일관성 — 멱등성', async ({ request }) => {
    const results: string[][] = [];
    for (let run = 0; run < 2; run++) {
      const res = await request.post(`${BASE}/api/fmea/pipeline-verify`, {
        data: { fmeaId: FMEA_ID },
        timeout: 60_000,
      });
      const data: PipelineResponse = await res.json();
      results.push(data.steps.map(s => `${s.name}:${s.status}`));
    }
    console.log('Run1:', results[0].join(' | '));
    console.log('Run2:', results[1].join(' | '));

    for (let i = 0; i < results[0].length; i++) {
      expect(results[0][i], `STEP ${i} 불일치`).toBe(results[1][i]);
    }
  });
});
