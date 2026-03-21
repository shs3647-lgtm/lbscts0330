/**
 * @file optimistic-lock.ts
 * @description Optimistic locking utilities for concurrent edit protection.
 *
 * Prevents lost updates when multiple users edit the same record simultaneously.
 * Each record carries a `version` integer that increments on every write.
 * Before updating, the caller asserts that the record's current version matches
 * what the client last read. If another user wrote in between, the versions
 * diverge and an OptimisticLockError is thrown.
 *
 * Usage pattern:
 * ```typescript
 *   const current = await prisma.l2Structure.findUnique({ where: { id } });
 *   assertVersion(current, expectedVersion, 'L2Structure');
 *   await prisma.l2Structure.update({
 *     where: { id },
 *     data: { ...changes, version: incrementVersion(current.version) },
 *   });
 * ```
 *
 * Or use the all-in-one helper:
 * ```typescript
 *   const result = await withOptimisticLock(
 *     prisma, 'L2Structure', recordId, clientVersion,
 *     async (tx) => {
 *       return tx.l2Structure.update({
 *         where: { id: recordId },
 *         data: { name: 'new name', version: clientVersion + 1 },
 *       });
 *     },
 *   );
 * ```
 */

// ══════════════════════════════════════════════════════
// Error class
// ══════════════════════════════════════════════════════

/**
 * Thrown when a record's current version in the DB does not match the
 * version the caller expected, indicating a concurrent modification.
 */
export class OptimisticLockError extends Error {
  public readonly tableName: string;
  public readonly recordId: string;
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(
    tableName: string,
    recordId: string,
    expectedVersion: number,
    actualVersion: number,
  ) {
    super(
      `Optimistic lock conflict on ${tableName}[${recordId}]: ` +
      `expected v${expectedVersion}, found v${actualVersion}. ` +
      `Another user may have modified this record.`,
    );
    this.name = 'OptimisticLockError';
    this.tableName = tableName;
    this.recordId = recordId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

// ══════════════════════════════════════════════════════
// Core utilities
// ══════════════════════════════════════════════════════

/**
 * Assert that a record's version matches the expected version.
 *
 * @param record   - The record fetched from the DB. Must have `id` and optionally `version`.
 *                   If null, throws a generic error (record not found).
 * @param expectedVersion - The version the client believes the record is at.
 * @param tableName - Table/model name for error messages (e.g. 'L2Structure').
 *
 * @throws {Error} if the record is null (not found)
 * @throws {OptimisticLockError} if versions do not match
 */
export function assertVersion(
  record: { id: string; version?: number } | null,
  expectedVersion: number,
  tableName: string = 'unknown',
): void {
  if (!record) {
    throw new Error(
      `Record not found in ${tableName}. Cannot perform version check.`,
    );
  }

  const actualVersion = record.version ?? 0;

  if (actualVersion !== expectedVersion) {
    throw new OptimisticLockError(
      tableName,
      record.id,
      expectedVersion,
      actualVersion,
    );
  }
}

/**
 * Increment a version number. Simple `+1` with a guard against non-numeric input.
 *
 * @param currentVersion - The current version (defaults to 0 if undefined/null).
 * @returns The next version number.
 */
export function incrementVersion(currentVersion: number): number {
  const v = typeof currentVersion === 'number' && !Number.isNaN(currentVersion)
    ? currentVersion
    : 0;
  return v + 1;
}

// ══════════════════════════════════════════════════════
// Transaction wrapper
// ══════════════════════════════════════════════════════

/**
 * Execute an update inside a Prisma `$transaction`, with an optimistic lock
 * check on the target record's version before proceeding.
 *
 * Flow:
 *   1. Begin transaction
 *   2. Re-read the record (inside tx) to get its latest version
 *   3. Assert version matches `expectedVersion`
 *   4. Execute the caller's `updateFn` (which should set `version: expectedVersion + 1`)
 *   5. Commit
 *
 * If versions diverge, the transaction is rolled back and an
 * `OptimisticLockError` is thrown.
 *
 * @param prisma - Prisma client (project-schema-scoped).
 * @param tableName - The Prisma model name in camelCase (e.g. 'l2Structure').
 *                    Must match `prisma[tableName].findUnique()`.
 * @param recordId - The UUID of the record to lock.
 * @param expectedVersion - The version the caller last read.
 * @param updateFn - An async function receiving the transaction client (`tx`).
 *                   The caller is responsible for setting `version: expectedVersion + 1`
 *                   in their update data.
 * @returns The return value of `updateFn`.
 *
 * @throws {OptimisticLockError} if the record's version has changed
 * @throws {Error} if the record does not exist or the table name is invalid
 *
 * @example
 * ```typescript
 * const updated = await withOptimisticLock(
 *   prisma,
 *   'l2Structure',
 *   'some-uuid',
 *   3, // client last saw version 3
 *   async (tx) => {
 *     return tx.l2Structure.update({
 *       where: { id: 'some-uuid' },
 *       data: { name: 'Updated', version: 4 },
 *     });
 *   },
 * );
 * ```
 */
export async function withOptimisticLock<T>(
  prisma: any,
  tableName: string,
  recordId: string,
  expectedVersion: number,
  updateFn: (tx: any) => Promise<T>,
): Promise<T> {
  const modelDelegate = prisma[tableName];
  if (!modelDelegate || typeof modelDelegate.findUnique !== 'function') {
    throw new Error(
      `Invalid table name "${tableName}". ` +
      `Ensure it matches a Prisma model name (camelCase, e.g. "l2Structure").`,
    );
  }

  return prisma.$transaction(async (tx: any) => {
    // Re-read inside the transaction to get the authoritative version
    const current = await tx[tableName].findUnique({
      where: { id: recordId },
      select: { id: true, version: true },
    });

    assertVersion(current, expectedVersion, tableName);

    return updateFn(tx);
  });
}
