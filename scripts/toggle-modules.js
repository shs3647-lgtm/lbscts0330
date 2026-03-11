#!/usr/bin/env node
/**
 * 모듈 활성화/비활성화 토글 스크립트
 *
 * 사용법:
 *   node scripts/toggle-modules.js status          # 현재 상태 확인
 *   node scripts/toggle-modules.js disable dfmea   # DFMEA 비활성화
 *   node scripts/toggle-modules.js disable all     # 비핵심 모듈 전체 비활성화
 *   node scripts/toggle-modules.js enable all      # 전체 활성화 (빌드/배포 전)
 *   node scripts/toggle-modules.js enable dfmea    # DFMEA 활성화
 *
 * 원리: Next.js App Router는 _ 접두사 디렉토리를 라우팅에서 제외.
 *       src/app/(fmea-core)/dfmea → src/app/(fmea-core)/_dfmea
 *
 * ⚠️ Windows: dev 서버와 VSCode를 닫은 후 실행하거나, 관리자 권한 터미널에서 실행
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_DIR = path.join(__dirname, '..', 'src', 'app');

// 비활성화 가능한 모듈 정의
// key: 모듈명, value: { group: route-group, dir: 디렉토리명 }
const MODULES = {
  dfmea:    { group: '(fmea-core)', dir: 'dfmea' },
  'rpn-analysis': { group: '(fmea-core)', dir: 'rpn-analysis' },
  apqp:     { group: '(planning)',   dir: 'apqp' },
  gantt:    { group: '(planning)',   dir: 'gantt' },
  pm:       { group: '(operations)', dir: 'pm' },
  ws:       { group: '(operations)', dir: 'ws' },
};

// API 라우트도 함께 비활성화
const API_MODULES = {
  dfmea:    ['dfmea'],
  apqp:     ['apqp'],
  pm:       ['pm'],
  ws:       ['ws'],
};

function getModulePath(mod) {
  const m = MODULES[mod];
  return path.join(APP_DIR, m.group, m.dir);
}

function getDisabledPath(mod) {
  const m = MODULES[mod];
  return path.join(APP_DIR, m.group, `_${m.dir}`);
}

function getApiPath(apiDir) {
  return path.join(APP_DIR, 'api', apiDir);
}

function getApiDisabledPath(apiDir) {
  return path.join(APP_DIR, 'api', `_${apiDir}`);
}

function isEnabled(mod) {
  return fs.existsSync(getModulePath(mod));
}

function isDisabled(mod) {
  return fs.existsSync(getDisabledPath(mod));
}

function showStatus() {
  console.log('\n📦 모듈 상태:\n');
  let enabledCount = 0;
  let disabledCount = 0;

  for (const [name, info] of Object.entries(MODULES)) {
    const enabled = isEnabled(name);
    const disabled = isDisabled(name);
    const status = enabled ? '✅ 활성' : disabled ? '⛔ 비활성' : '❓ 없음';

    // 파일 수 세기
    let fileCount = 0;
    const checkDir = enabled ? getModulePath(name) : disabled ? getDisabledPath(name) : null;
    if (checkDir) {
      fileCount = countFiles(checkDir);
    }

    console.log(`  ${status}  ${name.padEnd(15)} (${info.group}/${info.dir}) — ${fileCount}개 파일`);
    if (enabled) enabledCount += fileCount;
    if (disabled) disabledCount += fileCount;
  }

  console.log(`\n  활성: ${enabledCount}개 파일 | 비활성: ${disabledCount}개 파일\n`);
}

function countFiles(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countFiles(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        count++;
      }
    }
  } catch { /* ignore */ }
  return count;
}

function disableModule(mod) {
  if (!MODULES[mod]) {
    console.error(`❌ 알 수 없는 모듈: ${mod}`);
    console.log(`   사용 가능: ${Object.keys(MODULES).join(', ')}`);
    return false;
  }

  const src = getModulePath(mod);
  const dst = getDisabledPath(mod);

  if (!fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      console.log(`  ⏭️  ${mod} — 이미 비활성화됨`);
      return true;
    }
    console.error(`  ❌ ${mod} — 디렉토리 없음`);
    return false;
  }

  try {
    fs.renameSync(src, dst);
  } catch (err) {
    // Windows: 다른 프로세스가 잡고 있을 때 cmd.exe로 재시도
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      console.log(`  ⚠️  파일 잠김 → cmd.exe move로 재시도...`);
      try {
        execSync(`cmd.exe /c move /Y "${src.replace(/\//g, '\\')}" "${dst.replace(/\//g, '\\')}"`, { stdio: 'pipe' });
      } catch {
        console.error(`  ❌ ${mod} — 디렉토리 잠김. dev 서버/VSCode를 닫고 재시도하세요.`);
        return false;
      }
    } else {
      throw err;
    }
  }
  console.log(`  ⛔ ${mod} 비활성화 완료 (${MODULES[mod].dir} → _${MODULES[mod].dir})`);

  // API도 비활성화
  const apiDirs = API_MODULES[mod] || [];
  for (const apiDir of apiDirs) {
    const apiSrc = getApiPath(apiDir);
    const apiDst = getApiDisabledPath(apiDir);
    if (fs.existsSync(apiSrc)) {
      try { fs.renameSync(apiSrc, apiDst); }
      catch { try { execSync(`cmd.exe /c move /Y "${apiSrc.replace(/\//g, '\\')}" "${apiDst.replace(/\//g, '\\')}"`, { stdio: 'pipe' }); } catch {} }
      console.log(`  ⛔ api/${apiDir} 비활성화`);
    }
  }

  return true;
}

function enableModule(mod) {
  if (!MODULES[mod]) {
    console.error(`❌ 알 수 없는 모듈: ${mod}`);
    return false;
  }

  const src = getDisabledPath(mod);
  const dst = getModulePath(mod);

  if (!fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      console.log(`  ⏭️  ${mod} — 이미 활성화됨`);
      return true;
    }
    console.error(`  ❌ ${mod} — 디렉토리 없음`);
    return false;
  }

  fs.renameSync(src, dst);
  console.log(`  ✅ ${mod} 활성화 완료`);

  // API도 활성화
  const apiDirs = API_MODULES[mod] || [];
  for (const apiDir of apiDirs) {
    const apiSrc = getApiDisabledPath(apiDir);
    const apiDst = getApiPath(apiDir);
    if (fs.existsSync(apiSrc)) {
      fs.renameSync(apiSrc, apiDst);
      console.log(`  ✅ api/${apiDir} 활성화`);
    }
  }

  return true;
}

// ─── CLI ───

const [,, action, target] = process.argv;

if (!action || action === 'status') {
  showStatus();
  process.exit(0);
}

if (!['enable', 'disable'].includes(action)) {
  console.log(`
사용법:
  node scripts/toggle-modules.js status            현재 상태
  node scripts/toggle-modules.js disable dfmea     DFMEA 비활성화
  node scripts/toggle-modules.js disable all       비핵심 모듈 전체 비활성화
  node scripts/toggle-modules.js enable all        전체 활성화 (빌드 전 필수)
  node scripts/toggle-modules.js enable dfmea      DFMEA 활성화
`);
  process.exit(1);
}

if (!target) {
  console.error('❌ 대상 모듈을 지정하세요 (모듈명 또는 all)');
  process.exit(1);
}

const fn = action === 'disable' ? disableModule : enableModule;

console.log(`\n${action === 'disable' ? '⛔ 비활성화' : '✅ 활성화'} 시작:\n`);

if (target === 'all') {
  for (const mod of Object.keys(MODULES)) {
    fn(mod);
  }
} else {
  fn(target);
}

console.log('\n⚠️  dev 서버를 재시작하세요 (npm run dev)\n');
