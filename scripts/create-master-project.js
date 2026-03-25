const { Client } = require('pg');

async function createProject() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db'
  });
  await c.connect();

  const fmeaId = 'pfm26-m001';

  // 1. TripletGroup
  console.log('1. TripletGroup 생성...');
  await c.query(`
    INSERT INTO public.triplet_groups (id, year, "typeCode", "pfmeaId", subject, "productName", "syncStatus", version, "createdAt", "updatedAt")
    VALUES ($1, '26', 'm', $2, '12inch AU BUMP Master FMEA', '12inch AU BUMP', 'synced', 1, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `, ['tg26-m001', fmeaId]);
  console.log('  OK: tg26-m001');

  // 2. FmeaProject
  console.log('2. FmeaProject 생성...');
  const { v4: uuidv4 } = require('uuid');
  await c.query(`
    INSERT INTO public.fmea_projects (id, "fmeaId", "fmeaType", "parentFmeaId", "parentFmeaType", status, step, "createdAt", "updatedAt")
    VALUES ($1, $2, 'M', NULL, NULL, 'active', 1, NOW(), NOW())
    ON CONFLICT ("fmeaId") DO NOTHING
  `, [uuidv4(), fmeaId]);
  console.log('  OK:', fmeaId);

  // 3. FmeaRegistration
  console.log('3. FmeaRegistration 생성...');
  await c.query(`
    INSERT INTO public.fmea_registrations (id, "fmeaId", "companyName", "engineeringLocation", "customerName", "modelYear", "subject", "fmeaProjectName", "designResponsibility", "confidentialityLevel", "fmeaResponsibleName", "partName", "partNo", "createdAt", "updatedAt")
    VALUES ($1, $2, 'Samsung Electro-Mechanics', 'Pyeongtaek', 'Samsung Electronics', '2026', '12inch AU BUMP PFMEA', '12inch AU BUMP Master', 'Bumping Engineering', 'Confidential', 'Master Admin', '12inch AU BUMP', 'AUBUMP-001', NOW(), NOW())
    ON CONFLICT ("fmeaId") DO NOTHING
  `, [uuidv4(), fmeaId]);
  console.log('  OK: registration for', fmeaId);

  // 4. Update FamilyMaster with fmeaId (if exists)
  console.log('4. FamilyMaster fmeaId 연결...');
  const fm = await c.query("SELECT id FROM public.family_masters LIMIT 1");
  if (fm.rows.length > 0) {
    await c.query('UPDATE public.family_masters SET "fmeaId" = $1 WHERE id = $2', [fmeaId, fm.rows[0].id]);
    console.log('  OK: FamilyMaster.fmeaId =', fmeaId);
  } else {
    console.log('  SKIP: FamilyMaster 없음');
  }

  // Verify
  console.log('\n=== 확인 ===');
  const fp = await c.query('SELECT "fmeaId", "fmeaType", status FROM public.fmea_projects WHERE "fmeaId" = $1', [fmeaId]);
  console.log('FmeaProject:', fp.rows[0]);
  const fr = await c.query('SELECT "fmeaId", subject FROM public.fmea_registrations WHERE "fmeaId" = $1', [fmeaId]);
  console.log('FmeaRegistration:', fr.rows[0]);

  await c.end();
  console.log('\n✅ 프로젝트 생성 완료 — 이제 Import 가능');
}

createProject().catch(e => console.error('ERROR:', e.message));
