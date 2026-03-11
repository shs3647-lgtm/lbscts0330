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
}

interface RecommendImprovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RecommendCandidate[];
  onApplyAll: (options: { prevention: boolean; detection: boolean }) => void;
  onApplySingle: (uniqueKey: string, mode: 'prevention' | 'detection', value: string) => void;
  cftLeaderName: string;
}

// ─── AP 색상 ───

const AP_COLORS: Record<string, { bg: string; text: string }> = {
  H: { bg: '#ef5350', text: '#fff' },
  M: { bg: '#ffc107', text: '#000' },
  L: { bg: '#4caf50', text: '#fff' },
};

// ─── 컴포넌트 ───

export default function RecommendImprovementModal({
  isOpen, onClose, candidates, onApplyAll, onApplySingle, cftLeaderName,
}: RecommendImprovementModalProps) {
  // 체크 상태
  const [applyPrevention, setApplyPrevention] = useState(true);
  const [applyDetection, setApplyDetection] = useState(true);

  // 산업DB 개선안 모달 상태 (개별 항목 클릭 시)
  const [industryModal, setIndustryModal] = useState<{
    isOpen: boolean;
    mode: 'prevention' | 'detection';
    uniqueKey: string;
    fcText: string;
    fmText: string;
    processNo: string;
    processName: string;
    currentValues: string[];
    sodInfo: { s: number; o: number; d: number; ap: string };
  } | null>(null);

  // Floating window
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 820, height: 520, minWidth: 600, minHeight: 400,
  });

  // H/M 카운트
  const { hCount, mCount } = useMemo(() => {
    let h = 0, m = 0;
    candidates.forEach(c => { if (c.ap === 'H') h++; else if (c.ap === 'M') m++; });
    return { hCount: h, mCount: m };
  }, [candidates]);

  // 적용 가능 건수
  const applicableCount = useMemo(() => {
    let count = 0;
    candidates.forEach(c => {
      if (applyPrevention && !c.hasPrev && c.prevRecommend && c.prevRecommend !== 'N/A') count++;
      if (applyDetection && !c.hasDet && c.detRecommend && c.detRecommend !== 'N/A') count++;
    });
    return count;
  }, [candidates, applyPrevention, applyDetection]);

  // 전체적용 핸들러
  const handleApplyAll = useCallback(() => {
    onApplyAll({ prevention: applyPrevention, detection: applyDetection });
    onClose();
  }, [onApplyAll, applyPrevention, applyDetection, onClose]);

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
      currentValues: [],
      sodInfo: { s: candidate.s, o: candidate.o, d: candidate.d, ap: candidate.ap },
    });
  }, []);

  // IndustryImproveModal 저장 핸들러 — 다중 선택 지원
  const handleIndustrySave = useCallback((selectedValues: string[]) => {
    if (!industryModal || selectedValues.length === 0) return;
    const combined = selectedValues.map(v => `[추천] ${v}`).join('\n');
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
            <span className="font-bold text-sm">산업DB 개선추천</span>
            <HelpIcon compact iconSize={16} title="산업DB 개선추천 도움말" popoverWidth={460}>
              <div style={{ lineHeight: 1.9 }}>
                <b>산업DB 개선추천이란?</b>
                <p>위험분석(5단계)에서 AP(Action Priority)가 <b>H(높음)</b> 또는 <b>M(중간)</b>으로 평가된 항목에 대해, 산업DB의 예방관리/검출관리 데이터를 기반으로 <b>개선안을 자동 추천</b>하는 기능입니다.</p>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>사용 방법</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, width: 80 }}>전체적용</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>체크박스로 예방/검출 선택 후 <b>전체적용</b> 버튼 클릭 → 빈 셀에 일괄 반영</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>개별 적용</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>테이블의 초록/파란 셀 클릭 → 산업DB 모달에서 직접 선택</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>입력됨</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>이미 수동 입력된 항목은 덮어쓰지 않음 (보호)</td></tr>
                  </tbody>
                </table>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>추천 원리</b>
                <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
                  <li>AP=H/M 달성을 위한 <b>최소비용 경로</b>를 자동 계산</li>
                  <li>예방(O 개선)만으로 L 달성 가능하면 검출은 N/A 표시</li>
                  <li>산업DB의 예방/검출 방법 중 목표 O/D에 가장 적합한 것을 선택</li>
                  <li>추천값은 <span style={{ color: '#6b7280' }}>[추천]</span> 접두사로 표시되며, 수동 입력 시 덮어쓰기 가능</li>
                </ul>
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
              취소
            </button>
            <button
              onClick={handleApplyAll}
              disabled={applicableCount === 0}
              className={`px-3 py-1 text-[11px] font-bold text-white rounded ${
                applicableCount > 0
                  ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                  : 'bg-gray-500 cursor-not-allowed'
              }`}
            >
              전체적용<span className="text-[8px] opacity-70 ml-0.5">(Apply)</span> ({applicableCount}건)
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-lg font-bold ml-1">✕</button>
          </div>
        </div>

        {/* 옵션 바 */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={applyPrevention}
                onChange={e => setApplyPrevention(e.target.checked)}
                className="w-3.5 h-3.5 accent-green-600"
              />
              <span className="text-green-700">예방관리(PC) 전체적용</span>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={applyDetection}
                onChange={e => setApplyDetection(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-600"
              />
              <span className="text-blue-700">검출관리(DC) 전체적용</span>
            </label>
          </div>
          {cftLeaderName && (
            <span className="text-[10px] text-gray-500">
              책임자: {cftLeaderName}
            </span>
          )}
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 z-[1]">
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-1 py-0.5 w-8 text-center">#</th>
                <th className="border border-gray-300 px-2 py-0.5 text-left" style={{ width: '60px' }}><div className="leading-tight"><div>공정</div><div className="text-[8px] text-gray-400">(Process)</div></div></th>
                <th className="border border-gray-300 px-2 py-0.5 text-left" style={{ minWidth: '100px' }}><div className="leading-tight"><div>고장형태</div><div className="text-[8px] text-gray-400">(FM)</div></div></th>
                <th className="border border-gray-300 px-1 py-0.5 text-center" style={{ width: '60px' }}>S:O:D</th>
                <th className="border border-gray-300 px-1 py-0.5 text-center" style={{ width: '35px' }}>AP</th>
                <th className="border border-gray-300 px-2 py-0.5 text-left" style={{ minWidth: '150px' }}>
                  <div className="leading-tight"><div className="text-green-700">예방관리 개선</div><div className="text-[8px] text-gray-400">(PC Impr.)</div></div>
                </th>
                <th className="border border-gray-300 px-2 py-0.5 text-left" style={{ minWidth: '150px' }}>
                  <div className="leading-tight"><div className="text-blue-700">검출관리 개선</div><div className="text-[8px] text-gray-400">(DC Impr.)</div></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, idx) => (
                <tr key={c.uniqueKey} className="hover:bg-blue-50">
                  <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-400">{idx + 1}</td>
                  <td className="border border-gray-200 px-2 py-0.5 truncate" title={`${c.processNo} ${c.processName}`}>
                    {c.processNo}
                  </td>
                  <td className="border border-gray-200 px-2 py-0.5 truncate" title={c.fmText}>
                    {c.fmText || '-'}
                  </td>
                  <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-500">
                    {c.s}:{c.o}:{c.d}
                  </td>
                  <td className="border border-gray-200 px-1 py-0.5 text-center">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: AP_COLORS[c.ap]?.bg, color: AP_COLORS[c.ap]?.text }}
                    >
                      {c.ap}
                    </span>
                  </td>
                  {/* 예방관리 개선 셀 */}
                  <td className="border border-gray-200 px-1 py-0.5">
                    {c.hasPrev ? (
                      <span className="text-gray-500 text-[9px]">입력됨</span>
                    ) : c.prevRecommend && c.prevRecommend !== 'N/A' ? (
                      <button
                        onClick={() => handleItemClick(c, 'prevention')}
                        className="w-full text-left px-1 py-0.5 rounded text-[9px] bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 truncate"
                        title={c.prevRecommend}
                      >
                        {c.prevRecommend.replace('[추천] ', '')}
                      </button>
                    ) : (
                      <span className="text-gray-300 text-[9px]">-</span>
                    )}
                  </td>
                  {/* 검출관리 개선 셀 */}
                  <td className="border border-gray-200 px-1 py-0.5">
                    {c.hasDet ? (
                      <span className="text-gray-500 text-[9px]">입력됨</span>
                    ) : c.detRecommend && c.detRecommend !== 'N/A' ? (
                      <button
                        onClick={() => handleItemClick(c, 'detection')}
                        className="w-full text-left px-1 py-0.5 rounded text-[9px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 truncate"
                        title={c.detRecommend}
                      >
                        {c.detRecommend.replace('[추천] ', '')}
                      </button>
                    ) : (
                      <span className="text-gray-300 text-[9px]">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400 text-xs">
                    개선 추천 대상이 없습니다 (모든 AP가 L이거나, 이미 개선안이 입력됨)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 — 적용 건수 안내만 표시 (버튼은 헤더로 이동) */}
        <div className="px-4 py-1 border-t border-gray-200 bg-gray-50 flex items-center shrink-0">
          <span className="text-[10px] text-gray-500">
            {applicableCount > 0
              ? `${applicableCount}건 추천안이 적용됩니다`
              : '적용할 추천안이 없습니다'}
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
          currentValues={industryModal.currentValues}
          sodInfo={industryModal.sodInfo}
        />
      )}
    </>
  );

  return createPortal(modal, document.body);
}
