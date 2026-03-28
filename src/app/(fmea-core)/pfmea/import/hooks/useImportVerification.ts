/**
 * @file useImportVerification.ts
 * @description Import 검증 + 자가개선루프 (FK/pgsql/API)
 * @created 2026-03-22
 * @updated 2026-03-25 — 자가개선루프 추가
 *
 * ★ 자가개선루프 (Self-Improvement Loop):
 *   1. 저장 완료 → pgsql/API 검증 실행
 *   2. 불일치 발견 → force=true로 자동 재저장
 *   3. 재검증 실행
 *   4. 최대 3회 반복 후 최종 결과 반환
 */

'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import type { ImportedFlatData } from '../types';
import {
  verifyFK,
  mergeImportExpectedCounts,
  mapCountsToPgsql,
  mapApiToVerification,
  type FKVerifyResult,
  type PgsqlVerifyResult,
  type ApiVerifyResult,
} from '../utils/import-verification-columns';

const MAX_LOOP = 3;

interface UseImportVerificationReturn {
  fkData: Record<string, FKVerifyResult>;
  pgsqlData: Record<string, PgsqlVerifyResult> | null;
  apiData: Record<string, ApiVerifyResult> | null;
  isVerifyingPgsql: boolean;
  isVerifyingApi: boolean;
  loopCount: number;
  loopLog: string[];
  runPgsqlVerify: () => Promise<void>;
  runApiVerify: () => Promise<void>;
  runFullVerify: () => Promise<void>;
  runSelfImprovementLoop: (resaveFn?: () => Promise<boolean>, masterImportFn?: () => Promise<boolean>) => Promise<{ pass: boolean; loops: number; strategy: string }>;
}

export function useImportVerification(
  fmeaId: string | undefined,
  flatData: ImportedFlatData[],
  uuidCounts: Record<string, number>,
  /** 통계표「고유」열 — 있으면 pgsql/API 기대 건수를 DB 엔티티 스케일에 맞춤 */
  uniqueByCode?: Record<string, number>,
  /** 위치기반 파서 stats 기반 — verify-counts와 동일 척도(있으면 기대값 전부 이걸로) */
  verifyScaleExpected?: Record<string, number> | null,
): UseImportVerificationReturn {
  const fkData = useMemo(() => verifyFK(flatData), [flatData]);

  const dbExpectedCounts = useMemo(() => {
    if (verifyScaleExpected && typeof verifyScaleExpected.A1 === 'number') {
      return verifyScaleExpected;
    }
    return mergeImportExpectedCounts(uuidCounts, uniqueByCode);
  }, [verifyScaleExpected, uuidCounts, uniqueByCode]);

  const [pgsqlData, setPgsqlData] = useState<Record<string, PgsqlVerifyResult> | null>(null);
  const [isVerifyingPgsql, setIsVerifyingPgsql] = useState(false);
  const [apiData, setApiData] = useState<Record<string, ApiVerifyResult> | null>(null);
  const [isVerifyingApi, setIsVerifyingApi] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [loopLog, setLoopLog] = useState<string[]>([]);
  const loopLogRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    const entry = `[${ts}] ${msg}`;
    loopLogRef.current = [...loopLogRef.current, entry];
    setLoopLog([...loopLogRef.current]);
    console.log(`[SelfImprove] ${msg}`);
  };

  // ── pgsql 검증 (내부용: 결과 반환) ──
  const _verifyPgsql = useCallback(async (): Promise<Record<string, PgsqlVerifyResult> | null> => {
    if (!fmeaId) return null;
    try {
      const res = await fetch(`/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}&t=${Date.now()}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.counts) {
        const result = mapCountsToPgsql(data.counts, dbExpectedCounts);
        setPgsqlData(result);
        return result;
      }
    } catch (e) {
      console.error('[useImportVerification] pgsql verify error:', e);
    }
    return null;
  }, [fmeaId, dbExpectedCounts]);

  // ── API 검증 (내부용: 결과 반환) ──
  const _verifyApi = useCallback(async (): Promise<Record<string, ApiVerifyResult> | null> => {
    if (!fmeaId) return null;
    try {
      const res = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic&t=${Date.now()}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data) {
        const result = mapApiToVerification(data, dbExpectedCounts);
        setApiData(result);
        return result;
      }
    } catch (e) {
      console.error('[useImportVerification] API verify error:', e);
    }
    return null;
  }, [fmeaId, dbExpectedCounts]);

  // ── Public wrappers ──
  const runPgsqlVerify = useCallback(async () => {
    setIsVerifyingPgsql(true);
    await _verifyPgsql();
    setIsVerifyingPgsql(false);
  }, [_verifyPgsql]);

  const runApiVerify = useCallback(async () => {
    setIsVerifyingApi(true);
    await _verifyApi();
    setIsVerifyingApi(false);
  }, [_verifyApi]);

  const runFullVerify = useCallback(async () => {
    setIsVerifyingPgsql(true);
    setIsVerifyingApi(true);
    await _verifyPgsql();
    await _verifyApi();
    setIsVerifyingPgsql(false);
    setIsVerifyingApi(false);
  }, [_verifyPgsql, _verifyApi]);

  // ── 검증 결과 판정 ──
  const isPgsqlPass = (pg: Record<string, PgsqlVerifyResult>): boolean =>
    Object.values(pg).every(v => v.actual > 0 || v.expected === 0);
  const isApiPass = (api: Record<string, ApiVerifyResult>): boolean =>
    Object.values(api).every(v => v.apiCount > 0 || v.expected === 0);

  const getMismatchCodes = (pg: Record<string, PgsqlVerifyResult>): string[] =>
    Object.entries(pg).filter(([, v]) => v.actual === 0 && v.expected > 0).map(([k]) => k);

  // ★★★ 자가개선루프 3단계 전략 ★★★
  // Loop 1: 검증 only (정상이면 즉시 pass)
  // Loop 2: force=true ReImport → 재검증
  // Loop 3: masterData에서 Import → 재검증
  const runSelfImprovementLoop = useCallback(async (
    resaveFn?: () => Promise<boolean>,
    masterImportFn?: () => Promise<boolean>,
  ): Promise<{ pass: boolean; loops: number; strategy: string }> => {
    loopLogRef.current = [];
    setLoopLog([]);
    setLoopCount(0);

    const strategies = [
      { name: '검증', action: null },
      { name: 'ReImport (force)', action: resaveFn },
      { name: 'MasterData Import', action: masterImportFn || resaveFn },
    ];

    for (let loop = 1; loop <= MAX_LOOP; loop++) {
      const strat = strategies[loop - 1];
      setLoopCount(loop);
      addLog(`── Loop ${loop}/${MAX_LOOP}: ${strat.name} ──`);

      // Loop 2,3: 복구 액션 실행
      if (loop > 1 && strat.action) {
        addLog(`🔄 ${strat.name} 실행 중...`);
        const ok = await strat.action();
        if (!ok) {
          addLog(`⚠️ ${strat.name} 실패 — 다음 루프로`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        addLog(`${strat.name} 완료 — 2초 대기 후 재검증`);
        await new Promise(r => setTimeout(r, 2000));
      }

      // 검증
      setIsVerifyingPgsql(true);
      setIsVerifyingApi(true);
      addLog('pgsql 검증 중...');
      const pgResult = await _verifyPgsql();
      addLog('API 검증 중...');
      const apiResult = await _verifyApi();
      setIsVerifyingPgsql(false);
      setIsVerifyingApi(false);

      if (!pgResult || !apiResult) {
        addLog('⚠️ 검증 API 응답 없음 — 다음 루프');
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // 판정
      const pgPass = isPgsqlPass(pgResult);
      const apiPass = isApiPass(apiResult);
      const mismatch = getMismatchCodes(pgResult);

      if (pgPass && apiPass) {
        addLog(`✅ Loop ${loop} (${strat.name}): ALL PASS — pgsql ✓, API ✓`);
        return { pass: true, loops: loop, strategy: strat.name };
      }

      // 불일치 진단
      addLog(`❌ Loop ${loop}: pgsql ${pgPass ? '✓' : '✗'}, API ${apiPass ? '✓' : '✗'}`);
      if (mismatch.length > 0) {
        addLog(`   불일치: ${mismatch.join(', ')}`);
      }
    }

    addLog(`⛔ 3단계 루프 완료 — 수동 확인 필요`);
    return { pass: false, loops: MAX_LOOP, strategy: 'exhausted' };
  }, [_verifyPgsql, _verifyApi]);

  return {
    fkData, pgsqlData, apiData,
    isVerifyingPgsql, isVerifyingApi,
    loopCount, loopLog,
    runPgsqlVerify, runApiVerify, runFullVerify,
    runSelfImprovementLoop,
  };
}
