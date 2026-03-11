/**
 * @file components/sync/SyncConflictModal.tsx
 * @description 동기화 충돌 해결 모달 컴포넌트
 * @module sync/components
 */

'use client';

import React, { useState } from 'react';
import type { SyncConflict, ConflictResolution } from '@/hooks/sync/types';

// ============================================================================
// 타입 정의
// ============================================================================

export interface SyncConflictModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 충돌 목록 */
  conflicts: SyncConflict[];
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 해결 완료 핸들러 */
  onResolve: (resolutions: Array<{ field: string; resolution: ConflictResolution }>) => void;
  /** FMEA 우선 일괄 적용 핸들러 */
  onApplyAllFmea?: () => void;
  /** CP 우선 일괄 적용 핸들러 */
  onApplyAllCp?: () => void;
}

// ============================================================================
// 컴포넌트
// ============================================================================

/**
 * 동기화 충돌 해결 모달
 * 
 * @example
 * ```tsx
 * <SyncConflictModal
 *   isOpen={showConflictModal}
 *   conflicts={syncState.conflicts}
 *   onClose={() => setShowConflictModal(false)}
 *   onResolve={(resolutions) => handleResolve(resolutions)}
 * />
 * ```
 */
export function SyncConflictModal({
  isOpen,
  conflicts,
  onClose,
  onResolve,
  onApplyAllFmea,
  onApplyAllCp,
}: SyncConflictModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [applyToAll, setApplyToAll] = useState(false);

  if (!isOpen) return null;

  // 해결 방법 선택
  const handleSelect = (field: string, resolution: ConflictResolution) => {
    if (applyToAll) {
      // 모든 충돌에 동일하게 적용
      const newResolutions: Record<string, ConflictResolution> = {};
      conflicts.forEach(c => {
        newResolutions[c.field] = resolution;
      });
      setResolutions(newResolutions);
    } else {
      setResolutions(prev => ({
        ...prev,
        [field]: resolution,
      }));
    }
  };

  // 해결 완료
  const handleResolve = () => {
    const result = conflicts.map(c => ({
      field: c.field,
      resolution: resolutions[c.field] || 'skip',
    }));
    onResolve(result);
    onClose();
  };

  // FMEA 우선 일괄 적용
  const handleApplyAllFmea = () => {
    const newResolutions: Record<string, ConflictResolution> = {};
    conflicts.forEach(c => {
      newResolutions[c.field] = 'use-fmea';
    });
    setResolutions(newResolutions);
    if (onApplyAllFmea) onApplyAllFmea();
  };

  // CP 우선 일괄 적용
  const handleApplyAllCp = () => {
    const newResolutions: Record<string, ConflictResolution> = {};
    conflicts.forEach(c => {
      newResolutions[c.field] = 'use-cp';
    });
    setResolutions(newResolutions);
    if (onApplyAllCp) onApplyAllCp();
  };

  // 모든 충돌 해결되었는지 확인
  const allResolved = conflicts.every(c => resolutions[c.field]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b bg-yellow-50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <h2 className="text-lg font-semibold text-gray-900">
              데이터 충돌 감지
            </h2>
            <span className="ml-auto text-sm text-gray-600">
              {conflicts.length}개 충돌
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            FMEA와 CP의 데이터가 다릅니다. 어떤 값을 사용할지 선택해주세요.
          </p>
        </div>

        {/* 일괄 적용 버튼 */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">일괄 적용:</span>
          <button
            type="button"
            onClick={handleApplyAllFmea}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            FMEA 우선
          </button>
          <button
            type="button"
            onClick={handleApplyAllCp}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            CP 우선
          </button>
          <button
            type="button"
            onClick={() => {
              // 최신 값 자동 선택
              const newResolutions: Record<string, ConflictResolution> = {};
              conflicts.forEach(c => {
                if (c.fmeaUpdatedAt && c.cpUpdatedAt) {
                  const fmeaTime = new Date(c.fmeaUpdatedAt).getTime();
                  const cpTime = new Date(c.cpUpdatedAt).getTime();
                  newResolutions[c.field] = fmeaTime >= cpTime ? 'use-fmea' : 'use-cp';
                } else if (c.fmeaUpdatedAt) {
                  newResolutions[c.field] = 'use-fmea';
                } else if (c.cpUpdatedAt) {
                  newResolutions[c.field] = 'use-cp';
                } else {
                  newResolutions[c.field] = 'use-fmea'; // 기본값
                }
              });
              setResolutions(newResolutions);
            }}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            최신 값 선택
          </button>
          <button
            type="button"
            onClick={() => {
              // 모두 건너뛰기
              const newResolutions: Record<string, ConflictResolution> = {};
              conflicts.forEach(c => {
                newResolutions[c.field] = 'skip';
              });
              setResolutions(newResolutions);
            }}
            className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            모두 건너뛰기
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="rounded border-gray-300"
            />
            연속 선택 적용
          </label>
        </div>

        {/* 충돌 목록 */}
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">필드</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-blue-600">FMEA 값</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-green-600">CP 값</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">선택</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((conflict, idx) => (
                <tr 
                  key={conflict.field}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-sm">{conflict.fieldLabel}</span>
                    <span className="block text-xs text-gray-500">{conflict.field}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-blue-700">
                      {conflict.fmeaValue || '(빈 값)'}
                    </span>
                    {conflict.fmeaUpdatedAt && (
                      <span className="block text-xs text-gray-400">
                        {new Date(conflict.fmeaUpdatedAt).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-green-700">
                      {conflict.cpValue || '(빈 값)'}
                    </span>
                    {conflict.cpUpdatedAt && (
                      <span className="block text-xs text-gray-400">
                        {new Date(conflict.cpUpdatedAt).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelect(conflict.field, 'use-fmea')}
                        className={`px-2 py-1 text-xs rounded ${
                          resolutions[conflict.field] === 'use-fmea'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        title="FMEA 값 사용"
                      >
                        FMEA
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect(conflict.field, 'use-cp')}
                        className={`px-2 py-1 text-xs rounded ${
                          resolutions[conflict.field] === 'use-cp'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        title="CP 값 사용"
                      >
                        CP
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelect(conflict.field, 'skip')}
                        className={`px-2 py-1 text-xs rounded ${
                          resolutions[conflict.field] === 'skip'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="건너뛰기"
                      >
                        Skip
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <span className="mr-auto text-sm text-gray-600">
            {Object.keys(resolutions).length}/{conflicts.length} 선택됨
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleResolve}
            disabled={!allResolved}
            className={`px-4 py-2 text-sm text-white rounded ${
              allResolved
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}

export default SyncConflictModal;
