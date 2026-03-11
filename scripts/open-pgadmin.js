/**
 * pgAdmin 또는 DB 클라이언트 도구 연결 정보 안내
 */
const { exec } = require('child_process');

console.log('='.repeat(80));
console.log('=== PostgreSQL DB 연결 정보 ===');
console.log('='.repeat(80));
console.log('');
console.log('📊 DB 연결 정보:');
console.log('');
console.log('  Host:     localhost');
console.log('  Port:     5432');
console.log('  Database: fmea_db');
console.log('  Username: postgres');
console.log('  Password: postgres');
console.log('');
console.log('🔗 연결 문자열:');
console.log('  postgresql://postgres:postgres@localhost:5432/fmea_db');
console.log('');
console.log('📁 주요 스키마:');
console.log('  1. public');
console.log('  2. pfmea_pfm26_m001 (FMEA 데이터)');
console.log('  3. new_fmea');
console.log('');
console.log('='.repeat(80));
console.log('=== DB 클라이언트 도구 연결 방법 ===');
console.log('='.repeat(80));
console.log('');
console.log('1. pgAdmin 4:');
console.log('   - 서버 추가 → 위 정보 입력');
console.log('');
console.log('2. DBeaver:');
console.log('   - 새 연결 → PostgreSQL → 위 정보 입력');
console.log('');
console.log('3. TablePlus:');
console.log('   - 새 연결 → PostgreSQL → 위 정보 입력');
console.log('');
console.log('4. DataGrip:');
console.log('   - Data Source → PostgreSQL → 위 정보 입력');
console.log('');
console.log('5. VS Code 확장:');
console.log('   - "PostgreSQL" 확장 설치 후 위 정보로 연결');
console.log('');
console.log('='.repeat(80));
console.log('');
console.log('💡 명령줄에서 확인:');
console.log('   $env:PGPASSWORD="postgres"; psql -h localhost -p 5432 -U postgres -d fmea_db');
console.log('');
console.log('💡 스크립트로 확인:');
console.log('   node scripts/show-full-db.js');
console.log('');











