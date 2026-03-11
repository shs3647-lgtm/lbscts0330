import { getArgValue, getProtectedHits, hasFlag, normalizePath, readJsonConfig, type Mode } from './_shared';

function main(): void {
  const modeArg = (getArgValue('--mode') ?? 'staged') as Mode;
  const mode: Mode = modeArg === 'branch' ? 'branch' : 'staged';
  const warnOnly = hasFlag('--warn-only');

  const cfg = readJsonConfig();
  const overrideEnv = cfg.overrideEnvVar ? process.env[cfg.overrideEnvVar] : undefined;
  if (cfg.overrideEnvVar && cfg.overrideEnvValue && overrideEnv === cfg.overrideEnvValue) {
    process.exit(0);
  }

  const protectedHits = getProtectedHits(mode, cfg);

  if (protectedHits.length === 0) {
    process.exit(0);
  }

  const envHint =
    cfg.overrideEnvVar && cfg.overrideEnvValue
      ? `\nOverride (ONLY with user written approval): set ${cfg.overrideEnvVar}=${cfg.overrideEnvValue}`
      : '';

  const msg = [
    '',
    '[FMEA GUARD] Protected paths changed. This is blocked without user approval.',
    `Mode: ${mode}`,
    'Changed protected files:',
    ...protectedHits.map((p) => `- ${normalizePath(p)}`),
    envHint,
    '',
  ].join('\n');

  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(warnOnly ? 0 : 1);
}

main();


