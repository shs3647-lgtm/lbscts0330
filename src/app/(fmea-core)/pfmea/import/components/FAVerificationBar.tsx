/**
 * @file FAVerificationBar.tsx
 * @description FA 파싱 검증 바 — 엑셀 파싱 결과를 기대값과 비교하여 OK/NG 표시
 * ★★★ 2026-02-28: FE/FM/FC 매칭 검증 + 미매칭 항목 표시 추가 ★★★
 * @created 2026-02-26
 *
 * CODEFREEZE — 최고단계 (2026-02-28)
 * 수정 조건: "IMPORT 통계검증 수정해"라고 명시적으로 지시할 때만 수정
 * 포괄적 수정 지시 시 반드시 사용자에게 먼저 확인 요청
 */

'use client';

import { useMemo } from 'react';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ParseStatistics } from '../excel-parser';

interface FAVerificationBarProps {
  chains: MasterFailureChain[];
  parseStatistics?: ParseStatistics;
  flatData?: ImportedFlatData[];
  /** 미매칭 항목 클릭 → 해당 행으로 스크롤 */
  onScrollToItem?: (type: 'FE' | 'FM' | 'FC', text: string) => void;
}

type Source = 'VERIFY수식' | '스캐너' | 'FC시트' | '메인시트' | '-';

interface VerifyRow {
  no: number;
  label: string;
  actual: number;
  expected: number;
  src: Source;
}

// ─── 텍스트 정규화 (비교용, NFKC 강화) ───
function norm(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function FAVerificationBar({ chains, parseStatistics, flatData, onScrollToItem }: FAVerificationBarProps) {

  // ─── 1. 건수 검증 테이블 ───
  const verify = useMemo<VerifyRow[]>(() => {
    const itemStats = parseStatistics?.itemStats || [];
    const byCode = (code: string) => itemStats.find(s => s.itemCode === code)?.uniqueCount ?? 0;
    const procStats = parseStatistics?.processStats || [];
    const fd = flatData || [];

    // flatData 건수
    const fdProc = new Set(fd.filter(d => d.category !== 'C' && d.processNo && /^\d+$/.test(d.processNo)).map(d => d.processNo)).size;
    const fdFM = new Set(fd.filter(d => d.itemCode === 'A5' && d.value?.trim()).map(d => `${d.processNo}|${d.value.trim()}`)).size;
    const fdFC = new Set(fd.filter(d => d.itemCode === 'B4' && d.value?.trim()).map(d => `${d.processNo}|${d.value.trim()}`)).size;
    // ★ Bug fix: FE = 고장영향 = C4 (C3은 요구사항 — 오인식 버그였음)
    const fdFE = new Set(fd.filter(d => d.itemCode === 'C4' && d.value?.trim()).map(d => d.value.trim())).size;

    // FC시트 건수
    const chainCount = chains.length;
    const chainFM = new Set(chains.filter(c => c.fmValue?.trim()).map(c => `${c.processNo}|${c.fmValue!.trim()}`)).size;
    const chainFC = new Set(chains.filter(c => c.fcValue?.trim()).map(c => `${c.processNo}|${c.fcValue!.trim()}`)).size;
    const chainFE = new Set(chains.filter(c => c.feValue?.trim()).map(c => c.feValue!.trim())).size;

    const actualProc = fdProc || procStats.length || new Set(chains.map(c => c.processNo).filter(Boolean)).size;
    const actualFM = fdFM || byCode('A5') || chainFM;
    const actualFC = fdFC || byCode('B4') || chainFC;

    const formulas = parseStatistics?.rawFingerprint?.excelFormulas;
    const scanner = parseStatistics?.rawFingerprint;

    const pick = (f: number | undefined, s: number | undefined, ps: number, fd2: number): { val: number; src: Source } => {
      if (f && f > 0) return { val: f, src: 'VERIFY수식' };
      if (s && s > 0) return { val: s, src: '스캐너' };
      if (ps > 0) return { val: ps, src: '메인시트' };
      if (fd2 > 0) return { val: fd2, src: '메인시트' };
      return { val: 0, src: '-' };
    };

    const expChain = pick(formulas?.chainCount, scanner?.totalChainRows, 0, chainCount);
    const expProc  = pick(formulas?.processCount, scanner?.processes.length, procStats.length, fdProc);
    const expFM    = pick(formulas?.fmCount, scanner?.totalFM, byCode('A5'), fdFM);
    // ★ Bug fix: scanner.totalFC는 체인 행수(589)이므로 고유 FC 비교에 부적합 → 제외
    const expFC    = pick(formulas?.fcCount, undefined, byCode('B4'), fdFC);

    return [
      { no: 1, label: 'FC시트 파싱', actual: chainCount, expected: expChain.val, src: expChain.src },
      { no: 2, label: '공정 수',     actual: actualProc, expected: expProc.val,  src: expProc.src },
      { no: 3, label: 'FM 합계',     actual: actualFM,   expected: expFM.val,    src: expFM.src },
      { no: 4, label: 'FC 합계',     actual: actualFC,   expected: expFC.val,    src: expFC.src },
      // ★ FE/FM/FC 매칭: FC시트(actual) vs 메인시트(expected) — 차이 = 고장연결 누락 예상
      { no: 5, label: 'FE 매칭', actual: chainFE, expected: fdFE || chainFE, src: fdFE > 0 ? '메인시트' as Source : 'FC시트' as Source },
      { no: 6, label: 'FM 매칭', actual: chainFM, expected: fdFM || chainFM, src: fdFM > 0 ? '메인시트' as Source : 'FC시트' as Source },
      { no: 7, label: 'FC 매칭', actual: chainFC, expected: fdFC || chainFC, src: fdFC > 0 ? '메인시트' as Source : 'FC시트' as Source },
      { no: 8, label: 'FA통합 행수', actual: chainCount, expected: expChain.val, src: expChain.src },
    ];
  }, [chains, parseStatistics, flatData]);

  // ─── 2. 미매칭 항목 목록 (메인시트에만 있고 FC시트에 없는 것) ───
  const unmatched = useMemo(() => {
    const fd = flatData || [];
    if (fd.length === 0 || chains.length === 0) return { fe: [] as string[], fm: [] as string[], fc: [] as string[] };

    // 메인시트 Set
    // ★ Bug fix: FE = C4(고장영향), NOT C3(요구사항)
    const mainFE = new Set(fd.filter(d => d.itemCode === 'C4' && d.value?.trim()).map(d => norm(d.value)));
    const mainFM = new Set(fd.filter(d => d.itemCode === 'A5' && d.value?.trim()).map(d => norm(d.value)));
    const mainFC = new Set(fd.filter(d => d.itemCode === 'B4' && d.value?.trim()).map(d => norm(d.value)));

    // FC시트 Set
    const chainFESet = new Set(chains.filter(c => c.feValue?.trim()).map(c => norm(c.feValue!)));
    const chainFMSet = new Set(chains.filter(c => c.fmValue?.trim()).map(c => norm(c.fmValue!)));
    const chainFCSet = new Set(chains.filter(c => c.fcValue?.trim()).map(c => norm(c.fcValue!)));

    // 원본 텍스트로 표시하기 위한 Map (정규화 → 원본)
    const feOriginal = new Map<string, string>();
    fd.filter(d => d.itemCode === 'C4' && d.value?.trim()).forEach(d => feOriginal.set(norm(d.value), d.value.trim()));
    const fmOriginal = new Map<string, string>();
    fd.filter(d => d.itemCode === 'A5' && d.value?.trim()).forEach(d => fmOriginal.set(norm(d.value), `[${d.processNo}] ${d.value.trim()}`));
    const fcOriginal = new Map<string, string>();
    fd.filter(d => d.itemCode === 'B4' && d.value?.trim()).forEach(d => fcOriginal.set(norm(d.value), `[${d.processNo}] ${d.value.trim()}`));

    // 차집합: 메인시트에 있지만 FC시트에 없는 항목
    const unmatchedFE = [...mainFE].filter(v => !chainFESet.has(v)).map(v => feOriginal.get(v) || v);
    const unmatchedFM = [...mainFM].filter(v => !chainFMSet.has(v)).map(v => fmOriginal.get(v) || v);
    const unmatchedFC = [...mainFC].filter(v => !chainFCSet.has(v)).map(v => fcOriginal.get(v) || v);

    return { fe: unmatchedFE, fm: unmatchedFM, fc: unmatchedFC };
  }, [flatData, chains]);

  if (chains.length === 0 && (!flatData || flatData.length === 0)) return null;

  const allOk = verify.every(v => v.expected === 0 || v.actual === v.expected);
  const failCount = verify.filter(v => v.expected > 0 && v.actual !== v.expected).length;
  const totalUnmatched = unmatched.fe.length + unmatched.fm.length + unmatched.fc.length;

  return (
    <div className="mb-1">
      {/* ─── 건수 비교 테이블 ─── */}
      <table className={`w-full text-[10px] border-collapse rounded overflow-hidden ${
        allOk ? 'border border-green-300' : 'border border-red-300'
      }`}>
        <thead>
          <tr className={allOk ? 'bg-green-100' : 'bg-red-100'}>
            <th colSpan={7} className="px-2 py-0.5 text-left font-bold">
              <span className={allOk ? 'text-green-700' : 'text-red-700'}>
                파싱 검증 {allOk ? '✓ ALL PASS' : `✗ ${failCount}건 FAIL`}
              </span>
            </th>
          </tr>
          <tr className="bg-gray-100 text-gray-600">
            <th className="px-1.5 py-0.5 border-t border-gray-200 w-6 text-center">#</th>
            <th className="px-1.5 py-0.5 border-t border-gray-200 text-left">항목</th>
            <th className="px-1.5 py-0.5 border-t border-gray-200 text-right w-14">FC시트</th>
            <th className="px-1.5 py-0.5 border-t border-gray-200 text-right w-14">기대값</th>
            <th className="px-1.5 py-0.5 border-t border-gray-200 text-right w-14">차이</th>
            <th className="px-1.5 py-0.5 border-t border-gray-200 text-center w-14">기준</th>
            <th className="px-1.5 py-0.5 border-t border-gray-200 text-center w-10">결과</th>
          </tr>
        </thead>
        <tbody>
          {verify.map(v => {
            const hasExp = v.expected > 0;
            const ok = hasExp && v.actual === v.expected;
            const ng = hasExp && v.actual !== v.expected;
            const diff = v.actual - v.expected;
            return (
              <tr key={v.no} className={ng ? 'bg-red-50' : ok ? 'bg-green-50' : 'bg-white'}>
                <td className="px-1.5 py-0.5 border-t border-gray-100 text-center text-gray-400">{v.no}</td>
                <td className="px-1.5 py-0.5 border-t border-gray-100 text-gray-700">{v.label}</td>
                <td className={`px-1.5 py-0.5 border-t border-gray-100 text-right font-mono font-bold ${
                  ng ? 'text-red-600' : ok ? 'text-green-600' : 'text-gray-700'
                }`}>{v.actual}</td>
                <td className="px-1.5 py-0.5 border-t border-gray-100 text-right font-mono text-gray-500">
                  {hasExp ? v.expected : '-'}
                </td>
                <td className={`px-1.5 py-0.5 border-t border-gray-100 text-right font-mono ${
                  !hasExp ? 'text-gray-300' : diff === 0 ? 'text-green-500' : diff > 0 ? 'text-blue-500' : 'text-red-500'
                }`}>
                  {!hasExp ? '-' : diff === 0 ? '±0' : diff > 0 ? `+${diff}` : `${diff}`}
                </td>
                <td className="px-1.5 py-0.5 border-t border-gray-100 text-center text-gray-400 text-[9px]">
                  {v.src}
                </td>
                <td className="px-1.5 py-0.5 border-t border-gray-100 text-center font-bold">
                  {ng ? <span className="text-red-500">NG</span>
                    : ok ? <span className="text-green-500">OK</span>
                    : <span className="text-gray-300">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ─── 미매칭 항목 상세 (NG일 때만) ─── */}
      {totalUnmatched > 0 && (
        <div className="mt-1 border border-red-300 rounded bg-red-50 px-2 py-1 text-[9px]">
          <div className="font-bold text-red-700 mb-0.5">
            ⚠ 미매칭 {totalUnmatched}건 — 메인시트에만 존재 (FC시트에 없음 → 고장연결 누락)
          </div>
          {unmatched.fe.length > 0 && (
            <div className="mb-0.5">
              <span className="font-bold text-blue-700">FE ({unmatched.fe.length}건):</span>
              {unmatched.fe.map((t, i) => (
                <div key={i} className={`pl-2 text-red-600 truncate ${onScrollToItem ? 'cursor-pointer hover:bg-red-100 hover:underline rounded' : ''}`}
                  title={`${t}${onScrollToItem ? ' — 클릭 시 해당 행으로 이동' : ''}`}
                  onClick={() => onScrollToItem?.('FE', t)}>• {t}</div>
              ))}
            </div>
          )}
          {unmatched.fm.length > 0 && (
            <div className="mb-0.5">
              <span className="font-bold text-orange-700">FM ({unmatched.fm.length}건):</span>
              {unmatched.fm.map((t, i) => (
                <div key={i} className={`pl-2 text-red-600 truncate ${onScrollToItem ? 'cursor-pointer hover:bg-red-100 hover:underline rounded' : ''}`}
                  title={`${t}${onScrollToItem ? ' — 클릭 시 해당 행으로 이동' : ''}`}
                  onClick={() => onScrollToItem?.('FM', t)}>• {t}</div>
              ))}
            </div>
          )}
          {unmatched.fc.length > 0 && (
            <div>
              <span className="font-bold text-green-700">FC ({unmatched.fc.length}건):</span>
              {unmatched.fc.map((t, i) => (
                <div key={i} className={`pl-2 text-red-600 truncate ${onScrollToItem ? 'cursor-pointer hover:bg-red-100 hover:underline rounded' : ''}`}
                  title={`${t}${onScrollToItem ? ' — 클릭 시 해당 행으로 이동' : ''}`}
                  onClick={() => onScrollToItem?.('FC', t)}>• {t}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FAVerificationBar;
