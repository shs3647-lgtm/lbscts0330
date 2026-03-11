/**
 * @file FailureLinkVerifyBar.tsx
 * @description DB 중심 12항목 파이프라인 검증 바
 *
 * 파이프라인: Import(엑셀→MasterFlatItem) → DB(원자성 테이블) → 워크시트(클라이언트) → 연결(FailureLink)
 * 12항목을 가로(컬럼), 5단계를 세로(행)로 배치하여 각 단계의 건수를 사실 기반으로 비교
 *
 * @version 3.0.0 - DB 중심 재설계 (transposed 12×5 테이블 + verify-counts API)
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { LinkVerifyResult, FailReason, FMTraceItem, RepairableLink, StructureTraceItem } from '../hooks/useFailureLinkVerify';

interface FailureLinkVerifyBarProps {
  result: LinkVerifyResult;
  /** 누락 자동 복구 콜백 — repairableLinks를 state.failureLinks에 머지 */
  onRepair?: (links: RepairableLink[]) => void;
}

// ─── 14항목 정의 (순서: 구조→기능→고장→최적화) ───

const ITEM_DEFS: { code: string; label: string; tab: string }[] = [
  { code: 'A2', label: '공정명',       tab: '구조' },
  { code: 'B1', label: '작업요소명',   tab: '구조' },
  { code: 'C1', label: '구분',         tab: '기능L1' },
  { code: 'C2', label: '완제품기능',   tab: '기능L1' },
  { code: 'C3', label: '요구사항',     tab: '기능L1' },
  { code: 'A3', label: '공정기능',     tab: '기능L2' },
  { code: 'A4', label: '제품특성',     tab: '기능L2' },
  { code: 'B2', label: '작업요소기능', tab: '기능L3' },
  { code: 'B3', label: '공정특성',     tab: '기능L3' },
  { code: 'C4', label: '고장영향',     tab: '고장L1' },
  { code: 'A5', label: '고장형태',     tab: '고장L2' },
  { code: 'B4', label: '고장원인',     tab: '고장L3' },
  { code: 'A6', label: '검출관리',     tab: '최적화' },
  { code: 'B5', label: '예방관리',     tab: '최적화' },
];

/** 고장 연결 대상 아이템코드 (연결 행에 값이 표시되는 항목) */
const LINK_CODES = new Set(['C4', 'A5', 'B4']);

const REASON_LABELS: Record<FailReason, { label: string; color: string }> = {
  fm_not_found:      { label: 'FM 없음',      color: '#d32f2f' },
  fm_cross_process:  { label: 'FM 공정불일치', color: '#c62828' },
  fc_not_found:      { label: 'FC 없음',      color: '#e65100' },
  fe_not_found:      { label: 'FE 없음',      color: '#1565c0' },
  fm_text_mismatch:  { label: 'FM 텍스트차이', color: '#f57c00' },
  fc_text_mismatch:  { label: 'FC 텍스트차이', color: '#ff8f00' },
  fe_text_mismatch:  { label: 'FE 텍스트차이', color: '#0277bd' },
  link_missing:      { label: 'Link 미생성',   color: '#6a1b9a' },
  chain_empty:       { label: '빈 chain',      color: '#757575' },
};

// ─── DB 카운트 타입 ───

interface LinkDiag {
  active: number;
  softDeleted: number;
  total: number;
  importChains: number;
}

interface DbCountsResponse {
  success: boolean;
  import: Record<string, number>;
  db: Record<string, number>;
  linkDiag?: LinkDiag;
}

// ─── 셀 비교 색상 헬퍼 ───

function compareColor(a: number, b: number): string {
  if (a === b) return 'text-green-600';
  return 'text-red-600';
}

export default function FailureLinkVerifyBar({ result, onRepair }: FailureLinkVerifyBarProps) {
  const searchParams = useSearchParams();
  const fmeaId = searchParams.get('id')?.toLowerCase() || '';

  const [showDetail, setShowDetail] = useState(false);
  const [showFmTrace, setShowFmTrace] = useState(false);
  const [fmFilter, setFmFilter] = useState<'all' | 'missing' | 'wsOnly' | 'crossProc'>('missing');
  const [repaired, setRepaired] = useState(false);

  // ── DB 카운트 fetch ──
  const [dbCounts, setDbCounts] = useState<DbCountsResponse | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  useEffect(() => {
    if (!fmeaId) return;
    setDbLoading(true);
    fetch(`/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}`)
      .then(res => res.json())
      .then((data: DbCountsResponse) => {
        if (data.success) setDbCounts(data);
      })
      .catch(err => console.error('[verify-counts] fetch error:', err))
      .finally(() => setDbLoading(false));
  }, [fmeaId]);

  // ── countComparison을 code 기반 Map으로 변환 ──
  const compMap = new Map(result.countComparison.map(r => [r.itemCode, r]));

  // ── 전체 상태 판정 ──
  const coverageOk = result.countComparison.every(r => r.coverageGap <= 0);
  const allOk = result.failedCount === 0 && coverageOk;
  const coverageFailCount = result.countComparison.filter(r => r.coverageGap > 0).reduce((sum, r) => sum + r.coverageGap, 0);
  const matchRate = result.chainCount > 0
    ? ((result.matchedCount / result.chainCount) * 100).toFixed(1)
    : '0';

  const stats = result.fmTraceStats;

  const filteredFmTrace = result.fmTrace.filter((fm: FMTraceItem) => {
    if (fmFilter === 'missing') return fm.missingAt !== null;
    if (fmFilter === 'wsOnly') return !fm.inImport;
    if (fmFilter === 'crossProc') return fm.crossProcessMatch != null;
    return true;
  });

  // 원인분석 요약
  const rootCauses: { label: string; count: number; color: string; desc: string }[] = [];
  if (stats.missingInWorksheet > 0) {
    rootCauses.push({ label: '빌드 누락', count: stats.missingInWorksheet, color: '#d32f2f', desc: 'Import A5에 있으나 워크시트에 없음 → 파서→워크시트 변환 실패' });
  }
  if (stats.missingInLink > 0) {
    rootCauses.push({ label: '연결 누락', count: stats.missingInLink, color: '#e65100', desc: '워크시트에 있으나 고장연결 미생성 → injector/auto-link 매칭 실패' });
  }
  const crossProcCount = result.fmTrace.filter(t => t.crossProcessMatch).length;
  if (crossProcCount > 0) {
    rootCauses.push({ label: '공정번호 불일치', count: crossProcCount, color: '#c62828', desc: 'FM이 다른 공정에서 발견됨 → Import 공정번호와 워크시트 공정번호 불일치' });
  }
  if (stats.wsOnlyCount > 0) {
    rootCauses.push({ label: 'WS 전용', count: stats.wsOnlyCount, color: '#1565c0', desc: '워크시트에만 있고 Import에 없음 → 자동 생성 또는 수동 추가' });
  }
  // ★ B1 작업요소 누락
  if (result.b1TraceStats && result.b1TraceStats.missing > 0) {
    rootCauses.push({ label: 'B1 누락', count: result.b1TraceStats.missing, color: '#b71c1c', desc: 'Import B1 작업요소가 워크시트에 없음 → 빌드 파이프라인 누락' });
  }
  // ★ Import < DB 경고 — Import 데이터 부족 감지
  if (dbCounts) {
    for (const def of ITEM_DEFS) {
      const comp = compMap.get(def.code);
      const imp = comp?.importCount ?? 0;
      const db = dbCounts.db[def.code] ?? -1;
      if (db > 0 && imp > 0 && imp < db) {
        rootCauses.push({
          label: `${def.code} Import 부족`,
          count: db - imp,
          color: '#e65100',
          desc: `${def.label}(${def.code}): Import=${imp} < DB=${db} → 엑셀 데이터 누락 또는 파싱 오류, 재 Import 필요`,
        });
      }
    }
  }

  // ── 12항목 + Link 검증 통계 ──
  let passCount = 0;
  let failCount = 0;
  for (const def of ITEM_DEFS) {
    const comp = compMap.get(def.code);
    const imp = comp?.importCount ?? 0;
    const db = dbCounts?.db[def.code] ?? -1;
    const ws = comp?.worksheetCount ?? 0;
    const link = comp?.linkedCount ?? -1;
    // Import→DB 비교
    const idOk = db < 0 || imp === db;
    // DB→WS 비교
    const dwOk = db < 0 || db === ws;
    // WS→Link (고장 항목만)
    const wlOk = !LINK_CODES.has(def.code) || link === ws;
    // ★ coverageGap도 검증에 포함 (카운트 OK여도 누락이면 FAIL)
    const gap = comp?.coverageGap ?? -1;
    const gapOk = gap <= 0;
    if (idOk && dwOk && wlOk && gapOk) passCount++;
    else failCount++;
  }

  return (
    <div className="text-[10px] select-text" style={{ maxHeight: 400, overflowY: 'auto' }}>
      {/* ── 요약 헤더 ── */}
      <div className={`px-2 py-1 font-bold flex items-center justify-between rounded-t ${
        allOk && failCount === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <span>
          파이프라인 검증 {allOk && failCount === 0 ? '✓ ALL PASS' : `✗ ${result.failedCount + coverageFailCount}건 FAIL`}
          <span className="ml-2 text-[9px] font-mono">({passCount}/{ITEM_DEFS.length} 항목 OK)</span>
        </span>
        <div className="flex items-center gap-2">
          {result.repairableLinks.length > 0 && onRepair && !repaired && (
            <button
              onClick={() => { onRepair(result.repairableLinks); setRepaired(true); }}
              className="px-3 py-0.5 bg-green-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-green-700 shadow-sm"
            >
              누락 자동 복구 ({result.repairableLinks.length}건)
            </button>
          )}
          {repaired && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">
              ✓ {result.repairableLinks.length}건 복구 완료
            </span>
          )}
          <span className="font-mono text-[9px]">
            chain {result.chainCount}건 → 매칭 {result.matchedCount}건 ({matchRate}%)
          </span>
        </div>
      </div>

      {/* ── ★ 12항목 × 5행 DB 중심 검증 테이블 (가로=항목, 세로=파이프라인 단계) ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200 min-w-[900px]">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="px-1.5 py-0.5 border border-gray-200 text-left w-20 sticky left-0 bg-gray-100 z-10">단계</th>
              {ITEM_DEFS.map(def => (
                <th key={def.code} className="px-1 py-0.5 border border-gray-200 text-center" title={`${def.code} ${def.label} — ${def.tab}`}>
                  <div className="font-mono text-[9px] text-blue-600">{def.code}</div>
                  <div className="text-[8px] text-gray-500 truncate max-w-[70px]">{def.label}</div>
                </th>
              ))}
              <th className="px-1 py-0.5 border border-gray-200 text-center" title="FailureLink 연결 총 건수">
                <div className="font-mono text-[9px] text-blue-600">Link</div>
                <div className="text-[8px] text-gray-500">연결합계</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 1행: Import (PfmeaMasterFlatItem) */}
            <tr className="bg-blue-50">
              <td className="px-1.5 py-0.5 border border-gray-200 font-bold text-blue-700 sticky left-0 bg-blue-50 z-10">Import</td>
              {ITEM_DEFS.map(def => {
                const comp = compMap.get(def.code);
                const impVal = comp?.importCount ?? 0;
                // ★ A6/B5: Import=0이고 chains에 pcValue/dcValue 없으면 "재Import" 표시
                const isReimport = (def.code === 'A6' || def.code === 'B5') && impVal === 0 && result.needsReimportPCDC;
                return (
                  <td key={def.code} className={`px-1 py-0.5 border border-gray-200 text-center font-mono ${isReimport ? 'text-orange-600' : ''}`}
                    title={isReimport ? 'FC시트 재Import 필요 — 기존 Import에 예방/검출관리 데이터 없음' : undefined}>
                    {isReimport ? <span className="text-[8px] font-bold">재Import</span> : impVal}
                  </td>
                );
              })}
              <td className={`px-1 py-0.5 border border-gray-200 text-center font-mono ${
                dbCounts?.import?.link != null ? 'text-blue-700 font-bold' : 'text-gray-300'
              }`}>
                {dbCounts?.import?.link ?? (dbLoading ? '...' : '—')}
              </td>
            </tr>

            {/* 2행: DB (원자성 테이블 — API) */}
            <tr className="bg-amber-50">
              <td className="px-1.5 py-0.5 border border-gray-200 font-bold text-amber-700 sticky left-0 bg-amber-50 z-10">
                DB
                {dbLoading && <span className="ml-1 text-[8px] text-gray-400">...</span>}
              </td>
              {ITEM_DEFS.map(def => {
                const dbVal = dbCounts?.db[def.code];
                const impVal = compMap.get(def.code)?.importCount ?? 0;
                if (dbVal == null) {
                  return <td key={def.code} className="px-1 py-0.5 border border-gray-200 text-center text-gray-300 font-mono">{dbLoading ? '...' : '—'}</td>;
                }
                return (
                  <td key={def.code} className={`px-1 py-0.5 border border-gray-200 text-center font-mono font-bold ${compareColor(impVal, dbVal)}`}>
                    {dbVal}
                  </td>
                );
              })}
              <td
                className={`px-1 py-0.5 border border-gray-200 text-center font-mono font-bold ${
                  dbCounts?.db.link != null
                    ? compareColor(dbCounts?.import?.link ?? 0, dbCounts.db.link)
                    : 'text-gray-300'
                }`}
                title={dbCounts?.linkDiag
                  ? `활성=${dbCounts.linkDiag.active}, 소프트삭제=${dbCounts.linkDiag.softDeleted}, 전체=${dbCounts.linkDiag.total}`
                  : undefined}
              >
                {dbCounts?.db.link ?? (dbLoading ? '...' : '—')}
              </td>
            </tr>

            {/* 3행: 워크시트 (클라이언트 state) */}
            <tr className="bg-green-50">
              <td className="px-1.5 py-0.5 border border-gray-200 font-bold text-green-700 sticky left-0 bg-green-50 z-10">워크시트</td>
              {ITEM_DEFS.map(def => {
                const comp = compMap.get(def.code);
                const wsVal = comp?.worksheetCount ?? 0;
                const dbVal = dbCounts?.db[def.code];
                const refVal = dbVal ?? comp?.importCount ?? 0;
                return (
                  <td key={def.code} className={`px-1 py-0.5 border border-gray-200 text-center font-mono font-bold ${compareColor(refVal, wsVal)}`}>
                    {wsVal}
                  </td>
                );
              })}
              <td className={`px-1 py-0.5 border border-gray-200 text-center font-mono font-bold ${
                result.wsLinkCount != null && dbCounts?.db.link != null
                  ? compareColor(dbCounts.db.link, result.wsLinkCount)
                  : 'text-gray-300'
              }`}>
                {result.wsLinkCount ?? '—'}
              </td>
            </tr>

            {/* 4행: 연결 (savedLinks) */}
            <tr className="bg-indigo-50">
              <td className="px-1.5 py-0.5 border border-gray-200 font-bold text-indigo-700 sticky left-0 bg-indigo-50 z-10">연결</td>
              {ITEM_DEFS.map(def => {
                const comp = compMap.get(def.code);
                if (!LINK_CODES.has(def.code)) {
                  return <td key={def.code} className="px-1 py-0.5 border border-gray-200 text-center text-gray-300">—</td>;
                }
                const linkVal = comp?.linkedCount ?? 0;
                const wsVal = comp?.worksheetCount ?? 0;
                return (
                  <td key={def.code} className={`px-1 py-0.5 border border-gray-200 text-center font-mono font-bold ${compareColor(wsVal, linkVal)}`}>
                    {linkVal}
                  </td>
                );
              })}
              <td className={`px-1 py-0.5 border border-gray-200 text-center font-mono font-bold ${
                dbCounts?.db.link != null ? 'text-indigo-700' : 'text-gray-300'
              }`}>
                {dbCounts?.db.link ?? '—'}
              </td>
            </tr>

            {/* 5행: 커버리지 (I→D→W→L 비교 상태) */}
            <tr className="bg-gray-50">
              <td className="px-1.5 py-0.5 border border-gray-200 font-bold text-gray-700 sticky left-0 bg-gray-50 z-10">커버리지</td>
              {ITEM_DEFS.map(def => {
                const comp = compMap.get(def.code);
                const imp = comp?.importCount ?? 0;
                const db = dbCounts?.db[def.code];
                const ws = comp?.worksheetCount ?? 0;
                const link = comp?.linkedCount ?? -1;

                // 3단계 비교: I→D, D→W, W→L
                const stages: string[] = [];
                const hasDb = db != null;

                if (hasDb) {
                  if (imp !== db) stages.push(`I→D ${db - imp > 0 ? '+' : ''}${db - imp}`);
                  if (db !== ws) stages.push(`D→W ${ws - db > 0 ? '+' : ''}${ws - db}`);
                } else {
                  if (imp !== ws) stages.push(`I→W ${ws - imp > 0 ? '+' : ''}${ws - imp}`);
                }
                if (LINK_CODES.has(def.code) && link >= 0 && link !== ws) {
                  stages.push(`W→L ${link - ws > 0 ? '+' : ''}${link - ws}`);
                }

                // ★★★ 2026-03-01: 커버리지 숫자 표시 — 해당 컬럼 기준 숫자 표시 ★★★
                const gap = comp?.coverageGap ?? -1;

                // 누락 건수 뱃지 표시
                if (gap > 0) {
                  stages.push(LINK_CODES.has(def.code) ? `FM누락 ${gap}` : `누락 ${gap}`);
                }

                // 파이프라인 체인 숫자 생성 (해당 컬럼 기준)
                const chain = LINK_CODES.has(def.code)
                  ? (hasDb ? `${imp}=${db}=${ws}=${link >= 0 ? link : '?'}` : `${imp}=${ws}=${link >= 0 ? link : '?'}`)
                  : (hasDb ? `${imp}=${db}=${ws}` : `${imp}=${ws}`);

                if (stages.length === 0) {
                  // ★ "OK" 대신 해당 항목의 파이프라인 숫자 체인 표시
                  return (
                    <td key={def.code} className="px-1 py-0.5 border border-gray-200 text-center text-green-600 font-bold font-mono text-[9px]"
                      title={LINK_CODES.has(def.code) ? `I=${imp}, DB=${db ?? '-'}, WS=${ws}, L=${link}` : `I=${imp}, DB=${db ?? '-'}, WS=${ws}`}>
                      {chain}
                    </td>
                  );
                }
                // 불일치 있는 경우: 빨간(파이프라인 불일치) / 주황(FM누락만)
                const hasPipelineDiff = stages.some(s => !s.startsWith('FM누락'));
                const cellColor = hasPipelineDiff ? 'text-red-600' : 'text-orange-600';
                return (
                  <td key={def.code} className={`px-1 py-0.5 border border-gray-200 text-center font-bold text-[8px] ${cellColor}`} title={`${chain} | ${stages.join(', ')}`}>
                    {stages.join(' ')}
                  </td>
                );
              })}
              <td className="px-1 py-0.5 border border-gray-200 text-center text-gray-400 text-[8px]">
                {passCount}/{ITEM_DEFS.length}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 원인분석 요약 (누락이 있을 때만) ── */}
      {rootCauses.length > 0 && (
        <div className="mt-1 border border-amber-200 rounded bg-amber-50 px-2 py-1">
          <span className="font-bold text-amber-800 text-[10px]">원인분석</span>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {rootCauses.map((rc, idx) => (
              <div key={idx} className="flex items-center gap-1" title={rc.desc}>
                <span className="px-1.5 py-0.5 rounded text-white text-[9px] font-bold" style={{ background: rc.color }}>
                  {rc.label}: {rc.count}건
                </span>
                <span className="text-[8px] text-gray-500 max-w-[200px] truncate">{rc.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FM 중심 파이프라인 추적 (A5 = 중심축) ── */}
      <div className="mt-1 border border-blue-200 rounded bg-blue-50 px-2 py-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold text-blue-800">
            FM 파이프라인 (A5 중심) — Import {stats.total}건
            → WS {stats.inWorksheet}건
            → Link {stats.inLink}건
            {stats.missingInWorksheet > 0 && <span className="text-red-600 ml-1">빌드누락 {stats.missingInWorksheet}</span>}
            {stats.missingInLink > 0 && <span className="text-orange-600 ml-1">연결누락 {stats.missingInLink}</span>}
            {stats.wsOnlyCount > 0 && <span className="text-blue-600 ml-1">WS전용 {stats.wsOnlyCount}</span>}
          </span>
          <button
            onClick={() => setShowFmTrace(!showFmTrace)}
            className="px-2 py-0.5 bg-white border border-blue-300 rounded text-blue-600 font-bold cursor-pointer hover:bg-blue-100"
          >
            {showFmTrace ? 'FM추적 접기 ▲' : 'FM추적 ▼'}
          </button>
        </div>

        {/* FM 추적 통계 바 */}
        {stats.total > 0 && (
          <div className="flex items-center gap-1 mb-1">
            <div className="flex-1 h-3 bg-gray-200 rounded overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: `${(stats.inLink / stats.total) * 100}%` }} title={`연결 완료: ${stats.inLink}건`} />
              <div className="bg-orange-400 h-full" style={{ width: `${(stats.missingInLink / stats.total) * 100}%` }} title={`연결 누락: ${stats.missingInLink}건`} />
              <div className="bg-red-500 h-full" style={{ width: `${(stats.missingInWorksheet / stats.total) * 100}%` }} title={`빌드 누락: ${stats.missingInWorksheet}건`} />
            </div>
            <span className="text-[9px] font-mono text-gray-500 shrink-0">
              {((stats.inLink / stats.total) * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {showFmTrace && (
          <>
            <div className="flex gap-1 mb-1">
              {([
                ['missing', '누락만'],
                ['all', '전체'],
                ['wsOnly', 'WS에만'],
                ['crossProc', '공정불일치'],
              ] as const).map(([val, label]) => (
                <button key={val}
                  onClick={() => setFmFilter(val)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                    fmFilter === val ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-300'
                  }`}
                >{label} {
                  val === 'missing' ? `(${stats.missingInWorksheet + stats.missingInLink})` :
                  val === 'wsOnly' ? `(${stats.wsOnlyCount})` :
                  val === 'crossProc' ? `(${crossProcCount})` :
                  `(${result.fmTrace.length})`
                }</button>
              ))}
            </div>

            <table className="w-full border-collapse border border-gray-300 bg-white">
              <thead>
                <tr className="bg-gray-100 text-[9px] text-gray-600">
                  <th className="px-1 py-0.5 border border-gray-200 w-6">#</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-10">공정</th>
                  <th className="px-1 py-0.5 border border-gray-200 text-left">FM (고장형태)</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-10">Import</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-10">WS</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-10">Link</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-16">상태</th>
                  <th className="px-1 py-0.5 border border-gray-200">비고</th>
                </tr>
              </thead>
              <tbody>
                {filteredFmTrace.map((fm, idx) => (
                  <tr key={idx} className={
                    fm.missingAt === 'worksheet' ? 'bg-red-50' :
                    fm.missingAt === 'link' ? 'bg-orange-50' :
                    !fm.inImport ? 'bg-yellow-50' :
                    fm.crossProcessMatch ? 'bg-pink-50' : 'bg-green-50'
                  }>
                    <td className="px-1 py-0.5 border border-gray-200 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-1 py-0.5 border border-gray-200 text-center font-mono">{fm.processNo}</td>
                    <td className="px-1 py-0.5 border border-gray-200 truncate max-w-[200px]" title={fm.fmText}>{fm.fmText}</td>
                    <td className="px-1 py-0.5 border border-gray-200 text-center">{fm.inImport ? '✓' : '-'}</td>
                    <td className={`px-1 py-0.5 border border-gray-200 text-center font-bold ${fm.inWorksheet ? 'text-green-600' : 'text-red-600'}`}>
                      {fm.inWorksheet ? '✓' : '✗'}
                    </td>
                    <td className={`px-1 py-0.5 border border-gray-200 text-center font-bold ${fm.inLink ? 'text-green-600' : 'text-orange-600'}`}>
                      {fm.inLink ? '✓' : '✗'}
                    </td>
                    <td className="px-1 py-0.5 border border-gray-200 text-center">
                      {fm.missingAt === 'worksheet' && <span className="text-red-600 font-bold">빌드누락</span>}
                      {fm.missingAt === 'link' && <span className="text-orange-600 font-bold">연결누락</span>}
                      {!fm.missingAt && fm.inImport && <span className="text-green-600">OK</span>}
                      {!fm.inImport && <span className="text-yellow-600">WS전용</span>}
                    </td>
                    <td className="px-1 py-0.5 border border-gray-200 text-[8px] text-gray-500 truncate max-w-[200px]"
                      title={buildRemarkTitle(fm)}>
                      {buildRemarkText(fm)}
                    </td>
                  </tr>
                ))}
                {filteredFmTrace.length === 0 && (
                  <tr><td colSpan={8} className="px-2 py-2 text-center text-gray-400">해당 항목 없음</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── B1 작업요소 누락 추적 ── */}
      {result.b1TraceStats && result.b1TraceStats.missing > 0 && (
        <div className="mt-1 border border-red-200 rounded bg-red-50 px-2 py-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-bold text-red-800">
              B1 작업요소 누락 — Import {result.b1TraceStats.total}건
              → WS {result.b1TraceStats.inWorksheet}건
              <span className="text-red-600 ml-1">누락 {result.b1TraceStats.missing}건</span>
              {result.b1TraceStats.wsOnly > 0 && <span className="text-blue-600 ml-1">WS전용 {result.b1TraceStats.wsOnly}건</span>}
            </span>
          </div>
          <table className="w-full border-collapse border border-gray-300 bg-white">
            <thead>
              <tr className="bg-gray-100 text-[9px] text-gray-600">
                <th className="px-1 py-0.5 border border-gray-200 w-6">#</th>
                <th className="px-1 py-0.5 border border-gray-200 w-10">공정</th>
                <th className="px-1 py-0.5 border border-gray-200 text-left">작업요소명</th>
                <th className="px-1 py-0.5 border border-gray-200 w-10">Import</th>
                <th className="px-1 py-0.5 border border-gray-200 w-10">WS</th>
                <th className="px-1 py-0.5 border border-gray-200 w-16">상태</th>
              </tr>
            </thead>
            <tbody>
              {result.b1Trace
                .filter((t: StructureTraceItem) => !t.inWorksheet || !t.inImport)
                .map((t: StructureTraceItem, idx: number) => (
                <tr key={idx} className={t.inImport && !t.inWorksheet ? 'bg-red-50' : 'bg-yellow-50'}>
                  <td className="px-1 py-0.5 border border-gray-200 text-center text-gray-400">{idx + 1}</td>
                  <td className="px-1 py-0.5 border border-gray-200 text-center font-mono">{t.processNo}</td>
                  <td className="px-1 py-0.5 border border-gray-200 truncate max-w-[200px]" title={t.value}>{t.value}</td>
                  <td className="px-1 py-0.5 border border-gray-200 text-center">{t.inImport ? '✓' : '-'}</td>
                  <td className={`px-1 py-0.5 border border-gray-200 text-center font-bold ${t.inWorksheet ? 'text-green-600' : 'text-red-600'}`}>
                    {t.inWorksheet ? '✓' : '✗'}
                  </td>
                  <td className="px-1 py-0.5 border border-gray-200 text-center">
                    {t.inImport && !t.inWorksheet && <span className="text-red-600 font-bold">누락</span>}
                    {!t.inImport && <span className="text-yellow-600">WS전용</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 누락 원인 분류 (chain 단위) ── */}
      {result.failedCount > 0 && (
        <div className="mt-1 border border-red-200 rounded bg-red-50 px-2 py-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-bold text-red-700">chain 누락 상세 ({result.failedCount}건)</span>
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="px-2 py-0.5 bg-white border border-red-300 rounded text-red-600 font-bold cursor-pointer hover:bg-red-100"
            >
              {showDetail ? '접기 ▲' : '상세 ▼'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1 mb-1">
            {(Object.entries(result.reasonSummary) as [FailReason, number][])
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([reason, count]) => (
                <span key={reason} className="px-1.5 py-0.5 rounded font-bold text-white text-[9px]" style={{ background: REASON_LABELS[reason].color }}>
                  {REASON_LABELS[reason].label}: {count}건
                </span>
              ))}
          </div>

          {showDetail && (
            <table className="w-full border-collapse border border-gray-300 bg-white mt-1">
              <thead>
                <tr className="bg-gray-100 text-[9px] text-gray-600">
                  <th className="px-1 py-0.5 border border-gray-200 w-6">#</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-10">공정</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-8">4M</th>
                  <th className="px-1 py-0.5 border border-gray-200">FM</th>
                  <th className="px-1 py-0.5 border border-gray-200">FC</th>
                  <th className="px-1 py-0.5 border border-gray-200 w-20">원인</th>
                  <th className="px-1 py-0.5 border border-gray-200">진단</th>
                </tr>
              </thead>
              <tbody>
                {result.failedChains.map((fc, idx) => {
                  const reasonInfo = REASON_LABELS[fc.failReason];
                  return (
                    <tr key={idx} className="hover:bg-yellow-50">
                      <td className="px-1 py-0.5 border border-gray-200 text-center text-gray-400">{idx + 1}</td>
                      <td className="px-1 py-0.5 border border-gray-200 text-center font-mono">{fc.processNo}</td>
                      <td className="px-1 py-0.5 border border-gray-200 text-center">{fc.m4}</td>
                      <td className="px-1 py-0.5 border border-gray-200 truncate max-w-[120px]" title={fc.fmValue}>{fc.fmValue}</td>
                      <td className="px-1 py-0.5 border border-gray-200 truncate max-w-[120px]" title={fc.fcValue}>{fc.fcValue}</td>
                      <td className="px-1 py-0.5 border border-gray-200 text-center">
                        <span className="px-1 rounded text-white text-[8px] font-bold" style={{ background: reasonInfo.color }}>
                          {reasonInfo.label}
                        </span>
                      </td>
                      <td className="px-1 py-0.5 border border-gray-200 text-[8px] text-gray-600 truncate max-w-[200px]" title={fc.diagnostics}>
                        {fc.diagnostics}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 비고 텍스트 헬퍼 ───

function buildRemarkTitle(fm: FMTraceItem): string {
  const parts: string[] = [];
  if (fm.bestMatchText) parts.push(`유사: "${fm.bestMatchText}" (${((fm.bestSimilarity || 0) * 100).toFixed(0)}%)`);
  if (fm.crossProcessMatch) parts.push(`다른 공정 발견: 공정${fm.crossProcessMatch.processNo}(${fm.crossProcessMatch.processName})`);
  if (!fm.inImport) parts.push('Import에 없음 (자동생성 또는 수동추가 의심)');
  return parts.join(' | ');
}

function buildRemarkText(fm: FMTraceItem): string {
  if (fm.crossProcessMatch) return `→공정${fm.crossProcessMatch.processNo} (${fm.crossProcessMatch.processName})`;
  if (fm.bestMatchText) return `≈ ${fm.bestMatchText} (${((fm.bestSimilarity || 0) * 100).toFixed(0)}%)`;
  if (!fm.inImport) return '(Import에 없음)';
  return '';
}
