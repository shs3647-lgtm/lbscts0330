/**
 * @file page.tsx
 * @description 사용자 권한 설정 페이지 (조합 전용)
 * @created 2026-01-19
 * @updated 2026-03-11: 파일 분리 (938→~200행) + Import .csv 전용
 */

'use client';

import React, { useEffect } from 'react';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { useUserHandlers } from './hooks/useUserHandlers';
import UserTable from './components/UserTable';
import UserFormModal from './components/UserFormModal';

export default function UsersSettingsPage() {
  const h = useUserHandlers();

  // 초기 로드
  useEffect(() => { h.fetchUsers(); }, [h.fetchUsers]);

  // Floating window
  const { pos: modalPos, size: modalSize, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen: h.isModalOpen, width: 680, height: 560,
  });

  return (
    <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
      <div className="p-4 h-full overflow-auto">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                👥 사용자 권한 설정
              </h1>
              <p className="text-indigo-200 text-sm mt-1">시스템 사용자 관리 및 모듈별 권한 설정</p>
            </div>
            <div className="flex gap-2">
              {/* CSV Import */}
              <input
                type="file"
                ref={h.fileInputRef}
                accept=".csv"
                onChange={h.handleImport}
                className="hidden"
              />
              <button
                onClick={() => h.fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                📥 Import
              </button>
              {/* CSV Export */}
              <button
                onClick={h.handleExport}
                className="bg-teal-500 hover:bg-teal-600 px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                📤 Export
              </button>
              {/* 사용자 추가 */}
              <button
                onClick={h.openAddModal}
                className="bg-green-500 hover:bg-green-600 px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 transition-colors"
              >
                ➕ 사용자 추가
              </button>
            </div>
          </div>
        </div>

        {/* 검색/필터 */}
        <div className="bg-white border-b p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">검색:</span>
            <input
              type="text"
              placeholder="이름, 이메일, 부서..."
              value={h.searchTerm}
              onChange={(e) => h.setSearchTerm(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-52"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">권한:</span>
            <select value={h.roleFilter} onChange={(e) => h.setRoleFilter(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
              <option value="">전체</option>
              <option value="admin">관리자</option>
              <option value="editor">편집자</option>
              <option value="viewer">열람자</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">상태:</span>
            <select value={h.statusFilter} onChange={(e) => h.setStatusFilter(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
              <option value="">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            총 <span className="font-bold text-indigo-600">{h.filteredUsers.length}</span>명
            {h.filteredUsers.length !== h.users.length && ` / ${h.users.length}명`}
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-b-lg shadow overflow-x-auto">
          <UserTable
            users={h.filteredUsers}
            loading={h.loading}
            error={h.error}
            totalCount={h.users.length}
            onRoleChange={h.handleRoleChange}
            onPermChange={h.handlePermChange}
            onToggleActive={h.handleToggleActive}
            onEdit={h.openEditModal}
            onResetPassword={h.handleResetPassword}
            onDelete={h.handleDelete}
          />
        </div>

        {/* 권한 설명 */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">📋 시스템 권한</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="border rounded p-2 bg-red-50 border-red-200">
                <div className="font-semibold text-red-700 mb-1">🔴 관리자</div>
                <ul className="text-red-600 space-y-0.5"><li>✓ 모든 권한</li><li>✓ 사용자 관리</li></ul>
              </div>
              <div className="border rounded p-2 bg-yellow-50 border-yellow-200">
                <div className="font-semibold text-yellow-700 mb-1">🟡 편집자</div>
                <ul className="text-yellow-600 space-y-0.5"><li>✓ FMEA 작성</li><li>✗ 관리 불가</li></ul>
              </div>
              <div className="border rounded p-2 bg-green-50 border-green-200">
                <div className="font-semibold text-green-700 mb-1">🟢 열람자</div>
                <ul className="text-green-600 space-y-0.5"><li>✓ 읽기만</li><li>✗ 수정 불가</li></ul>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">📋 모듈별 권한</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="border rounded p-2 bg-gray-50 border-gray-200">
                <div className="font-semibold text-gray-700 mb-1">⚫ 없음</div>
                <ul className="text-gray-600 space-y-0.5"><li>✗ 접근 불가</li><li>✗ 메뉴 숨김</li></ul>
              </div>
              <div className="border rounded p-2 bg-blue-50 border-blue-200">
                <div className="font-semibold text-blue-700 mb-1">🔵 읽기</div>
                <ul className="text-blue-600 space-y-0.5"><li>✓ 조회 가능</li><li>✗ 수정 불가</li></ul>
              </div>
              <div className="border rounded p-2 bg-green-50 border-green-200">
                <div className="font-semibold text-green-700 mb-1">🟢 쓰기</div>
                <ul className="text-green-600 space-y-0.5"><li>✓ 조회 가능</li><li>✓ 수정 가능</li></ul>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 */}
        {h.isModalOpen && (
          <UserFormModal
            isEditing={h.isEditing}
            formData={h.formData}
            saving={h.saving}
            modalPos={modalPos}
            modalSize={modalSize}
            onFormChange={h.setFormData}
            onSave={h.handleSave}
            onClose={() => h.setIsModalOpen(false)}
            onDragStart={onDragStart}
            onResizeStart={onResizeStart}
          />
        )}
      </div>
    </FixedLayout>
  );
}
