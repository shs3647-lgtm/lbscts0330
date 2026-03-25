/**
 * @file AutoLldResultModal.tsx
 * @description 습득교훈(LLD) 자동선택 결과 모달
 * - 예방/검출개선 입력 항목 중 LLD 매칭 결과 표시
 * - 체크박스로 개별 포함/제외 후 전체적용
 * - RecommendImprovementModal.tsx와 동일 UI 패턴 (floating window)
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import type { AutoLldCandidate, AutoLldModalState } from './hooks/useAutoLldHandlers';

interface AutoLldResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalState: AutoLldModalState;
  onApplyAll: () => void;
  onToggleCheck: (uniqueKey: string) => void;
  onToggleAllCheck: (checked: boolean) => void;
}

const CATEGORY_BADGE: Record<string, { bg: string; text: string }> = {
  '설계검증 예방': { bg: '#dbeafe', text: '#1d4ed8' },
  '설계검증 검출': { bg: '#fef3c7', text: '#b45309' },
};

export default function AutoLldResultModal({
  isOpen, onClose, modalState, onApplyAll, onToggleCheck, onToggleAllCheck,
}: AutoLldResultModalProps) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 900, height: 520, minWidth: 650, minHeight: 400,
  });

  const { candidates, totalEligible, totalMatched } = modalState;

  // 체크된 건수
  const checkedCount = useMemo(() => candidates.filter(c => c.checked && c.bestLld).length, [candidates]);
  const allMatchedChecked = useMemo(() => {
    const matched = candidates.filter(c => c.bestLld);
    return matched.length > 0 && matched.every(c => c.checked);
  }, [candidates]);

  const handleApply = useCallback(() => {
    onApplyAll();
  }, [onApplyAll]);

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed z-[9998] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 (드래그) */}
      <div
        className="bg-[#00587a] text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between cursor-move shrink-0"
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">습득교훈 자동선택</span>
          <span className="flex items-center gap-2 text-[11px]">
            <span className="text-white/70">대상 {totalEligible}건</span>
            <span className="px-2 py-0.5 rounded" style={{ background: totalMatched > 0 ? '#4caf50' : '#ef5350' }}>
              매칭 {totalMatched}건
            </span>
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
            onClick={handleApply}
            disabled={checkedCount === 0}
            className={`px-3 py-1 text-[11px] font-bold text-white rounded ${
              checkedCount > 0
                ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                : 'bg-gray-500 cursor-not-allowed'
            }`}
          >
            전체적용 ({checkedCount}건)
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg font-bold ml-1">✕</button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[10px]">
          <thead className="sticky top-0 z-[1]">
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-1 py-1 w-7 text-center">
                <input
                  type="checkbox"
                  checked={allMatchedChecked}
                  onChange={e => onToggleAllCheck(e.target.checked)}
                  className="w-3 h-3"
                  title="전체 선택/해제"
                />
              </th>
              <th className="border border-gray-300 px-1 py-1 w-8 text-center">#</th>
              <th className="border border-gray-300 px-2 py-1 text-left" style={{ width: '60px' }}>공정</th>
              <th className="border border-gray-300 px-2 py-1 text-left" style={{ minWidth: '100px' }}>고장형태</th>
              <th className="border border-gray-300 px-2 py-1 text-left" style={{ minWidth: '80px' }}>고장원인</th>
              <th className="border border-gray-300 px-1 py-1 text-center" style={{ width: '50px' }}>개선</th>
              <th className="border border-gray-300 px-2 py-1 text-center" style={{ width: '85px' }}>매칭 LLD</th>
              <th className="border border-gray-300 px-2 py-1 text-left" style={{ minWidth: '100px' }}>개선대책</th>
              <th className="border border-gray-300 px-1 py-1 text-center" style={{ width: '40px' }}>점수</th>
              <th className="border border-gray-300 px-1 py-1 text-center" style={{ width: '55px' }}>적용대상</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, idx) => {
              const hasMatch = c.bestLld !== null;
              const catBadge = hasMatch ? CATEGORY_BADGE[c.bestLld!.category] : null;
              return (
                <tr
                  key={c.uniqueKey}
                  className={hasMatch ? 'hover:bg-blue-50' : 'bg-gray-50'}
                  style={{ opacity: hasMatch ? 1 : 0.5 }}
                >
                  {/* 체크박스 */}
                  <td className="border border-gray-200 px-1 py-0.5 text-center">
                    {hasMatch ? (
                      <input
                        type="checkbox"
                        checked={c.checked}
                        onChange={() => onToggleCheck(c.uniqueKey)}
                        className="w-3 h-3"
                      />
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  {/* # */}
                  <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-400">{idx + 1}</td>
                  {/* 공정 */}
                  <td className="border border-gray-200 px-2 py-0.5 truncate" title={`${c.processNo} ${c.processName}`}>
                    {c.processNo}
                  </td>
                  {/* 고장형태 */}
                  <td className="border border-gray-200 px-2 py-0.5 truncate" title={c.fmText}>
                    {c.fmText || '-'}
                  </td>
                  {/* 고장원인 */}
                  <td className="border border-gray-200 px-2 py-0.5 truncate" title={c.fcText}>
                    {c.fcText || '-'}
                  </td>
                  {/* 개선 상태 */}
                  <td className="border border-gray-200 px-1 py-0.5 text-center">
                    <span className="flex items-center justify-center gap-0.5">
                      {c.hasPreventionOpt && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: '#dbeafe', color: '#1d4ed8' }}>PC</span>
                      )}
                      {c.hasDetectionOpt && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: '#fef3c7', color: '#b45309' }}>DC</span>
                      )}
                    </span>
                  </td>
                  {/* 매칭 LLD */}
                  <td className="border border-gray-200 px-2 py-0.5 text-center font-mono font-bold" style={{ color: hasMatch ? '#00587a' : '#999' }}>
                    {hasMatch ? c.bestLld!.lldNo : '미매칭'}
                  </td>
                  {/* 개선대책 */}
                  <td className="border border-gray-200 px-2 py-0.5 truncate" title={hasMatch ? c.bestLld!.improvement : ''}>
                    {hasMatch ? c.bestLld!.improvement : '-'}
                  </td>
                  {/* 점수 */}
                  <td className="border border-gray-200 px-1 py-0.5 text-center">
                    {c.score > 0 ? (
                      <span
                        title={c.matchReasons.join(', ')}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{
                          background: c.score >= 2 ? '#7c3aed' : c.score >= 1 ? '#a78bfa' : '#c4b5fd',
                          color: '#fff',
                        }}
                      >
                        {c.score.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  {/* 적용대상 */}
                  <td className="border border-gray-200 px-1 py-0.5 text-center">
                    {hasMatch && catBadge ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: catBadge.bg, color: catBadge.text }}
                      >
                        {c.applyTarget === 'prevention' ? '예방' : '검출'}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-6 text-gray-400 text-xs">
                  자동선택 대상이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 푸터 */}
      <div className="px-4 py-1 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-gray-500">
          {checkedCount > 0
            ? `${checkedCount}건 습득교훈이 적용됩니다`
            : totalMatched === 0
              ? '매칭되는 습득교훈이 없습니다 — LLD 데이터를 추가해주세요'
              : '적용할 항목을 선택해주세요'}
        </span>
        <span className="text-[10px] text-gray-400">
          미매칭 {totalEligible - totalMatched}건
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
  );

  return createPortal(modal, document.body);
}
