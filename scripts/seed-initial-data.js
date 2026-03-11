/**
 * @file seed-initial-data.js
 * @description 초기 데이터 시드 — 관리자 계정 + SOD 평가기준 + 고객사
 *
 * 사용법: DATABASE_URL="postgresql://..." node scripts/seed-initial-data.js
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl });

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function seedUsers() {
  console.log('\n1. 사용자 생성...');

  const users = [
    { name: '관리자', email: 'admin@fmea.local', phone: '010-0000-0000', factory: 'AMP', department: '품질관리', position: '관리자', role: 'admin' },
    { name: '김품질', email: 'kim@amp.co.kr', phone: '010-1111-1111', factory: 'AMP', department: '품질관리', position: '과장', role: 'editor' },
    { name: '이설계', email: 'lee@amp.co.kr', phone: '010-2222-2222', factory: 'AMP', department: '설계팀', position: '대리', role: 'editor' },
    { name: '박공정', email: 'park@amp.co.kr', phone: '010-3333-3333', factory: 'AMP', department: '생산기술', position: '팀장', role: 'editor' },
  ];

  for (const u of users) {
    const phoneDigits = u.phone.replace(/[^0-9]/g, '');
    const passwordHash = sha256(phoneDigits);

    await pool.query(`
      INSERT INTO users (id, name, email, phone, factory, department, position, role,
                         password, "isActive",
                         "permPfmea", "permDfmea", "permCp", "permPfd",
                         "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true,
              'write', 'write', 'write', 'write',
              NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, [u.name, u.email, u.phone, u.factory, u.department, u.position, u.role, passwordHash]);

    console.log(`  + ${u.name} (${u.email}) pw: ${phoneDigits}`);
  }
  console.log('  * admin@fmea.local / admin (hardcoded fallback)');
}

async function seedCustomers() {
  console.log('\n2. 고객사 생성...');

  const customers = [
    { name: '현대자동차', code: 'HMC' },
    { name: '기아자동차', code: 'KIA' },
    { name: 'BMW', code: 'BMW' },
    { name: 'Volkswagen', code: 'VW' },
    { name: 'Ford', code: 'FORD' },
    { name: 'GM', code: 'GM' },
    { name: 'Stellantis', code: 'STLA' },
  ];

  for (const [i, c] of customers.entries()) {
    await pool.query(`
      INSERT INTO customers (id, name, code, "sortOrder", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
    `, [c.name, c.code, i + 1]);
    console.log(`  + ${c.name} (${c.code})`);
  }
}

async function seedSodCriteria() {
  console.log('\n3. SOD 평가기준 생성...');

  // columns: id, rating, scope, effect, description, example, isActive, sortOrder, createdAt, updatedAt
  const severities = [
    [10, '안전/법규 (경고없이)', '안전 관련 고장으로 경고 없이 발생', '안전/법규 위반 — 경고 없음', '에어백 미작동'],
    [9,  '안전/법규 (경고있음)', '안전 관련 고장으로 경고와 함께 발생', '안전/법규 위반 — 경고 있음', '브레이크 경고등 점등'],
    [8,  '기능 상실', '차량/아이템 기능 상실 (작동 불가)', '기능 상실', '엔진 시동 불가'],
    [7,  '기능 저하', '차량/아이템 기능 저하 (성능 감소)', '기능 저하', '출력 감소'],
    [6,  '부분 기능 저하', '편의 기능의 부분적 저하', '편의 기능 부분 저하', '에어컨 풍량 감소'],
    [5,  '편의 기능 상실', '편의 기능 상실 (차량은 작동)', '편의 기능 상실', '파워윈도우 불량'],
    [4,  '외관/소음 (대부분 인지)', '대부분의 고객이 인지', '외관/소음 — 대부분 인지', '도어 개폐 소음'],
    [3,  '외관/소음 (일부 인지)', '일부 고객이 인지', '외관/소음 — 일부 인지', '미세 도장 불량'],
    [2,  '외관/소음 (극소수 인지)', '극소수 고객이 인지', '외관/소음 — 극소수 인지', '미세 스크래치'],
    [1,  '영향 없음', '인지할 수 없는 영향', '영향 없음', '무영향'],
  ];

  for (const [rating, scope, effect, desc, example] of severities) {
    await pool.query(`
      INSERT INTO pfmea_severity_criteria (id, rating, scope, effect, description, example, "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $1, NOW(), NOW())
    `, [rating, scope, effect, desc, example]);
  }
  console.log(`  + 심각도(S): ${severities.length}건`);

  // columns: id, rating, probability, ppm, description, prevention, isActive, sortOrder, createdAt, updatedAt
  const occurrences = [
    [10, '매우 높음',   '>=100/1000', '예방관리 없음'],
    [9,  '높음',       '50/1000',    '예방관리 거의 없음'],
    [8,  '높음',       '20/1000',    '예방관리 미흡'],
    [7,  '보통 높음',  '10/1000',    '예방관리 비효과적'],
    [6,  '보통',       '2/1000',     '예방관리 부분 효과'],
    [5,  '보통 낮음',  '0.5/1000',   '예방관리 효과적'],
    [4,  '낮음',       '0.1/1000',   '예방관리 매우 효과적'],
    [3,  '매우 낮음',  '0.01/1000',  '예방관리 고도 효과적'],
    [2,  '극히 낮음',  '<=0.001/1000', '예방관리 거의 완벽'],
    [1,  '거의 없음',  '고장 제거',    '예방관리 완벽'],
  ];

  for (const [rating, probability, ppm, prevention] of occurrences) {
    await pool.query(`
      INSERT INTO pfmea_occurrence_criteria (id, rating, probability, ppm, description, prevention, "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $2, $4, true, $1, NOW(), NOW())
    `, [rating, probability, ppm, prevention]);
  }
  console.log(`  + 발생도(O): ${occurrences.length}건`);

  // columns: id, rating, maturity, description, detection, isActive, sortOrder, createdAt, updatedAt
  const detections = [
    [10, '검출 불가',           '검출관리가 고장모드를 검출할 수 없음',          '검출관리 없음'],
    [9,  '매우 낮은 검출',      '검출 가능성이 매우 낮음',                       '간접 검출만 가능'],
    [8,  '낮은 검출',           '검출 가능성이 낮음',                            '육안 검사'],
    [7,  '매우 낮음',           '검출 가능성이 매우 낮음',                       '이중 육안 검사'],
    [6,  '낮음',                '검출 가능성이 낮음',                            '게이지/측정'],
    [5,  '보통',                '검출 가능성이 보통',                            'SPC + 게이지'],
    [4,  '보통 높음',           '검출 가능성이 보통 높음',                       '자동 검사'],
    [3,  '높음',                '검출 가능성이 높음',                            '자동 검사 + 알람'],
    [2,  '매우 높음',           '검출 가능성이 매우 높음',                       '자동 차단 + 검증'],
    [1,  '거의 확실',           '검출관리가 거의 확실히 검출',                    'Poka-Yoke (방지설계)'],
  ];

  for (const [rating, maturity, desc, detection] of detections) {
    await pool.query(`
      INSERT INTO pfmea_detection_criteria (id, rating, maturity, description, detection, "isActive", "sortOrder", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $1, NOW(), NOW())
    `, [rating, maturity, desc, detection]);
  }
  console.log(`  + 검출도(D): ${detections.length}건`);
}

async function main() {
  console.log('=== 초기 데이터 시드 시작 ===');

  try {
    await seedUsers();
    await seedCustomers();
    await seedSodCriteria();

    console.log('\n=== 완료 ===');
    console.log('\n로그인 정보:');
    console.log('  admin@fmea.local / admin');
    console.log('  kim@amp.co.kr / 01011111111');
    console.log('  lee@amp.co.kr / 01022222222');
    console.log('  park@amp.co.kr / 01033333333');

  } catch (e) {
    console.error('오류:', e.message);
  }

  await pool.end();
}

main();
