/**
 * Forge: pfm26-m101 프로젝트 3회 파이프라인 검증 루프
 *
 * 전제: 원본 pfm26-m002 이 DB에 Import 완료된 상태
 * 동작: create-with-import 로 m002 → m101 복제(최적화 포함) 후 pipeline-verify ×3
 *
 * 사용: dotenv -- node scripts/forge-m101-3cycle.mjs
 * 환경: BASE_URL (기본 http://localhost:3000)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SOURCE = 'pfm26-m002';
const TARGET = 'pfm26-m101';

async function j(method, url, body) {
  const opt = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(url, opt);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return data;
}

async function main() {
  console.info(`[forge-m101] BASE=${BASE} ${SOURCE} → ${TARGET}`);

  const step1 = await j('POST', `${BASE}/api/fmea/create-with-import`, {
    targetFmeaId: TARGET,
    sourceFmeaId: SOURCE,
    fmeaType: 'P',
    project: { projectName: 'Forge m101 (from m002)' },
    options: { copyDCPC: true, copySOD: true, copyOptimization: true },
  });
  console.info('[forge-m101] create-with-import:', JSON.stringify(step1, null, 2));

  for (let cycle = 1; cycle <= 3; cycle++) {
    console.info(`\n--- cycle ${cycle} / 3 ---`);
    const get = await j('GET', `${BASE}/api/fmea/pipeline-verify?fmeaId=${TARGET}`);
    console.info('[pipeline-verify GET] allGreen=', get.allGreen, 'steps=', get.steps?.length);

    const post = await j('POST', `${BASE}/api/fmea/pipeline-verify`, { fmeaId: TARGET });
    console.info('[pipeline-verify POST] allGreen=', post.allGreen);

    const rebuild = await j(
      'POST',
      `${BASE}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(TARGET)}`
    );
    console.info('[rebuild-atomic]', rebuild.success ?? rebuild);

    const exp = await j('POST', `${BASE}/api/fmea/export-master`, { fmeaId: TARGET });
    console.info('[export-master]', exp.success ?? exp);
  }

  console.info('\n[forge-m101] done. Worksheet:', `/pfmea/worksheet?id=${TARGET}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
