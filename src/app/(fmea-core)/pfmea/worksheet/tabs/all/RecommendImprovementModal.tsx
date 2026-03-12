/**
 * @file RecommendImprovementModal.tsx
 * @description 개선추천 전체적용 모달
 *
 * - 예방관리(PC) / 검출관리(DC) 선택 후 전체적용
 * - 개별 항목 클릭 시 IndustryImproveModal 연동 (부모 모달 유지)
 * - 적용 결과는 회색 [추천] 텍스트로 표시
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import IndustryImproveModal from '@/components/modals/IndustryImproveModal';
import { PLACEHOLDER_NA, RECOMMEND_PREFIX } from './allTabConstants';
import HelpIcon from '@/components/common/HelpIcon';

// ─── 타입 ───

export interface RecommendCandidate {
  uniqueKey: string;        // fmId-fcId
  fmId: string;
  fcId: string;
  processNo: string;
  processName: string;
  fmText: string;           // 고장형태명
  fcText: string;           // 고장원인명
  s: number;
  o: number;
  d: number;
  ap: 'H' | 'M' | 'L';
  hasPrev: boolean;         // 이미 예방개선 입력됨
  hasDet: boolean;          // 이미 검출개선 입력됨
  prevRecommend: string;    // 사전 계산된 예방 추천안
  detRecommend: string;     // 사전 계산된 검출 추천안
  // 5단계 현재 관리 텍스트
  curPrevText: string;      // 현재 예방관리(PC) 텍스트
  curDetText: string;       // 현재 검출관리(DC) 텍스트
  // 6단계 기존 개선안 텍스트 (이미 입력된 값)
  curPrevOpt: string;       // 기존 예방관리 개선안
  curDetOpt: string;        // 기존 검출관리 개선안
  // 개선 목표값
  targetO: number;          // 개선 후 목표 O'
  targetD: number;          // 개선 후 목표 D'
  targetAP: 'H' | 'M' | 'L';  // 개선 후 목표 AP' (L 목표)
}

interface RecommendImprovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RecommendCandidate[];
  onApplyAll: (options: { prevention: boolean; detection: boolean; checkedKeys?: Set<string> }) => void;
  onApplySingle: (uniqueKey: string, mode: 'prevention' | 'detection', value: string) => void;
  cftLeaderName: string;
  diagnostics?: {
    totalFMGroups: number;
    totalRows: number;
    sodMissingCount: number;
    apLCount: number;
  };
}

// ─── AP 색상 ───

const AP_COLORS: Record<string, { bg: string; text: string }> = {
  H: { bg: '#ef5350', text: '#fff' },
  M: { bg: '#ffc107', text: '#000' },
  L: { bg: '#4caf50', text: '#fff' },
};

// ─── 컴포넌트 ───

export default function RecommendImprovementModal({
  isOpen, onClose, candidates, onApplyAll, onApplySingle, cftLeaderName, diagnostics,
}: RecommendImprovementModalProps) {
  // 행별 체크 상태
  const [checkedRows, setCheckedRows] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    candidates.forEach(c => { init[c.uniqueKey] = true; });
    return init;
  });

  // 전체 선택/해제
  const allChecked = candidates.length > 0 && candidates.every(c => checkedRows[c.uniqueKey]);
  const toggleAll = useCallback(() => {
    const next = !allChecked;
    setCheckedRows(prev => {
      const updated = { ...prev };
      candidates.forEach(c => { updated[c.uniqueKey] = next; });
      return updated;
    });
  }, [allChecked, candidates]);

  const toggleRow = useCallback((uk: string) => {
    setCheckedRows(prev => ({ ...prev, [uk]: !prev[uk] }));
  }, []);

  // 산업DB 개선안 모달 상태 (개별 항목 클릭 시)
  const [industryModal, setIndustryModal] = useState<{
    isOpen: boolean;
    mode: 'prevention' | 'detection';
    uniqueKey: string;
    fcText: string;
    fmText: string;
    processNo: string;
    processName: string;
    pcText: string;
    dcText: string;
    currentValues: string[];
    sodInfo: { s: number; o: number; d: number; ap: string };
  } | null>(null);

  // Floating window
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 880, height: 520, minWidth: 700, minHeight: 400,
  });

  // H/M 카운트
  const { hCount, mCount } = useMemo(() => {
    let h = 0, m = 0;
    candidates.forEach(c => { if (c.ap === 'H') h++; else if (c.ap === 'M') m++; });
    return { hCount: h, mCount: m };
  }, [candidates]);

  // 선택된 행 기반 적용 가능 건수
  const checkedCount = useMemo(() => {
    return candidates.filter(c => checkedRows[c.uniqueKey]).length;
  }, [candidates, checkedRows]);

  // 선택 적용 핸들러 — 체크된 행만 적용
  const handleApplyChecked = useCallback(() => {
    const checkedKeys = new Set(
      candidates.filter(c => checkedRows[c.uniqueKey]).map(c => c.uniqueKey)
    );
    onApplyAll({ prevention: true, detection: true, checkedKeys });
    onClose();
  }, [onApplyAll, onClose, candidates, checkedRows]);

  // 개별 항목 클릭 → IndustryImproveModal 열기
  const handleItemClick = useCallback((candidate: RecommendCandidate, mode: 'prevention' | 'detection') => {
    setIndustryModal({
      isOpen: true,
      mode,
      uniqueKey: candidate.uniqueKey,
      fcText: candidate.fcText,
      fmText: candidate.fmText,
      processNo: candidate.processNo,
      processName: candidate.processName,
      pcText: candidate.curPrevText,
      dcText: candidate.curDetText,
      currentValues: [],
      sodInfo: { s: candidate.s, o: candidate.o, d: candidate.d, ap: candidate.ap },
    });
  }, []);

  // IndustryImproveModal 저장 핸들러 — 다중 선택 지원
  const handleIndustrySave = useCallback((selectedValues: string[]) => {
    if (!industryModal || selectedValues.length === 0) return;
    const combined = selectedValues.map(v => `${RECOMMEND_PREFIX} ${v}`).join('\n');
    onApplySingle(industryModal.uniqueKey, industryModal.mode, combined);
    setIndustryModal(null);
  }, [industryModal, onApplySingle]);

  if (!isOpen) return null;

  const modal = (
    <>
      {/* ★ 부모 모달 — z-index: 9998 */}
      <div
        className="fixed z-[9998] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
        style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      >
        {/* 헤더 (드래그) */}
        <div
          className="bg-[#1565c0] text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between cursor-move shrink-0"
          onMouseDown={onDragStart}
        >
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">산업DB 개선추천(Industry DB Recommend)</span>
            <HelpIcon title="산업DB 개선추천 도움말" popoverWidth={480}>
              <div style={{ lineHeight: 1.8 }}>
                <b>산업DB 개선추천이란?</b>
                <p>위험분석(5단계)에서 AP가 <b>H(높음)</b> 또는 <b>M(중간)</b>인 항목에 대해, 산업DB의 예방/검출 데이터를 기반으로 <b>개선안을 자동 추천</b>하는 기능입니다.</p>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>테이블 컬럼 설명</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, width: 100 }}>공정(Proc.)</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>공정 번호</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>고장형태(FM)</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>2레벨 고장형태 (Failure Mode)</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>고장원인(FC)</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>3레벨 고장원인 (Failure Cause)</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>S:O:D</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>현재 심각도:발생도:검출도 점수</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#2e7d32' }}>예방관리 현재</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>5단계에서 기입한 현재 예방관리(PC) 방법</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#2e7d32' }}>예방관리 개선</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>6단계 예방 개선안 — <span style={{ color: '#2e7d32' }}>초록셀</span> 클릭 시 산업DB에서 직접 선택</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#1565c0' }}>검출관리 현재</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>5단계에서 기입한 현재 검출관리(DC) 방법</td></tr>
                    <tr><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#1565c0' }}>검출관리 개선</td><td style={{ padding: '2px 6px', borderBottom: '1px solid #e5e7eb' }}>6단계 검출 개선안 — <span style={{ color: '#1565c0' }}>파란셀</span> 클릭 시 산업DB에서 직접 선택</td></tr>
                  </tbody>
                </table>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>사용 방법</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, width: 80 }}>선택적용</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>체크박스로 원하는 행 선택 → <b>선택적용(Apply)</b> 클릭 → 빈 셀에 일괄 반영</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>개별 선택</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>초록/파란 셀 클릭 → <b>업계 개선사례</b> 모달에서 방법 직접 선택</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>수동 입력</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>N/A 항목은 모달 닫은 후 워크시트 6단계 영역에서 직접 텍스트 입력 가능</td></tr>
                  </tbody>
                </table>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>N/A 표시 의미</b>
                <p><b>N/A = 이 쪽은 자동추천 불필요</b>입니다. 예방(O)만 개선해도 L 달성 가능하면 검출은 N/A, 반대도 마찬가지입니다. N/A여도 워크시트에서 수동 입력은 가능합니다.</p>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>AP 등급 기준</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '2px 6px', background: '#ef5350', color: '#fff', fontWeight: 700, width: 40, textAlign: 'center' }}>H</td><td style={{ padding: '2px 6px' }}>즉시 조치 필요 — 개선 조치 기록 필수</td></tr>
                    <tr><td style={{ padding: '2px 6px', background: '#ffc107', color: '#000', fontWeight: 700, textAlign: 'center' }}>M</td><td style={{ padding: '2px 6px' }}>개선 권장 — 적절한 시기에 조치</td></tr>
                    <tr><td style={{ padding: '2px 6px', background: '#4caf50', color: '#fff', fontWeight: 700, textAlign: 'center' }}>L</td><td style={{ padding: '2px 6px' }}>현재 수준 유지 (추천 대상 제외)</td></tr>
                  </tbody>
                </table>
              </div>
            </HelpIcon>
            <span className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded" style={{ background: '#ef5350' }}>H:{hCount}</span>
              <span className="px-2 py-0.5 rounded" style={{ background: '#ffc107', color: '#000' }}>M:{mCount}</span>
              <span className="text-white/70">총 {candidates.length}건</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-[11px] text-white/80 bg-white/15 border border-white/30 rounded hover:bg-white/25"
            >
              취소(Cancel)
            </button>
            <button
              onClick={handleApplyChecked}
              disabled={checkedCount === 0}
              className={`px-3 py-1 text-[11px] font-bold text-white rounded ${
                checkedCount > 0
                  ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                  : 'bg-gray-500 cursor-not-allowed'
              }`}
            >
              선택적용(Apply) ({checkedCount}건)
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-lg font-bold ml-1">✕</button>
          </div>
        </div>

        {/* 옵션 바 */}
        <div className="px-3 py-1 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-gray-500">
            체크된 항목만 적용됩니다. 예방/검출 중 하나만 개선해도 AP→L 달성 가능합니다.
          </span>
          {cftLeaderName && (
            <span className="text-[10px] text-gray-500">
              책임자(Leader): {cftLeaderName}
            </span>
          )}
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 z-[1]">
              <tr className="bg-gray-100 text-center text-[9px]">
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '24px' }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3 h-3 accent-green-600" />
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '28px' }}>
                  <div>공정</div><div className="text-[7px] text-gray-400">(Proc.)</div>
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '60px' }}>
                  <div>고장형태</div><div className="text-[7px] text-gray-400">(FM)</div>
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '60px' }}>
                  <div>고장원인</div><div className="text-[7px] text-gray-400">(FC)</div>
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '36px' }}>S:O:D</th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '22px' }}>AP</th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '18%' }}>
                  <div className="text-green-700">예방관리 현재</div><div className="text-[7px] text-gray-400">(PC, O)</div>
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '18%' }}>
                  <div className="text-green-700">예방관리 개선</div><div className="text-[7px] text-gray-400">(PC&apos;, O&apos;)</div>
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '18%' }}>
                  <div className="text-blue-700">검출관리 현재</div><div className="text-[7px] text-gray-400">(DC, D)</div>
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '18%' }}>
                  <div className="text-blue-700">검출관리 개선</div><div className="text-[7px] text-gray-400">(DC&apos;, D&apos;)</div>
                </th>
                <th className="border border-gray-300 px-0.5 py-0.5" style={{ width: '22px' }}>AP&apos;</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const apPrime = AP_COLORS[c.targetAP] || AP_COLORS.L;
                const isChecked = !!checkedRows[c.uniqueKey];
                return (
                <tr key={c.uniqueKey} className="hover:bg-blue-50">
                  {/* 체크박스 */}
                  <td className="border border-gray-200 px-0.5 py-0 text-center">
                    <input type="checkbox" checked={isChecked} onChange={() => toggleRow(c.uniqueKey)} className="w-3 h-3 accent-green-600" />
                  </td>
                  <td className="border border-gray-200 px-0.5 py-0 text-center text-[9px]" title={`${c.processNo} ${c.processName}`}>
                    {c.processNo}
                  </td>
                  <td className="border border-gray-200 px-1 py-0 text-center text-[9px]" style={{ lineHeight: '1.2' }} title={c.fmText}>
                    <div className="line-clamp-2">{c.fmText || '-'}</div>
                  </td>
                  <td className="border border-gray-200 px-1 py-0 text-center text-[9px]" style={{ lineHeight: '1.2' }} title={c.fcText}>
                    <div className="line-clamp-2">{c.fcText || '-'}</div>
                  </td>
                  <td className={`border border-gray-200 px-0.5 py-0 text-center text-[9px] ${c.s <= 0 || c.o <= 0 || c.d <= 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                    {c.s > 0 || c.o > 0 || c.d > 0
                      ? `${c.s || '-'}:${c.o || '-'}:${c.d || '-'}`
                      : <span className="text-[8px]">미입력</span>}
                  </td>
                  <td className="border border-gray-200 px-0.5 py-0 text-center">
                    {c.s > 0 && c.o > 0 && c.d > 0 ? (
                      <span className="inline-block px-1 rounded text-[9px] font-bold" style={{ background: AP_COLORS[c.ap]?.bg, color: AP_COLORS[c.ap]?.text }}>
                        {c.ap}
                      </span>
                    ) : (
                      <span className="text-[8px] text-gray-400">-</span>
                    )}
                  </td>
                  {/* 예방관리 현재(O) */}
                  <td className="border border-gray-200 px-1 py-0 text-center text-[9px]" style={{ lineHeight: '1.2' }}>
                    <div className="line-clamp-2" title={c.curPrevText || '-'}>
                      {c.curPrevText || <span className="text-gray-300">-</span>}
                    </div>
                    <div className="text-orange-600 font-semibold text-[8px]">O={c.o}</div>
                  </td>
                  {/* 예방관리 개선(O') */}
                  <td className="border border-gray-200 px-1 py-0 text-center text-[9px]" style={{ lineHeight: '1.2' }}>
                    {c.hasPrev ? (
                      <div>
                        <div className="line-clamp-2 text-gray-500" title={c.curPrevOpt}>{c.curPrevOpt || '-'}</div>
                        <div className="text-orange-600 font-semibold text-[8px]">O&apos;={c.targetO}</div>
                      </div>
                    ) : c.prevRecommend && c.prevRecommend !== PLACEHOLDER_NA ? (
                      <button
                        onClick={() => handleItemClick(c, 'prevention')}
                        className="w-full px-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                        title={c.prevRecommend}
                        style={{ lineHeight: '1.2' }}
                      >
                        <div className="line-clamp-2">{c.prevRecommend.replace(`${RECOMMEND_PREFIX} `, '')}</div>
                        <div className="text-orange-600 font-semibold text-[8px]">O&apos;={c.targetO}</div>
                      </button>
                    ) : (
                      <span className="text-gray-400 text-[8px]">{PLACEHOLDER_NA}</span>
                    )}
                  </td>
                  {/* 검출관리 현재(D) */}
                  <td className="border border-gray-200 px-1 py-0 text-center text-[9px]" style={{ lineHeight: '1.2' }}>
                    <div className="line-clamp-2" title={c.curDetText || '-'}>
                      {c.curDetText || <span className="text-gray-300">-</span>}
                    </div>
                    <div className="text-purple-600 font-semibold text-[8px]">D={c.d}</div>
                  </td>
                  {/* 검출관리 개선(D') */}
                  <td className="border border-gray-200 px-1 py-0 text-center text-[9px]" style={{ lineHeight: '1.2' }}>
                    {c.hasDet ? (
                      <div>
                        <div className="line-clamp-2 text-gray-500" title={c.curDetOpt}>{c.curDetOpt || '-'}</div>
                        <div className="text-purple-600 font-semibold text-[8px]">D&apos;={c.targetD}</div>
                      </div>
                    ) : c.detRecommend && c.detRecommend !== PLACEHOLDER_NA ? (
                      <button
                        onClick={() => handleItemClick(c, 'detection')}
                        className="w-full px-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                        title={c.detRecommend}
                        style={{ lineHeight: '1.2' }}
                      >
                        <div className="line-clamp-2">{c.detRecommend.replace(`${RECOMMEND_PREFIX} `, '')}</div>
                        <div className="text-purple-600 font-semibold text-[8px]">D&apos;={c.targetD}</div>
                      </button>
                    ) : (
                      <span className="text-gray-400 text-[8px]">{PLACEHOLDER_NA}</span>
                    )}
                  </td>
                  {/* AP' */}
                  <td className="border border-gray-200 px-0.5 py-0 text-center">
                    <span className="inline-block px-1 rounded text-[9px] font-bold" style={{ background: apPrime.bg, color: apPrime.text }}>
                      {c.targetAP}
                    </span>
                  </td>
                </tr>
                );
              })}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-xs">
                    <div className="text-gray-400 mb-3">개선 추천 대상이 없습니다</div>
                    {diagnostics && (
                      <div className="inline-block text-left bg-gray-50 border border-gray-200 rounded px-4 py-2 text-[10px]">
                        <div className="font-semibold text-gray-600 mb-1">진단 정보(Diagnostics)</div>
                        <div className="text-gray-500">고장연결 그룹(FM): <b className="text-gray-700">{diagnostics.totalFMGroups}개</b></div>
                        <div className="text-gray-500">FC 행 수: <b className="text-gray-700">{diagnostics.totalRows}건</b></div>
                        {diagnostics.sodMissingCount > 0 && (
                          <div className="text-orange-600">⚠ S:O:D 미입력: <b>{diagnostics.sodMissingCount}건</b> — 5단계 위험분석에서 SOD를 먼저 입력하세요</div>
                        )}
                        {diagnostics.apLCount > 0 && (
                          <div className="text-green-600">✓ AP=L (개선 불필요): <b>{diagnostics.apLCount}건</b></div>
                        )}
                        {diagnostics.totalFMGroups === 0 && (
                          <div className="text-red-500">⚠ 고장연결이 없습니다 — 고장연결 탭에서 FE↔FM↔FC를 먼저 연결하세요</div>
                        )}
                        {diagnostics.totalRows === 0 && diagnostics.totalFMGroups > 0 && (
                          <div className="text-red-500">⚠ FC가 없습니다 — 고장원인(FC)을 먼저 입력하세요</div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 — 적용 건수 안내만 표시 (버튼은 헤더로 이동) */}
        <div className="px-4 py-1 border-t border-gray-200 bg-gray-50 flex items-center shrink-0">
          <span className="text-[10px] text-gray-500">
            {checkedCount > 0
              ? `${checkedCount}건 선택됨 — 선택적용(Apply) 클릭 시 체크된 항목의 추천안이 적용됩니다`
              : '적용할 항목을 체크해주세요'}
          </span>
        </div>

        {/* 리사이즈 핸들 */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* ★ 산업DB 개선안 모달 — z-index: 50000 (IndustryImproveModal 기본값, 부모 모달 위에 표시) */}
      {industryModal?.isOpen && (
        <IndustryImproveModal
          isOpen={true}
          onClose={() => setIndustryModal(null)}
          onSave={handleIndustrySave}
          mode={industryModal.mode}
          fcText={industryModal.fcText}
          fmText={industryModal.fmText}
          processNo={industryModal.processNo}
          processName={industryModal.processName}
          pcText={industryModal.pcText}
          dcText={industryModal.dcText}
          currentValues={industryModal.currentValues}
          sodInfo={industryModal.sodInfo}
        />
      )}
    </>
  );

  return createPortal(modal, document.body);
}
