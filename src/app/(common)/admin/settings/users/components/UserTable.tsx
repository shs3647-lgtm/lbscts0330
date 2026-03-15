/**
 * @file UserTable.tsx
 * @description 사용자 목록 테이블 컴포넌트
 */

'use client';

import React from 'react';
import { UserRole, ModulePermission, PERM_COLORS } from '@/lib/auth/types';
import type { User } from '../hooks/useUserHandlers';

// =====================================================
// Style constants
// =====================================================
const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  editor: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  viewer: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

const ROLE_ICONS: Record<UserRole, string> = {
  admin: '🔴', editor: '🟡', viewer: '🟢',
};

const PERM_ICONS: Record<ModulePermission, string> = {
  none: '⚫', read: '🔵', write: '🟢',
};

// =====================================================
// Props
// =====================================================
interface UserTableProps {
  users: User[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  onRoleChange: (userId: string, newRole: UserRole) => void;
  onPermChange: (userId: string, module: 'permPfmea' | 'permCp' | 'permPfd', perm: ModulePermission) => void;
  onToggleActive: (userId: string) => void;
  onEdit: (user: User) => void;
  onResetPassword: (userId: string, userName: string) => void;
  onDelete: (userId: string, userName: string) => void;
}

// =====================================================
// PermSelect 헬퍼
// =====================================================
function PermSelect({ userId, module, value, onChange }: {
  userId: string;
  module: 'permPfmea' | 'permCp' | 'permPfd';
  value: ModulePermission;
  onChange: (userId: string, module: 'permPfmea' | 'permCp' | 'permPfd', perm: ModulePermission) => void;
}) {
  const colors = PERM_COLORS[value];
  return (
    <select
      value={value}
      onChange={(e) => onChange(userId, module, e.target.value as ModulePermission)}
      className={`border rounded px-1 py-0.5 text-[10px] font-semibold w-16 whitespace-nowrap shrink-0 ${colors.bg} ${colors.text}`}
    >
      <option value="none">{PERM_ICONS.none} 없음</option>
      <option value="read">{PERM_ICONS.read} 읽기</option>
      <option value="write">{PERM_ICONS.write} 쓰기</option>
    </select>
  );
}

// =====================================================
// Component
// =====================================================
export default function UserTable({
  users, loading, error, totalCount,
  onRoleChange, onPermChange, onToggleActive, onEdit, onResetPassword, onDelete,
}: UserTableProps) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {totalCount === 0 ? '등록된 사용자가 없습니다.' : '검색 결과가 없습니다.'}
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="px-2 py-2 text-left font-semibold text-gray-700 w-10">#</th>
          <th className="px-2 py-2 text-left font-semibold text-gray-700">이름</th>
          <th className="px-2 py-2 text-left font-semibold text-gray-700">이메일</th>
          <th className="px-2 py-2 text-left font-semibold text-gray-700">공장</th>
          <th className="px-2 py-2 text-left font-semibold text-gray-700">부서</th>
          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-24">시스템</th>
          <th className="px-1 py-2 text-center font-semibold text-gray-700 w-16 bg-blue-50">PFMEA</th>
          <th className="px-1 py-2 text-center font-semibold text-gray-700 w-16 bg-orange-50">CP</th>
          <th className="px-1 py-2 text-center font-semibold text-gray-700 w-16 bg-green-50">PFD</th>
          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-16">상태</th>
          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-24">작업</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user, idx) => {
          const roleColor = ROLE_COLORS[user.role];
          return (
            <tr
              key={user.id}
              className={`border-b hover:bg-blue-50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''} ${!user.isActive ? 'opacity-60' : ''}`}
            >
              <td className="px-2 py-2 text-gray-500 text-xs">{idx + 1}</td>
              <td className={`px-2 py-2 font-medium ${!user.isActive ? 'text-gray-400' : ''}`}>{user.name}</td>
              <td className={`px-2 py-2 text-xs ${!user.isActive ? 'text-gray-400' : 'text-gray-600'}`}>{user.email || '-'}</td>
              <td className={`px-2 py-2 text-xs ${!user.isActive ? 'text-gray-400' : ''}`}>{user.factory}</td>
              <td className={`px-2 py-2 text-xs ${!user.isActive ? 'text-gray-400' : ''}`}>{user.department}</td>
              <td className="px-2 py-2 text-center">
                <select
                  value={user.role}
                  onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
                  className={`border rounded px-1 py-0.5 text-[10px] font-semibold ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}
                >
                  <option value="admin">{ROLE_ICONS.admin} 관리자</option>
                  <option value="editor">{ROLE_ICONS.editor} 편집자</option>
                  <option value="viewer">{ROLE_ICONS.viewer} 열람자</option>
                </select>
              </td>
              <td className="px-1 py-2 text-center bg-blue-50/30">
                <PermSelect userId={user.id} module="permPfmea" value={user.permPfmea || 'none'} onChange={onPermChange} />
              </td>
              <td className="px-1 py-2 text-center bg-orange-50/30">
                <PermSelect userId={user.id} module="permCp" value={user.permCp || 'none'} onChange={onPermChange} />
              </td>
              <td className="px-1 py-2 text-center bg-green-50/30">
                <PermSelect userId={user.id} module="permPfd" value={user.permPfd || 'none'} onChange={onPermChange} />
              </td>
              <td className="px-2 py-2 text-center">
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer ${user.isActive
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  onClick={() => onToggleActive(user.id)}
                  title="클릭하여 상태 변경"
                >
                  {user.isActive ? '활성' : '비활성'}
                </span>
              </td>
              <td className="px-2 py-2 text-center">
                <button className="text-blue-600 hover:text-blue-800 px-0.5 text-xs" title="수정" onClick={() => onEdit(user)}>✏️</button>
                <button className="text-orange-500 hover:text-orange-700 px-0.5 text-xs" title="비밀번호 초기화" onClick={() => onResetPassword(user.id, user.name)}>🔑</button>
                <button className="text-red-500 hover:text-red-700 px-0.5 text-xs" title="삭제" onClick={() => onDelete(user.id, user.name)}>🗑️</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
