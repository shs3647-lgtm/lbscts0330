/**
 * 백업 데이터 정리 스크립트 (Node.js)
 * 사용법: node scripts/cleanup-backups.js [--days=30] [--keep=10] [--max-size=10GB] [--dry-run]
 * 
 * 옵션:
 *   --days=N      : N일 이상 된 백업 삭제 (기본: 30일)
 *   --keep=N      : 최신 N개만 유지, 나머지 삭제 (기본: 무제한)
 *   --max-size=   : 총 백업 크기가 지정된 크기 초과 시 오래된 것부터 삭제 (예: 10GB, 1GB)
 *   --dry-run     : 실제 삭제하지 않고 삭제 대상만 표시
 * 
 * 예시:
 *   node scripts/cleanup-backups.js --days=30
 *   node scripts/cleanup-backups.js --keep=10
 *   node scripts/cleanup-backups.js --max-size=10GB --dry-run
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'db');

// 명령행 인자 파싱
const args = process.argv.slice(2);
const options = {
  days: null,
  keep: null,
  maxSize: null,
  dryRun: false,
};

args.forEach(arg => {
  if (arg.startsWith('--days=')) {
    options.days = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--keep=')) {
    options.keep = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--max-size=')) {
    options.maxSize = arg.split('=')[1];
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  }
});

// 크기 단위 변환 (GB, MB → bytes)
function parseSize(sizeStr) {
  if (!sizeStr) return null;
  
  const match = sizeStr.match(/^(\d+\.?\d*)\s*(GB|MB|KB|B)$/i);
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'GB': return value * 1024 * 1024 * 1024;
    case 'MB': return value * 1024 * 1024;
    case 'KB': return value * 1024;
    case 'B': return value;
    default: return null;
  }
}

// 파일 정보 수집
function getBackupFiles() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql') || f.endsWith('.json'))
    .map(f => {
      const filePath = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(filePath);
      
      return {
        name: f,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
        age: Date.now() - stats.mtime.getTime(),
      };
    })
    .sort((a, b) => b.mtime - a.mtime); // 최신순 정렬
  
  return files;
}

// 일수 기준 삭제 대상 필터링
function filterByDays(files, days) {
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  return files.filter(f => f.mtime.getTime() < cutoffTime);
}

// 개수 기준 삭제 대상 필터링 (최신 N개 제외)
function filterByKeep(files, keep) {
  if (files.length <= keep) return [];
  return files.slice(keep); // 최신 N개 제외한 나머지
}

// 크기 기준 삭제 대상 필터링
function filterByMaxSize(files, maxSizeBytes) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  
  if (totalSize <= maxSizeBytes) return [];
  
  // 오래된 파일부터 삭제 (역순 정렬)
  const filesToDelete = [];
  let currentSize = totalSize;
  
  for (let i = files.length - 1; i >= 0; i--) {
    if (currentSize <= maxSizeBytes) break;
    
    filesToDelete.push(files[i]);
    currentSize -= files[i].size;
  }
  
  return filesToDelete;
}

// 파일 삭제
function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`  ❌ 삭제 실패: ${error.message}`);
    return false;
  }
}

// 메인 실행
function main() {
  console.log('\n=== 백업 데이터 정리 시작 ===\n');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`❌ 백업 디렉토리가 없습니다: ${BACKUP_DIR}`);
    return;
  }
  
  const files = getBackupFiles();
  
  if (files.length === 0) {
    console.log('✅ 삭제할 백업 파일이 없습니다.');
    return;
  }
  
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  
  console.log(`현재 백업 파일: ${files.length}개 (${totalSizeMB} MB)\n`);
  
  // 삭제 대상 수집
  let filesToDelete = new Set();
  
  // 1. 일수 기준
  if (options.days !== null) {
    const byDays = filterByDays(files, options.days);
    byDays.forEach(f => filesToDelete.add(f.path));
    console.log(`📅 ${options.days}일 이상 된 백업: ${byDays.length}개`);
  }
  
  // 2. 개수 기준
  if (options.keep !== null) {
    const byKeep = filterByKeep(files, options.keep);
    byKeep.forEach(f => filesToDelete.add(f.path));
    console.log(`📦 최신 ${options.keep}개 제외한 백업: ${byKeep.length}개`);
  }
  
  // 3. 크기 기준
  if (options.maxSize) {
    const maxSizeBytes = parseSize(options.maxSize);
    if (maxSizeBytes) {
      const bySize = filterByMaxSize(files, maxSizeBytes);
      bySize.forEach(f => filesToDelete.add(f.path));
      const maxSizeMB = (maxSizeBytes / 1024 / 1024).toFixed(2);
      console.log(`💾 ${maxSizeMB}MB 초과 시 삭제 대상: ${bySize.length}개`);
    } else {
      console.warn(`⚠️  잘못된 크기 형식: ${options.maxSize}`);
    }
  }
  
  const filesToDeleteArray = Array.from(filesToDelete).map(path => 
    files.find(f => f.path === path)
  ).filter(Boolean);
  
  if (filesToDeleteArray.length === 0) {
    console.log('\n✅ 삭제할 백업 파일이 없습니다.');
    return;
  }
  
  const deleteSize = filesToDeleteArray.reduce((sum, f) => sum + f.size, 0);
  const deleteSizeMB = (deleteSize / 1024 / 1024).toFixed(2);
  
  console.log(`\n삭제 대상: ${filesToDeleteArray.length}개 (${deleteSizeMB} MB)\n`);
  
  if (options.dryRun) {
    console.log('🔍 [DRY RUN] 실제 삭제하지 않습니다.\n');
    filesToDeleteArray.forEach(f => {
      const ageDays = Math.floor(f.age / (24 * 60 * 60 * 1000));
      console.log(`  - ${f.name} (${f.size / 1024 / 1024} MB, ${ageDays}일 전)`);
    });
    console.log('\n✅ [DRY RUN] 완료 (실제 삭제되지 않음)');
    return;
  }
  
  // 실제 삭제
  console.log('삭제 시작...\n');
  let deletedCount = 0;
  let deletedSize = 0;
  
  filesToDeleteArray.forEach(f => {
    const ageDays = Math.floor(f.age / (24 * 60 * 60 * 1000));
    console.log(`  삭제: ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB, ${ageDays}일 전)`);
    
    if (deleteFile(f.path)) {
      deletedCount++;
      deletedSize += f.size;
    }
  });
  
  // 백업 로그 정리 (삭제된 파일 참조 제거)
  const logFile = path.join(BACKUP_DIR, 'backup.log');
  if (fs.existsSync(logFile)) {
    try {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => {
        const fileInLine = filesToDeleteArray.find(f => line.includes(f.name));
        return !fileInLine; // 삭제된 파일이 포함된 줄 제거
      });
      fs.writeFileSync(logFile, logLines.join('\n'), 'utf8');
      console.log(`\n  ✅ 백업 로그 정리 완료`);
    } catch (e) {
      console.warn(`  ⚠️  백업 로그 정리 실패: ${e.message}`);
    }
  }
  
  const deletedSizeMB = (deletedSize / 1024 / 1024).toFixed(2);
  const remainingCount = files.length - deletedCount;
  const remainingSize = totalSize - deletedSize;
  const remainingSizeMB = (remainingSize / 1024 / 1024).toFixed(2);
  
  console.log(`\n✅ 정리 완료!`);
  console.log(`삭제: ${deletedCount}개 (${deletedSizeMB} MB)`);
  console.log(`남은 백업: ${remainingCount}개 (${remainingSizeMB} MB)`);
}

main();










