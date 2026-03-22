/**
 * @file page.tsx
 * @description 사용자 정보 관리 페이지 (회사명별, ID/PW 설정, 엑셀 Import 지원)
 * @created 2026-01-26
 * @updated 2026-03-22 — 뷰포트 높이 레이아웃, 인라인 편집 저장/닫기, 필드 저장 stale fix
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Upload, Download, Plus, Trash2, Edit, Search, Building2, Key, Eye, EyeOff, Camera, Save, DoorOpen } from 'lucide-react';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { AdminBackToHome } from '@/components/admin/AdminBackToHome';
import { ADMIN_HOME_PATH } from '@/lib/admin/admin-routes';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { toast } from '@/hooks/useToast';
import * as XLSX from 'xlsx';

interface UserInfo {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    phone: string;
    loginType: 'email' | 'id_pw';
    loginId?: string;
    role: 'admin' | 'manager' | 'editor' | 'viewer';
    permPfmea: 'none' | 'read' | 'write';
    permCp: 'none' | 'read' | 'write';
    permPfd: 'none' | 'read' | 'write';
    isActive: boolean;
    customer: string;
    photoUrl?: string;
}

const CUSTOMERS = ['전체', '현대자동차', '기아자동차', 'GM', '폭스바겐', '도요타', '기타'];

const DEFAULT_USER: Omit<UserInfo, 'id'> = {
    name: '',
    email: '',
    department: '',
    position: '',
    phone: '',
    loginType: 'id_pw',
    loginId: '',
    role: 'viewer',
    permPfmea: 'read',
    permCp: 'read',
    permPfd: 'none',
    isActive: true,
    customer: '현대자동차',
    photoUrl: '',
};

export default function UsersManagementPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState('전체');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPwModal, setShowPwModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [newUser, setNewUser] = useState<Omit<UserInfo, 'id'>>(DEFAULT_USER);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
    const [inlineEditMode, setInlineEditMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Floating window hooks
    const { pos: addPos, size: addSize, onDragStart: addDragStart, onResizeStart: addResizeStart } = useFloatingWindow({ isOpen: showAddModal, width: 520, height: 560 });
    const { pos: pwPos, size: pwSize, onDragStart: pwDragStart, onResizeStart: pwResizeStart } = useFloatingWindow({ isOpen: showPwModal, width: 400, height: 300 });
    const { pos: editPos, size: editSize, onDragStart: editDragStart, onResizeStart: editResizeStart } = useFloatingWindow({ isOpen: showEditModal, width: 520, height: 600 });

    /** @returns 서버에서 목록을 정상 반영했으면 true */
    const loadUsers = useCallback(async (): Promise<boolean> => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users || []);
                return true;
            }
            toast.warn(data.error || '사용자 목록을 불러오지 못했습니다.');
            return false;
        } catch (err) {
            console.error('사용자 로드 실패:', err);
            toast.error('사용자 목록을 불러오는 중 오류가 발생했습니다.');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const filteredUsers = users.filter(user => {
        const matchesCustomer = selectedCustomer === '전체' || user.customer === selectedCustomer;
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch = !q ||
            user.name.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            user.department.toLowerCase().includes(q) ||
            (user.customer || '').toLowerCase().includes(q) ||
            (user.loginId || '').toLowerCase().includes(q);
        return matchesCustomer && matchesSearch;
    });

    // 인라인 편집: 사용자 필드 업데이트 (최신 병합 객체로 서버 저장 — stale closure 방지)
    const updateUserField = useCallback(async (userId: string, field: string, value: string) => {
        let merged: UserInfo | null = null;
        setUsers(prev => {
            const next = prev.map(u => {
                if (u.id !== userId) return u;
                merged = { ...u, [field]: value };
                return merged;
            });
            return next;
        });
        if (!merged) return;
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: merged }),
            });
            const data = await res.json();
            if (!data.success) {
                console.error('[사용자 필드 저장]', data.error);
                toast.error(data.error || '저장에 실패했습니다.');
                await loadUsers();
            }
        } catch (err) {
            console.error('업데이트 실패:', err);
            toast.error('네트워크 오류로 저장에 실패했습니다.');
        }
    }, [loadUsers]);

    /** 푸터 저장: 서버에서 목록 다시 불러오기 */
    const handleToolbarSave = useCallback(async () => {
        const ok = await loadUsers();
        if (ok) {
            toast.success('서버에서 최신 사용자 목록을 불러왔습니다.');
        }
    }, [loadUsers]);

    /**
     * 푸터 닫기: 인라인 편집 해제 후 관리 메인(/admin)으로 복귀 (항상 동일 동작)
     */
    const handleToolbarClose = useCallback(() => {
        try {
            setInlineEditMode(false);
            router.replace(ADMIN_HOME_PATH);
        } catch (e) {
            console.error('[닫기]', e);
            toast.error('화면 이동에 실패했습니다. 관리 홈으로 이동합니다.');
            router.replace(ADMIN_HOME_PATH);
        }
    }, [router]);

    // 이미지 리사이즈 함수 (큰 이미지 자동 압축)
    const resizeImage = (file: File, maxWidth: number = 150, quality: number = 0.6): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context 생성 실패'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const base64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(base64);
                };
                img.onerror = () => reject(new Error('이미지 로드 실패'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsDataURL(file);
        });
    };

    // 사진 업로드 핸들러 (자동 리사이즈)
    const handlePhotoUpload = async (userId: string, file: File) => {
        try {
            // 파일 크기 체크 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('사진은 10MB 이하만 가능합니다.');
                return;
            }

            // 이미지 리사이즈 (150px, 60% 품질)
            const base64 = await resizeImage(file, 150, 0.6);

            // 현재 사용자 정보 가져오기 (업데이트 전)
            const user = users.find(u => u.id === userId);
            if (!user) {
                alert('사용자를 찾을 수 없습니다.');
                return;
            }

            // 서버에 저장 (새로운 photoUrl 직접 전송)
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: { ...user, photoUrl: base64 } }),
            });

            const data = await res.json();
            if (data.success) {
                // 로컬 상태 업데이트 (서버 저장 성공 후)
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, photoUrl: base64 } : u
                ));
            } else {
                console.error('사진 저장 실패:', data.error);
                alert('사진 저장에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
            }
        } catch (err) {
            console.error('사진 업로드 실패:', err);
            alert('사진 업로드에 실패했습니다.');
        }
    };

    const deleteUser = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadUsers();
            }
        } catch (err) {
            console.error('삭제 실패:', err);
        }
    };

    const addUser = async () => {
        if (!newUser.name || !newUser.email) {
            alert('이름과 이메일은 필수입니다.');
            return;
        }
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: { ...newUser, id: `new-${Date.now()}` } }),
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                loadUsers();
                setShowAddModal(false);
                setNewUser(DEFAULT_USER);
            }
        } catch (err) {
            console.error('추가 실패:', err);
        }
    };

    // 사용자 정보 편집
    const openEditModal = (user: UserInfo) => {
        setEditingUser({ ...user });
        setShowEditModal(true);
    };

    const saveEditUser = async () => {
        if (!editingUser) return;
        if (!editingUser.name || !editingUser.email) {
            alert('이름과 이메일은 필수입니다.');
            return;
        }
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: editingUser }),
            });
            const data = await res.json();
            if (data.success) {
                alert('사용자 정보가 수정되었습니다.');
                loadUsers();
                setShowEditModal(false);
                setEditingUser(null);
            } else {
                alert('수정 실패: ' + data.error);
            }
        } catch (err) {
            console.error('수정 실패:', err);
            alert('수정 중 오류가 발생했습니다.');
        }
    };

    // 비밀번호 변경
    const handleChangePassword = async () => {
        if (!selectedUser || !newPassword) {
            alert('새 비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword.length < 4) {
            alert('비밀번호는 4자 이상이어야 합니다.');
            return;
        }
        try {
            const res = await fetch('/api/admin/users/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id, newPassword }),
            });
            const data = await res.json();
            if (data.success) {
                alert('비밀번호가 변경되었습니다.');
                setShowPwModal(false);
                setNewPassword('');
                setSelectedUser(null);
            } else {
                alert('변경 실패: ' + data.error);
            }
        } catch (err) {
            alert('오류가 발생했습니다.');
        }
    };

    const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const data = evt.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

            const importedUsers: Omit<UserInfo, 'id'>[] = jsonData.map(row => ({
                customer: row['회사명'] || row['고객사'] || row['customer'] || '기타',
                name: row['이름'] || row['name'] || '',
                email: row['이메일'] || row['email'] || '',
                loginId: row['로그인ID'] || row['ID'] || row['loginId'] || '',
                department: row['부서'] || row['department'] || '',
                position: row['직급'] || row['position'] || '',
                phone: row['전화번호'] || row['phone'] || '',
                loginType: (row['로그인방식'] === '이메일' ? 'email' : 'id_pw') as 'email' | 'id_pw',
                role: (row['역할'] || row['role'] || 'viewer') as 'admin' | 'manager' | 'editor' | 'viewer',
                permPfmea: (row['PFMEA'] || row['permPfmea'] || 'read') as 'none' | 'read' | 'write',
                permCp: (row['CP'] || row['permCp'] || 'read') as 'none' | 'read' | 'write',
                permPfd: (row['PFD'] || row['permPfd'] || 'none') as 'none' | 'read' | 'write',
                isActive: row['활성'] !== '비활성',
            }));

            try {
                const res = await fetch('/api/admin/users/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ users: importedUsers }),
                });
                const result = await res.json();
                if (result.success) {
                    alert(`${result.count}명의 사용자 정보를 가져왔습니다.`);
                    loadUsers();
                } else {
                    alert('Import 실패: ' + result.error);
                }
            } catch (err) {
                alert('Import 중 오류가 발생했습니다.');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleExcelExport = () => {
        const exportData = filteredUsers.map(user => ({
            '회사명': user.customer || '전체',
            '이름': user.name,
            '로그인ID': user.loginId || user.email,
            '이메일': user.email,
            '부서': user.department,
            '직급': user.position,
            '전화번호': user.phone,
            '로그인방식': user.loginType === 'email' ? '이메일' : 'ID/PW',
            '역할': user.role,
            'PFMEA': user.permPfmea,
            'CP': user.permCp,
            'PFD': user.permPfd,
            '활성': user.isActive ? '활성' : '비활성',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '사용자정보');
        XLSX.writeFile(wb, `사용자정보_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const downloadSampleExcel = () => {
        const sampleData = [
            { '회사명': '현대자동차', '이름': '홍길동', '로그인ID': 'hong123', '이메일': 'hong@company.com', '부서': '품질팀', '직급': '과장', '전화번호': '010-1234-5678', '로그인방식': 'ID/PW', '역할': 'editor', 'PFMEA': 'write', 'CP': 'write', 'PFD': 'read', '활성': '활성' },
            { '회사명': '기아자동차', '이름': '김철수', '로그인ID': 'kimcs', '이메일': 'kim@company.com', '부서': '설계팀', '직급': '대리', '전화번호': '010-2345-6789', '로그인방식': 'ID/PW', '역할': 'viewer', 'PFMEA': 'read', 'CP': 'read', 'PFD': 'none', '활성': '활성' },
            { '회사명': 'GM', '이름': '박영희', '로그인ID': '', '이메일': 'park@gm.com', '부서': '개발팀', '직급': '차장', '전화번호': '010-3456-7890', '로그인방식': '이메일', '역할': 'admin', 'PFMEA': 'write', 'CP': 'write', 'PFD': 'write', '활성': '활성' },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '사용자정보_샘플');
        XLSX.writeFile(wb, '사용자정보_Import_샘플.xlsx');
    };

    const PermBadge = ({ level }: { level: string }) => {
        const colors: Record<string, string> = {
            write: 'bg-green-100 text-green-700',
            read: 'bg-blue-100 text-blue-700',
            none: 'bg-gray-100 text-gray-500',
        };
        const labels: Record<string, string> = { write: 'W', read: 'R', none: '-' };
        return <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${colors[level]}`}>{labels[level]}</span>;
    };

    return (
        <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
            <div className="flex flex-col gap-3 max-w-full">
                <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
                    <div>
                        <div className="mb-1.5">
                            <AdminBackToHome />
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            사용자 정보 관리 (ID/PW 설정)
                        </h1>
                        <p className="text-sm text-gray-600">회사명별 사용자 계정, 비밀번호, 시스템 권한 설정</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={downloadSampleExcel} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                            <Download className="w-4 h-4" /> 샘플 양식
                        </button>
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1">
                            <Upload className="w-4 h-4" /> 엑셀 Import
                        </button>
                        <button onClick={handleExcelExport} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                            <Download className="w-4 h-4" /> 엑셀 Export
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                            <Plus className="w-4 h-4" /> 사용자 추가
                        </button>
                        <button
                            onClick={() => setInlineEditMode(!inlineEditMode)}
                            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors ${inlineEditMode
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                }`}
                        >
                            <Edit className="w-4 h-4" /> {inlineEditMode ? '편집 완료' : '인라인 편집'}
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                            {CUSTOMERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="회사명, 이름, 이메일, 부서, 로그인ID 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                    </div>
                </div>

                {/* 목록 요약 + 저장/닫기 — 항상 테이블 위(하단 고정 금지, 가독성) */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-md flex flex-col overflow-hidden">
                    <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                        <span className="text-gray-700">
                            총 <strong className="text-blue-600">{filteredUsers.length}</strong>명
                            {selectedCustomer !== '전체' && ` · 필터: ${selectedCustomer}`}
                            {inlineEditMode && <span className="ml-2 text-orange-700 font-medium">· 인라인 편집 중</span>}
                        </span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void handleToolbarSave()}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 shadow-sm hover:bg-blue-50"
                            >
                                <Save className="w-3.5 h-3.5" /> 저장
                            </button>
                            <button
                                type="button"
                                onClick={() => { handleToolbarClose(); }}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-100"
                            >
                                <DoorOpen className="w-3.5 h-3.5" /> 닫기
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-15.5rem)]">
                        <table className="w-full text-sm border-collapse table-fixed">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-2 py-2 text-center font-bold text-gray-700 border-b w-12">사진</th>
                                    <th className="px-3 py-2 text-left font-bold text-gray-700 border-b bg-blue-50 w-[10rem]">회사명</th>
                                    <th className="px-3 py-2 text-left font-bold text-gray-700 border-b">이름</th>
                                    <th className="px-3 py-2 text-left font-bold text-gray-700 border-b">ID</th>
                                    <th className="px-3 py-2 text-center font-bold text-gray-700 border-b">PW</th>
                                    <th className="px-3 py-2 text-center font-bold text-gray-700 border-b">역할</th>
                                    <th className="px-2 py-2 text-center font-bold text-gray-700 border-b text-[11px]">PFMEA</th>
                                    <th className="px-2 py-2 text-center font-bold text-gray-700 border-b text-[11px]">CP</th>
                                    <th className="px-2 py-2 text-center font-bold text-gray-700 border-b text-[11px]">PFD</th>
                                    <th className="px-3 py-2 text-left font-bold text-gray-700 border-b">부서</th>
                                    <th className="px-3 py-2 text-left font-bold text-gray-700 border-b">이메일</th>
                                    <th className="px-3 py-2 text-center font-bold text-gray-700 border-b">상태</th>
                                    <th className="px-3 py-2 text-center font-bold text-gray-700 border-b">작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr><td colSpan={14} className="px-4 py-8 text-center text-gray-500">{loading ? '로딩 중...' : '등록된 사용자가 없습니다.'}</td></tr>
                                ) : filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 border-b border-gray-100 align-middle">
                                        {/* 사진 셀 */}
                                        <td className="px-2 py-1 text-center">
                                            <label className="cursor-pointer inline-block">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handlePhotoUpload(user.id, file);
                                                        e.target.value = '';
                                                    }}
                                                />
                                                {user.photoUrl ? (
                                                    <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover mx-auto border-2 border-gray-200 hover:border-blue-400" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mx-auto hover:bg-blue-100 border-2 border-gray-300 hover:border-blue-400">
                                                        <Camera className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                )}
                                            </label>
                                        </td>
                                        {/* 회사명 */}
                                        <td className="px-1 py-1">
                                            <input
                                                type="text"
                                                list={inlineEditMode ? `customer-list-${user.id}` : undefined}
                                                value={user.customer || ''}
                                                onChange={(e) => inlineEditMode && updateUserField(user.id, 'customer', e.target.value)}
                                                readOnly={!inlineEditMode}
                                                className={`w-full px-2 py-1 text-xs border rounded ${inlineEditMode
                                                    ? 'border-orange-300 bg-orange-50 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 cursor-text'
                                                    : 'border-gray-200 bg-gray-50 cursor-default'
                                                    }`}
                                                placeholder={inlineEditMode ? "선택 또는 입력" : ""}
                                            />
                                            {inlineEditMode && (
                                                <datalist id={`customer-list-${user.id}`}>
                                                    {CUSTOMERS.filter(c => c !== '전체').map(c => <option key={c} value={c} />)}
                                                </datalist>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-gray-800 align-middle">{user.name}</td>
                                        <td className="px-3 py-2 text-gray-600 font-mono text-xs align-middle whitespace-nowrap">{user.loginId || user.email?.split('@')[0] || '—'}</td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowPwModal(true); setNewPassword(''); }}
                                                className="px-2 py-1 text-[10px] bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center gap-1 mx-auto"
                                            >
                                                <Key className="w-3 h-3" /> 변경
                                            </button>
                                        </td>
                                        {/* 역할 - 인라인 편집 시 select로 변경 */}
                                        <td className="px-3 py-2 text-center">
                                            {inlineEditMode ? (
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => updateUserField(user.id, 'role', e.target.value)}
                                                    className="px-1 py-0.5 text-[10px] font-bold border rounded border-orange-300 bg-orange-50"
                                                >
                                                    <option value="viewer">viewer</option>
                                                    <option value="editor">editor</option>
                                                    <option value="manager">manager</option>
                                                    <option value="admin">admin</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'manager' ? 'bg-cyan-100 text-cyan-800' : user.role === 'editor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {user.role}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-center"><PermBadge level={user.permPfmea} /></td>
                                        <td className="px-2 py-2 text-center"><PermBadge level={user.permCp} /></td>
                                        <td className="px-2 py-2 text-center"><PermBadge level={user.permPfd} /></td>
                                        <td className="px-3 py-2 text-gray-600 text-xs">{user.department}</td>
                                        <td className="px-3 py-2 text-gray-600 text-xs">{user.email}</td>
                                        <td className="px-3 py-2 text-center"><span className={`w-2 h-2 inline-block rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span></td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => openEditModal(user)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => deleteUser(user.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 사용자 추가 모달 */}
            {showAddModal && (
                <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
                    style={{ left: addPos.x, top: addPos.y, width: addSize.w, height: addSize.h }}>
                    <div className="bg-gray-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={addDragStart}>
                        <h2 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5" /> 사용자 추가</h2>
                        <button onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white text-xl">✕</button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">회사명 *</label>
                                    <input type="text" list="customer-list-add" value={newUser.customer} onChange={e => setNewUser({ ...newUser, customer: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="선택 또는 직접 입력" />
                                    <datalist id="customer-list-add">
                                        {CUSTOMERS.filter(c => c !== '전체').map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                                    <input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">로그인 ID</label>
                                    <input type="text" value={newUser.loginId} onChange={e => setNewUser({ ...newUser, loginId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="ID/PW 방식용" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                                    <input type="text" value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                                    <input type="text" value={newUser.position} onChange={e => setNewUser({ ...newUser, position: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserInfo['role'] })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        <option value="viewer">Viewer (읽기 전용)</option>
                                        <option value="editor">Editor (편집 가능)</option>
                                        <option value="manager">Manager (기업관리·고객사/CFT)</option>
                                        <option value="admin">Admin (시스템관리)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">로그인 방식</label>
                                    <select value={newUser.loginType} onChange={e => setNewUser({ ...newUser, loginType: e.target.value as 'email' | 'id_pw' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        <option value="id_pw">🔑 ID/PW</option>
                                        <option value="email">📧 이메일</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div><label className="block text-xs font-medium text-gray-700 mb-1">PFMEA</label><select value={newUser.permPfmea} onChange={e => setNewUser({ ...newUser, permPfmea: e.target.value as any })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="none">없음</option><option value="read">읽기</option><option value="write">쓰기</option></select></div>
                                <div><label className="block text-xs font-medium text-gray-700 mb-1">CP</label><select value={newUser.permCp} onChange={e => setNewUser({ ...newUser, permCp: e.target.value as any })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="none">없음</option><option value="read">읽기</option><option value="write">쓰기</option></select></div>
                                <div><label className="block text-xs font-medium text-gray-700 mb-1">PFD</label><select value={newUser.permPfd} onChange={e => setNewUser({ ...newUser, permPfd: e.target.value as any })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="none">없음</option><option value="read">읽기</option><option value="write">쓰기</option></select></div>
                            </div>
                            <p className="text-xs text-gray-500">* 초기 비밀번호는 1234로 설정됩니다.</p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">취소</button>
                            <button onClick={addUser} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">추가</button>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={addResizeStart} title="크기 조절">
                        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>
            )}

            {/* 비밀번호 변경 모달 */}
            {showPwModal && selectedUser && (
                <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
                    style={{ left: pwPos.x, top: pwPos.y, width: pwSize.w, height: pwSize.h }}>
                    <div className="bg-orange-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={pwDragStart}>
                        <h2 className="text-lg font-bold flex items-center gap-2"><Key className="w-5 h-5" /> 비밀번호 변경</h2>
                        <button onClick={() => setShowPwModal(false)} className="text-white/70 hover:text-white text-xl">✕</button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>{selectedUser.name}</strong> ({selectedUser.email})
                            </p>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="새 비밀번호 (4자 이상)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowPwModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">취소</button>
                            <button onClick={handleChangePassword} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">변경</button>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={pwResizeStart} title="크기 조절">
                        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>
            )}

            {/* 사용자 편집 모달 */}
            {showEditModal && editingUser && (
                <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
                    style={{ left: editPos.x, top: editPos.y, width: editSize.w, height: editSize.h }}>
                    <div className="bg-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={editDragStart}>
                        <h2 className="text-lg font-bold flex items-center gap-2"><Edit className="w-5 h-5" /> 사용자 정보 수정</h2>
                        <button onClick={() => { setShowEditModal(false); setEditingUser(null); }} className="text-white/70 hover:text-white text-xl">✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">회사명 *</label>
                                    <input type="text" list="customer-list-edit" value={editingUser.customer} onChange={e => setEditingUser({ ...editingUser, customer: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="선택 또는 직접 입력" />
                                    <datalist id="customer-list-edit">
                                        {CUSTOMERS.filter(c => c !== '전체').map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                                    <input type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">로그인 ID</label>
                                    <input type="text" value={editingUser.loginId || ''} onChange={e => setEditingUser({ ...editingUser, loginId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="ID/PW 방식용" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                                    <input type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
                                    <input type="text" value={editingUser.department} onChange={e => setEditingUser({ ...editingUser, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                                    <input type="text" value={editingUser.position} onChange={e => setEditingUser({ ...editingUser, position: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                                    <input type="text" value={editingUser.phone} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                                    <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserInfo['role'] })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        <option value="viewer">Viewer (읽기 전용)</option>
                                        <option value="editor">Editor (편집 가능)</option>
                                        <option value="manager">Manager (기업관리·고객사/CFT)</option>
                                        <option value="admin">Admin (시스템관리)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">로그인 방식</label>
                                    <select value={editingUser.loginType} onChange={e => setEditingUser({ ...editingUser, loginType: e.target.value as 'email' | 'id_pw' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        <option value="id_pw">🔑 ID/PW</option>
                                        <option value="email">📧 이메일</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                                    <select value={editingUser.isActive ? 'active' : 'inactive'} onChange={e => setEditingUser({ ...editingUser, isActive: e.target.value === 'active' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        <option value="active">활성</option>
                                        <option value="inactive">비활성</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                <div><label className="block text-xs font-medium text-gray-700 mb-1">PFMEA</label><select value={editingUser.permPfmea} onChange={e => setEditingUser({ ...editingUser, permPfmea: e.target.value as any })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="none">없음</option><option value="read">읽기</option><option value="write">쓰기</option></select></div>
                                <div><label className="block text-xs font-medium text-gray-700 mb-1">CP</label><select value={editingUser.permCp} onChange={e => setEditingUser({ ...editingUser, permCp: e.target.value as any })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="none">없음</option><option value="read">읽기</option><option value="write">쓰기</option></select></div>
                                <div><label className="block text-xs font-medium text-gray-700 mb-1">PFD</label><select value={editingUser.permPfd} onChange={e => setEditingUser({ ...editingUser, permPfd: e.target.value as any })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="none">없음</option><option value="read">읽기</option><option value="write">쓰기</option></select></div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setShowEditModal(false); setEditingUser(null); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">취소</button>
                            <button onClick={saveEditUser} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={editResizeStart} title="크기 조절">
                        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>
                </div>
            )}
        </FixedLayout>
    );
}
