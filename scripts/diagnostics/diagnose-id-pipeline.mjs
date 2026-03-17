import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db',
});

async function diagnose() {
  console.log('=== FMEA ID 파이프라인 진단 ===\n');

  // 1. fmea_projects
  const { rows: projects } = await pool.query(`
    SELECT "fmeaId", "fmeaType", status
    FROM fmea_projects
    WHERE "fmeaType" IN ('P','F','M') AND "deletedAt" IS NULL
    ORDER BY "createdAt" DESC LIMIT 20
  `);
  console.log('1. fmea_projects (최근 20개):');
  for (const p of projects) {
    const hasUpper = p.fmeaId !== p.fmeaId.toLowerCase();
    console.log(' ', p.fmeaId, p.fmeaType, p.status, hasUpper ? '⚠️ UPPERCASE' : '✓');
  }

  // 2. fmea_registrations
  console.log('\n2. fmea_registrations (partName/subject):');
  const { rows: regs } = await pool.query(`
    SELECT "fmeaId", "partName", subject, "fmeaProjectName"
    FROM fmea_registrations
    ORDER BY "createdAt" DESC LIMIT 20
  `);
  for (const r of regs) {
    const hasUpper = r.fmeaId !== r.fmeaId.toLowerCase();
    console.log(' ', r.fmeaId, hasUpper ? '⚠️ UPPER' : '✓',
      '| partName:', JSON.stringify(r.partName || ''),
      '| subject:', JSON.stringify((r.subject || '').substring(0, 60)),
      '| projName:', JSON.stringify((r.fmeaProjectName || '').substring(0, 40)));
  }

  // 3. fmea_legacy_data
  console.log('\n3. fmea_legacy_data (public schema):');
  const { rows: legacies } = await pool.query(`
    SELECT "fmeaId", data->'l1'->>'name' as l1_name,
           jsonb_array_length(COALESCE(data->'l2', '[]'::jsonb)) as l2_count,
           "updatedAt"
    FROM fmea_legacy_data
    ORDER BY "updatedAt" DESC LIMIT 20
  `);
  for (const l of legacies) {
    const hasUpper = l.fmeaId !== l.fmeaId.toLowerCase();
    console.log(' ', l.fmeaId, hasUpper ? '⚠️ UPPER' : '✓',
      '| l1.name:', JSON.stringify((l.l1_name || '(empty)').substring(0, 40)),
      '| l2:', l.l2_count);
  }

  // 3b. Check project schemas
  console.log('\n3b. fmea_legacy_data (project schemas):');
  const { rows: schemas } = await pool.query(`
    SELECT schema_name FROM information_schema.schemata
    WHERE schema_name LIKE 'fmea_%'
    ORDER BY schema_name
  `);
  for (const s of schemas) {
    try {
      const { rows } = await pool.query(`
        SELECT "fmeaId", data->'l1'->>'name' as l1_name,
               jsonb_array_length(COALESCE(data->'l2', '[]'::jsonb)) as l2_count
        FROM "${s.schema_name}".fmea_legacy_data
        ORDER BY "updatedAt" DESC LIMIT 5
      `);
      for (const l of rows) {
        const hasUpper = l.fmeaId !== l.fmeaId.toLowerCase();
        console.log(' ', `[${s.schema_name}]`, l.fmeaId, hasUpper ? '⚠️ UPPER' : '✓',
          '| l1.name:', JSON.stringify((l.l1_name || '(empty)').substring(0, 40)),
          '| l2:', l.l2_count);
      }
    } catch {
      // schema might not have the table
    }
  }

  // 4. Cross-check
  console.log('\n4. 크로스체크 (3테이블 ID 일치성):');
  const projectIds = new Set(projects.map(p => p.fmeaId.toLowerCase()));
  const regIds = new Set(regs.map(r => r.fmeaId.toLowerCase()));
  const legacyIds = new Set(legacies.map(l => l.fmeaId.toLowerCase()));

  for (const pid of projectIds) {
    const inReg = regIds.has(pid);
    const inLeg = legacyIds.has(pid);
    if (!inReg || !inLeg) {
      console.log('  ⚠️', pid,
        !inReg ? '| Registration 없음' : '',
        !inLeg ? '| LegacyData 없음' : '');
    }
  }

  // 5. 정확 케이스 비교
  console.log('\n5. 정확 케이스 비교 (3테이블):');
  const projMap = new Map(projects.map(p => [p.fmeaId.toLowerCase(), p.fmeaId]));
  const regMap = new Map(regs.map(r => [r.fmeaId.toLowerCase(), r.fmeaId]));
  const legMap = new Map(legacies.map(l => [l.fmeaId.toLowerCase(), l.fmeaId]));

  let mismatchCount = 0;
  for (const [key, projId] of projMap) {
    const regId = regMap.get(key);
    const legId = legMap.get(key);
    const allSame = (!regId || projId === regId) && (!legId || projId === legId);
    if (!allSame) {
      console.log('  ❌ MISMATCH:', key,
        '| Project:', projId,
        '| Reg:', regId || '(없음)',
        '| Legacy:', legId || '(없음)');
      mismatchCount++;
    }
  }
  if (mismatchCount === 0) console.log('  ✅ 케이스 불일치 없음');

  // 6. partName vs l1.name 비교
  console.log('\n6. partName vs l1.name 비교:');
  for (const [key] of projMap) {
    const reg = regs.find(r => r.fmeaId.toLowerCase() === key);
    const leg = legacies.find(l => l.fmeaId.toLowerCase() === key);
    if (reg && leg) {
      const partName = (reg.partName || '').trim();
      const l1Name = (leg.l1_name || '').trim();
      if (partName && l1Name && partName !== l1Name) {
        console.log('  ⚠️', key,
          '| partName:', JSON.stringify(partName),
          '| l1.name:', JSON.stringify(l1Name));
      } else if (!partName && !l1Name) {
        console.log('  ⚠️', key, '| 둘 다 비어있음');
      } else if (!l1Name || l1Name.includes('입력')) {
        console.log('  ⚠️', key,
          '| l1.name 비어있음/플레이스홀더 | partName:', JSON.stringify(partName));
      }
    }
  }

  // 7. 워크시트 로드 시뮬레이션
  console.log('\n7. 워크시트 로드 시뮬레이션:');
  for (const p of projects.slice(0, 5)) {
    const fmeaId = p.fmeaId.toLowerCase();
    const schemaName = `fmea_${fmeaId.replace(/[^a-z0-9]/g, '_')}`;
    let legacyFound = false;
    let legacySource = '';

    try {
      const { rows } = await pool.query(
        `SELECT "fmeaId" FROM "${schemaName}".fmea_legacy_data WHERE "fmeaId" = $1`,
        [fmeaId]
      );
      if (rows.length > 0) {
        legacyFound = true;
        legacySource = schemaName;
      }
    } catch {
      // schema doesn't exist
    }

    if (!legacyFound) {
      const { rows } = await pool.query(
        `SELECT "fmeaId" FROM fmea_legacy_data WHERE "fmeaId" = $1`,
        [fmeaId]
      );
      if (rows.length > 0) {
        legacyFound = true;
        legacySource = 'public';
      }
    }

    console.log(' ', fmeaId,
      legacyFound ? `✅ found in ${legacySource}` : '❌ NOT FOUND',
      '| DB ID:', p.fmeaId);
  }

  console.log('\n=== 진단 완료 ===');
  await pool.end();
}

diagnose().catch(e => { console.error(e); process.exit(1); });
