import { readFileSync } from 'node:fs';
import { getProtectedHits, normalizePath, readJsonConfig } from './_shared';

function main(): void {
  const msgFile = process.argv[2];
  if (!msgFile) process.exit(0);

  const cfg = readJsonConfig();
  const hits = getProtectedHits('staged', cfg);

  if (hits.length === 0) process.exit(0);

  const token = cfg.approvalToken ?? 'APPROVED-BY-USER';
  const msg = readFileSync(msgFile, 'utf8');
  if (msg.includes(token)) process.exit(0);

  const out = [
    '',
    '[FMEA GUARD] Protected (codefreeze) files are staged.',
    `This commit is BLOCKED unless the commit message contains: ${token}`,
    'Staged protected files:',
    ...hits.map((p) => `- ${normalizePath(p)}`),
    '',
  ].join('\n');

  // eslint-disable-next-line no-console
  console.error(out);
  process.exit(1);
}

main();



