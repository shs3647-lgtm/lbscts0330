/**
 * 전체 검증 오케스트레이션 (온프레미스 품질 게이트)
 *
 * 1) npx tsc --noEmit
 * 2) npm run test:import-slice (Import/FK 가드)
 * 3) npx vitest run — **파이프라인·고장연결 회귀 묶음** (E2E/Playwright·서버의존 스펙 제외)
 * 4) npx tsx scripts/verify-import-fe-chain-layout.ts
 *
 * 전체 Vitest(실패 다수 = 서버·DB·FULL_SYSTEM 전제)는:
 *   npx vitest run
 *
 * 환경변수 (pipeline API):
 *   VERIFY_BASE_URL, VERIFY_FMEA_ID, VERIFY_PIPELINE_POST=1, VERIFY_PIPELINE_WARN_ONLY=1
 *
 * 종료: 0 = 전 구간 PASS
 */

import { execSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

function run(label: string, cmd: string): void {
  console.log(`\n${'═'.repeat(72)}\n▶ ${label}\n${'─'.repeat(72)}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, env: process.env });
}

function main(): void {
  console.log('[verify-all] 시작', new Date().toISOString());

  run('1/4 TypeScript (tsc --noEmit)', 'npx tsc --noEmit');

  run('2/4 test:import-slice', 'npm run test:import-slice');

  const pipelineTests = [
    'src/__tests__/failure-chain-parsing-diagnosis.test.ts',
    'src/__tests__/failure-link-pipeline.test.ts',
    'src/__tests__/sync-confirmed-flags-fe-severity.test.ts',
    'src/__tests__/s-recommend-bulk-apply.test.ts',
    'src/__tests__/import/failure-chain-injector-completeness.test.ts',
    'src/__tests__/optimization-od-industry.test.ts',
    'src/__tests__/aiag-vda-severity-mapping.test.ts',
    'src/__tests__/failure-link-link-stats.test.ts',
    'src/__tests__/auto-match-missing-fc.test.ts',
    'src/__tests__/collect-auto-match-fc-entries.test.ts',
    'src/__tests__/import/v3-masterfc-no-pcdc.test.ts',
    'src/__tests__/import/fa-verification-spec-relax.test.ts',
    'src/__tests__/import/linkage-sheet-parse.test.ts',
    'src/__tests__/import/post-save-pgsql-alignment.test.ts',
  ].join(' ');

  run('3/4 Vitest (파이프라인·고장연결 회귀 묶음)', `npx vitest run ${pipelineTests}`);

  run('4/4 Import 체인 + pipeline-verify(환경변수 시)', 'npx tsx scripts/verify-import-fe-chain-layout.ts');

  console.log(`\n${'═'.repeat(72)}\n[verify-all] 전체 PASS ${new Date().toISOString()}\n`);
}

try {
  main();
} catch (e) {
  console.error('\n[verify-all] FAIL — 위 로그 확인');
  process.exit(1);
}
