// CODEFREEZE
/**
 * @file BackupModal.tsx
 * @description DFMEA Import 백업 관리 모달
 * @author AI Assistant
 * @created 2026-01-21
 */

'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { BackupInfo } from '../hooks';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  backupList: BackupInfo[];
  onRestore: (backup: BackupInfo) => void;
  onDelete: (timestamp: string) => void;
}

export function BackupModal({ isOpen, onClose, backupList, onRestore, onDelete }: Props) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 500, height: 400, minWidth: 400, minHeight: 280 });

  if (!isOpen) return null;

  return typeof document === 'undefined' ? null : createPortal(
    <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
      {/* 헤더 */}
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={onDragStart}>
        <h3 className="font-bold text-sm">📦 백업 관리</h3>
        <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="text-white/80 hover:text-white text-lg">&times;</button>
      </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4">
          {backupList.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📭</div>
              <div>저장된 백업이 없습니다.</div>
              <div className="text-xs mt-1">데이터 변경 시 자동으로 백업됩니다.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {backupList.map((backup, idx) => (
                <div
                  key={backup.timestamp}
                  className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-800">
                        {idx === 0 && <span className="text-orange-500 mr-1">★</span>}
                        {new Date(backup.timestamp).toLocaleString('ko-KR')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        데이터 {backup.count}건
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onRestore(backup)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                      >
                        복원
                      </button>
                      <button
                        onClick={() => onDelete(backup.timestamp)}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* 푸터 */}
      <div className="px-4 py-3 border-t bg-gray-50 rounded-b-lg flex justify-between items-center">
        <div className="text-xs text-gray-500">
          최대 10개의 백업이 자동 유지됩니다.
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
        >
          닫기
        </button>
      </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>,
    document.body
  );
}

export default BackupModal;
