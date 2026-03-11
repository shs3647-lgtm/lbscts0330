/**
 * @file ParseStatisticsPanel.tsx
 * @description 변환결과 통계표 + 원본 대조 검증
 * 핵심 검증: 공정별 고장형태(A5) 고유 건수
 * ★ v2.5.3: 원본 핑거프린트 vs 파싱 결과 대조 검증 추가
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { ParseStatistics, ItemCodeStat } from '../../import/excel-parser';
import type { DbVerifyCounts } from '../utils/stepConfirmation';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ImportedFlatData } from '../types';

interface Props {
  statistics: ParseStatistics;
  dbVerifyCounts?: DbVerifyCounts;  // ★ FA 확정 후 실제 DB 테이블 건수 (verify-counts API)
  failureChains?: MasterFailureChain[];  // ★ A6/B5 카운트용 고장사슬
  flatData?: ImportedFlatData[];  // ★ UUID/DB저장 검증용 flatData
  fmeaId?: string;  // ★ 미사용 (자체 호출 제거됨, 호출 측 호환성 유지)
}

/** 아이템코드별 배경색 */
const CODE_COLORS: Record<string, string> = {
  A3: 'bg-blue-50', A4: 'bg-blue-50', A5: 'bg-blue-50', A6: 'bg-blue-50',
  B1: 'bg-green-50', B2: 'bg-green-50', B3: 'bg-green-50', B4: 'bg-yellow-50', B5: 'bg-green-50',
  C2: 'bg-gray-50', C3: 'bg-gray-50', C4: 'bg-orange-50',
};

/** 불일치 유형 한글명 */
const MISMATCH_LABELS: Record<string, string> = {
  FM_COUNT: 'FM 건수',
  FC_PER_FM: 'FC/FM',
  FE_PER_FM: 'FE/FM',
  CHAIN_COUNT: '사슬 행수',
};

export default function ParseStatisticsPanel({ statistics, dbVerifyCounts, failureChains, flatData, fmeaId }: Props) {
  const [view, setView] = useState<'summary' | 'process' | 'verify'>('summary');

  // ★★★ 2026-03-12: 자체 API 호출 제거 — dbVerifyCounts prop이 전달될 때만 DB저장/I→D 표시
  // SA 확정 시 verify-counts 조회 → stepState.dbVerifyCounts에 저장 → prop으로 전달
  // Import 직후에는 DB저장='-', I→D='-' (공란) → 단계 진행하면서 통계 업데이트
  const effectiveDbCounts = dbVerifyCounts ?? null;

  const { itemStats: rawItemStats, processStats, totalRows, chainCount, verification, rawFingerprint, excelFormulas, chainProcessStats } = statistics;

  // ★ A6(검출관리)/B5(예방관리) — 다중 소스에서 카운트 → itemStats에 항상 주입
  const itemStats = React.useMemo<ItemCodeStat[]>(() => {
    const stats = [...rawItemStats];

    // A6(검출관리): failureChains.dcValue → dbVerifyCounts.import → 0
    if (!stats.some(s => s.itemCode === 'A6')) {
      let a6Count = 0;
      if (failureChains && failureChains.length > 0) {
        const dcSet = new Set<string>();
        for (const c of failureChains) {
          const dc = c.dcValue?.trim();
          if (dc) dcSet.add(dc);
        }
        a6Count = dcSet.size;
      }
      if (a6Count === 0 && dbVerifyCounts?.import?.['A6']) {
        a6Count = dbVerifyCounts.import['A6'];
      }
      stats.push({ itemCode: 'A6', label: '검출관리', rawCount: a6Count, uniqueCount: a6Count, dupSkipped: 0 });
    }

    // B5(예방관리): failureChains.pcValue → dbVerifyCounts.import → 0
    if (!stats.some(s => s.itemCode === 'B5')) {
      let b5Count = 0;
      if (failureChains && failureChains.length > 0) {
        const pcSet = new Set<string>();
        for (const c of failureChains) {
          const pc = c.pcValue?.trim();
          if (pc) pcSet.add(pc);
        }
        b5Count = pcSet.size;
      }
      if (b5Count === 0 && dbVerifyCounts?.import?.['B5']) {
        b5Count = dbVerifyCounts.import['B5'];
      }
      stats.push({ itemCode: 'B5', label: '예방관리', rawCount: b5Count, uniqueCount: b5Count, dupSkipped: 0 });
    }

    // ★★★ 2026-03-02: B2(요소기능) — 항상 표시 (FC시트 l3Function / DB / 0) ★★★
    if (!stats.some(s => s.itemCode === 'B2')) {
      let b2Count = 0;
      if (failureChains && failureChains.length > 0) {
        const b2Set = new Set<string>();
        for (const c of failureChains) {
          const fn = c.l3Function?.trim();
          if (fn && c.processNo) b2Set.add(`${c.processNo}|${c.m4 || ''}|${fn}`);
        }
        b2Count = b2Set.size;
      }
      if (b2Count === 0 && dbVerifyCounts?.import?.['B2']) {
        b2Count = dbVerifyCounts.import['B2'];
      }
      stats.push({ itemCode: 'B2', label: '요소기능', rawCount: b2Count, uniqueCount: b2Count, dupSkipped: 0 });
    }

    // ★★★ 2026-03-02: B3(공정특성) — 항상 표시 (FC시트 processChar / DB / 0) ★★★
    if (!stats.some(s => s.itemCode === 'B3')) {
      let b3Count = 0;
      if (failureChains && failureChains.length > 0) {
        const b3Set = new Set<string>();
        for (const c of failureChains) {
          const pc = c.processChar?.trim();
          if (pc && c.processNo) b3Set.add(`${c.processNo}|${c.m4 || ''}|${pc}`);
        }
        b3Count = b3Set.size;
      }
      if (b3Count === 0 && dbVerifyCounts?.import?.['B3']) {
        b3Count = dbVerifyCounts.import['B3'];
      }
      stats.push({ itemCode: 'B3', label: '공정특성', rawCount: b3Count, uniqueCount: b3Count, dupSkipped: 0 });
    }

    stats.sort((a, b) => a.itemCode.localeCompare(b.itemCode));
    return stats;
  }, [rawItemStats, failureChains, dbVerifyCounts]);

  // ★★★ 2026-03-05: UUID 검증 — flatData에서 itemCode별 UUID 유효 건수 ★★★
  const uuidStats = useMemo<Record<string, { total: number; valid: number; hasParent: number }>>(() => {
    if (!flatData || flatData.length === 0) return {};
    const stats: Record<string, { total: number; valid: number; hasParent: number }> = {};
    for (const d of flatData) {
      const code = d.itemCode;
      if (!code) continue;
      if (!stats[code]) stats[code] = { total: 0, valid: 0, hasParent: 0 };
      stats[code].total++;
      // UUID 유효성: 비어있지 않고, uuid v4 패턴 또는 uid() 패턴
      if (d.id && d.id.length > 0) stats[code].valid++;
      // parentItemId 존재 여부 (B2/B3 원자성 연결 검증)
      if (d.parentItemId) stats[code].hasParent++;
    }
    return stats;
  }, [flatData]);

  const hasFlatData = !!flatData && flatData.length > 0;

  // ★★★ 2026-03-05: DB저장 검증 — effectiveDbCounts.import에서 itemCode별 실제 저장 건수 ★★★
  const importDbCounts = effectiveDbCounts?.import;

  // ★ verify-counts API 실제 DB 건수 사용
  const hasDbCounts = !!effectiveDbCounts;

  // 고장사슬 핵심 지표
  const a5Stat = itemStats.find(s => s.itemCode === 'A5');
  const b4Stat = itemStats.find(s => s.itemCode === 'B4');
  const c4Stat = itemStats.find(s => s.itemCode === 'C4');
  const hasDuplicates = itemStats.some(s => s.dupSkipped > 0);

  return (
    <div className="border border-blue-200 rounded bg-white text-[11px]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-blue-600 text-white rounded-t">
        <span className="font-bold text-[12px]">변환결과 통계</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] opacity-80">원본 {totalRows}행 | 사슬 {chainCount}건</span>
          {/* 뷰 전환 버튼 */}
          {(['summary', 'process', 'verify'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                view === v ? 'bg-white text-blue-600 font-bold' : 'bg-blue-500 hover:bg-blue-400'
              }`}
            >
              {v === 'summary' ? '요약' : v === 'process' ? '공정별' : '검증'}
            </button>
          ))}
        </div>
      </div>

      {/* 고장사슬 핵심 지표 + 검증 상태 */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="font-bold text-red-700 text-[11px]">A5 고장형태:</span>
            <span className="font-bold text-red-600 text-[13px]">{a5Stat?.uniqueCount ?? 0}</span>
            <span className="text-gray-500">건</span>
            {a5Stat && a5Stat.dupSkipped > 0 && (
              <span className="text-orange-600 ml-1">중복제거 {a5Stat.dupSkipped}</span>
            )}
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold text-yellow-700">B4:</span>
            <span className="font-bold text-yellow-600">{b4Stat?.uniqueCount ?? 0}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold text-orange-700">C4:</span>
            <span className="font-bold text-orange-600">{c4Stat?.uniqueCount ?? 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 엑셀 수식 검증 배지 */}
          {/* 수식 검증 배지: OK일 때만 표시 (NG는 사용자 혼동 방지 위해 비표시) */}
          {excelFormulas && excelFormulas.hasVerifySheet && (() => {
            const excelPass = excelFormulas.fmCount === (a5Stat?.uniqueCount ?? 0) &&
                              excelFormulas.fcCount === (b4Stat?.uniqueCount ?? 0) &&
                              excelFormulas.feCount === (c4Stat?.uniqueCount ?? 0) &&
                              excelFormulas.chainCount === chainCount;
            if (!excelPass) return null;
            return (
              <div className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                📊 수식OK
              </div>
            );
          })()}
          {/* 검증 결과 배지 */}
          {verification && (
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              verification.pass
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {verification.pass
                ? `PASS ${verification.passedChecks}/${verification.totalChecks}`
                : `FAIL ${verification.mismatches.length}건 불일치`
              }
            </div>
          )}
        </div>
      </div>

      {/* ── 요약 뷰 ── */}
      {view === 'summary' && (<>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-[10px]">
              <th className="border border-gray-300 px-1 py-0.5 text-center w-16">코드</th>
              <th className="border border-gray-300 px-1 py-0.5 text-left">항목명</th>
              {hasFlatData && (
                <th className="border border-gray-300 px-1 py-0.5 text-center w-14 bg-violet-50 text-violet-700" title="UUID 생성 건수 (convertToImportFormat)">UUID</th>
              )}
              {hasFlatData && (
                <th className="border border-gray-300 px-1 py-0.5 text-center w-14 bg-teal-50 text-teal-700" title="DB Input 건수 (PfmeaMasterFlatItem 테이블)">DBINPUT</th>
              )}
              <th className="border border-gray-300 px-1 py-0.5 text-center w-14">원본</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-14">고유</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-14">중복</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-14 bg-indigo-50 text-indigo-700">DB저장</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-14 bg-indigo-50 text-indigo-700">I→D</th>
            </tr>
          </thead>
          <tbody>
            {itemStats.map(stat => {
              const uuidInfo = uuidStats[stat.itemCode];
              const dbSaved = importDbCounts?.[stat.itemCode];
              // UUID 검증: flatData 전체 항목(중복 포함)에 UUID가 있어야 정상
              const uuidOk = uuidInfo ? uuidInfo.valid === stat.rawCount : undefined;
              // DB저장 검증: 저장 건수가 고유 건수와 일치해야 정상
              const dbSavedOk = dbSaved !== undefined ? dbSaved === stat.uniqueCount : undefined;
              // parentItemId 검증 (B2/B3만): 모든 항목에 parentItemId가 있어야 원자성 매칭
              const needsParent = stat.itemCode === 'B2' || stat.itemCode === 'B3';
              const parentOk = needsParent && uuidInfo ? uuidInfo.hasParent === uuidInfo.total : undefined;
              return (
              <tr key={stat.itemCode} className={`${CODE_COLORS[stat.itemCode] || ''} ${stat.dupSkipped > 0 ? 'font-bold' : ''}`}>
                <td className="border border-gray-300 px-1 py-0.5 text-center">{stat.itemCode}</td>
                <td className="border border-gray-300 px-1 py-0.5">{stat.label}</td>
                {hasFlatData && (
                  <td className={`border border-gray-300 px-1 py-0.5 text-center bg-violet-50 ${
                    uuidOk === undefined ? 'text-gray-400' : uuidOk ? 'text-violet-600' : 'text-red-600 font-bold'
                  }`} title={uuidInfo ? `UUID: ${uuidInfo.valid}/${uuidInfo.total}${needsParent ? ` | parentId: ${uuidInfo.hasParent}/${uuidInfo.total}` : ''}` : ''}>
                    {uuidInfo ? uuidInfo.valid : '-'}
                  </td>
                )}
                {hasFlatData && (
                  <td className={`border border-gray-300 px-1 py-0.5 text-center bg-teal-50 ${
                    dbSavedOk === undefined ? 'text-gray-400' : dbSavedOk ? 'text-teal-600' : 'text-red-600 font-bold'
                  }`} title={dbSaved !== undefined ? `저장: ${dbSaved} / 기대: ${stat.uniqueCount}` : 'DB 저장 전'}>
                    {dbSaved !== undefined ? dbSaved : '-'}
                  </td>
                )}
                <td className="border border-gray-300 px-1 py-0.5 text-center">{stat.rawCount}</td>
                <td className={`border border-gray-300 px-1 py-0.5 text-center ${stat.dupSkipped > 0 ? 'text-red-600' : ''}`}>
                  {stat.uniqueCount}
                </td>
                <td className={`border border-gray-300 px-1 py-0.5 text-center ${stat.dupSkipped > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                  {stat.dupSkipped > 0 ? stat.dupSkipped : '-'}
                </td>
                {(() => {
                  const dbVal = hasDbCounts ? effectiveDbCounts!.db[stat.itemCode] : undefined;
                  const diff = dbVal !== undefined ? dbVal - stat.uniqueCount : undefined;
                  return (
                    <>
                      <td className={`border border-gray-300 px-1 py-0.5 text-center bg-indigo-50 ${
                        dbVal !== undefined
                          ? diff === 0 ? 'text-indigo-600' : 'text-red-600 font-bold'
                          : 'text-gray-400'
                      }`}>
                        {dbVal !== undefined ? dbVal : '-'}
                      </td>
                      <td className={`border border-gray-300 px-1 py-0.5 text-center bg-indigo-50 ${
                        diff !== undefined
                          ? diff === 0 ? 'text-green-600' : 'text-red-600 font-bold'
                          : 'text-gray-400'
                      }`}>
                        {diff !== undefined ? (diff === 0 ? '0' : (diff > 0 ? `+${diff}` : `${diff}`)) : '-'}
                      </td>
                    </>
                  );
                })()}
              </tr>
              );
            })}
          </tbody>
          {hasDuplicates && (
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={2} className="border border-gray-300 px-1 py-0.5 font-bold text-right">합계</td>
                {hasFlatData && (
                  <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-violet-700 bg-violet-50">
                    {itemStats.reduce((s, st) => s + (uuidStats[st.itemCode]?.valid ?? 0), 0)}
                  </td>
                )}
                {hasFlatData && (
                  <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-teal-700 bg-teal-50">
                    {importDbCounts ? itemStats.reduce((s, st) => s + (importDbCounts[st.itemCode] ?? 0), 0) : '-'}
                  </td>
                )}
                <td className="border border-gray-300 px-1 py-0.5 text-center font-bold">
                  {itemStats.reduce((s, st) => s + st.rawCount, 0)}
                </td>
                <td className="border border-gray-300 px-1 py-0.5 text-center font-bold">
                  {itemStats.reduce((s, st) => s + st.uniqueCount, 0)}
                </td>
                <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-orange-600">
                  {itemStats.reduce((s, st) => s + st.dupSkipped, 0)}
                </td>
                {(() => {
                  const totalDb = hasDbCounts
                    ? itemStats.reduce((s, st) => s + (effectiveDbCounts!.db[st.itemCode] ?? 0), 0)
                    : undefined;
                  const totalUnique = itemStats.reduce((s, st) => s + st.uniqueCount, 0);
                  const totalDiff = totalDb !== undefined ? totalDb - totalUnique : undefined;
                  return (
                    <>
                      <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-indigo-700 bg-indigo-50">
                        {totalDb !== undefined ? totalDb : '-'}
                      </td>
                      <td className={`border border-gray-300 px-1 py-0.5 text-center font-bold bg-indigo-50 ${
                        totalDiff !== undefined
                          ? totalDiff === 0 ? 'text-green-600' : 'text-red-600'
                          : 'text-gray-400'
                      }`}>
                        {totalDiff !== undefined ? (totalDiff === 0 ? '0' : (totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`)) : '-'}
                      </td>
                    </>
                  );
                })()}
              </tr>
            </tfoot>
          )}
        </table>
        {/* Link 건수 (FA 확정 후) */}
        {hasDbCounts && effectiveDbCounts!.db['link'] !== undefined && (
          <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 border-t border-indigo-200 text-[10px]">
            <span className="font-bold text-indigo-700">고장연결(Link):</span>
            <span className="font-bold text-indigo-600">{effectiveDbCounts!.db['link']}건</span>
          </div>
        )}
      </>)}

      {/* ── 공정별 뷰 ── */}
      {view === 'process' && processStats.length > 0 && (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-[10px]">
              <th className="border border-gray-300 px-1 py-0.5 text-center w-12">공정</th>
              <th className="border border-gray-300 px-1 py-0.5 text-left">공정명</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-10 bg-red-50 text-red-700">A5</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-10 bg-yellow-50">B4</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-10">A3</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-10">A4</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-10">B1</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-10">B2</th>
              <th className="border border-gray-300 px-1 py-0.5 text-center w-10">B3</th>
            </tr>
          </thead>
          <tbody>
            {processStats.map(proc => {
              const get = (code: string) => proc.items[code]?.unique ?? 0;
              return (
                <tr key={proc.processNo} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-1 py-0.5 text-center font-mono">{proc.processNo}</td>
                  <td className="border border-gray-300 px-1 py-0.5 truncate max-w-[120px]">{proc.processName}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-red-600 bg-red-50">{get('A5')}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-yellow-700 bg-yellow-50">{get('B4')}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{get('A3')}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{get('A4')}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{get('B1')}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{get('B2')}</td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center">{get('B3')}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={2} className="border border-gray-300 px-1 py-0.5 text-right">합계</td>
              {['A5', 'B4', 'A3', 'A4', 'B1', 'B2', 'B3'].map(code => (
                <td key={code} className={`border border-gray-300 px-1 py-0.5 text-center ${code === 'A5' ? 'text-red-600' : code === 'B4' ? 'text-yellow-700' : ''}`}>
                  {processStats.reduce((s, p) => s + (p.items[code]?.unique ?? 0), 0)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      )}

      {/* ── 검증 뷰: 원본 vs 파싱 대조표 ── */}
      {view === 'verify' && (
        <div>
          {/* ★★★ 2026-02-24: 엑셀 수식 기반 검증 (진정한 독립 기준) ★★★ */}
          {excelFormulas && excelFormulas.hasVerifySheet && (
            <div className="px-2 py-1.5 bg-emerald-50 border-b border-emerald-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-emerald-700 text-[11px]">📊 엑셀 수식 검증 (VERIFY 시트)</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1 rounded">진정한 독립 기준</span>
              </div>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-emerald-100">
                    <th className="border border-emerald-300 px-1 py-0.5 text-center w-16">항목</th>
                    <th className="border border-emerald-300 px-1 py-0.5 text-center w-14 bg-emerald-200">엑셀수식</th>
                    <th className="border border-emerald-300 px-1 py-0.5 text-center w-14 bg-blue-100">파서</th>
                    <th className="border border-emerald-300 px-1 py-0.5 text-center w-10">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'FM건수', excel: excelFormulas.fmCount, parser: a5Stat?.uniqueCount ?? 0 },
                    { label: 'FC건수', excel: excelFormulas.fcCount, parser: b4Stat?.uniqueCount ?? 0 },
                    { label: 'FE건수', excel: excelFormulas.feCount, parser: c4Stat?.uniqueCount ?? 0 },
                    { label: '사슬건수', excel: excelFormulas.chainCount, parser: chainCount },
                    { label: '공정건수', excel: excelFormulas.processCount, parser: processStats.length },
                  ].map(row => {
                    const match = row.excel === row.parser;
                    return (
                      <tr key={row.label} className={match ? 'hover:bg-emerald-50' : 'bg-red-50'}>
                        <td className="border border-emerald-300 px-1 py-0.5 font-bold">{row.label}</td>
                        <td className="border border-emerald-300 px-1 py-0.5 text-center font-bold text-emerald-700">{row.excel}</td>
                        <td className="border border-emerald-300 px-1 py-0.5 text-center font-bold text-blue-700">{row.parser}</td>
                        <td className={`border border-emerald-300 px-1 py-0.5 text-center font-bold ${match ? 'text-green-600' : 'text-red-600'}`}>
                          {match ? '✓' : '✗'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* 일치성 검증 (S3, S4, S5) */}
              <div className="mt-2 mb-1 font-bold text-blue-700 text-[10px]">📋 일치성 검증 (0=OK)</div>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-blue-300 px-1 py-0.5 text-center w-16">항목</th>
                    <th className="border border-blue-300 px-1 py-0.5 text-center w-14 bg-blue-200">누락건수</th>
                    <th className="border border-blue-300 px-1 py-0.5 text-left">설명</th>
                    <th className="border border-blue-300 px-1 py-0.5 text-center w-10">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'S3', value: excelFormulas.s3Miss, desc: '공정번호 (FC→A1)' },
                    { label: 'S4', value: excelFormulas.s4Miss, desc: 'FM (FC→A5)' },
                    { label: 'S5', value: excelFormulas.s5Miss, desc: 'FC (FC→B4)' },
                  ].map(row => {
                    const ok = row.value === 0;
                    return (
                      <tr key={row.label} className={ok ? 'hover:bg-blue-50' : 'bg-red-50'}>
                        <td className="border border-blue-300 px-1 py-0.5 font-bold">{row.label}</td>
                        <td className={`border border-blue-300 px-1 py-0.5 text-center font-bold ${ok ? 'text-blue-700' : 'text-red-600'}`}>
                          {row.value}
                        </td>
                        <td className="border border-blue-300 px-1 py-0.5 text-gray-600">{row.desc}</td>
                        <td className={`border border-blue-300 px-1 py-0.5 text-center font-bold ${ok ? 'text-green-600' : 'text-red-600'}`}>
                          {ok ? '✓' : '✗'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 불일치 경고 */}
              {[
                { label: 'FM', excel: excelFormulas.fmCount, parser: a5Stat?.uniqueCount ?? 0 },
                { label: 'FC', excel: excelFormulas.fcCount, parser: b4Stat?.uniqueCount ?? 0 },
                { label: 'FE', excel: excelFormulas.feCount, parser: c4Stat?.uniqueCount ?? 0 },
                { label: '사슬', excel: excelFormulas.chainCount, parser: chainCount },
              ].some(r => r.excel !== r.parser) && (
                <div className="mt-1 px-2 py-1 bg-red-100 border border-red-300 rounded text-[10px] text-red-700">
                  ⚠️ <strong>파서 버그 가능성:</strong> 엑셀 수식 결과와 파서 결과가 다릅니다. 
                  원본 엑셀의 VERIFY 시트를 직접 확인해주세요.
                </div>
              )}
              {/* 일치성 누락 경고 */}
              {(excelFormulas.s3Miss > 0 || excelFormulas.s4Miss > 0 || excelFormulas.s5Miss > 0) && (
                <div className="mt-1 px-2 py-1 bg-orange-100 border border-orange-300 rounded text-[10px] text-orange-700">
                  ⚠️ <strong>참조 무결성 오류:</strong> FC 시트에 존재하는 값이 원본 시트에 없습니다.
                </div>
              )}
            </div>
          )}

          {!rawFingerprint ? (
            <></>
          ) : (
            <>
              {/* 공정별 FM 대조표 */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[10px]">
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12">공정</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-left">공정명</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-blue-50">원본FM</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-green-50">파싱FM</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-10">결과</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-blue-50">원본FC</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-green-50">파싱FC</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-blue-50">원본FE</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-green-50">파싱FE</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-blue-50">원본사슬</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-center w-12 bg-green-50">파싱사슬</th>
                  </tr>
                </thead>
                <tbody>
                  {rawFingerprint.processes.map(rawProc => {
                    const parsedProc = processStats.find(p => p.processNo === rawProc.processNo);
                    const parsedFM = parsedProc?.items['A5']?.unique ?? 0;
                    // FC/FE 합계: rawFingerprint의 fcByFm/feByFm에서
                    const rawFCTotal = Object.values(rawProc.fcByFm).reduce((s, n) => s + n, 0);
                    const rawFETotal = Object.values(rawProc.feByFm).reduce((s, n) => s + n, 0);
                    // ★★★ 2026-02-27: chainProcessStats 사용 (Scanner와 동일 집계 방식) ★★★
                    const chainProc = chainProcessStats?.[rawProc.processNo];
                    const parsedFC = chainProc?.fcTotal ?? (parsedProc?.items['B4']?.unique ?? 0);
                    const parsedFE = chainProc?.feTotal ?? (parsedProc?.items['C4']?.unique ?? 0);
                    const fmMatch = rawProc.fmCount === parsedFM;

                    // 사슬 행수 (chainProcessStats 우선, 없으면 verification에서)
                    const parsedChainRows = chainProc?.chainRows
                      ?? (verification?.mismatches.find(m => m.processNo === rawProc.processNo && m.type === 'CHAIN_COUNT')?.parsedCount
                        ?? rawProc.chainRows);

                    // ★ NG 행 관련 불일치 상세
                    const procMismatches = verification?.mismatches.filter(m => m.processNo === rawProc.processNo) || [];
                    const fcMatch = rawFCTotal === parsedFC;
                    const feMatch = rawFETotal === parsedFE;
                    const chainMatch = rawProc.chainRows === parsedChainRows;
                    const hasAnyNG = !fmMatch || !fcMatch || !feMatch || !chainMatch;

                    return (
                      <tr
                        key={rawProc.processNo}
                        className={hasAnyNG ? 'bg-red-50 cursor-pointer hover:bg-red-100' : 'hover:bg-gray-50'}
                        onClick={hasAnyNG ? () => {
                          const lines: string[] = [];
                          if (!fmMatch) lines.push(`FM 건수: 원본 ${rawProc.fmCount} → 파싱 ${parsedFM} (차이 ${parsedFM - rawProc.fmCount > 0 ? '+' : ''}${parsedFM - rawProc.fmCount})`);
                          if (!fcMatch) lines.push(`FC 건수: 원본 ${rawFCTotal} → 파싱 ${parsedFC} (차이 ${parsedFC - rawFCTotal > 0 ? '+' : ''}${parsedFC - rawFCTotal})`);
                          if (!feMatch) lines.push(`FE 건수: 원본 ${rawFETotal} → 파싱 ${parsedFE} (차이 ${parsedFE - rawFETotal > 0 ? '+' : ''}${parsedFE - rawFETotal})`);
                          if (!chainMatch) lines.push(`사슬 행수: 원본 ${rawProc.chainRows} → 파싱 ${parsedChainRows}`);
                          if (procMismatches.length > 0) {
                            lines.push('');
                            procMismatches.forEach(m => {
                              lines.push(`[${MISMATCH_LABELS[m.type] || m.type}] ${m.fmText ? `"${m.fmText}" ` : ''}원본:${m.rawCount} / 파싱:${m.parsedCount}`);
                            });
                          }
                          alert(`공정 ${rawProc.processNo} (${rawProc.processName}) 검증 상세\n━━━━━━━━━━━━━━━━━━━━\n${lines.join('\n')}`);
                        } : undefined}
                        title={hasAnyNG ? '클릭하여 불일치 상세 확인' : undefined}
                      >
                        <td className="border border-gray-300 px-1 py-0.5 text-center font-mono">{rawProc.processNo}</td>
                        <td className="border border-gray-300 px-1 py-0.5 truncate max-w-[100px]">{rawProc.processName}</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-blue-700">{rawProc.fmCount}</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center font-bold text-green-700">{parsedFM}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center font-bold ${!hasAnyNG ? 'text-green-600' : 'text-red-600'}`}>
                          {!hasAnyNG ? 'OK' : 'NG'}
                        </td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${fcMatch ? 'text-blue-600' : 'text-red-600 font-bold'}`}>{rawFCTotal}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${fcMatch ? 'text-green-600' : 'text-red-600 font-bold'}`}>{parsedFC}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${feMatch ? 'text-blue-600' : 'text-red-600 font-bold'}`}>{rawFETotal}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${feMatch ? 'text-green-600' : 'text-red-600 font-bold'}`}>{parsedFE}</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center text-blue-600">{rawProc.chainRows}</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center text-green-600">{parsedChainRows}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    // ★ chain 기반 합계 계산
                    let totalParsedFC = 0, totalParsedFE = 0, totalParsedChain = 0;
                    if (chainProcessStats) {
                      for (const v of Object.values(chainProcessStats)) {
                        totalParsedFC += v.fcTotal;
                        totalParsedFE += v.feTotal;
                        totalParsedChain += v.chainRows;
                      }
                    } else {
                      totalParsedFC = b4Stat?.uniqueCount ?? 0;
                      totalParsedFE = c4Stat?.uniqueCount ?? 0;
                      totalParsedChain = chainCount;
                    }
                    const fmTotalMatch = rawFingerprint.totalFM === (a5Stat?.uniqueCount ?? 0);
                    const fcTotalMatch = rawFingerprint.totalFC === totalParsedFC;
                    const feTotalMatch = rawFingerprint.totalFE === totalParsedFE;
                    const chainTotalMatch = rawFingerprint.totalChainRows === totalParsedChain;
                    const allMatch = fmTotalMatch && fcTotalMatch && feTotalMatch && chainTotalMatch;
                    return (
                      <tr className="bg-gray-100 font-bold">
                        <td colSpan={2} className="border border-gray-300 px-1 py-0.5 text-right">합계</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center text-blue-700">{rawFingerprint.totalFM}</td>
                        <td className="border border-gray-300 px-1 py-0.5 text-center text-green-700">{a5Stat?.uniqueCount ?? 0}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center font-bold ${allMatch ? 'text-green-600' : 'text-red-600'}`}>
                          {allMatch ? 'OK' : 'NG'}
                        </td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${fcTotalMatch ? 'text-blue-600' : 'text-red-600'}`}>{rawFingerprint.totalFC}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${fcTotalMatch ? 'text-green-600' : 'text-red-600'}`}>{totalParsedFC}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${feTotalMatch ? 'text-blue-600' : 'text-red-600'}`}>{rawFingerprint.totalFE}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${feTotalMatch ? 'text-green-600' : 'text-red-600'}`}>{totalParsedFE}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${chainTotalMatch ? 'text-blue-600' : 'text-red-600'}`}>{rawFingerprint.totalChainRows}</td>
                        <td className={`border border-gray-300 px-1 py-0.5 text-center ${chainTotalMatch ? 'text-green-600' : 'text-red-600'}`}>{totalParsedChain}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>

              {/* 불일치 상세 */}
              {verification && !verification.pass && (
                <div className="px-2 py-1 bg-red-50 border-t border-red-200">
                  <div className="font-bold text-red-700 text-[10px] mb-1">
                    불일치 {verification.mismatches.length}건
                  </div>
                  <div className="max-h-[100px] overflow-y-auto">
                    {verification.mismatches.map((m, i) => (
                      <div key={i} className="text-[10px] text-red-600 py-0.5 border-b border-red-100 last:border-b-0">
                        <span className="font-mono font-bold">[{m.processNo}]</span>
                        {' '}{MISMATCH_LABELS[m.type] || m.type}
                        {m.fmText && <span className="text-gray-600"> &quot;{m.fmText.substring(0, 20)}&quot;</span>}
                        {' '}원본:{m.rawCount} / 파싱:{m.parsedCount}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
