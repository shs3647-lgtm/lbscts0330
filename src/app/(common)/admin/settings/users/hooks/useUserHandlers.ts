/**
 * @file useUserHandlers.ts
 * @description 사용자 관리 CRUD / Import / Export 핸들러 훅
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { UserRole, ModulePermission, ROLE_LABELS, PERM_LABELS } from '@/lib/auth/types';

// =====================================================
// Types
// =====================================================
export interface User {
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

export interface UserFormData {
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

export const INITIAL_FORM: UserFormData = {
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

// =====================================================
// Hook
// =====================================================
export function useUserHandlers() {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 필터링된 사용자
  const filteredUsers = users.filter(user => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match =
        user.name.toLowerCase().includes(term) ||
        (user.email?.toLowerCase() || '').includes(term) ||
        user.department.toLowerCase().includes(term) ||
        user.factory.toLowerCase().includes(term);
      if (!match) return false;
    }
    if (roleFilter && user.role !== roleFilter) return false;
    if (statusFilter === 'active' && !user.isActive) return false;
    if (statusFilter === 'inactive' && user.isActive) return false;
    return true;
  });

  // 시스템 권한 변경
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('권한 변경 오류: ' + message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('권한 변경 오류: ' + message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('상태 변경 오류: ' + message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('삭제 오류: ' + message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('비밀번호 초기화 오류: ' + message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('저장 오류: ' + message);
    } finally {
      setSaving(false);
    }
  };

  // CSV Export
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

  // CSV Import
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
          '관리자': 'admin', '편집자': 'editor', '열람자': 'viewer',
        };
        const permLabelToValue: Record<string, ModulePermission> = {
          '없음': 'none', '읽기': 'read', '쓰기': 'write',
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
            password: crypto.randomUUID().slice(0, 8),
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
            if (data.success) { successCount++; } else { failCount++; }
          } catch (e) {
            console.error('[사용자 Import] 개별 저장 오류:', e);
            failCount++;
          }
        }
        alert(`Import 완료!\n성공: ${successCount}건\n실패: ${failCount}건\n\n⚠️ Import된 사용자의 초기 비밀번호는 랜덤 생성되었습니다.\n관리자가 각 사용자의 비밀번호를 설정해주세요.`);
        fetchUsers();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert('Import 오류: ' + message);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    // state
    users, loading, error, filteredUsers,
    searchTerm, setSearchTerm, roleFilter, setRoleFilter, statusFilter, setStatusFilter,
    isModalOpen, setIsModalOpen, formData, setFormData, isEditing, saving,
    fileInputRef,
    // actions
    fetchUsers, handleRoleChange, handlePermChange, handleToggleActive,
    handleDelete, handleResetPassword, openAddModal, openEditModal,
    handleSave, handleExport, handleImport,
  };
}
