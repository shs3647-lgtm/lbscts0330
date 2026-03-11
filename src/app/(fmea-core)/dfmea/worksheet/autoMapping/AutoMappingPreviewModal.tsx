/**
 * @file AutoMappingPreviewModal.tsx
 * @description 자동매핑 트리뷰 미리보기 — 매칭/누락 확인 후 진행/취소
 *
 * 흐름: 자동모드 → Gatekeeper 검증 → ★ 이 모달로 트리뷰 표시 → 사용자 확인 → 매핑 진행
 */

'use client';

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { GatekeeperResult, MatchedEntry, RejectionReason } from './gatekeeper';

/** 트리 노드: 공정 → 작업요소 → 매칭된 데이터 */
interface TreeNode {
  procNo: string;
  procName: string;
  children: WorkElementNode[];
}

interface WorkElementNode {
  m4: string;
  weName: string;
  matched: { itemCode: string; value: string }[];
  isMissing: boolean; // 매칭 데이터 없음
}

type AutoMappingTab =
  | 'function-l1' | 'function-l2' | 'function-l3'
  | 'failure-l1' | 'failure-l2' | 'failure-l3';

interface AutoMappingPreviewModalProps {
  isOpen: boolean;
  tab: AutoMappingTab;
  result: GatekeeperResult;
  state: any; // WorksheetState
  onConfirm: (action: 'proceed' | 'remove-missing') => void;
  onCancel: () => void;
}

/** 트리뷰 데이터 구축 (L3용) */
function buildTreeL3(state: any, result: GatekeeperResult): TreeNode[] {
  const l2 = state.l2 || [];
  const matchedMap = new Map<string, { itemCode: string; value: string }[]>();

  for (const entry of result.matched) {
    const key = `${entry.room.processNo}::${entry.room.m4 || ''}`;
    if (!matchedMap.has(key)) matchedMap.set(key, []);
    matchedMap.get(key)!.push({ itemCode: entry.data.itemCode, value: entry.data.value });
  }

  return l2.map((proc: any) => {
    const procNo = String(proc.no || '').trim();
    const children: WorkElementNode[] = (proc.l3 || []).map((we: any) => {
      const m4 = (we.m4 || '').trim().toUpperCase();
      const roomKey = `${procNo}::${m4}`;
      const matched = matchedMap.get(roomKey) || [];
      return {
        m4,
        weName: (we.name || '').trim() || '(이름없음)',
        matched,
        isMissing: matched.length === 0,
      };
    });
    return { procNo, procName: (proc.name || '').trim(), children };
  });
}

/** 트리뷰 데이터 구축 (L2용) */
function buildTreeL2(state: any, result: GatekeeperResult): TreeNode[] {
  const l2 = state.l2 || [];
  const matchedMap = new Map<string, { itemCode: string; value: string }[]>();

  for (const entry of result.matched) {
    const key = entry.room.processNo;
    if (!matchedMap.has(key)) matchedMap.set(key, []);
    matchedMap.get(key)!.push({ itemCode: entry.data.itemCode, value: entry.data.value });
  }

  return l2.map((proc: any) => {
    const procNo = String(proc.no || '').trim();
    const matched = matchedMap.get(procNo) || [];
    return {
      procNo,
      procName: (proc.name || '').trim(),
      children: [{
        m4: '',
        weName: (proc.name || '').trim(),
        matched,
        isMissing: matched.length === 0,
      }],
    };
  });
}

/** 트리뷰 데이터 구축 (L1용 — types: YP/SP/USER) */
function buildTreeL1(state: any, result: GatekeeperResult): TreeNode[] {
  const types = state.l1?.types || [];
  const matchedMap = new Map<string, { itemCode: string; value: string }[]>();

  for (const entry of result.matched) {
    const key = (entry.room.processNo || '').toUpperCase().trim();
    if (!matchedMap.has(key)) matchedMap.set(key, []);
    matchedMap.get(key)!.push({ itemCode: entry.data.itemCode, value: entry.data.value });
  }

  return types.map((t: any) => {
    const typeName = (t.name || '').trim();
    const typeKey = typeName.toUpperCase();
    const matched = matchedMap.get(typeKey) || [];
    return {
      procNo: typeName,
      procName: typeName,
      children: [{
        m4: '',
        weName: typeName,
        matched,
        isMissing: matched.length === 0,
      }],
    };
  });
}

/** 거부 사유 한국어 라벨 */
const REASON_LABELS: Record<RejectionReason, string> = {
  NO_ROOM: '구조에 없는 공정번호',
  WRONG_ROOM: '4M 불일치/누락',
  EMPTY_KEY: '빈 값',
  WRONG_KEY_TYPE: 'itemCode 불일치',
  HOTEL_MISMATCH: 'FMEA ID 불일치',
  CASCADE: '연쇄 삭제',
};

const REASON_COLORS: Record<RejectionReason, string> = {
  NO_ROOM: 'text-red-600',
  WRONG_ROOM: 'text-orange-600',
  EMPTY_KEY: 'text-yellow-700',
  WRONG_KEY_TYPE: 'text-red-700',
  HOTEL_MISMATCH: 'text-red-800',
  CASCADE: 'text-orange-500',
};

/** 거부 목록 섹션 — 사유별 그룹핑 */
function RejectedSection({ rejected }: { rejected: { reason: RejectionReason; detail: string }[] }) {
  // 사유별 그룹핑
  const groups = new Map<RejectionReason, string[]>();
  for (const r of rejected) {
    if (!groups.has(r.reason)) groups.set(r.reason, []);
    groups.get(r.reason)!.push(r.detail);
  }

  return (
    <div className="px-4 py-2 border-t bg-orange-50">
      <div className="text-[10px] font-bold text-orange-700 mb-1">
        거부된 데이터 ({rejected.length}건)
      </div>
      <div className="max-h-[100px] overflow-auto space-y-1.5">
        {Array.from(groups.entries()).map(([reason, details]) => (
          <div key={reason}>
            <div className={`text-[9px] font-bold ${REASON_COLORS[reason] || 'text-orange-600'}`}>
              [{REASON_LABELS[reason] || reason}] {details.length}건
            </div>
            {details.slice(0, 3).map((d, i) => (
              <div key={i} className="text-[8px] text-gray-500 ml-2 truncate">{d}</div>
            ))}
            {details.length > 3 && (
              <div className="text-[8px] text-gray-400 ml-2">외 {details.length - 3}건...</div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 text-[9px] text-orange-600 font-medium">
        거부된 항목은 워크시트에서 수동으로 입력해주세요.
      </div>
    </div>
  );
}

export default function AutoMappingPreviewModal({
  isOpen, tab, result, state, onConfirm, onCancel,
}: AutoMappingPreviewModalProps) {
  const tree = useMemo(() => {
    if (tab === 'function-l1' || tab === 'failure-l1') return buildTreeL1(state, result);
    if (tab === 'function-l3' || tab === 'failure-l3') return buildTreeL3(state, result);
    return buildTreeL2(state, result);
  }, [tab, state, result]);

  const totalMissing = useMemo(() =>
    tree.reduce((sum, node) => sum + node.children.filter(c => c.isMissing).length, 0),
    [tree]);
  const totalMatched = useMemo(() =>
    tree.reduce((sum, node) => sum + node.children.filter(c => !c.isMissing).length, 0),
    [tree]);

  if (!isOpen || typeof window === 'undefined') return null;

  const isL1 = tab === 'function-l1' || tab === 'failure-l1';
  const isL3 = tab === 'function-l3' || tab === 'failure-l3';
  const tabLabel = tab.includes('function') ? '기능분석' : '고장분석';
  const levelLabel = isL1 ? '1L' : isL3 ? '3L' : '2L';

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-black/40 z-[9998]" onClick={onCancel} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
          {/* 헤더 */}
          <div className="px-4 py-2 bg-blue-700 text-white rounded-t-lg flex items-center justify-between">
            <span className="text-[12px] font-bold">{levelLabel} {tabLabel} 자동매핑 미리보기</span>
            <button onClick={onCancel} className="w-5 h-5 flex items-center justify-center text-white/80 hover:text-white text-sm">X</button>
          </div>

          {/* 요약 */}
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-3 text-[11px]">
            <span className="font-bold text-green-700">매칭: {totalMatched}건</span>
            {totalMissing > 0 && <span className="font-bold text-red-600">누락: {totalMissing}건</span>}
            {result.rejected.length > 0 && <span className="font-bold text-orange-600">거부: {result.rejected.length}건</span>}
          </div>

          {/* 트리뷰 */}
          <div className="flex-1 overflow-auto px-2 py-2" style={{ maxHeight: '50vh' }}>
            {tree.map((node) => (
              <div key={node.procNo} className="mb-2">
                {/* 공정 노드 */}
                <div className="flex items-center gap-1 px-1 py-0.5 bg-blue-50 rounded text-[11px] font-bold text-blue-800">
                  <span className="text-[10px]">&#9654;</span>
                  <span>{node.procNo}. {node.procName}</span>
                </div>
                {/* 작업요소/공정 하위 */}
                {node.children.map((child, ci) => (
                  <div key={ci} className="ml-4 mt-0.5">
                    <div className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] ${
                      child.isMissing ? 'bg-red-100 border border-red-300 text-red-700' : 'bg-green-50 text-green-800'
                    }`}>
                      <span className="font-bold w-4 text-center">
                        {child.isMissing ? 'X' : 'O'}
                      </span>
                      {isL3 && <span className="font-bold text-[9px] px-1 rounded bg-gray-200 text-gray-700">{child.m4}</span>}
                      <span className="font-medium">{child.weName}</span>
                      {child.isMissing && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-200 px-1.5 py-0.5 rounded ml-auto">
                          데이타 누락
                        </span>
                      )}
                      {!child.isMissing && <span className="text-[9px] text-green-600 ml-auto">{child.matched.length}건</span>}
                    </div>
                    {/* ★ 누락 항목 방어코드: 빈 데이터 안내 */}
                    {child.isMissing && (
                      <div className="ml-5 mt-0.5 text-[9px] text-red-500 font-medium">
                        마스터 기초정보에 해당 데이터 없음 → 빈 행 생성 또는 제외
                      </div>
                    )}
                    {/* 매칭된 데이터 목록 */}
                    {!child.isMissing && child.matched.length > 0 && (
                      <div className="ml-5 mt-0.5 space-y-0.5">
                        {child.matched.slice(0, 4).map((m, mi) => (
                          <div key={mi} className="flex items-center gap-1 text-[9px] text-gray-600">
                            <span className="w-[22px] text-center font-bold text-blue-600 bg-blue-100 rounded px-0.5">{m.itemCode}</span>
                            <span className="truncate max-w-[350px]">{m.value}</span>
                          </div>
                        ))}
                        {child.matched.length > 4 && (
                          <div className="text-[9px] text-gray-400 ml-6">외 {child.matched.length - 4}건...</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 거부 목록 (있으면) — 사유별 그룹핑 */}
          {result.rejected.length > 0 && (
            <RejectedSection rejected={result.rejected} />
          )}

          {/* 푸터 버튼 */}
          <div className="px-4 py-2.5 border-t bg-gray-50 rounded-b-lg flex items-center justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-1 text-[11px] font-bold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
              취소
            </button>
            {totalMissing > 0 && (
              <button
                onClick={() => onConfirm('remove-missing')}
                className="px-3 py-1 text-[11px] font-bold bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                누락 제외하고 진행
              </button>
            )}
            <button
              onClick={() => onConfirm('proceed')}
              className="px-3 py-1 text-[11px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {totalMissing > 0 ? '빈 데이터 생성 후 진행' : '진행'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
