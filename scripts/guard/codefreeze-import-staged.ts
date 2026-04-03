/**
 * Import 파이프라인 핵심 유틸 스테이징 하드 차단 (protected-paths.config.json → importCodefreezeFiles)
 * Override: FMEA_GUARD_OVERRIDE=APPROVED-BY-USER (config과 동일)
 */
import { execSync } from 'node:child_process';
import {
  hasFlag,
  normalizePath,
  readJsonConfig,
  type GuardConfig,
} from './_shared';

function getStagedFiles(): string[] {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function main(): void {
  const warnOnly = hasFlag('--warn-only');
  const cfg = readJsonConfig() as GuardConfig;
  const overrideEnv = cfg.overrideEnvVar ? process.env[cfg.overrideEnvVar] : undefined;
  if (cfg.overrideEnvVar && cfg.overrideEnvValue && overrideEnv === cfg.overrideEnvValue) {
    process.exit(0);
  }

  const files = cfg.importCodefreezeFiles ?? [];
  if (files.length === 0) {
    process.exit(0);
  }

  const staged = getStagedFiles().map(normalizePath);
  const frozenNorm = files.map(normalizePath);
  const hits = staged.filter((p) => frozenNorm.includes(p));

  if (hits.length === 0) {
    process.exit(0);
  }

  const envHint =
    cfg.overrideEnvVar && cfg.overrideEnvValue
      ? `\nOverride (ONLY with user written approval): set ${cfg.overrideEnvVar}=${cfg.overrideEnvValue}`
      : '';

  // eslint-disable-next-line no-console
  console.error(
    [
      '',
      '[FMEA GUARD] Import CODEFREEZE file(s) staged — commit blocked.',
      'Files:',
      ...hits.map((h) => `- ${h}`),
      envHint,
      '',
    ].join('\n'),
  );
  process.exit(warnOnly ? 0 : 1);
}

main();
