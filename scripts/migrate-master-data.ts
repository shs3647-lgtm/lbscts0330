/**
 * @file migrate-master-data.ts
 * @description 마스터 데이터 독립 DB 마이그레이션 스크립트
 *
 * 기존 구조: 1개 active dataset에 모든 FMEA 데이터 혼합 (sourceFmeaId로 구분)
 * 신규 구조: 1 FMEA = 1 Dataset (fmeaId @unique)
 *
 * 실행: npx tsx scripts/migrate-master-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('❌ DATABASE_URL 환경변수가 없습니다'); process.exit(1); }
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migratePfmea() {
  console.log('\n=== PFMEA Master Data 마이그레이션 시작 ===');

  // Step 1: 기존 컬럼 추가 (fmeaId, fmeaType, parentFmeaId, version, inherited, sourceId)
  // Prisma db push가 실패하므로 raw SQL로 컬럼 추가
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE pfmea_master_datasets
      ADD COLUMN IF NOT EXISTS "fmeaId" TEXT,
      ADD COLUMN IF NOT EXISTS "fmeaType" TEXT DEFAULT 'P',
      ADD COLUMN IF NOT EXISTS "parentFmeaId" TEXT,
      ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1
    `);
    console.log('✅ pfmea_master_datasets 컬럼 추가 완료');
  } catch (e: any) {
    console.log('⚠️ pfmea_master_datasets 컬럼 추가 스킵 (이미 존재):', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE pfmea_master_flat_items
      ADD COLUMN IF NOT EXISTS "inherited" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "sourceId" TEXT
    `);
    console.log('✅ pfmea_master_flat_items 컬럼 추가 완료');
  } catch (e: any) {
    console.log('⚠️ pfmea_master_flat_items 컬럼 추가 스킵 (이미 존재):', e.message);
  }

  // Step 2: 기존 데이터 분석
  const existingDatasets = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, "isActive" FROM pfmea_master_datasets`
  );
  console.log(`\n📊 기존 dataset 수: ${existingDatasets.length}`);

  if (existingDatasets.length === 0) {
    console.log('ℹ️ 기존 데이터 없음 - 스킵');
    return;
  }

  // sourceFmeaId별 그룹핑
  const fmeaGroups = await prisma.$queryRawUnsafe<any[]>(`
    SELECT "sourceFmeaId", COUNT(*) as cnt
    FROM pfmea_master_flat_items
    GROUP BY "sourceFmeaId"
    ORDER BY "sourceFmeaId"
  `);
  console.log('📊 sourceFmeaId별 데이터:');
  for (const g of fmeaGroups) {
    console.log(`   ${g.sourceFmeaId || '(null)'}: ${g.cnt}건`);
  }

  // Step 3: 각 sourceFmeaId에 대해 독립 dataset 생성
  const oldDatasetId = existingDatasets[0].id;

  for (const g of fmeaGroups) {
    const fmeaId = g.sourceFmeaId;
    if (!fmeaId) {
      console.log('⚠️ sourceFmeaId=null 데이터 → 고아 데이터 (삭제 대상)');
      continue;
    }

    // FmeaProject에서 타입 정보 가져오기
    const project = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "fmeaId", "fmeaType", "parentFmeaId" FROM fmea_projects WHERE "fmeaId" = $1`,
      fmeaId
    );
    const fmeaType = project[0]?.fmeaType || 'P';
    const parentFmeaId = project[0]?.parentFmeaId || null;

    // 기존 dataset의 fmeaId가 이미 설정되어 있는지 확인
    const existingDs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM pfmea_master_datasets WHERE "fmeaId" = $1`,
      fmeaId
    );

    if (existingDs.length > 0) {
      console.log(`ℹ️ ${fmeaId}: 이미 독립 dataset 존재 → 스킵`);
      continue;
    }

    // 첫 번째 fmeaId는 기존 dataset을 재사용
    const isFirst = fmeaGroups.indexOf(g) === 0 || (fmeaGroups[0].sourceFmeaId === null && fmeaGroups.indexOf(g) === 1);

    if (isFirst && existingDatasets.length > 0) {
      // 기존 dataset에 fmeaId 설정
      await prisma.$executeRawUnsafe(
        `UPDATE pfmea_master_datasets SET "fmeaId" = $1, "fmeaType" = $2, "parentFmeaId" = $3, "isActive" = true WHERE id = $4`,
        fmeaId, fmeaType, parentFmeaId, oldDatasetId
      );
      // 다른 FMEA의 flat items를 새 dataset으로 이동해야 함
      console.log(`✅ ${fmeaId} (${fmeaType}): 기존 dataset 재사용`);
    } else {
      // 새 dataset 생성
      const newDsId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO pfmea_master_datasets (id, name, "fmeaId", "fmeaType", "parentFmeaId", "isActive", version, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())`,
        newDsId, 'MASTER', fmeaId, fmeaType, parentFmeaId
      );
      // flat items 이동
      await prisma.$executeRawUnsafe(
        `UPDATE pfmea_master_flat_items SET "datasetId" = $1 WHERE "sourceFmeaId" = $2 AND "datasetId" = $3`,
        newDsId, fmeaId, oldDatasetId
      );
      console.log(`✅ ${fmeaId} (${fmeaType}): 새 dataset 생성 + 데이터 이동`);
    }
  }

  // Step 4: sourceFmeaId=null 고아 데이터 삭제
  const orphanResult = await prisma.$executeRawUnsafe(
    `DELETE FROM pfmea_master_flat_items WHERE "sourceFmeaId" IS NULL`
  );
  console.log(`🗑️ 고아 데이터(sourceFmeaId=null) 삭제: ${orphanResult}건`);

  // Step 5: fmeaId가 없는 빈 dataset 삭제
  await prisma.$executeRawUnsafe(
    `DELETE FROM pfmea_master_datasets WHERE "fmeaId" IS NULL`
  );

  // Step 6: sourceFmeaId 컬럼 제거 (더 이상 불필요)
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE pfmea_master_flat_items DROP COLUMN IF EXISTS "sourceFmeaId"`
    );
    console.log('✅ sourceFmeaId 컬럼 제거 완료');
  } catch (e: any) {
    console.log('⚠️ sourceFmeaId 컬럼 제거 실패:', e.message);
  }

  // Step 7: fmeaId UNIQUE 제약조건 추가
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE pfmea_master_datasets ADD CONSTRAINT pfmea_master_datasets_fmeaId_key UNIQUE ("fmeaId")`
    );
    console.log('✅ fmeaId UNIQUE 제약조건 추가');
  } catch (e: any) {
    console.log('⚠️ fmeaId UNIQUE 제약조건 스킵 (이미 존재):', e.message);
  }

  // Step 8: NOT NULL 제약조건 추가
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE pfmea_master_datasets ALTER COLUMN "fmeaId" SET NOT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE pfmea_master_datasets ALTER COLUMN "fmeaType" SET NOT NULL`);
    console.log('✅ NOT NULL 제약조건 추가');
  } catch (e: any) {
    console.log('⚠️ NOT NULL 제약조건 스킵:', e.message);
  }

  console.log('\n=== PFMEA 마이그레이션 완료 ===');
}

async function migrateDfmea() {
  console.log('\n=== DFMEA Master Data 마이그레이션 시작 ===');

  // PFMEA와 동일한 패턴
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE dfmea_master_datasets
      ADD COLUMN IF NOT EXISTS "fmeaId" TEXT,
      ADD COLUMN IF NOT EXISTS "fmeaType" TEXT DEFAULT 'P',
      ADD COLUMN IF NOT EXISTS "parentFmeaId" TEXT,
      ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1
    `);
    console.log('✅ dfmea_master_datasets 컬럼 추가 완료');
  } catch (e: any) {
    console.log('⚠️ dfmea_master_datasets 컬럼 추가 스킵:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE dfmea_master_flat_items
      ADD COLUMN IF NOT EXISTS "inherited" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "sourceId" TEXT
    `);
    console.log('✅ dfmea_master_flat_items 컬럼 추가 완료');
  } catch (e: any) {
    console.log('⚠️ dfmea_master_flat_items 컬럼 추가 스킵:', e.message);
  }

  const existingDatasets = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, "isActive" FROM dfmea_master_datasets`
  );
  console.log(`\n📊 기존 DFMEA dataset 수: ${existingDatasets.length}`);

  if (existingDatasets.length === 0) {
    console.log('ℹ️ 기존 데이터 없음 - 스킵');
  } else {
    const fmeaGroups = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "sourceFmeaId", COUNT(*) as cnt
      FROM dfmea_master_flat_items
      GROUP BY "sourceFmeaId"
    `);

    const oldDatasetId = existingDatasets[0].id;

    for (const g of fmeaGroups) {
      const fmeaId = g.sourceFmeaId;
      if (!fmeaId) continue;

      const project = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "fmeaId", "fmeaType", "parentFmeaId" FROM fmea_projects WHERE "fmeaId" = $1`,
        fmeaId
      );
      const fmeaType = project[0]?.fmeaType || 'P';
      const parentFmeaId = project[0]?.parentFmeaId || null;

      const existingDs = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM dfmea_master_datasets WHERE "fmeaId" = $1`,
        fmeaId
      );
      if (existingDs.length > 0) continue;

      const isFirst = fmeaGroups.indexOf(g) === 0 || (fmeaGroups[0].sourceFmeaId === null && fmeaGroups.indexOf(g) === 1);
      if (isFirst) {
        await prisma.$executeRawUnsafe(
          `UPDATE dfmea_master_datasets SET "fmeaId" = $1, "fmeaType" = $2, "parentFmeaId" = $3, "isActive" = true WHERE id = $4`,
          fmeaId, fmeaType, parentFmeaId, oldDatasetId
        );
        console.log(`✅ ${fmeaId} (${fmeaType}): 기존 dataset 재사용`);
      } else {
        const newDsId = crypto.randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO dfmea_master_datasets (id, name, "fmeaId", "fmeaType", "parentFmeaId", "isActive", version, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())`,
          newDsId, 'MASTER', fmeaId, fmeaType, parentFmeaId
        );
        await prisma.$executeRawUnsafe(
          `UPDATE dfmea_master_flat_items SET "datasetId" = $1 WHERE "sourceFmeaId" = $2 AND "datasetId" = $3`,
          newDsId, fmeaId, oldDatasetId
        );
        console.log(`✅ ${fmeaId} (${fmeaType}): 새 dataset 생성 + 데이터 이동`);
      }
    }

    // 고아 데이터 삭제
    await prisma.$executeRawUnsafe(`DELETE FROM dfmea_master_flat_items WHERE "sourceFmeaId" IS NULL`);

    // sourceFmeaId 컬럼 제거
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE dfmea_master_flat_items DROP COLUMN IF EXISTS "sourceFmeaId"`);
    } catch {}

    // 빈 dataset 삭제
    await prisma.$executeRawUnsafe(`DELETE FROM dfmea_master_datasets WHERE "fmeaId" IS NULL`);
  }

  // UNIQUE + NOT NULL 제약조건
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE dfmea_master_datasets ADD CONSTRAINT dfmea_master_datasets_fmeaId_key UNIQUE ("fmeaId")`
    );
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE dfmea_master_datasets ALTER COLUMN "fmeaId" SET NOT NULL`);
    await prisma.$executeRawUnsafe(`ALTER TABLE dfmea_master_datasets ALTER COLUMN "fmeaType" SET NOT NULL`);
  } catch {}

  console.log('\n=== DFMEA 마이그레이션 완료 ===');
}

async function main() {
  console.log('🚀 FMEA Master Data 독립 DB 마이그레이션 시작\n');
  console.log('현재 시각:', new Date().toISOString());

  await migratePfmea();
  await migrateDfmea();

  // 최종 확인
  console.log('\n=== 최종 결과 확인 ===');

  const pfmeaDs = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, "fmeaId", "fmeaType", "parentFmeaId", "isActive" FROM pfmea_master_datasets ORDER BY "fmeaType"`
  );
  console.log(`\nPFMEA Datasets (${pfmeaDs.length}개):`);
  for (const ds of pfmeaDs) {
    const count = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM pfmea_master_flat_items WHERE "datasetId" = $1`, ds.id
    );
    console.log(`  ${ds.fmeaType} | ${ds.fmeaId} | ${ds.name} | active=${ds.isActive} | items=${count[0].cnt}`);
  }

  const dfmeaDs = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, name, "fmeaId", "fmeaType", "parentFmeaId", "isActive" FROM dfmea_master_datasets ORDER BY "fmeaType"`
  );
  console.log(`\nDFMEA Datasets (${dfmeaDs.length}개):`);
  for (const ds of dfmeaDs) {
    const count = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt FROM dfmea_master_flat_items WHERE "datasetId" = $1`, ds.id
    );
    console.log(`  ${ds.fmeaType} | ${ds.fmeaId} | ${ds.name} | active=${ds.isActive} | items=${count[0].cnt}`);
  }

  console.log('\n✅ 마이그레이션 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 마이그레이션 오류:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
