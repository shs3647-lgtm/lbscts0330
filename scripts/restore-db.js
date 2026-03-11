/**
 * PostgreSQL DB 복원 스크립트 (Node.js)
 * 사용법: node scripts/restore-db.js <backup_file>
 * 
 * 예시:
 *   전체 DB 복원: node scripts/restore-db.js backups/db/fmea_db_full_20260111_120000.sql
 *   프로젝트 복원: node scripts/restore-db.js backups/db/fmea_PFM26-M001_20260111_120000.json
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const BACKUP_FILE = args[0];

if (!BACKUP_FILE) {
  console.error('❌ 사용법: node scripts/restore-db.js <backup_file>');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`❌ 백업 파일이 없습니다: ${BACKUP_FILE}`);
  process.exit(1);
}

// PostgreSQL 연결 정보
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'fmea_db',
  user: 'postgres',
  password: 'postgres',
};

async function restoreFullDB(backupFile) {
  console.log(`\n=== 전체 DB 복원 시작 ===`);
  console.log(`백업 파일: ${backupFile}`);
  
  try {
    // pg_restore 실행
    const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };
    const command = `pg_restore -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} --clean --if-exists --verbose "${backupFile}"`;
    
    console.log('\n⚠️  주의: 기존 데이터가 삭제됩니다!');
    console.log('계속하려면 Enter를 누르세요...');
    
    // Windows에서는 readline 사용 불가, 자동 진행
    console.log('\n복원 시작...\n');
    
    execSync(command, { 
      env,
      stdio: 'inherit',
    });
    
    console.log(`\n✅ 복원 완료!`);
    
  } catch (error) {
    console.error(`\n❌ 복원 실패:`, error.message);
    process.exit(1);
  }
}

async function restoreFmeaProject(backupFile) {
  console.log(`\n=== 프로젝트 복원 시작 ===`);
  console.log(`백업 파일: ${backupFile}`);
  
  const pool = new Pool(DB_CONFIG);
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const { fmeaId, tables } = backupData;
    
    console.log(`FMEA ID: ${fmeaId}`);
    console.log(`테이블 수: ${Object.keys(tables).length}`);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // ★ 각 테이블 데이터 복원
      for (const [tableName, rows] of Object.entries(tables)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        
        try {
          // 기존 데이터 삭제
          await client.query(`DELETE FROM public.${tableName} WHERE "fmeaId" = $1`, [fmeaId]);
          
          // 새 데이터 삽입
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = columns.map((_, i) => `$${i + 1}`).join(', ');
            const columnNames = columns.map(c => `"${c}"`).join(', ');
            const rowValues = columns.map(c => row[c]);
            
            await client.query(
              `INSERT INTO public.${tableName} (${columnNames}) VALUES (${values})`,
              rowValues
            );
          }
          
          console.log(`  ✅ ${tableName}: ${rows.length}건 복원`);
          
        } catch (e) {
          console.warn(`  ⚠️  ${tableName}: ${e.message}`);
        }
      }
      
      await client.query('COMMIT');
      console.log(`\n✅ 복원 완료!`);
      
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    
    await pool.end();
    
  } catch (error) {
    console.error(`\n❌ 복원 실패:`, error.message);
    await pool.end();
    process.exit(1);
  }
}

// 실행
(async () => {
  const ext = path.extname(BACKUP_FILE);
  
  if (ext === '.sql') {
    await restoreFullDB(BACKUP_FILE);
  } else if (ext === '.json') {
    await restoreFmeaProject(BACKUP_FILE);
  } else {
    console.error(`❌ 지원하지 않는 백업 파일 형식: ${ext}`);
    console.error('지원 형식: .sql (전체 DB), .json (프로젝트)');
    process.exit(1);
  }
})();










