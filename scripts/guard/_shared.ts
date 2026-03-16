import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Mode = 'staged' | 'branch';

export interface GuardConfig {
  protectedPaths?: string[];
  frozenFiles?: string[];
  approvalToken?: string;
  overrideEnvVar?: string;
  overrideEnvValue?: string;
}

/** CLI 플래그 값 반환 (예: --mode staged → 'staged') */
export function getArgValue(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

/** CLI 불리언 플래그 존재 여부 */
export function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

/** 경로 정규화 (백슬래시 → 슬래시) */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/** 설정 파일 읽기 */
export function readJsonConfig(): GuardConfig {
  const cfgPath = join(__dirname, 'protected-paths.config.json');
  const raw = readFileSync(cfgPath, 'utf8');
  return JSON.parse(raw) as GuardConfig;
}

/** glob 패턴 매칭 (**, * 지원) */
function matchGlob(pattern: string, filePath: string): boolean {
  const norm = normalizePath(filePath);
  const pat = normalizePath(pattern);

  // 정확한 파일 경로 매칭
  if (norm === pat) return true;

  // ** 처리
  const regexStr = pat
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 특수문자 이스케이프 (/ 제외)
    .replace(/\\\//g, '/')                  // 슬래시 복원
    .replace(/\*\*/g, '__DOUBLE_STAR__')    // ** 임시 치환
    .replace(/\*/g, '[^/]*')               // * → 단일 세그먼트
    .replace(/__DOUBLE_STAR__\//g, '(?:.+/)?') // **/ → 0개 이상의 경로 세그먼트
    .replace(/__DOUBLE_STAR__/g, '.*');    // ** → 모든 문자

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(norm);
}

/** 변경된 파일 목록 가져오기 */
function getChangedFiles(mode: Mode): string[] {
  try {
    if (mode === 'staged') {
      const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      return out.split('\n').filter(Boolean);
    } else {
      const base = execSync('git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main', { encoding: 'utf8' }).trim();
      const out = execSync(`git diff ${base}...HEAD --name-only`, { encoding: 'utf8' });
      return out.split('\n').filter(Boolean);
    }
  } catch {
    return [];
  }
}

/** 보호 경로에 해당하는 변경 파일 목록 반환 */
export function getProtectedHits(mode: Mode, cfg: GuardConfig): string[] {
  const changed = getChangedFiles(mode);
  const patterns = [...(cfg.protectedPaths ?? []), ...(cfg.frozenFiles ?? [])];

  return changed.filter((file) =>
    patterns.some((pattern) => matchGlob(pattern, file))
  );
}
