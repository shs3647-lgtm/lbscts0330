/**
 * @file page.tsx
 * @description 사용자 권한 설정 페이지
 * @created 2026-01-19
 * @updated 2026-01-19: 모듈별 권한 추가 (PFMEA, DFMEA, CP, PFD)
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, ModulePermission, ROLE_LABELS, PERM_LABELS, PERM_COLORS } from '@/lib/auth/types';

interface User {
  id: string;
  name: string;
  email: string;
  factory: string;
  department: string;
  position: string;
  phone: string;
  role: UserRole;
  permPfmea: ModulePermission;
  permDfmea: ModulePermission;
  permCp: ModulePermission;
  permPfd: ModulePermission;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  id?: string;
  name: string;
  email: string;
  factory: string;
  department: string;
  position: string;
  phone: string;
  role: UserRole;
  permPfmea: ModulePermission;
  permDfmea: ModulePermission;
  permCp: ModulePermission;
  permPfd: ModulePermission;
  password: string;
  passwordConfirm: string;
}

const INITIAL_FORM: UserFormData = {
  name: '',
  email: '',
  factory: '',
  department: '',
  position: '',
  phone: '',
  role: 'viewer',
  permPfmea: 'none',
  permDfmea: 'none',
  permCp: 'none',
  permPfd: 'none',
  password: '',
  passwordConfirm: '',
};

const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  editor: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  viewer: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

const ROLE_ICONS: Record<UserRole, string> = {
  admin: '🔴',
  editor: '🟡',
  viewer: '🟢',
};

const PERM_ICONS: Record<ModulePermission, string> = {
  none: '⚫',
  read: '🔵',
  write: '🟢',
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 필터
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 엑셀 Import 파일 ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 필터링된 사용자
  const filteredUsers = users.filter(user => {
    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = 
        user.name.toLowerCase().includes(term) ||
        (user.email?.toLowerCase() || '').includes(term) ||
        user.department.toLowerCase().includes(term) ||
        user.factory.toLowerCase().includes(term);
      if (!match) return false;
    }
    // 권한 필터
    if (roleFilter && user.role !== roleFilter) return false;
    // 상태 필터
    if (statusFilter === 'active' && !user.isActive) return false;
    if (statusFilter === 'inactive' && user.isActive) return false;
    return true;
  });

  // 권한 변경 (시스템)
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert('권한 변경 실패: ' + data.error);
      }
    } catch (err: any) {
      alert('권한 변경 오류: ' + err.message);
    }
  };

  // 모듈별 권한 변경
  const handlePermChange = async (userId: string, module: 'permPfmea' | 'permDfmea' | 'permCp' | 'permPfd', newPerm: ModulePermission) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, [module]: newPerm }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, [module]: newPerm } : u));
      } else {
        alert('권한 변경 실패: ' + data.error);
      }
    } catch (err: any) {
      alert('권한 변경 오류: ' + err.message);
    }
  };

  // 활성화/비활성화 토글
  const handleToggleActive = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
      } else {
        alert('상태 변경 실패: ' + data.error);
      }
    } catch (err: any) {
      alert('상태 변경 오류: ' + err.message);
    }
  };

  // 사용자 삭제
  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`정말 "${userName}" 사용자를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        alert('삭제 실패: ' + data.error);
      }
    } catch (err: any) {
      alert('삭제 오류: ' + err.message);
    }
  };

  // 비밀번호 초기화
  const handleResetPassword = async (userId: string, userName: string) => {
    const newPassword = prompt(`"${userName}" 사용자의 새 비밀번호를 입력하세요:`);
    if (!newPassword) return;

    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        alert('비밀번호가 초기화되었습니다.');
      } else {
        alert('비밀번호 초기화 실패: ' + data.error);
      }
    } catch (err: any) {
      alert('비밀번호 초기화 오류: ' + err.message);
    }
  };

  // 모달 열기 (추가)
  const openAddModal = () => {
    setFormData(INITIAL_FORM);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // 모달 열기 (수정)
  const openEditModal = (user: User) => {
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email || '',
      factory: user.factory,
      department: user.department,
      position: user.position,
      phone: user.phone || '',
      role: user.role,
      permPfmea: user.permPfmea || 'none',
      permDfmea: user.permDfmea || 'none',
      permCp: user.permCp || 'none',
      permPfd: user.permPfd || 'none',
      password: '',
      passwordConfirm: '',
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // 폼 저장
  const handleSave = async () => {
    if (!formData.name || !formData.factory || !formData.department) {
      alert('필수 항목을 입력해주세요. (이름, 공장, 부서)');
      return;
    }

    if (!isEditing && (!formData.password || formData.password !== formData.passwordConfirm)) {
      alert('비밀번호를 확인해주세요.');
      return;
    }

    try {
      setSaving(true);
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing 
        ? { ...formData, password: formData.password || undefined }
        : formData;

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (data.success) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        alert('저장 실패: ' + data.error);
      }
    } catch (err: any) {
      alert('저장 오류: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 엑셀 Export
  const handleExport = () => {
    const headers = ['이름', '이메일', '공장', '부서', '직급', '시스템권한', 'PFMEA', 'DFMEA', 'CP', 'PFD', '상태'];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email || '',
      u.factory,
      u.department,
      u.position || '',
      ROLE_LABELS[u.role],
      PERM_LABELS[u.permPfmea || 'none'],
      PERM_LABELS[u.permDfmea || 'none'],
      PERM_LABELS[u.permCp || 'none'],
      PERM_LABELS[u.permPfd || 'none'],
      u.isActive ? '활성' : '비활성',
    ]);

    // CSV 생성
    const BOM = '\uFEFF';
    const csv = BOM + [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `사용자목록_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 엑셀 Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('유효한 데이터가 없습니다.');
          return;
        }

        // 헤더 파싱
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const nameIdx = headers.indexOf('이름');
        const emailIdx = headers.indexOf('이메일');
        const factoryIdx = headers.indexOf('공장');
        const deptIdx = headers.indexOf('부서');
        const posIdx = headers.indexOf('직급');
        const roleIdx = headers.indexOf('시스템권한');
        const pfmeaIdx = headers.indexOf('PFMEA');
        const dfmeaIdx = headers.indexOf('DFMEA');
        const cpIdx = headers.indexOf('CP');
        const pfdIdx = headers.indexOf('PFD');

        if (nameIdx === -1 || factoryIdx === -1 || deptIdx === -1) {
          alert('필수 컬럼이 없습니다. (이름, 공장, 부서)');
          return;
        }

        const roleLabelToValue: Record<string, UserRole> = {
          '관리자': 'admin',
          '편집자': 'editor',
          '열람자': 'viewer',
        };

        const permLabelToValue: Record<string, ModulePermission> = {
          '없음': 'none',
          '읽기': 'read',
          '쓰기': 'write',
        };

        let successCount = 0;
        let failCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
          
          const userData = {
            name: cols[nameIdx] || '',
            email: emailIdx >= 0 ? cols[emailIdx] : '',
            factory: cols[factoryIdx] || '',
            department: cols[deptIdx] || '',
            position: posIdx >= 0 ? cols[posIdx] : '',
            role: roleLabelToValue[cols[roleIdx]] || 'viewer',
            permPfmea: permLabelToValue[cols[pfmeaIdx]] || 'none',
            permDfmea: permLabelToValue[cols[dfmeaIdx]] || 'none',
            permCp: permLabelToValue[cols[cpIdx]] || 'none',
            permPfd: permLabelToValue[cols[pfdIdx]] || 'none',
            password: 'temp1234', // 임시 비밀번호
          };

          if (!userData.name || !userData.factory || !userData.department) {
            failCount++;
            continue;
          }

          try {
            const res = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData),
            });
            const data = await res.json();
            if (data.success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }
        }

        alert(`Import 완료!\n성공: ${successCount}건\n실패: ${failCount}건\n\n임시 비밀번호: temp1234`);
        fetchUsers();
      } catch (err: any) {
        alert('Import 오류: ' + err.message);
      }
    };
    reader.readAsText(file);
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 권한 드롭다운 렌더링
  const renderPermSelect = (userId: string, module: 'permPfmea' | 'permDfmea' | 'permCp' | 'permPfd', value: ModulePermission) => {
    const colors = PERM_COLORS[value];
    return (
      <select
        value={value}
        onChange={(e) => handlePermChange(userId, module, e.target.value as ModulePermission)}
        className={`border rounded px-1 py-0.5 text-[10px] font-semibold w-14 ${colors.bg} ${colors.text}`}
      >
        <option value="none">{PERM_ICONS.none} 없음</option>
        <option value="read">{PERM_ICONS.read} 읽기</option>
        <option value="write">{PERM_ICONS.write} 쓰기</option>
      </select>
    );
  };

  return (
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
            {/* 엑셀 Import */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              📥 Import
            </button>
            {/* 엑셀 Export */}
            <button 
              onClick={handleExport}
              className="bg-teal-500 hover:bg-teal-600 px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 transition-colors"
            >
              📤 Export
            </button>
            {/* 사용자 추가 */}
            <button 
              onClick={openAddModal}
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm w-52"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">권한:</span>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">전체</option>
            <option value="admin">관리자</option>
            <option value="editor">편집자</option>
            <option value="viewer">열람자</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">상태:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          총 <span className="font-bold text-indigo-600">{filteredUsers.length}</span>명
          {filteredUsers.length !== users.length && ` / ${users.length}명`}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-b-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {users.length === 0 ? '등록된 사용자가 없습니다.' : '검색 결과가 없습니다.'}
          </div>
        ) : (
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
                <th className="px-1 py-2 text-center font-semibold text-gray-700 w-16 bg-purple-50">DFMEA</th>
                <th className="px-1 py-2 text-center font-semibold text-gray-700 w-16 bg-orange-50">CP</th>
                <th className="px-1 py-2 text-center font-semibold text-gray-700 w-16 bg-green-50">PFD</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-16">상태</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700 w-24">작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => {
                const roleColor = ROLE_COLORS[user.role];
                return (
                  <tr 
                    key={user.id} 
                    className={`border-b hover:bg-blue-50 transition-colors ${
                      idx % 2 === 1 ? 'bg-gray-50/50' : ''
                    } ${!user.isActive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-2 py-2 text-gray-500 text-xs">{idx + 1}</td>
                    <td className={`px-2 py-2 font-medium ${!user.isActive ? 'text-gray-400' : ''}`}>
                      {user.name}
                    </td>
                    <td className={`px-2 py-2 text-xs ${!user.isActive ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user.email || '-'}
                    </td>
                    <td className={`px-2 py-2 text-xs ${!user.isActive ? 'text-gray-400' : ''}`}>
                      {user.factory}
                    </td>
                    <td className={`px-2 py-2 text-xs ${!user.isActive ? 'text-gray-400' : ''}`}>
                      {user.department}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        className={`border rounded px-1 py-0.5 text-[10px] font-semibold ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}
                      >
                        <option value="admin">{ROLE_ICONS.admin} 관리자</option>
                        <option value="editor">{ROLE_ICONS.editor} 편집자</option>
                        <option value="viewer">{ROLE_ICONS.viewer} 열람자</option>
                      </select>
                    </td>
                    <td className="px-1 py-2 text-center bg-blue-50/30">
                      {renderPermSelect(user.id, 'permPfmea', user.permPfmea || 'none')}
                    </td>
                    <td className="px-1 py-2 text-center bg-purple-50/30">
                      {renderPermSelect(user.id, 'permDfmea', user.permDfmea || 'none')}
                    </td>
                    <td className="px-1 py-2 text-center bg-orange-50/30">
                      {renderPermSelect(user.id, 'permCp', user.permCp || 'none')}
                    </td>
                    <td className="px-1 py-2 text-center bg-green-50/30">
                      {renderPermSelect(user.id, 'permPfd', user.permPfd || 'none')}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span 
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer ${
                          user.isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        onClick={() => handleToggleActive(user.id)}
                        title="클릭하여 상태 변경"
                      >
                        {user.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button 
                        className="text-blue-600 hover:text-blue-800 px-0.5 text-xs" 
                        title="수정"
                        onClick={() => openEditModal(user)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="text-orange-500 hover:text-orange-700 px-0.5 text-xs" 
                        title="비밀번호 초기화"
                        onClick={() => handleResetPassword(user.id, user.name)}
                      >
                        🔑
                      </button>
                      <button 
                        className="text-red-500 hover:text-red-700 px-0.5 text-xs" 
                        title="삭제"
                        onClick={() => handleDelete(user.id, user.name)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 권한 설명 */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* 시스템 권한 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-700 mb-3 text-sm">📋 시스템 권한</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="border rounded p-2 bg-red-50 border-red-200">
              <div className="font-semibold text-red-700 mb-1">🔴 관리자</div>
              <ul className="text-red-600 space-y-0.5">
                <li>✓ 모든 권한</li>
                <li>✓ 사용자 관리</li>
              </ul>
            </div>
            <div className="border rounded p-2 bg-yellow-50 border-yellow-200">
              <div className="font-semibold text-yellow-700 mb-1">🟡 편집자</div>
              <ul className="text-yellow-600 space-y-0.5">
                <li>✓ FMEA 작성</li>
                <li>✗ 관리 불가</li>
              </ul>
            </div>
            <div className="border rounded p-2 bg-green-50 border-green-200">
              <div className="font-semibold text-green-700 mb-1">🟢 열람자</div>
              <ul className="text-green-600 space-y-0.5">
                <li>✓ 읽기만</li>
                <li>✗ 수정 불가</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 모듈별 권한 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-700 mb-3 text-sm">📋 모듈별 권한</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="border rounded p-2 bg-gray-50 border-gray-200">
              <div className="font-semibold text-gray-700 mb-1">⚫ 없음</div>
              <ul className="text-gray-600 space-y-0.5">
                <li>✗ 접근 불가</li>
                <li>✗ 메뉴 숨김</li>
              </ul>
            </div>
            <div className="border rounded p-2 bg-blue-50 border-blue-200">
              <div className="font-semibold text-blue-700 mb-1">🔵 읽기</div>
              <ul className="text-blue-600 space-y-0.5">
                <li>✓ 조회 가능</li>
                <li>✗ 수정 불가</li>
              </ul>
            </div>
            <div className="border rounded p-2 bg-green-50 border-green-200">
              <div className="font-semibold text-green-700 mb-1">🟢 쓰기</div>
              <ul className="text-green-600 space-y-0.5">
                <li>✓ 조회 가능</li>
                <li>✓ 수정 가능</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 rounded-t-lg">
              <h2 className="text-lg font-bold">
                {isEditing ? '✏️ 사용자 수정' : '➕ 사용자 추가'}
              </h2>
            </div>
            <div className="p-4">
              {/* 기본 정보 */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">기본 정보</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">이름 *</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">이메일</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder="user@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">전화번호</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder="010-1234-5678"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">공장 *</label>
                    <input 
                      type="text" 
                      value={formData.factory}
                      onChange={(e) => setFormData(prev => ({ ...prev, factory: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder="평택공장"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">부서 *</label>
                    <input 
                      type="text" 
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder="품질관리"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">직급</label>
                    <input 
                      type="text" 
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder="과장"
                    />
                  </div>
                </div>
              </div>

              {/* 권한 설정 */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">권한 설정</h3>
                <div className="grid grid-cols-5 gap-3 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">시스템 권한 *</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="viewer">🟢 열람자</option>
                      <option value="editor">🟡 편집자</option>
                      <option value="admin">🔴 관리자</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">PFMEA</label>
                    <select 
                      value={formData.permPfmea}
                      onChange={(e) => setFormData(prev => ({ ...prev, permPfmea: e.target.value as ModulePermission }))}
                      className="w-full border rounded px-2 py-1.5 text-sm bg-blue-50"
                    >
                      <option value="none">⚫ 없음</option>
                      <option value="read">🔵 읽기</option>
                      <option value="write">🟢 쓰기</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">DFMEA</label>
                    <select 
                      value={formData.permDfmea}
                      onChange={(e) => setFormData(prev => ({ ...prev, permDfmea: e.target.value as ModulePermission }))}
                      className="w-full border rounded px-2 py-1.5 text-sm bg-purple-50"
                    >
                      <option value="none">⚫ 없음</option>
                      <option value="read">🔵 읽기</option>
                      <option value="write">🟢 쓰기</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">CP</label>
                    <select 
                      value={formData.permCp}
                      onChange={(e) => setFormData(prev => ({ ...prev, permCp: e.target.value as ModulePermission }))}
                      className="w-full border rounded px-2 py-1.5 text-sm bg-orange-50"
                    >
                      <option value="none">⚫ 없음</option>
                      <option value="read">🔵 읽기</option>
                      <option value="write">🟢 쓰기</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">PFD</label>
                    <select 
                      value={formData.permPfd}
                      onChange={(e) => setFormData(prev => ({ ...prev, permPfd: e.target.value as ModulePermission }))}
                      className="w-full border rounded px-2 py-1.5 text-sm bg-green-50"
                    >
                      <option value="none">⚫ 없음</option>
                      <option value="read">🔵 읽기</option>
                      <option value="write">🟢 쓰기</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 비밀번호 */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">비밀번호</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">
                      비밀번호 {!isEditing && '*'}
                    </label>
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder={isEditing ? '변경 시에만 입력' : '********'}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs">
                      비밀번호 확인 {!isEditing && '*'}
                    </label>
                    <input 
                      type="password" 
                      value={formData.passwordConfirm}
                      onChange={(e) => setFormData(prev => ({ ...prev, passwordConfirm: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" 
                      placeholder="********"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 text-sm"
                disabled={saving}
              >
                취소
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
