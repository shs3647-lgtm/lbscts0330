/**
 * PostgreSQL DB 백업 스크립트 (Node.js)
 * 사용법: node scripts/backup-db.js [FMEA_ID]
 * FMEA_ID가 지정되면 해당 프로젝트만 백업, 없으면 전체 DB 백업
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const FMEA_ID = args[0] || '';
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'db');

// PostgreSQL 연결 정보
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'fmea_db',
  user: 'postgres',
  password: 'postgres',
};

// 타임스탬프 생성
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');

// 백업 디렉토리 생성
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ 백업 디렉토리 생성: ${BACKUP_DIR}`);
}

async function backupFullDB() {
  console.log('\n=== 전체 DB 백업 시작 ===');
  
  const backupFile = path.join(BACKUP_DIR, `fmea_db_full_${timestamp}.sql`);
  console.log(`백업 파일: ${backupFile}`);
  
  try {
    // pg_dump 실행
    const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };
    const command = `pg_dump -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} --format=custom --file="${backupFile}" --verbose`;
    
    execSync(command, { 
      env,
      stdio: 'inherit',
    });
    
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`\n✅ 백업 완료!`);
    console.log(`파일: ${backupFile}`);
    console.log(`크기: ${fileSizeMB} MB`);
    
    // 백업 로그 작성
    const logFile = path.join(BACKUP_DIR, 'backup.log');
    const logEntry = `${timestamp} | ${backupFile} | ${fileSizeMB} MB | FULL\n`;
    fs.appendFileSync(logFile, logEntry);
    
    console.log(`\n✅ 백업 로그: ${logFile}`);
    
    return backupFile;
    
  } catch (error) {
    console.error(`\n❌ 백업 실패:`, error.message);
    process.exit(1);
  }
}

async function backupFmeaProject(fmeaId) {
  console.log(`\n=== ${fmeaId} 프로젝트 백업 시작 ===`);
  
  const pool = new Pool(DB_CONFIG);
  const backupFile = path.join(BACKUP_DIR, `fmea_${fmeaId}_${timestamp}.json`);
  console.log(`백업 파일: ${backupFile}`);
  
  try {
    const backupData = {
      fmeaId,
      timestamp,
      version: '1.0',
      tables: {},
    };
    
    // ★ FMEA 프로젝트 관련 모든 테이블 데이터 추출
    const tables = [
      'fmea_projects',
      'fmea_registrations',
      'fmea_cft_members',
      'fmea_worksheet_data',
      'fmea_confirmed_states',
      'fmea_legacy_data',
      'failure_links',
      'failure_causes',
      'failure_modes',
      'failure_effects',
      'l1_structures',
      'l2_structures',
      'l3_structures',
      'l1_functions',
      'l2_functions',
      'l3_functions',
      'risk_analyses',
      'optimizations',
    ];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM public.${table} WHERE "fmeaId" = $1`, [fmeaId]);
        backupData.tables[table] = result.rows;
        console.log(`  ✅ ${table}: ${result.rows.length}건`);
      } catch (e) {
        // 테이블이 없거나 컬럼이 없을 수 있음
        if (!e.message.includes('does not exist') && !e.message.includes('does not have column')) {
          console.warn(`  ⚠️  ${table}: ${e.message}`);
        }
      }
    }
    
    // JSON 파일로 저장
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`\n✅ 백업 완료!`);
    console.log(`파일: ${backupFile}`);
    console.log(`크기: ${fileSizeMB} MB`);
    
    // 백업 로그 작성
    const logFile = path.join(BACKUP_DIR, 'backup.log');
    const logEntry = `${timestamp} | ${backupFile} | ${fileSizeMB} MB | ${fmeaId}\n`;
    fs.appendFileSync(logFile, logEntry);
    
    console.log(`\n✅ 백업 로그: ${logFile}`);
    
    await pool.end();
    return backupFile;
    
  } catch (error) {
    console.error(`\n❌ 백업 실패:`, error.message);
    await pool.end();
    process.exit(1);
  }
}

// 실행
(async () => {
  if (FMEA_ID) {
    await backupFmeaProject(FMEA_ID);
  } else {
    await backupFullDB();
  }
})();










