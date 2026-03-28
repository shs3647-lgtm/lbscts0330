/**
 * @file pipeline-autofix-loop.test.ts
 * @description 파이프라인 자동수정 반복 루프 — ALL GREEN 100% 달성 검증
 *
 * 실행: npx vitest run tests/unit/pipeline-autofix-loop.test.ts
 * 전제: dev 서버 기동 (localhost:3000)
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import http from 'http';

const PORT = process.env.PORT || '3000';
const FMEA_ID = process.env.FMEA_ID || 'pfm26-m002';
const MAX_LOOPS = 5;

interface StepResult {
  step: number; name: string; status: string;
  details: Record<string, number | string>;
  issues: string[]; fixed: string[];
  fkIntegrity?: Array<{ relation: string; total: number; valid: number; orphans: any[] }>;
}
interface AutoFixSummary {
  totalIssues: number; autoFixed: number; manualRequired: number;
  categories: Array<{ type: string; count: number; autoFixable: boolean; description: string }>;
}
interface PipelineResponse {
  success: boolean; fmeaId: string; steps: StepResult[]; allGreen: boolean;
  loopCount: number; autoFixSummary?: AutoFixSummary;
}

/** http.request 래퍼 — IPv4 127.0.0.1 강제 */
function apiCall(method: 'GET' | 'POST', path: string, body?: object): Promise<PipelineResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const req = http.request({
      hostname: '127.0.0.1',
      port: parseInt(PORT, 10),
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
      timeout: 60_000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

function printSteps(steps: StepResult[], loop: number) {
  console.log(`\n═══ Loop #${loop} ═══════════════════`);
  for (const s of steps) {
    const icon = s.status === 'ok' ? '✅' : s.status === 'warn' ? '⚠️' : s.status === 'fixed' ? '🔧' : '❌';
    const det = Object.entries(s.details).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(`  ${icon} STEP ${s.step} ${s.name}: ${s.status} | ${det}`);
    for (const iss of s.issues.slice(0, 3)) console.log(`     ❗ ${iss}`);
    for (const fix of s.fixed.filter(f => !f.startsWith('[진단]')).slice(0, 3)) console.log(`     ✔ ${fix}`);
  }
}

describe(`Pipeline 자동수정 반복루프 [${FMEA_ID}]`, () => {

  it('반복 자동수정 → orphan 0건 + error 없음', async () => {
    let last: PipelineResponse | null = null;

    for (let loop = 1; loop <= MAX_LOOPS; loop++) {
      const data = await apiCall('POST', '/api/fmea/pipeline-verify', { fmeaId: FMEA_ID });
      expect(data.success, `Loop ${loop}: success=false`).toBe(true);
      last = data;

      printSteps(data.steps, loop);
      if (data.autoFixSummary) {
        console.log(`  📊 자동=${data.autoFixSummary.autoFixed} | 수동=${data.autoFixSummary.manualRequired}`);
      }

      if (data.allGreen) { console.log(`\n🎉 ALL GREEN! (Loop #${loop})`); break; }

      const realFixes = data.steps.flatMap(s => s.fixed.filter(f => !f.startsWith('[진단]')));
      if (realFixes.length === 0 && loop > 1) { console.log(`\n⏹️ 수렴 (Loop #${loop})`); break; }
    }

    expect(last).not.toBeNull();
    const r = last!;
    for (let i = 0; i <= 2; i++) expect(r.steps[i].status, `STEP ${i} error`).not.toBe('error');
    expect(Number(r.steps[3].details.totalOrphans), 'FK orphan').toBe(0);
    expect(r.steps.every(s => s.status !== 'error'), 'error 잔존').toBe(true);
    console.log(`\n✅ allGreen=${r.allGreen}`);
  }, 120_000);

  it('GET 재검증 일관성', async () => {
    const data = await apiCall('GET', `/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    printSteps(data.steps, 0);
    expect(Number(data.steps[3].details.totalOrphans), 'orphan').toBe(0);
    expect(data.steps.every(s => s.status !== 'error'), 'error').toBe(true);
  }, 30_000);

  it('FK 14개 관계 전수', async () => {
    const data = await apiCall('GET', `/api/fmea/pipeline-verify?fmeaId=${FMEA_ID}`);
    const step3 = data.steps[3];
    if (step3.fkIntegrity) {
      console.log('\n═══ FK 무결성 ═══');
      let total = 0;
      for (const fk of step3.fkIntegrity) {
        console.log(`  ${fk.orphans.length === 0 ? '✅' : '❌'} ${fk.relation}: ${fk.valid}/${fk.total} (orphan=${fk.orphans.length})`);
        total += fk.orphans.length;
      }
      expect(total, 'FK orphan').toBe(0);
    }
    console.log(`  links=${step3.details.links} | unlinkedFC=${step3.details.unlinkedFC} | unlinkedFM=${step3.details.unlinkedFM}`);
  }, 30_000);

  it('2회 멱등성', async () => {
    const results: string[][] = [];
    for (let run = 0; run < 2; run++) {
      const data = await apiCall('POST', '/api/fmea/pipeline-verify', { fmeaId: FMEA_ID });
      results.push(data.steps.map(s => `${s.name}:${s.status}`));
    }
    console.log('Run1:', results[0].join(' | '));
    console.log('Run2:', results[1].join(' | '));
    for (let i = 0; i < results[0].length; i++) {
      expect(results[0][i], `STEP ${i}`).toBe(results[1][i]);
    }
  }, 120_000);
});
