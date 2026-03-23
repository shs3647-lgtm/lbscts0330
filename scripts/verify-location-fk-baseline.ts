/**
 * 위치기반 FK / 파이프라인 기준 검증 스크립트 (3단계)
 *
 * 전제: 로컬에서 `npm run dev` 후 DB에 해당 fmeaId 데이터가 이미 Import·저장되어 있어야 합니다.
 * 검증 범위: API `GET /api/fmea/pipeline-verify` = 구조 → UUID → fmeaId → **FK(FailureLink 등)** → 누락
 *
 * 사용:
 *   npx tsx scripts/verify-location-fk-baseline.ts
 *   VERIFY_BASE_URL=http://localhost:4000 VERIFY_FMEA_ID=pfm26-m066 npx tsx scripts/verify-location-fk-baseline.ts
 *   npx tsx scripts/verify-location-fk-baseline.ts --baseline   # pfm26-m066 골든 카운트 엄격 비교
 *
 * 종료 코드: 0 = PASS, 1 = FAIL (연결/API/검증 실패)
 */

type StepResult = {
  step: number;
  name: string;
  status: string;
  details?: Record<string, number | string>;
  issues?: string[];
};

type PipelineJson = {
  success?: boolean;
  error?: string;
  fmeaId?: string;
  allGreen?: boolean;
  steps?: StepResult[];
  timestamp?: string;
};

/** CLAUDE.md 파이프라인 골든 (pfm26-m066, 2026-03-17 기준) — --baseline 시 FK·수량 확인 */
const GOLDEN_PFM26_M066 = {
  fkLinks: 111,
  fkTotalOrphans: 0,
  fkNullFeIdLinks: 0,
  l2: 21,
} as const;

function printSteps(data: PipelineJson): void {
  const steps = data.steps || [];
  for (const s of steps) {
    const d = s.details ? JSON.stringify(s.details) : '';
    const iss = (s.issues || []).join(' | ');
    console.error(`  [${s.step}] ${s.name} status=${s.status} ${d}`);
    if (iss) console.error(`      issues: ${iss}`);
  }
}

async function main(): Promise<void> {
  const base = (process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  const fmeaId = process.env.VERIFY_FMEA_ID || 'pfm26-m066';
  const baseline = process.argv.includes('--baseline');

  const url = `${base}/api/fmea/pipeline-verify?fmeaId=${encodeURIComponent(fmeaId)}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch (e) {
    console.error('[verify-location-fk-baseline] fetch 실패 — dev 서버가 떠 있는지 확인하세요.');
    console.error(`  URL: ${url}`);
    console.error(`  ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
    return;
  }

  const text = await res.text();
  let data: PipelineJson;
  try {
    data = JSON.parse(text) as PipelineJson;
  } catch {
    console.error('[verify-location-fk-baseline] JSON 파싱 실패:', text.slice(0, 500));
    process.exit(1);
    return;
  }

  if (!data.success) {
    console.error('[verify-location-fk-baseline] API 오류:', data.error || res.status, text.slice(0, 400));
    process.exit(1);
    return;
  }

  if (!data.allGreen) {
    console.error(`[verify-location-fk-baseline] FAIL fmeaId=${fmeaId} allGreen=false`);
    printSteps(data);
    process.exit(1);
    return;
  }

  if (baseline && fmeaId === 'pfm26-m066') {
    const fk = data.steps?.find((s) => s.step === 3);
    const st0 = data.steps?.find((s) => s.step === 0);
    const d = fk?.details || {};
    const links = Number(d.links);
    const totalOrphans = Number(d.totalOrphans ?? 0);
    const nullFe = Number(d.nullFeIdLinks ?? 0);
    const l2 = Number(st0?.details?.l2 ?? 0);

    const ok =
      links === GOLDEN_PFM26_M066.fkLinks &&
      totalOrphans === GOLDEN_PFM26_M066.fkTotalOrphans &&
      nullFe === GOLDEN_PFM26_M066.fkNullFeIdLinks &&
      l2 === GOLDEN_PFM26_M066.l2;

    if (!ok) {
      console.error('[verify-location-fk-baseline] --baseline 골든 불일치 (pfm26-m066)');
      console.error('  기대:', GOLDEN_PFM26_M066);
      console.error('  실제:', { links, totalOrphans, nullFeIdLinks: nullFe, l2 });
      process.exit(1);
      return;
    }
  }

  console.log(
    `[verify-location-fk-baseline] PASS fmeaId=${fmeaId} allGreen=true` +
      (baseline ? ' --baseline(골든)' : '') +
      ` @ ${data.timestamp || ''}`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
