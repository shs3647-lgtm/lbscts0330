/**
 * batch-utils.ts — createMany 청크 분할 유틸리티
 * 대용량 Import 시 PostgreSQL statement 크기 초과 방지 (500건 단위)
 */

type CreateManyModel<T> = {
  createMany: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
};

/**
 * createMany를 chunkSize 단위로 분할 실행
 * 동일 $transaction 내부에서 호출 — 원자성 유지
 */
export async function batchCreateMany<T extends Record<string, unknown>>(
  model: CreateManyModel<T>,
  data: T[],
  chunkSize = 500,
): Promise<number> {
  if (data.length === 0) return 0;
  if (data.length <= chunkSize) {
    const result = await model.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  let total = 0;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const result = await model.createMany({ data: chunk, skipDuplicates: true });
    total += result.count;
  }
  return total;
}
