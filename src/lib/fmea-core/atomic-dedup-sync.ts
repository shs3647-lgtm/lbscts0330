/**
 * 위치기반 Import 저장 직후 dedupKey 동기화 (createMany + skipDuplicates 보정)
 * @see docs/Import 파이프라인에 dedupKey · UUID · FK · parentId 생성 코드 강제 삽입.md
 *
 * dedup-key.ts 는 읽기 전용 — 여기서 import·호출만 한다.
 */
import type { PositionAtomicData } from '@/types/position-import';
import { ImportSaveIntegrityError } from '@/lib/fmea/errors/import-errors';
import {
  normalize,
  dedupKey_ST_L1,
  dedupKey_ST_L2,
  dedupKey_ST_L3,
  dedupKey_FN_L1,
  dedupKey_FN_L2,
  dedupKey_FN_L3,
  dedupKey_FL_FE,
  dedupKey_FL_FM,
  dedupKey_FL_FC,
} from '@/lib/fmea/utils/dedup-key';

/** Prisma $transaction 콜백 tx — delegate 전용 시그니처 회피 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AtomicDedupTx = any;

/** L2 공정 A4(제품특성) id 조회 — L2Function.dedupKey_FN_L2 의 세 번째 인자용 */
export function buildPpcIdByL2AndCharName(
  pcs: Array<{ id: string; l2StructId: string; name: string }>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const pc of pcs) {
    m.set(`${pc.l2StructId}|${normalize(pc.name)}`, pc.id);
  }
  return m;
}

export function dedupKeyProcessProductChar(l2StructId: string, name: string): string {
  return `${l2StructId}::A4::${normalize(name)}`;
}

export function dedupKeyFailureLink(
  fmId: string,
  feId: string | null | undefined,
  fcId: string | null | undefined,
): string {
  return `${fmId}|${feId ?? '_'}|${fcId ?? '_'}`;
}

export async function syncL1StructureDedupKey(
  tx: AtomicDedupTx,
  fmeaId: string,
  row: { id: string; name: string },
): Promise<void> {
  const dk = dedupKey_ST_L1(fmeaId, row.name);
  await tx.l1Structure.updateMany({ where: { id: row.id, fmeaId }, data: { dedupKey: dk } });
}

export async function syncL2StructureDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l1Id: string; no: string }>,
): Promise<void> {
  for (const s of rows) {
    const dk = dedupKey_ST_L2(s.l1Id, s.no);
    await tx.l2Structure.updateMany({ where: { id: s.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncL3StructureDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l2Id: string; m4?: string | null; name: string }>,
): Promise<void> {
  for (const s of rows) {
    const dk = dedupKey_ST_L3(s.l2Id, s.m4 ?? '', s.name);
    await tx.l3Structure.updateMany({ where: { id: s.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncL1FunctionDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l1StructId: string; category: string; functionName: string }>,
): Promise<void> {
  for (const f of rows) {
    const dk = dedupKey_FN_L1(f.l1StructId, f.category, f.functionName);
    await tx.l1Function.updateMany({ where: { id: f.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncL2FunctionDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l2StructId: string; functionName: string; productChar: string }>,
  ppcByL2Char: Map<string, string>,
): Promise<void> {
  for (const f of rows) {
    const pcId =
      ppcByL2Char.get(`${f.l2StructId}|${normalize(f.productChar)}`) ?? `__NO_PPC__${f.id}`;
    const dk = dedupKey_FN_L2(f.l2StructId, f.functionName, pcId);
    await tx.l2Function.updateMany({ where: { id: f.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncProcessProductCharDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l2StructId: string; name: string }>,
): Promise<void> {
  for (const pc of rows) {
    const dk = dedupKeyProcessProductChar(pc.l2StructId, pc.name);
    await tx.processProductChar.updateMany({ where: { id: pc.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncFailureEffectDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l1FuncId: string; effect: string }>,
): Promise<void> {
  for (const fe of rows) {
    const dk = dedupKey_FL_FE(fe.l1FuncId, fe.effect);
    await tx.failureEffect.updateMany({ where: { id: fe.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncFailureModeDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l2FuncId: string; mode: string }>,
): Promise<void> {
  for (const fm of rows) {
    const dk = dedupKey_FL_FM(fm.l2FuncId, fm.mode);
    await tx.failureMode.updateMany({ where: { id: fm.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncL3FunctionDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l3StructId: string; functionName: string; processChar: string }>,
): Promise<void> {
  for (const f of rows) {
    const dk = dedupKey_FN_L3(f.l3StructId, f.functionName, f.processChar);
    await tx.l3Function.updateMany({ where: { id: f.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncFailureCauseDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; l3FuncId: string; cause: string }>,
): Promise<void> {
  for (const fc of rows) {
    const dk = dedupKey_FL_FC(fc.l3FuncId, fc.cause);
    await tx.failureCause.updateMany({ where: { id: fc.id, fmeaId }, data: { dedupKey: dk } });
  }
}

export async function syncFailureLinkDedupKeys(
  tx: AtomicDedupTx,
  fmeaId: string,
  rows: Array<{ id: string; fmId: string; feId?: string | null; fcId?: string | null }>,
): Promise<void> {
  for (const fl of rows) {
    const dk = dedupKeyFailureLink(fl.fmId, fl.feId, fl.fcId);
    await tx.failureLink.updateMany({ where: { id: fl.id, fmeaId }, data: { dedupKey: dk } });
  }
}

/**
 * 페이로드에 포함된 id들에 대해 dedupKey가 비어 있지 않은지 검사 (동기화 후 호출)
 */
export async function assertPayloadDedupKeysPresent(
  tx: AtomicDedupTx,
  fmeaId: string,
  data: PositionAtomicData,
  validFailureLinks: Array<{ id: string; fmId: string; feId?: string | null; fcId?: string | null }>,
): Promise<void> {
  const check = async (label: string, ids: string[], countFn: () => Promise<number>) => {
    if (ids.length === 0) return;
    const n = await countFn();
    if (n > 0) {
      throw new ImportSaveIntegrityError(`${label}: payload 중 dedupKey 누락 ${n}건`, {
        table: label,
        missingApprox: n,
      });
    }
  };

  await check(
    'l2_structures',
    data.l2Structures.map((s) => s.id),
    () =>
      tx.l2Structure.count({
        where: { fmeaId, id: { in: data.l2Structures.map((s) => s.id) }, dedupKey: null },
      }),
  );

  await check(
    'l3_structures',
    data.l3Structures.map((s) => s.id),
    () =>
      tx.l3Structure.count({
        where: { fmeaId, id: { in: data.l3Structures.map((s) => s.id) }, dedupKey: null },
      }),
  );

  await check(
    'l1_functions',
    data.l1Functions.map((f) => f.id),
    () =>
      tx.l1Function.count({
        where: { fmeaId, id: { in: data.l1Functions.map((f) => f.id) }, dedupKey: null },
      }),
  );

  await check(
    'l2_functions',
    data.l2Functions.map((f) => f.id),
    () =>
      tx.l2Function.count({
        where: { fmeaId, id: { in: data.l2Functions.map((f) => f.id) }, dedupKey: null },
      }),
  );

  await check(
    'process_product_chars',
    data.processProductChars.map((p) => p.id),
    () =>
      tx.processProductChar.count({
        where: { fmeaId, id: { in: data.processProductChars.map((p) => p.id) }, dedupKey: null },
      }),
  );

  await check(
    'failure_effects',
    data.failureEffects.map((fe) => fe.id),
    () =>
      tx.failureEffect.count({
        where: { fmeaId, id: { in: data.failureEffects.map((fe) => fe.id) }, dedupKey: null },
      }),
  );

  await check(
    'failure_modes',
    data.failureModes.map((fm) => fm.id),
    () =>
      tx.failureMode.count({
        where: { fmeaId, id: { in: data.failureModes.map((fm) => fm.id) }, dedupKey: null },
      }),
  );

  if (data.l3Functions.length > 0) {
    await check(
      'l3_functions',
      data.l3Functions.map((f) => f.id),
      () =>
        tx.l3Function.count({
          where: { fmeaId, id: { in: data.l3Functions.map((f) => f.id) }, dedupKey: null },
        }),
    );
  }

  await check(
    'failure_causes',
    data.failureCauses.map((fc) => fc.id),
    () =>
      tx.failureCause.count({
        where: { fmeaId, id: { in: data.failureCauses.map((fc) => fc.id) }, dedupKey: null },
      }),
  );

  const flIds = validFailureLinks.map((fl) => fl.id);
  await check('failure_links', flIds, () =>
    tx.failureLink.count({
      where: { fmeaId, id: { in: flIds }, dedupKey: null },
    }),
  );

  await check('l1_structures', [data.l1Structure.id], () =>
    tx.l1Structure.count({
      where: { fmeaId, id: data.l1Structure.id, dedupKey: null },
    }),
  );
}

/**
 * raw-to-atomic / save-position-import 공통: 페이로드 기준 dedupKey 일괄 동기화
 */
export async function runPositionAtomicDedupSync(
  tx: AtomicDedupTx,
  fmeaId: string,
  data: PositionAtomicData,
  validFailureLinks: Array<{ id: string; fmId: string; feId?: string | null; fcId?: string | null }>,
): Promise<void> {
  await syncL1StructureDedupKey(tx, fmeaId, {
    id: data.l1Structure.id,
    name: data.l1Structure.name,
  });

  if (data.l2Structures.length > 0) {
    await syncL2StructureDedupKeys(tx, fmeaId, data.l2Structures);
  }
  if (data.l3Structures.length > 0) {
    await syncL3StructureDedupKeys(tx, fmeaId, data.l3Structures);
  }
  if (data.l1Functions.length > 0) {
    await syncL1FunctionDedupKeys(tx, fmeaId, data.l1Functions);
  }

  const ppcMap = buildPpcIdByL2AndCharName(data.processProductChars ?? []);
  if (data.l2Functions.length > 0) {
    await syncL2FunctionDedupKeys(tx, fmeaId, data.l2Functions, ppcMap);
  }
  if (data.processProductChars?.length) {
    await syncProcessProductCharDedupKeys(tx, fmeaId, data.processProductChars);
  }
  if (data.failureEffects.length > 0) {
    await syncFailureEffectDedupKeys(tx, fmeaId, data.failureEffects);
  }
  if (data.failureModes.length > 0) {
    await syncFailureModeDedupKeys(tx, fmeaId, data.failureModes);
  }
  if (data.l3Functions.length > 0) {
    await syncL3FunctionDedupKeys(tx, fmeaId, data.l3Functions);
  }
  if (data.failureCauses.length > 0) {
    await syncFailureCauseDedupKeys(tx, fmeaId, data.failureCauses);
  }
  if (validFailureLinks.length > 0) {
    await syncFailureLinkDedupKeys(tx, fmeaId, validFailureLinks);
  }

  await assertPayloadDedupKeysPresent(tx, fmeaId, data, validFailureLinks);
}
