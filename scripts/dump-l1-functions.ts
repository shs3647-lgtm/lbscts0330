/**
 * 프로젝트 스키마 L1Function 덤프 (문서 Import 샘플 명칭 정비 — Step B-1)
 * 사용: dotenv -- npx tsx scripts/dump-l1-functions.ts [fmeaId]
 */
import { getBaseDatabaseUrl, getPrismaForSchema } from '../src/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '../src/lib/project-schema';

async function main(): Promise<void> {
  const fmeaId = process.argv[2] || 'pfm26-m002';
  const base = getBaseDatabaseUrl();
  if (!base) {
    console.error('[dump-l1-functions] DATABASE_URL 없음');
    process.exit(1);
  }
  const schema = getProjectSchemaName(fmeaId);
  await ensureProjectSchemaReady({ baseDatabaseUrl: base, schema });
  const p = getPrismaForSchema(schema);
  if (!p) {
    console.error('[dump-l1-functions] Prisma 실패');
    process.exit(1);
  }

  const rows = await p.l1Function.findMany({
    where: { fmeaId },
    orderBy: [{ category: 'asc' }, { functionName: 'asc' }],
    select: { id: true, category: true, functionName: true, requirement: true },
  });

  console.log(JSON.stringify({ fmeaId, schema, count: rows.length, rows }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
