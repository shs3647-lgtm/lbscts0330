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
  runSelfImprovementLoop: (resaveFn?: () => Promise<boolean>) => Promise<{ pass: boolean; loops: number }>;
}

export function useImportVerification(
  fmeaId: string | undefined,
  flatData: ImportedFlatData[],
  uuidCounts: Record<string, number>
): UseImportVerificationReturn {
  const fkData = useMemo(() => verifyFK(flatData), [flatData]);

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
        const result = mapCountsToPgsql(data.counts, uuidCounts);
        setPgsqlData(result);
        return result;
      }
    } catch (e) {
      console.error('[useImportVerification] pgsql verify error:', e);
    }
    return null;
  }, [fmeaId, uuidCounts]);

  // ── API 검증 (내부용: 결과 반환) ──
  const _verifyApi = useCallback(async (): Promise<Record<string, ApiVerifyResult> | null> => {
    if (!fmeaId) return null;
    try {
      const res = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic&t=${Date.now()}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data) {
        const result = mapApiToVerification(data, uuidCounts);
        setApiData(result);
        return result;
      }
    } catch (e) {
      console.error('[useImportVerification] API verify error:', e);
    }
    return null;
  }, [fmeaId, uuidCounts]);

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

  // ★★★ 자가개선루프 ★★★
  const runSelfImprovementLoop = useCallback(async (
    resaveFn?: () => Promise<boolean>
  ): Promise<{ pass: boolean; loops: number }> => {
    loopLogRef.current = [];
    setLoopLog([]);
    setLoopCount(0);

    for (let loop = 1; loop <= MAX_LOOP; loop++) {
      setLoopCount(loop);
      addLog(`── Loop ${loop}/${MAX_LOOP} 시작 ──`);

      // 1. 검증
      setIsVerifyingPgsql(true);
      setIsVerifyingApi(true);
      addLog('pgsql 검증 중...');
      const pgResult = await _verifyPgsql();
      addLog('API 검증 중...');
      const apiResult = await _verifyApi();
      setIsVerifyingPgsql(false);
      setIsVerifyingApi(false);

      if (!pgResult || !apiResult) {
        addLog('⚠️ 검증 API 응답 없음 — 재시도');
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      // 2. 판정
      const pgPass = isPgsqlPass(pgResult);
      const apiPass = isApiPass(apiResult);
      const mismatch = getMismatchCodes(pgResult);

      if (pgPass && apiPass) {
        addLog(`✅ Loop ${loop}: ALL PASS — pgsql ✓, API ✓`);
        return { pass: true, loops: loop };
      }

      // 3. 불일치 진단
      addLog(`❌ Loop ${loop}: pgsql ${pgPass ? '✓' : '✗'}, API ${apiPass ? '✓' : '✗'}`);
      if (mismatch.length > 0) {
        addLog(`   불일치 코드: ${mismatch.join(', ')}`);
      }

      // 4. 자가 개선: force=true 재저장
      if (loop < MAX_LOOP && resaveFn) {
        addLog(`🔄 자동 재저장 (force=true)...`);
        const saved = await resaveFn();
        if (!saved) {
          addLog('⚠️ 재저장 실패 — 루프 중단');
          break;
        }
        addLog('재저장 완료 — 2초 대기 후 재검증');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    addLog(`⛔ ${MAX_LOOP}회 루프 완료 — 자동 개선 한계 도달`);
    return { pass: false, loops: MAX_LOOP };
  }, [_verifyPgsql, _verifyApi]);

  return {
    fkData, pgsqlData, apiData,
    isVerifyingPgsql, isVerifyingApi,
    loopCount, loopLog,
    runPgsqlVerify, runApiVerify, runFullVerify,
    runSelfImprovementLoop,
  };
}
