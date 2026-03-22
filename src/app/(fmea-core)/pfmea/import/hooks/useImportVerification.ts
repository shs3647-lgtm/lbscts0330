/**
 * @file useImportVerification.ts
 * @description Import 검증 테이블 FK/pgsql저장/API적합 상태 관리 훅
 * @created 2026-03-22
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import type { ImportedFlatData } from '../types';
import {
  verifyFK,
  mapCountsToPgsql,
  mapApiToVerification,
  type FKVerifyResult,
  type PgsqlVerifyResult,
  type ApiVerifyResult,
} from '../utils/import-verification-columns';

interface UseImportVerificationReturn {
  fkData: Record<string, FKVerifyResult>;
  pgsqlData: Record<string, PgsqlVerifyResult> | null;
  apiData: Record<string, ApiVerifyResult> | null;
  isVerifyingPgsql: boolean;
  isVerifyingApi: boolean;
  runPgsqlVerify: () => Promise<void>;
  runApiVerify: () => Promise<void>;
  runFullVerify: () => Promise<void>;
}

export function useImportVerification(
  fmeaId: string | undefined,
  flatData: ImportedFlatData[],
  uuidCounts: Record<string, number>
): UseImportVerificationReturn {
  // FK: client-side, computed from flatData (always available)
  const fkData = useMemo(() => verifyFK(flatData), [flatData]);

  // pgsql: fetched from verify-counts API after save
  const [pgsqlData, setPgsqlData] = useState<Record<string, PgsqlVerifyResult> | null>(null);
  const [isVerifyingPgsql, setIsVerifyingPgsql] = useState(false);

  // API: fetched from GET /api/fmea after save
  const [apiData, setApiData] = useState<Record<string, ApiVerifyResult> | null>(null);
  const [isVerifyingApi, setIsVerifyingApi] = useState(false);

  const runPgsqlVerify = useCallback(async () => {
    if (!fmeaId) return;
    setIsVerifyingPgsql(true);
    try {
      const res = await fetch(`/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}`);
      if (!res.ok) throw new Error('verify-counts API error');
      const data = await res.json();
      if (data.success && data.counts) {
        setPgsqlData(mapCountsToPgsql(data.counts, uuidCounts));
      }
    } catch (e) {
      console.error('[useImportVerification] pgsql verify error:', e);
    } finally {
      setIsVerifyingPgsql(false);
    }
  }, [fmeaId, uuidCounts]);

  const runApiVerify = useCallback(async () => {
    if (!fmeaId) return;
    setIsVerifyingApi(true);
    try {
      const res = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
      if (!res.ok) throw new Error('atomic API error');
      const data = await res.json();
      if (data) {
        setApiData(mapApiToVerification(data, uuidCounts));
      }
    } catch (e) {
      console.error('[useImportVerification] API verify error:', e);
    } finally {
      setIsVerifyingApi(false);
    }
  }, [fmeaId, uuidCounts]);

  const runFullVerify = useCallback(async () => {
    await runPgsqlVerify();
    await runApiVerify();
  }, [runPgsqlVerify, runApiVerify]);

  return {
    fkData,
    pgsqlData,
    apiData,
    isVerifyingPgsql,
    isVerifyingApi,
    runPgsqlVerify,
    runApiVerify,
    runFullVerify,
  };
}
