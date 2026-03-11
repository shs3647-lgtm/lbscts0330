/**
 * @file FullAnalysisPreview.tsx
 * @description FA(Full Analysis) 미리보기 — ALL 화면 (구조+기능+고장+SOD/AP 통합 뷰)
 * 기존데이터 탭의 세 번째 서브탭
 * ★ 2026-02-22: L1↔L2 1:1 매칭 (공정 그룹별 L1 반복) + 공간 최적화
 * @created 2026-02-21
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


'use client';

import React, { useMemo } from 'react';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { CrossTab } from '../utils/template-delete-logic';
import type { ParseStatistics } from '../excel-parser';

// ─── 스타일 상수 ───

const TH = 'border border-gray-300 px-0.5 py-0 text-[8px] font-semibold text-center whitespace-nowrap leading-tight';
const TH_L1 = `${TH} bg-teal-50 text-teal-700`;
const TH_L2 = `${TH} bg-blue-50 text-blue-700`;
const TH_L3 = `${TH} bg-indigo-50 text-indigo-700`;
const TH_FAIL = `${TH} bg-red-50 text-red-700`;
const TH_RISK = `${TH} bg-amber-50 text-amber-700`;
const TH_VALID = `${TH} bg-emerald-50 text-emerald-700`;
// v3.1.1: PC/DC 컬럼 복원
const TH_CTRL = `${TH} bg-cyan-50 text-cyan-700`;
const TD = 'border border-gray-200 px-1 py-0.5 text-[9px] leading-tight';
const TD_NO = 'border border-gray-200 px-0.5 py-0.5 text-[8px] text-center text-gray-400 bg-gray-50/50';

const M4_BADGE: Record<string, string> = {
  MN: 'bg-red-50 text-red-600',
  MC: 'bg-blue-50 text-blue-600',
  IM: 'bg-amber-50 text-amber-600',
  EN: 'bg-pink-50 text-pink-600',
};

const AP_COLOR: Record<string, string> = {
  H: 'bg-red-100 text-red-700 font-bold',
  M: 'bg-yellow-100 text-yellow-700 font-bold',
  L: 'bg-green-100 text-green-700',
};

// ─── ALL Row (통합 뷰 1행 = 1개 고장사슬) ───

interface AllRow {
  no: number;
  // L1
  feScope: string;       // C1 구분
  l1Function: string;    // C2 제품기능
  l1Requirement: string; // C3 요구사항
  // L2
  processNo: string;     // A1 공정번호
  processName: string;   // A2 공정명
  l2Function: string;    // A3 공정기능
  productChar: string;   // A4 제품특성
  // L3
  m4: string;
  workElement: string;   // B1 작업요소
  l3Function: string;    // B2 요소기능
  processChar: string;   // B3 공정특성
  // Failure
  feValue: string;       // C4 고장영향
  fmValue: string;       // A5 고장형태
  fcValue: string;       // B4 고장원인
  // 관리방법 (v3.1.1: FC 시트 Import 복원)
  pcValue: string;       // B5 예방관리
  dcValue: string;       // A6 검출관리
  // Risk
  severity: number | null;
  occurrence: number | null;
  detection: number | null;
  ap: string;
  specialChar: string;
}

// ─── Props ───

interface Props {
  chains: MasterFailureChain[];
  crossTab: CrossTab;
  isFullscreen?: boolean;
  hideStats?: boolean;
  /** ★ 2026-02-25: import 갯수 vs 스캐너 갯수 비교 검증 */
  parseStatistics?: ParseStatistics;
}

// ─── 컴포넌트 ───

export function FullAnalysisPreview({ chains, crossTab, isFullscreen, hideStats, parseStatistics }: Props) {
  const tableMaxH = isFullscreen ? 'max-h-[calc(100vh-180px)]' : 'max-h-[280px]';

  // crossTab에서 공정 정보 매핑
  const processMap = useMemo(() => {
    const map = new Map<string, { A2: string; A3: string; A4: string }>();
    for (const a of crossTab.aRows) {
      map.set(a.processNo, { A2: a.A2, A3: a.A3, A4: a.A4 });
    }
    return map;
  }, [crossTab.aRows]);

  // L1 정보 (C1~C4)
  const l1Map = useMemo(() => {
    const map = new Map<string, { C2: string; C3: string }>();
    for (const c of crossTab.cRows) {
      map.set(c.C1 || c.category, { C2: c.C2, C3: c.C3 });
    }
    return map;
  }, [crossTab.cRows]);

  // ALL 행 생성 — ★ 2026-02-24: 빈 행(FE/FM/FC 모두 없는 행) 필터링
  const allRows: AllRow[] = useMemo(() => {
    return chains
      .filter(c => c.feValue?.trim() || c.fmValue?.trim() || c.fcValue?.trim()) // 빈 행 제거
      .map((c, i) => {
        const proc = processMap.get(c.processNo);
        const l1 = l1Map.get(c.feScope || '') || l1Map.values().next().value || { C2: '', C3: '' };

        return {
          no: i + 1,
          feScope: c.feScope || '',
          l1Function: l1.C2 || '',
          l1Requirement: l1.C3 || '',
          processNo: c.processNo,
          processName: proc?.A2 || '',
          l2Function: c.l2Function || proc?.A3 || '',
          productChar: c.productChar || proc?.A4 || '',
          m4: c.m4 || '',
          workElement: c.workElement || '',
          l3Function: c.l3Function || '',
          processChar: c.processChar || '',
          feValue: c.feValue || '',
          fmValue: c.fmValue || '',
          fcValue: c.fcValue || '',
          pcValue: c.pcValue || '',
          dcValue: c.dcValue || '',
          severity: c.severity ?? null,
          occurrence: c.occurrence ?? null,
          detection: c.detection ?? null,
          ap: c.ap || '',
          specialChar: c.specialChar || '',
        };
      });
  }, [chains, processMap, l1Map]);

  // ─── 셀병합(rowSpan) 계산 ───
  // ★ L1 rowSpan = L2 rowSpan (1:1 매칭) — 각 공정 그룹마다 L1 반복 표시
  interface MergeRow extends AllRow {
    l1Span: number;   // = l2Span (공정 그룹 단위)
    l2Span: number;   // processNo 그룹 단위
    fmSpan: number;   // FM 그룹 단위
    isL2GroupFirst: boolean; // L2 그룹 첫 행 (구분선용)
  }

  const mergedRows: MergeRow[] = useMemo(() => {
    if (allRows.length === 0) return [];

    // 정렬: feScope → processNo(숫자순) → fmValue → m4
    const sorted = [...allRows].sort((a, b) => {
      if (a.feScope !== b.feScope) return a.feScope.localeCompare(b.feScope);
      const nA = parseInt(a.processNo, 10) || 0;
      const nB = parseInt(b.processNo, 10) || 0;
      if (nA !== nB) return nA - nB;
      if (a.fmValue !== b.fmValue) return a.fmValue.localeCompare(b.fmValue);
      return 0;
    });

    const result: MergeRow[] = sorted.map((r, idx) => ({
      ...r, no: idx + 1, l1Span: 0, l2Span: 0, fmSpan: 0, isL2GroupFirst: false,
    }));

    // ★ L2 spans (processNo 그룹) — L1 span도 동일하게 설정 (1:1 매칭)
    let i = 0;
    while (i < result.length) {
      let j = i + 1;
      while (j < result.length && result[j].processNo === result[i].processNo && result[j].feScope === result[i].feScope) j++;
      const span = j - i;
      result[i].l2Span = span;
      result[i].l1Span = span;  // ★ L1 = L2 (1:1 매칭)
      result[i].isL2GroupFirst = true;
      i = j;
    }

    // FM spans (fmValue 그룹, 같은 L2 내)
    i = 0;
    while (i < result.length) {
      let j = i + 1;
      while (j < result.length && result[j].fmValue === result[i].fmValue && result[j].processNo === result[i].processNo && result[j].feScope === result[i].feScope) j++;
      result[i].fmSpan = j - i;
      i = j;
    }

    return result;
  }, [allRows]);

  // ★★★ 2026-02-25: FA 검증 — import 고유수 vs 스캐너/기대 고유수 비교 ★★★
  const faCount = useMemo(() => {
    const processes = new Set(allRows.map(r => r.processNo)).size;
    const actualFE = new Set(chains.filter(c => c.feValue?.trim()).map(c => c.feValue!.trim())).size;
    const actualFM = new Set(chains.filter(c => c.fmValue?.trim()).map(c => c.fmValue!.trim())).size;
    const actualFC = new Set(chains.filter(c => c.fcValue?.trim()).map(c => c.fcValue!.trim())).size;

    const scanner = parseStatistics?.rawFingerprint;
    const itemStats = parseStatistics?.itemStats || [];
    const byCode = (code: string) => itemStats.find(s => s.itemCode === code)?.uniqueCount ?? 0;

    const expectedFE = scanner?.totalFE || byCode('C4');
    const expectedFM = scanner?.totalFM || byCode('A5');
    const expectedFC = scanner?.totalFC || byCode('B4');

    return {
      total: allRows.length,
      processes,
      fe: { actual: actualFE, expected: expectedFE },
      fm: { actual: actualFM, expected: expectedFM },
      fc: { actual: actualFC, expected: expectedFC },
    };
  }, [allRows, chains, parseStatistics]);

  // Per-row 집계: 공정별 FM수, FM별 FC수, scope별 FE수
  const rowAgg = useMemo(() => {
    const fmByProc = new Map<string, Set<string>>();
    const fcByFm = new Map<string, Set<string>>();
    const feByScope = new Map<string, Set<string>>();
    allRows.forEach(r => {
      const proc = r.processNo;
      const fm = r.fmValue?.trim() || '';
      const fc = r.fcValue?.trim() || '';
      const fe = r.feValue?.trim() || '';
      const scope = r.feScope || '';
      if (fm) {
        if (!fmByProc.has(proc)) fmByProc.set(proc, new Set());
        fmByProc.get(proc)!.add(fm);
      }
      if (fm && fc) {
        const key = `${proc}|${fm}`;
        if (!fcByFm.has(key)) fcByFm.set(key, new Set());
        fcByFm.get(key)!.add(fc);
      }
      if (fe) {
        if (!feByScope.has(scope)) feByScope.set(scope, new Set());
        feByScope.get(scope)!.add(fe);
      }
    });
    return { fmByProc, fcByFm, feByScope };
  }, [allRows]);

  if (allRows.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-[11px] border border-dashed border-gray-300 rounded">
        통합 분석 데이터 없음 — 고장사슬(FC 탭) 데이터가 필요합니다
      </div>
    );
  }

  return (
    <div>
      {/* 통계 바 — hideStats 시 숨김 (부모 액션바에 통합) */}
      {!hideStats && (
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
            <b className="text-blue-700">{faCount.total}</b><span className="text-blue-500">전체</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
            <b className="text-blue-700">{faCount.processes}</b><span className="text-blue-500">공정</span>
          </span>
          <span className="w-px h-4 bg-gray-300 mx-0.5" />
          {/* FA 검증: FE — import수/기대수 */}
          {(['fe', 'fm', 'fc'] as const).map(key => {
            const v = faCount[key];
            const label = key.toUpperCase();
            const hasExpected = v.expected > 0;
            const isMatch = hasExpected && v.actual === v.expected;
            const color = !hasExpected ? 'text-gray-600' : isMatch ? 'text-green-600' : 'text-red-500';
            return (
              <span key={key} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[10px]">
                <span className="text-emerald-600 font-bold">{label}</span>
                <span className={`font-bold ${color}`}>
                  {v.actual}{hasExpected ? `/${v.expected}` : ''}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* ALL 테이블 */}
      <div className={`overflow-auto ${tableMaxH} border border-gray-200 rounded`}>
        <table className="w-full border-collapse text-[9px] table-fixed">
          <colgroup>
            {/* No */}
            <col style={{ width: 26 }} />
            {/* L1: 구분 */}
            <col style={{ width: 32 }} />
            {/* L1: 제품기능+요구사항 합산 */}
            <col style={{ width: '8%' }} />
            {/* L2: 공정No */}
            <col style={{ width: 34 }} />
            {/* L2: 공정명 */}
            <col style={{ width: '5%' }} />
            {/* L2: 공정기능 */}
            <col style={{ width: '10%' }} />
            {/* L2: 제품특성 */}
            <col style={{ width: '7%' }} />
            {/* L3: 4M */}
            <col style={{ width: 24 }} />
            {/* L3: 작업요소 */}
            <col style={{ width: '7%' }} />
            {/* L3: 요소기능 */}
            <col style={{ width: '10%' }} />
            {/* L3: 공정특성 */}
            <col style={{ width: '7%' }} />
            {/* Fail: 고장영향 */}
            <col style={{ width: '8%' }} />
            {/* Fail: 고장형태 */}
            <col style={{ width: '7%' }} />
            {/* Fail: 고장원인 */}
            <col style={{ width: '7%' }} />
            {/* Ctrl: 예방관리(PC) */}
            <col style={{ width: '7%' }} />
            {/* Ctrl: 검출관리(DC) */}
            <col style={{ width: '7%' }} />
            {/* FA검증: FE/FM/FC 상태 */}
            <col style={{ width: 36 }} />
            <col style={{ width: 36 }} />
            <col style={{ width: 36 }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${TH} bg-gray-100 text-gray-500`}>No</th>
              <th className={TH_L1}>구분</th>
              <th className={TH_L1}>기능/요구</th>
              <th className={TH_L2}>No</th>
              <th className={TH_L2}>공정명</th>
              <th className={TH_L2}>공정기능</th>
              <th className={TH_L2}>제품특성</th>
              <th className={TH_L3}>4M</th>
              <th className={TH_L3}>작업요소</th>
              <th className={TH_L3}>요소기능</th>
              <th className={TH_L3}>공정특성</th>
              <th className={TH_FAIL}>고장영향(FE)</th>
              <th className={TH_FAIL}>고장형태(FM)</th>
              <th className={TH_FAIL}>고장원인(FC)</th>
              <th className={TH_CTRL}>예방관리(PC)</th>
              <th className={TH_CTRL}>검출관리(DC)</th>
              <th className={TH_VALID}>FE</th>
              <th className={TH_VALID}>FM</th>
              <th className={TH_VALID}>FC</th>
            </tr>
          </thead>
          <tbody>
            {mergedRows.map((r, i) => (
              <tr key={i} className={r.isL2GroupFirst && i > 0 ? 'border-t-2 border-t-blue-300' : ''}>
                <td className={TD_NO}>{r.no}</td>
                {/* ★ L1 — L2 공정 그룹과 1:1 매칭 (동일 rowSpan) */}
                {r.l1Span > 0 && (
                  <>
                    <td className={`${TD} text-center text-[8px] font-bold text-teal-700 bg-teal-50/30 align-top`} rowSpan={r.l1Span}>
                      {r.feScope}
                    </td>
                    <td className={`${TD} bg-teal-50/30 align-top text-[8px] leading-snug`} rowSpan={r.l1Span}>
                      {r.l1Function && <span className="block">{r.l1Function}</span>}
                      {r.l1Requirement && <span className="block text-gray-500 mt-0.5">{r.l1Requirement}</span>}
                      {!r.l1Function && !r.l1Requirement && <Dash />}
                    </td>
                  </>
                )}
                {/* L2 — processNo 그룹 머지 */}
                {r.l2Span > 0 && (
                  <>
                    <td className={`${TD} text-center font-mono font-medium bg-blue-50/30 align-top`} rowSpan={r.l2Span}>{r.processNo}</td>
                    <td className={`${TD} bg-blue-50/30 align-top`} rowSpan={r.l2Span}>{r.processName || <Dash />}</td>
                    <td className={`${TD} bg-blue-50/30 align-top`} rowSpan={r.l2Span}>{r.l2Function || <Dash />}</td>
                    <td className={`${TD} bg-blue-50/30 align-top`} rowSpan={r.l2Span}>{r.productChar || <Dash />}</td>
                  </>
                )}
                {/* L3 — 개별 행 */}
                <td className={`${TD} text-center`}>
                  {r.m4 && <span className={`text-[7px] px-0.5 rounded font-bold ${M4_BADGE[r.m4] || ''}`}>{r.m4}</span>}
                </td>
                <td className={TD}>{r.workElement || <Dash />}</td>
                <td className={TD}>{r.l3Function || <Dash />}</td>
                <td className={TD}>{r.processChar || <Dash />}</td>
                {/* FE(고장영향) — FM 그룹 머지 (같은 FM이면 같은 FE) */}
                {r.fmSpan > 0 && (
                  <td className={`${TD} bg-red-50/30 align-top`} rowSpan={r.fmSpan}>{r.feValue || <Dash />}</td>
                )}
                {/* FM(고장형태) — FM 그룹 머지 */}
                {r.fmSpan > 0 && (
                  <td className={`${TD} bg-red-50/30 align-top`} rowSpan={r.fmSpan}>{r.fmValue || <Dash />}</td>
                )}
                {/* FC(고장원인) — 개별 행 */}
                <td className={`${TD} bg-red-50/30`}>{r.fcValue || <Dash />}</td>
                {/* 관리방법 — 개별 행 */}
                <td className={`${TD} bg-cyan-50/30`}>{r.pcValue || <Dash />}</td>
                <td className={`${TD} bg-cyan-50/30`}>{r.dcValue || <Dash />}</td>
                {/* FA검증 — scope별 FE수, 공정별 FM수, FM별 FC수 */}
                <td className={`${TD} text-center text-[8px] font-mono text-blue-600`}>
                  {rowAgg.feByScope.get(r.feScope)?.size || 0}
                </td>
                <td className={`${TD} text-center text-[8px] font-mono text-blue-600`}>
                  {rowAgg.fmByProc.get(r.processNo)?.size || 0}
                </td>
                <td className={`${TD} text-center text-[8px] font-mono text-blue-600`}>
                  {rowAgg.fcByFm.get(`${r.processNo}|${r.fmValue?.trim() || ''}`)?.size || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dash() {
  return <span className="text-gray-300">-</span>;
}

export default FullAnalysisPreview;
