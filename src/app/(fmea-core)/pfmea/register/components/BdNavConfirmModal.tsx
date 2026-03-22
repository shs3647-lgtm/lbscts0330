/**
 * @file BdNavConfirmModal.tsx
 * @description BD 로드 성공 후 "FMEA 워크시트로 이동하겠습니까?" 확인 팝업
 */
'use client';

import React from 'react';

interface BdNavConfirmModalProps {
  open: boolean;
  bdName?: string;
  fmeaId?: string | null;
  onClose: () => void;
  onNavigate: () => void;
}

export function BdNavConfirmModal({ open, bdName, fmeaId, onClose, onNavigate }: BdNavConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-[420px]">
        <div className="bg-blue-600 text-white px-4 py-2.5 rounded-t-lg font-bold text-sm flex items-center gap-2">
          <span>✅</span>
          <span>기초정보(BD) 로드 완료</span>
        </div>
        <div className="p-5">
          {bdName && (
            <p className="text-xs text-blue-700 font-semibold mb-2 bg-blue-50 border border-blue-200 rounded px-2 py-1">
              📋 {bdName}
            </p>
          )}
          <p className="text-sm text-gray-700 mb-1">기초정보(Basic Data)가 성공적으로 로드되었습니다.</p>
          <p className="text-xs text-gray-500">
            FMEA 작성화면으로 이동하시겠습니까?<br/>
            <span className="text-amber-600">※ 이동 전 BD를 저장하려면 "저장 후 이동"을 선택하세요.</span>
          </p>
          {fmeaId && (
            <p className="mt-2 text-[10px] text-gray-400 font-mono">대상: {fmeaId}</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300 cursor-pointer"
          >
            여기서 계속
          </button>
          <button
            onClick={onNavigate}
            className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 cursor-pointer"
          >
            FMEA 작성화면 이동 →
          </button>
        </div>
      </div>
    </div>
  );
}
