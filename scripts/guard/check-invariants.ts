/**
 * @file check-invariants.ts
 * @description FMEA 파이프라인 불변 규칙 자동 검증 스크립트
 *
 * ═══════════════════════════════════════════════════════════════
 * 실행 방법:
 *   npx tsx scripts/guard/check-invariants.ts
 *   npm run guard:invariants
 *
 * 사용처:
 *   1. Git pre-commit hook (자동)
 *   2. CI/CD 파이프라인 (자동)
 *   3. 수동 검증 (개발자)
 *
 * 검증 항목:
 *   ✓ distribute() 함수 사용 금지
 *   ✓ 랜덤 UUID (uid/uuidv4/nanoid) 사용 금지
 *   ✓ 레거시 파서 참조 금지
 *   ✓ 삭제된 파일 재생성 감지
 *   ✓ tsc 컴파일 오류 검사
 * ═══════════════════════════════════════════════════════════════
 *
 * @created 2026-03-25
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

// ─── 설정 ───

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');

/** 검사 대상 확장자 */
const TARGET_EXTENSIONS = ['.ts', '.tsx'];

/** 검사 제외 경로 (테스트, 설정파일) */
const EXCLUDE_PATTERNS = [
  '__tests__', 'test', 'spec', 'node_modules', '.next', '.git',
  'invariants.ts', // 자기 자신 제외
];

/** 모드: --warn-only이면 경고만, 아니면 exit 1 */
const WARN_ONLY = process.argv.includes('--warn-only');

// ─── 금지 패턴 ───

interface BannedPattern {
  name: string;
  pattern: RegExp;
  message: string;
  /** 검사 범위 (src 기준 상대경로 prefix) */
  scope?: string;
}

const BANNED_PATTERNS: BannedPattern[] = [
  {
    name: 'NO_DISTRIBUTE',
    pattern: /(?<!\/\/.*)\bdistribute\s*\(/gm,
    message: 'distribute() 함수 사용 금지 (카테시안 복제 원인)',
    scope: 'lib/fmea/',  // lib/fmea/ 만 검사 (lib/fmea-core/ 제외)
  },
  {
    name: 'NO_RANDOM_UUID',
    pattern: /(?<!\/\/.*)\b(uid|uuidv4|nanoid)\s*\(\)/gm,
    message: '랜덤 UUID 생성 금지 — buildCellId() 사용',
    scope: 'lib/fmea/',  // Import 파이프라인만 검사 (워크시트 편집 UI 제외)
  },
  {
    name: 'NO_LEGACY_buildWorksheetState',
    pattern: /(?<!\/\/.*)\bbuildWorksheetState\b/gm,
    message: 'buildWorksheetState 사용 금지 — position-parser 사용',
    // scope 없음: 전체 프로젝트에서 검사
  },
  {
    name: 'NO_LEGACY_failureChainInjector',
    pattern: /(?<!\/\/.*)\bfailureChainInjector\b/gm,
    message: 'failureChainInjector 사용 금지 — position-parser 사용',
  },
  {
    name: 'NO_LEGACY_buildAtomicFromFlat',
    pattern: /(?<!\/\/.*)\bbuildAtomicFromFlat\b/gm,
    message: 'buildAtomicFromFlat 사용 금지 — position-parser 사용',
  },
];

/** 삭제된 레거시 파일 — 재생성되면 차단 */
const DELETED_FILES = [
  'src/app/(fmea-core)/pfmea/import/utils/buildWorksheetState.ts',
  'src/app/(fmea-core)/pfmea/import/utils/failureChainInjector.ts',
  'src/app/(fmea-core)/pfmea/import/utils/buildAtomicFromFlat.ts',
  'src/app/(fmea-core)/pfmea/import/utils/fm-gap-feedback.ts',
  'src/app/(fmea-core)/pfmea/import/utils/supplementFlatDataFromChains.ts',
];

// ─── 파일 수집 ───

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (EXCLUDE_PATTERNS.some(p => fullPath.includes(p))) continue;
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...collectFiles(fullPath));
      } else if (TARGET_EXTENSIONS.includes(extname(entry))) {
        files.push(fullPath);
      }
    }
  } catch {
    // 디렉토리 접근 오류 무시
  }
  return files;
}

// ─── 검사 실행 ───

interface Violation {
  file: string;
  line: number;
  rule: string;
  message: string;
  content: string;
}

function checkBannedPatterns(): Violation[] {
  const violations: Violation[] = [];
  const files = collectFiles(SRC);

  for (const file of files) {
    const relPath = relative(ROOT, file).replace(/\\/g, '/');
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (const banned of BANNED_PATTERNS) {
      // scope 필터: 지정된 scope가 있으면 해당 경로만 검사
      if (banned.scope && !relPath.includes(banned.scope)) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 주석 라인 스킵
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
        // 문자열 내부 참조 스킵 (에러 메시지에 포함된 경우)
        if (line.includes("'") && line.match(/['"`].*?(distribute|buildWorksheetState|failureChainInjector|buildAtomicFromFlat).*?['"`]/)) continue;

        banned.pattern.lastIndex = 0;
        if (banned.pattern.test(line)) {
          violations.push({
            file: relPath,
            line: i + 1,
            rule: banned.name,
            message: banned.message,
            content: line.trim().substring(0, 80),
          });
        }
      }
    }
  }

  return violations;
}

function checkDeletedFiles(): Violation[] {
  const violations: Violation[] = [];
  for (const file of DELETED_FILES) {
    const fullPath = join(ROOT, file);
    if (existsSync(fullPath)) {
      violations.push({
        file,
        line: 0,
        rule: 'DELETED_FILE_RECREATED',
        message: `삭제된 레거시 파일이 다시 생성됨 — 즉시 삭제 필요`,
        content: '',
      });
    }
  }
  return violations;
}

function checkTsc(): { pass: boolean; errorCount: number } {
  try {
    execSync('npx tsc --noEmit --pretty false 2>&1', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 60000,
    });
    return { pass: true, errorCount: 0 };
  } catch (e: unknown) {
    const output = (e as { stdout?: string }).stdout || '';
    const errors = output.split('\n').filter(l => l.includes('error TS'));
    return { pass: false, errorCount: errors.length };
  }
}

// ─── 메인 ───

function main(): void {
  console.log('═══════════════════════════════════════════');
  console.log('  FMEA 파이프라인 불변 규칙 검증');
  console.log('═══════════════════════════════════════════\n');

  let totalViolations = 0;

  // 1. 금지 패턴 검사
  console.log('[1] 금지 패턴 검사...');
  const patternViolations = checkBannedPatterns();
  if (patternViolations.length > 0) {
    console.log(`  ❌ ${patternViolations.length}건 위반:`);
    for (const v of patternViolations) {
      console.log(`    ${v.file}:${v.line} [${v.rule}] ${v.message}`);
      if (v.content) console.log(`      → ${v.content}`);
    }
  } else {
    console.log('  ✅ 0건');
  }
  totalViolations += patternViolations.length;

  // 2. 삭제된 파일 재생성 감지
  console.log('\n[2] 삭제된 레거시 파일 감지...');
  const deletedViolations = checkDeletedFiles();
  if (deletedViolations.length > 0) {
    console.log(`  ❌ ${deletedViolations.length}건 재생성됨:`);
    for (const v of deletedViolations) {
      console.log(`    ${v.file} — ${v.message}`);
    }
  } else {
    console.log('  ✅ 0건');
  }
  totalViolations += deletedViolations.length;

  // 3. TypeScript 컴파일
  console.log('\n[3] TypeScript 컴파일...');
  const tsc = checkTsc();
  if (tsc.pass) {
    console.log('  ✅ 0건');
  } else {
    console.log(`  ❌ ${tsc.errorCount}건 오류`);
    totalViolations += tsc.errorCount;
  }

  // 결과
  console.log('\n═══════════════════════════════════════════');
  if (totalViolations === 0) {
    console.log('  ✅ 불변 규칙 검증 ALL PASS');
  } else {
    console.log(`  ❌ ${totalViolations}건 위반 발견`);
    if (!WARN_ONLY) {
      console.log('  → 커밋 차단됨. 위반 사항을 수정하세요.');
      process.exit(1);
    } else {
      console.log('  → 경고 모드: 커밋은 허용되지만 수정이 필요합니다.');
    }
  }
  console.log('═══════════════════════════════════════════\n');
}

main();
