/**
 * 스테이징 정책 (Import 통계「pgsql」·BD flat):
 * - `pfmea_master_datasets` / `pfmea_master_flat_items` → **public** (`getPrisma()`)
 * - `PROJECT_TABLES`(project-schema.ts)에 위 테이블 없음 → 프로젝트 스키마 Prisma로 조회 시 0건·오류
 *
 * Atomic (L2/FM/FL/RA 등) → `getPrismaForSchema(pfmea_{fmeaId})`
 */
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import path from 'path';

describe('verify-counts public staging guard', () => {
  it('uses getPrisma() for master flat counts, not schema-scoped client for dataset query', () => {
    const file = path.join(process.cwd(), 'src/app/api/fmea/verify-counts/route.ts');
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('getPrisma()');
    expect(src).toContain('stagingSource');
    expect(src).toMatch(/toLowerCase\(\)/);
    expect(src).not.toMatch(/getPrismaForSchema\s*\(\s*schemaName\s*\)/);
  });
});

describe('staging vs project schema — spot checks', () => {
  it('parsing-validate loads flat from getPrisma (public), chains from project prisma', () => {
    const file = path.join(process.cwd(), 'src/app/api/fmea/parsing-validate/route.ts');
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('getPrisma()');
    expect(src).toContain('publicPrisma.pfmeaMasterFlatItem');
    expect(src).toContain('getPrismaForSchema(schema)');
  });

  it('pipeline-verify auto-fix reads master flat via publicPrisma', () => {
    const file = path.join(process.cwd(), 'src/app/api/fmea/pipeline-verify/auto-fix.ts');
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('publicPrisma.pfmeaMasterDataset');
    expect(src).toContain('publicPrisma.pfmeaMasterFlatItem');
  });

  it('fmea POST master sync uses public $transaction for pfmeaMaster*', () => {
    const file = path.join(process.cwd(), 'src/app/api/fmea/route.ts');
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('upsertActiveMasterFromWorksheetTx(pubTx, db)');
    expect(src).toContain('publicPrisma.$transaction');
  });
});
