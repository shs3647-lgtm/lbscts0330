/**
 * @file useDbVerification.ts
 * @description Import 통계검증 — DB 저장 건수 조회 + 파싱 UUID 비교
 * 파이프라인 검증: Excel→Parse(UUID)→DB 정합성 확인
 * @created 2026-03-14
 */

import { useState, useCallback } from 'react';
import type { ImportedFlatData } from '../types';
import { loadDatasetByFmeaId } from '../utils/master-api';

/** itemCode별 DB 카운트 */
export interface DbItemCount {
  itemCode: string;
  dbCount: number;
}

export interface DbVerificationResult {
  counts: Record<string, number>;  // itemCode → DB count
  totalDbItems: number;
  loadedAt: Date;
}

export interface UseDbVerificationReturn {
  /** DB 검증 결과 (null = 아직 조회 안함) */
  dbResult: DbVerificationResult | null;
  /** DB 검증 로딩 중 */
  dbLoading: boolean;
  /** DB 검증 실행 */
  verifyDb: (fmeaId: string) => Promise<void>;
  /** flatData에서 UUID 카운트 계산 */
  getUuidCounts: (flatData: ImportedFlatData[]) => Record<string, number>;
}

/**
 * DB 검증 훅 — 저장된 master dataset에서 itemCode별 카운트를 조회하여
 * 파싱 결과(UUID)와 비교할 수 있게 함
 */
export function useDbVerification(): UseDbVerificationReturn {
  const [dbResult, setDbResult] = useState<DbVerificationResult | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  const verifyDb = useCallback(async (fmeaId: string) => {
    if (!fmeaId) return;
    setDbLoading(true);
    try {
      const dataset = await loadDatasetByFmeaId(fmeaId);
      const counts: Record<string, number> = {};
      let total = 0;
      for (const item of dataset.flatData) {
        const code = item.itemCode;
        if (!code) continue;
        counts[code] = (counts[code] || 0) + 1;
        total++;
      }
      setDbResult({ counts, totalDbItems: total, loadedAt: new Date() });
    } catch (err) {
      console.error('[useDbVerification] DB 조회 실패:', err);
      setDbResult({ counts: {}, totalDbItems: 0, loadedAt: new Date() });
    } finally {
      setDbLoading(false);
    }
  }, []);

  const getUuidCounts = useCallback((flatData: ImportedFlatData[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const item of flatData) {
      if (!item.itemCode || !item.id) continue;
      // 값이 있는 항목만 카운트 (빈 값은 DB 저장 시 필터됨)
      if (!item.value?.trim()) continue;
      counts[item.itemCode] = (counts[item.itemCode] || 0) + 1;
    }
    return counts;
  }, []);

  return { dbResult, dbLoading, verifyDb, getUuidCounts };
}
