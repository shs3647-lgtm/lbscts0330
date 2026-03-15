/**
 * @file UserFormModal.tsx
 * @description 사용자 추가/수정 모달 컴포넌트
 */

'use client';

import React from 'react';
import { UserRole, ModulePermission } from '@/lib/auth/types';
import type { UserFormData } from '../hooks/useUserHandlers';

// =====================================================
// Props
// =====================================================
interface UserFormModalProps {
  isEditing: boolean;
  formData: UserFormData;
  saving: boolean;
  modalPos: { x: number; y: number };
  modalSize: { w: number; h: number };
  onFormChange: (updater: (prev: UserFormData) => UserFormData) => void;
  onSave: () => void;
  onClose: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}

// =====================================================
// Component
// =====================================================
export default function UserFormModal({
  isEditing, formData, saving,
  modalPos, modalSize,
  onFormChange, onSave, onClose, onDragStart, onResizeStart,
}: UserFormModalProps) {
  return (
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: modalPos.x, top: modalPos.y, width: modalSize.w, height: modalSize.h }}
    >
      {/* 타이틀 바 */}
      <div
        className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 rounded-t-lg flex items-center justify-between cursor-move"
        onMouseDown={onDragStart}
      >
        <h2 className="text-lg font-bold">
          {isEditing ? '✏️ 사용자 수정' : '➕ 사용자 추가'}
        </h2>
        <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
      </div>

      {/* 폼 본문 */}
      <div className="p-4 flex-1 overflow-y-auto">
        {/* 기본 정보 */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">기본 정보</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-1 text-xs">이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormChange(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1 text-xs">이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onFormChange(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="user@company.com"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1 text-xs">전화번호</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => onFormChange(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="010-1234-5678"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1 text-xs">공장 *</label>
              <input
                type="text"
                value={formData.factory}
                onChange={(e) => onFormChange(prev => ({ ...prev, factory: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="평택공장"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1 text-xs">부서 *</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => onFormChange(prev => ({ ...prev, department: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="품질관리"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1 text-xs">직급</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => onFormChange(prev => ({ ...prev, position: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="과장"
              />
            </div>
          </div>
        </div>

        {/* 권한 설정 */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">권한 설정</h3>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-1 text-xs">시스템 권한 *</label>
              <select
                value={formData.role}
                onChange={(e) => onFormChange(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="viewer">🟢 열람자</option>
                <option value="editor">🟡 편집자</option>
                <option value="admin">🔴 관리자</option>
              </select>
            </div>
            {(['permPfmea', 'permCp', 'permPfd'] as const).map(mod => {
              const label = mod === 'permPfmea' ? 'PFMEA' : mod === 'permCp' ? 'CP' : 'PFD';
              const bg = mod === 'permPfmea' ? 'bg-blue-50' : mod === 'permCp' ? 'bg-orange-50' : 'bg-green-50';
              return (
                <div key={mod}>
                  <label className="block text-gray-600 mb-1 text-xs">{label}</label>
                  <select
                    value={formData[mod]}
                    onChange={(e) => onFormChange(prev => ({ ...prev, [mod]: e.target.value as ModulePermission }))}
                    className={`w-full border rounded px-2 py-1.5 text-sm ${bg}`}
                  >
                    <option value="none">⚫ 없음</option>
                    <option value="read">🔵 읽기</option>
                    <option value="write">🟢 쓰기</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* 비밀번호 */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">비밀번호</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-gray-600 mb-1 text-xs">비밀번호 {!isEditing && '*'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => onFormChange(prev => ({ ...prev, password: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder={isEditing ? '변경 시에만 입력' : '********'}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1 text-xs">비밀번호 확인 {!isEditing && '*'}</label>
              <input
                type="password"
                value={formData.passwordConfirm}
                onChange={(e) => onFormChange(prev => ({ ...prev, passwordConfirm: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="********"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 text-sm" disabled={saving}>
          취소
        </button>
        <button onClick={onSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
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
}
