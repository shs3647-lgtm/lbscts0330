/**
 * @file revision-r00-rename.test.ts
 * @description 개정번호 ID 관리 — 원본 -r00 리네임 로직 단위 테스트
 *
 * 검증 항목:
 * 1. renameFmeaId: 올바른 SQL 실행 순서 (FK 제거 → UPDATE → FK 재생성)
 * 2. renameFmeaId: 잘못된 파라미터 거부
 * 3. generateNewFmeaId 로직: isFirstRevision 판별
 * 4. 개정 ID 패턴 정합성 (base-r00, base-r01, ...)
 *
 * @created 2026-02-20
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renameFmeaId } from '@/app/api/fmea/revision-clone/renameFmeaId';

describe('renameFmeaId 유틸리티', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tx: any;

  beforeEach(() => {
    tx = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    };
  });

  // ═══════════════════════════════════════════════════════
  // TEST 1: 정상 실행 — SQL 호출 순서 검증
  // ═══════════════════════════════════════════════════════
  it('FK 제거 → UPDATE → FK 재생성 순서로 SQL 실행', async () => {
    await renameFmeaId(tx, 'pfm26-p004-l05', 'pfm26-p004-l05-r00');

    const calls = tx.$executeRawUnsafe.mock.calls;

    // Step 1: FK 제약 제거 (3개)
    expect(calls[0][0]).toContain('DROP CONSTRAINT IF EXISTS');
    expect(calls[0][0]).toContain('fmea_registrations');
    expect(calls[1][0]).toContain('DROP CONSTRAINT IF EXISTS');
    expect(calls[1][0]).toContain('fmea_cft_members');
    expect(calls[2][0]).toContain('DROP CONSTRAINT IF EXISTS');
    expect(calls[2][0]).toContain('fmea_worksheet_data');

    // Step 2: fmea_projects UPDATE (메인)
    expect(calls[3][0]).toContain('UPDATE fmea_projects');
    expect(calls[3][1]).toBe('pfm26-p004-l05-r00'); // newId
    expect(calls[3][2]).toBe('pfm26-p004-l05'); // oldId

    // Step 3: FK 자식 테이블 UPDATE (3개)
    expect(calls[4][0]).toContain('UPDATE "fmea_registrations"');
    expect(calls[5][0]).toContain('UPDATE "fmea_cft_members"');
    expect(calls[6][0]).toContain('UPDATE "fmea_worksheet_data"');

    // Step 4: plain String 테이블들 UPDATE
    const updateCalls = calls.filter((c: string[]) => c[0].startsWith('UPDATE'));
    expect(updateCalls.length).toBeGreaterThan(10); // 최소 10개 이상 테이블

    // Step 마지막: FK 재생성 (3개, ON UPDATE CASCADE 포함)
    const lastThree = calls.slice(-3);
    expect(lastThree[0][0]).toContain('ADD CONSTRAINT');
    expect(lastThree[0][0]).toContain('ON UPDATE CASCADE');
    expect(lastThree[1][0]).toContain('ADD CONSTRAINT');
    expect(lastThree[2][0]).toContain('ADD CONSTRAINT');
  });

  // ═══════════════════════════════════════════════════════
  // TEST 2: 잘못된 파라미터 거부
  // ═══════════════════════════════════════════════════════
  it('oldId === newId이면 에러', async () => {
    await expect(renameFmeaId(tx, 'abc', 'abc')).rejects.toThrow('invalid params');
  });

  it('빈 oldId이면 에러', async () => {
    await expect(renameFmeaId(tx, '', 'new-id')).rejects.toThrow('invalid params');
  });

  it('빈 newId이면 에러', async () => {
    await expect(renameFmeaId(tx, 'old-id', '')).rejects.toThrow('invalid params');
  });

  // ═══════════════════════════════════════════════════════
  // TEST 3: 교차 참조 필드 업데이트 확인
  // ═══════════════════════════════════════════════════════
  it('parentFmeaId, pfmeaId, linkedPfmeaNo 교차 참조도 업데이트', async () => {
    await renameFmeaId(tx, 'pfm26-p004-l05', 'pfm26-p004-l05-r00');

    const allSql = tx.$executeRawUnsafe.mock.calls.map((c: string[]) => c[0]);

    // parentFmeaId
    expect(allSql.some((s: string) => s.includes('"parentFmeaId"') && s.includes('UPDATE fmea_projects'))).toBe(true);

    // pfmeaId in project_linkages
    expect(allSql.some((s: string) => s.includes('"pfmeaId"') && s.includes('project_linkages'))).toBe(true);

    // linkedPfmeaNo
    expect(allSql.some((s: string) => s.includes('"linkedPfmeaNo"'))).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // TEST 4: 테이블이 없어도 에러 없이 진행
  // ═══════════════════════════════════════════════════════
  it('일부 테이블 UPDATE 실패해도 계속 진행', async () => {
    let callCount = 0;
    tx.$executeRawUnsafe = vi.fn().mockImplementation((sql: string) => {
      callCount++;
      // 특정 테이블에서 에러 발생 시뮬레이션
      if (sql.includes('ep_devices') || sql.includes('lessons_learned')) {
        throw new Error('relation does not exist');
      }
      return Promise.resolve(1);
    });

    // 에러 없이 완료되어야 함
    await expect(renameFmeaId(tx, 'old-id', 'new-id')).resolves.not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════
// 개정 ID 생성 로직 테스트 (순수 함수 추출)
// ═══════════════════════════════════════════════════════

describe('개정 ID 패턴 정합성', () => {
  /**
   * generateNewFmeaId 내부 로직 추출:
   * - base ID 추출 (기존 -rNN 접미사 제거)
   * - isFirstRevision 판별
   */
  function parseBaseId(sourceFmeaId: string): { baseId: string; hasRevisionSuffix: boolean } {
    const baseMatch = sourceFmeaId.match(/^(.+)-r(\d+)$/);
    return {
      baseId: baseMatch ? baseMatch[1] : sourceFmeaId,
      hasRevisionSuffix: !!baseMatch,
    };
  }

  function determineIsFirstRevision(maxRev: number, hasRevisionSuffix: boolean): boolean {
    return maxRev === 0 && !hasRevisionSuffix;
  }

  function buildNextRevisionId(baseId: string, maxRev: number): string {
    const nextRev = (maxRev + 1).toString().padStart(2, '0');
    return `${baseId}-r${nextRev}`;
  }

  it('원본(접미사 없음)에서 첫 개정 → isFirstRevision=true', () => {
    const { baseId, hasRevisionSuffix } = parseBaseId('pfm26-p004-l05');
    expect(baseId).toBe('pfm26-p004-l05');
    expect(hasRevisionSuffix).toBe(false);
    expect(determineIsFirstRevision(0, hasRevisionSuffix)).toBe(true);
  });

  it('-r00에서 다음 개정 → isFirstRevision=false', () => {
    const { baseId, hasRevisionSuffix } = parseBaseId('pfm26-p004-l05-r00');
    expect(baseId).toBe('pfm26-p004-l05');
    expect(hasRevisionSuffix).toBe(true);
    expect(determineIsFirstRevision(0, hasRevisionSuffix)).toBe(false);
  });

  it('-r01에서 다음 개정 → isFirstRevision=false', () => {
    const { baseId, hasRevisionSuffix } = parseBaseId('pfm26-p004-l05-r01');
    expect(baseId).toBe('pfm26-p004-l05');
    expect(hasRevisionSuffix).toBe(true);
    expect(determineIsFirstRevision(1, hasRevisionSuffix)).toBe(false);
  });

  it('첫 개정: maxRev=0 → nextRev=r01', () => {
    expect(buildNextRevisionId('pfm26-p004-l05', 0)).toBe('pfm26-p004-l05-r01');
  });

  it('두번째 개정: maxRev=1 → nextRev=r02', () => {
    expect(buildNextRevisionId('pfm26-p004-l05', 1)).toBe('pfm26-p004-l05-r02');
  });

  it('기존 r00+r01 있을 때: maxRev=1 → nextRev=r02', () => {
    // r00은 원본 리네임, r01은 첫 개정 → 다음은 r02
    expect(buildNextRevisionId('pfm26-p004-l05', 1)).toBe('pfm26-p004-l05-r02');
  });

  it('DFMEA ID도 동일 패턴', () => {
    const { baseId, hasRevisionSuffix } = parseBaseId('dfm26-p001-l01');
    expect(baseId).toBe('dfm26-p001-l01');
    expect(hasRevisionSuffix).toBe(false);
    expect(buildNextRevisionId('dfm26-p001-l01', 0)).toBe('dfm26-p001-l01-r01');
  });

  it('Solo ID (-s 접미사) 처리', () => {
    const { baseId, hasRevisionSuffix } = parseBaseId('pfm26-p005-s');
    expect(baseId).toBe('pfm26-p005-s');
    expect(hasRevisionSuffix).toBe(false);
    expect(buildNextRevisionId('pfm26-p005-s', 0)).toBe('pfm26-p005-s-r01');
  });
});
