/**
 * CI 스모크: 기동 중인 Next 서버에 대해 DB 연결 + pipeline-verify(GET) 응답 형식 검증
 * (골든 데이터 없어도 success·steps 5개면 API·Prisma·프로젝트 스키마 경로 정상)
 *
 * npx tsx scripts/ci/smoke-pipeline-api.ts
 * SMOKE_BASE_URL=http://127.0.0.1:3000 SMOKE_FMEA_ID=pfm26-m002 npx tsx scripts/ci/smoke-pipeline-api.ts
 */

const base = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const fmeaId = process.env.SMOKE_FMEA_ID || 'pfm26-m002';

async function fetchJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, body };
}

function fail(msg: string): never {
  console.error(`[smoke-pipeline-api] FAIL: ${msg}`);
  process.exit(1);
}

async function main(): Promise<void> {
  console.log(`[smoke-pipeline-api] base=${base} fmeaId=${fmeaId}`);

  const health = await fetchJson(`${base}/api/health`);
  if (health.status !== 200) {
    fail(`/api/health HTTP ${health.status}`);
  }
  const h = health.body as { checks?: { database?: string }; status?: string };
  if (h.checks?.database !== 'ok') {
    fail(`/api/health database=${String(h.checks?.database)} (expected ok)`);
  }

  const pipe = await fetchJson(`${base}/api/fmea/pipeline-verify?fmeaId=${encodeURIComponent(fmeaId)}`);
  if (pipe.status !== 200) {
    fail(`pipeline-verify HTTP ${pipe.status}`);
  }
  const p = pipe.body as { success?: boolean; steps?: unknown[]; error?: string };
  if (!p.success) {
    fail(`pipeline-verify success=false error=${String(p.error)}`);
  }
  if (!Array.isArray(p.steps) || p.steps.length !== 5) {
    fail(`pipeline-verify steps.length=${Array.isArray(p.steps) ? p.steps.length : 'n/a'} (expected 5)`);
  }

  console.log('[smoke-pipeline-api] PASS');
}

main().catch((e) => {
  console.error('[smoke-pipeline-api]', e);
  process.exit(1);
});
