/**
 * pfm26-mXXX 대상: pipeline-verify(GET) + validate-fk(GET) 결과를 받아
 * Import~고장연결 가설과 건수를 대조한다.
 *
 * 전제: dev 서버 기동 (기본 http://localhost:3000)
 *
 * 실행:
 *   npx tsx scripts/diag-pipeline-fk-compare.ts
 *   npx tsx scripts/diag-pipeline-fk-compare.ts pfm26-m008
 *   $env:FMEA_BASE_URL="http://localhost:3000"; npx tsx scripts/diag-pipeline-fk-compare.ts pfm26-m008
 *
 * 스냅샷 저장 (UTF-8):
 *   npx tsx scripts/diag-pipeline-fk-compare.ts pfm26-m008 --save-snapshots
 */

const DEFAULT_BASE = process.env.FMEA_BASE_URL || 'http://localhost:3000';

interface PipelineStep {
  step: number;
  name: string;
  status: string;
  details: Record<string, number | string>;
  issues: string[];
}

interface PipelineBody {
  success: boolean;
  fmeaId?: string;
  steps?: PipelineStep[];
  allGreen?: boolean;
  error?: string;
}

interface FkCheck {
  name: string;
  status: string;
  count: number;
  details: string[];
}

interface ValidateFkBody {
  success: boolean;
  fmeaId?: string;
  allGreen?: boolean;
  checks?: FkCheck[];
  summary?: { total: number; passed: number; failed: number };
  error?: string;
}

function stepDetails(steps: PipelineStep[] | undefined, n: number): Record<string, number | string> {
  return steps?.find((s) => s.step === n)?.details ?? {};
}

function checkCount(checks: FkCheck[] | undefined, name: string): number {
  return checks?.find((c) => c.name === name)?.count ?? -1;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--save-snapshots');
  const saveSnapshots = process.argv.includes('--save-snapshots');
  const fmeaId = args[0] || 'pfm26-m008';
  const base = DEFAULT_BASE.replace(/\/$/, '');

  const pipelineUrl = `${base}/api/fmea/pipeline-verify?fmeaId=${encodeURIComponent(fmeaId)}`;
  const validateUrl = `${base}/api/fmea/validate-fk?fmeaId=${encodeURIComponent(fmeaId)}`;

  let pipeline: PipelineBody;
  let validate: ValidateFkBody;

  try {
    const [pr, vr] = await Promise.all([
      fetch(pipelineUrl, { headers: { Accept: 'application/json' } }),
      fetch(validateUrl, { headers: { Accept: 'application/json' } }),
    ]);
    pipeline = (await pr.json()) as PipelineBody;
    validate = (await vr.json()) as ValidateFkBody;
  } catch (e) {
    console.error('[diag] fetch 실패 — dev 서버가 떠 있는지 확인:', e);
    process.exit(1);
  }

  if (saveSnapshots) {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = path.join(process.cwd(), 'docs', 'fmeadocs', 'snapshots');
    await fs.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const pj = path.join(dir, `${fmeaId}-${stamp}-pipeline-verify.json`);
    const vj = path.join(dir, `${fmeaId}-${stamp}-validate-fk.json`);
    await fs.writeFile(pj, JSON.stringify(pipeline, null, 2), 'utf8');
    await fs.writeFile(vj, JSON.stringify(validate, null, 2), 'utf8');
    console.log(`[diag] 스냅샷 저장: ${pj}\n            ${vj}\n`);
  }

  const steps = pipeline.steps;
  const d1 = stepDetails(steps, 1);
  const d3 = stepDetails(steps, 3);
  const d4 = stepDetails(steps, 4);
  const checks = validate.checks;

  const fm = Number(d1.FM ?? 0);
  const fe = Number(d1.FE ?? 0);
  const fc = Number(d1.FC ?? 0);
  const fl = Number(d1.FL ?? 0);
  const unlinkedFM = Number(d3.unlinkedFM ?? 0);
  const unlinkedFC = Number(d3.unlinkedFC ?? 0);
  const nullFeIdLinks = Number(d3.nullFeIdLinks ?? 0);
  const fcDup = Number(d3.fcDuplicates ?? 0);

  const flTriple = checkCount(checks, 'flTripleCheck');
  const flCoverage = checkCount(checks, 'failureLinkCoverage');
  const crossProc = checkCount(checks, 'crossProcessFk');
  const orphanFL = checkCount(checks, 'orphanFailureLinks');

  console.log('═'.repeat(72));
  console.log(`  diag-pipeline-fk-compare  |  fmeaId=${fmeaId}  |  base=${base}`);
  console.log('═'.repeat(72));
  console.log('\n[1] 파이프라인 STEP1(수량) — Atomic DB 카운트');
  console.log(`  FM=${fm}  FE=${fe}  FC=${fc}  FL=${fl}  RA=${d1.RA ?? '?'}`);
  console.log('\n[2] 파이프라인 STEP3(FK) — 미연결·품질');
  console.log(`  FL 없는 FM: ${unlinkedFM}  |  FL 없는 FC: ${unlinkedFC}`);
  console.log(`  nullFeId 링크: ${nullFeIdLinks}  |  FC중복(l2+cause): ${fcDup}`);
  if (steps?.[2]?.issues?.length) console.log(`  STEP3 issues: ${JSON.stringify(steps[2].issues)}`);

  console.log('\n[3] validate-fk — 가설 대조');
  console.log(`  orphanFailureLinks: ${orphanFL}  (가설: 저장 후 깨진 FL 참조)`);
  console.log(`  flTripleCheck: ${flTriple}  (가설: fm/fe/fc 중 빈 FK 링크가 DB에 남음)`);
  console.log(`  failureLinkCoverage: ${flCoverage}  (가설: FM 대비 FL 0건 — save-position-import 삼중필터·파서 미해결)`);
  console.log(`  crossProcessFk: ${crossProc}  (가설: FM 공정≠FC 공정으로 잘못 연결된 FL)`);

  console.log('\n[4] 건수 정합 (pipeline unlinkedFM vs validate-fk failureLinkCoverage)');
  const covMatch = unlinkedFM === flCoverage;
  console.log(
    `  unlinkedFM(${unlinkedFM}) === failureLinkCoverage(${flCoverage}) → ${covMatch ? '일치' : '불일치 (정의 차이 가능)'}`,
  );

  console.log('\n[5] 가설 요약표');
  const rows = [
    ['삼중 FK 미완성 링크가 DB에 존재', flTriple, flTriple === 0 ? 'PASS(0건)' : `주의(${flTriple})`],
    ['FM 중 FL 없음(validate)', flCoverage, flCoverage <= 0 ? '없음' : `${flCoverage}건`],
    ['FM 중 FL 없음(pipeline STEP3)', unlinkedFM, `${unlinkedFM}건`],
    ['교차 공정 FL', crossProc, crossProc <= 0 ? '없음' : `${crossProc}건`],
    ['FL 없는 FC(pipeline)', unlinkedFC, `${unlinkedFC}건`],
    ['고아 FailureLink(참조 깨짐)', orphanFL, orphanFL === 0 ? '없음' : `${orphanFL}건`],
  ] as const;
  for (const [h, n, r] of rows) {
    console.log(`  • ${h}: 지표=${n} → ${r}`);
  }

  console.log('\n[6] allGreen');
  console.log(`  pipeline: ${pipeline.success ? pipeline.allGreen : 'API실패'}  validate-fk: ${validate.success ? validate.allGreen : 'API실패'}`);
  if (!pipeline.success) console.log('  pipeline error:', pipeline.error);
  if (!validate.success) console.log('  validate-fk error:', validate.error);

  const cov = checks?.find((c) => c.name === 'failureLinkCoverage');
  if (cov && cov.details.length > 0) {
    console.log('\n[7] failureLinkCoverage 상세 (최대 10건)');
    cov.details.slice(0, 10).forEach((d) => console.log(`  - ${d}`));
  }

  const cross = checks?.find((c) => c.name === 'crossProcessFk');
  if (cross && cross.details.length > 0) {
    console.log('\n[8] crossProcessFk 샘플 (최대 5건)');
    cross.details.slice(0, 5).forEach((d) => console.log(`  - ${d}`));
  }

  console.log('\n' + '═'.repeat(72) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
