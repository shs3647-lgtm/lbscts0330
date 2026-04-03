/**
 * pfm26-m002 L1Function 완제품기능 재작성 (docs/Import 샘플 명칭 정비 … Step B-2)
 * 동일 id 유지 → FailureEffect.l1FuncId 무결성 유지
 *
 * 실행: npx tsx --require dotenv/config scripts/migrate-pfm26-m002-l1-functions.ts
 * 검증: npx tsx --require dotenv/config scripts/dump-l1-functions.ts pfm26-m002
 */
import { getBaseDatabaseUrl, getPrismaForSchema } from '../src/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '../src/lib/project-schema';

const FMEA_ID = 'pfm26-m002';

const FN_YP_HEIGHT =
  'Au Bump 높이 및 형상이 공정 수율 기준을 충족한다\nEnsure Au Bump height and geometry meet process yield spec';
const FN_YP_FILM =
  'UBM·PR 막두께가 공정 규격을 충족한다\nEnsure UBM and PR film thickness meet process spec';
const FN_YP_RESIDUE =
  '공정 후 표면 청정도가 잔류물 기준을 충족한다\nEnsure post-process surface cleanliness meets residue spec';
const FN_YP_WAFER =
  'Wafer 표면 청정도가 공정 파티클 기준을 만족한다\nEnsure wafer surface cleanliness meets particle spec';
const FN_SP_DELIVERY =
  '고객 납품 품질이 외관·파티클 기준을 만족한다\nEnsure delivery quality meets visual and particle criteria';
const FN_SP_MATERIAL =
  '고객 소재·포장 규격을 만족한다\nEnsure material and packaging meet customer spec';

async function main(): Promise<void> {
  const base = getBaseDatabaseUrl();
  if (!base) {
    console.error('[migrate-l1] DATABASE_URL 없음');
    process.exit(1);
  }
  const schema = getProjectSchemaName(FMEA_ID);
  await ensureProjectSchemaReady({ baseDatabaseUrl: base, schema });
  const p = getPrismaForSchema(schema);
  if (!p) {
    console.error('[migrate-l1] Prisma 실패');
    process.exit(1);
  }

  await p.$transaction(async (tx) => {
    // YP — 높이·CD (기존 R2, R6)
    await tx.l1Function.update({
      where: { id: 'L1-R2-C2' },
      data: { functionName: FN_YP_HEIGHT },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R6-C2' },
      data: { functionName: FN_YP_HEIGHT },
    });

    // YP — UBM·PR (R5, R7)
    await tx.l1Function.update({
      where: { id: 'L1-R5-C2' },
      data: { functionName: FN_YP_FILM },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R7-C2' },
      data: { functionName: FN_YP_FILM },
    });

    // YP — 잔류물 (R8, R9)
    await tx.l1Function.update({
      where: { id: 'L1-R8-C2' },
      data: { functionName: FN_YP_RESIDUE },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R9-C2' },
      data: { functionName: FN_YP_RESIDUE },
    });

    // YP — 파티클·외관 (R3 유지 명칭 정렬, R4 동일 기능명)
    await tx.l1Function.update({
      where: { id: 'L1-R3-C2' },
      data: { functionName: FN_YP_WAFER },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R4-C2' },
      data: { functionName: FN_YP_WAFER },
    });

    // SP — 납품 품질 (R10, R11, R114) 고객 외관·파티클·출하 높이
    await tx.l1Function.update({
      where: { id: 'L1-R10-C2' },
      data: { category: 'SP', functionName: FN_SP_DELIVERY },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R11-C2' },
      data: { category: 'SP', functionName: FN_SP_DELIVERY },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R114-C2' },
      data: { functionName: FN_SP_DELIVERY },
    });

    // SP — 소재·포장 (R12, R13, R14)
    await tx.l1Function.update({
      where: { id: 'L1-R12-C2' },
      data: { category: 'SP', functionName: FN_SP_MATERIAL },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R13-C2' },
      data: { category: 'SP', functionName: FN_SP_MATERIAL },
    });
    await tx.l1Function.update({
      where: { id: 'L1-R14-C2' },
      data: { category: 'SP', functionName: FN_SP_MATERIAL },
    });

    // R15, R185 — 문서 변경 대상 아님 (RoHS/USER 유지)

    // C4 고장영향 scope: L1Function이 SP로 바뀐 행에 매달린 FE category 정합
    const spL1Ids = [
      'L1-R10-C2',
      'L1-R11-C2',
      'L1-R114-C2',
      'L1-R12-C2',
      'L1-R13-C2',
      'L1-R14-C2',
    ];
    await tx.failureEffect.updateMany({
      where: { fmeaId: FMEA_ID, l1FuncId: { in: spL1Ids } },
      data: { category: 'SP' },
    });
  });

  const after = await p.l1Function.findMany({
    where: { fmeaId: FMEA_ID },
    orderBy: [{ category: 'asc' }, { functionName: 'asc' }, { id: 'asc' }],
    select: { id: true, category: true, functionName: true, requirement: true },
  });
  console.log(JSON.stringify({ ok: true, count: after.length, rows: after }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
