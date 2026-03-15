'use client';

/**
 * @file 사용자정보 기초정보 페이지
 * @description UserSelectModal과 동일한 데이터 소스(localStorage) 사용 - 양방향 동기화
 * @version 1.1.0
 * @updated 2026-01-26 AdminTopNav 추가
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserInfo } from '@/types/user';
import { getAllUsers, deleteUser, createUser, updateUser } from '@/lib/user-db';
import { downloadStyledExcel } from '@/lib/excel-utils';
import { FixedLayout, AdminTopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';
import * as XLSX from 'xlsx';

export default function UserMasterPage() {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로드
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const loadedUsers = await getAllUsers();
      setUsers(loadedUsers);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredUsers = users.filter(user =>
    user.name.includes(searchTerm) ||
    user.department.includes(searchTerm) ||
    user.factory.includes(searchTerm) ||
    user.email.includes(searchTerm)
  );

  // 신규 추가
  const handleAdd = () => {
    const now = new Date().toISOString();
    const newUser: UserInfo = {
      id: crypto.randomUUID(),
      factory: '',
      department: '',
      name: '',
      position: '',
      phone: '',
      email: '',
      remark: '',
      createdAt: now,
      updatedAt: now
    };
    setEditingUser(newUser);
  };

  // 저장
  const handleSave = async () => {
    if (editingUser) {
      if (!editingUser.name) {
        alert('성명은 필수입니다.');
        return;
      }

      const savedId = editingUser.id;

      if (editingUser.id && users.find(u => u.id === editingUser.id)) {
        await updateUser(editingUser.id, {
          factory: editingUser.factory,
          department: editingUser.department,
          name: editingUser.name,
          position: editingUser.position,
          phone: editingUser.phone,
          email: editingUser.email,
          photoUrl: editingUser.photoUrl,
          remark: editingUser.remark,
        });
      } else {
        await createUser({
          factory: editingUser.factory,
          department: editingUser.department,
          name: editingUser.name,
          position: editingUser.position,
          phone: editingUser.phone,
          email: editingUser.email,
          photoUrl: editingUser.photoUrl,
          remark: editingUser.remark,
        });
      }

      setEditingUser(null);
      await refreshData();
      setSelectedId(savedId);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!selectedId) {
      window.alert('삭제할 사용자를 선택해주세요(Please select a user to delete).');
      return;
    }
    const user = users.find(u => u.id === selectedId);
    if (!user) {
      window.alert('❌ 선택된 사용자를 찾을 수 없습니다(User not found).');
      return;
    }
    const confirmed = window.confirm(`"${user.name}" (${user.factory}/${user.department}) 삭제하시겠습니까(Delete)?`);
    if (!confirmed) return;
    try {
      await deleteUser(selectedId);
      await refreshData();
      setSelectedId(null);
      setEditingUser(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('[UserMasterPage] 삭제 오류:', error);
      window.alert(`❌ 삭제 실패(Delete Failed):\n${msg}`);
      await refreshData();
    }
  };

  // Export
  const handleExport = () => {
    const headers = ['공장', '부서', '성명', '직급', '전화번호', '이메일', '비고'];
    const colWidths = [12, 15, 10, 10, 15, 25, 20];
    const data = users.map(u => [
      u.factory,
      u.department,
      u.name,
      u.position,
      u.phone,
      u.email,
      u.remark || ''
    ]);
    downloadStyledExcel(headers, data, colWidths, '사용자정보', `사용자정보_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Import
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

      const dataRows = jsonData.slice(1).filter(row => row.length > 0 && row[2]);

      if (dataRows.length === 0) {
        alert('❌ 데이터가 없습니다.');
        return;
      }

      let importedCount = 0;

      // 역순 Import: createdAt desc 정렬에서 엑셀 원본 순서 유지
      for (const row of [...dataRows].reverse()) {
        const userData = {
          factory: String(row[0] || ''),
          department: String(row[1] || ''),
          name: String(row[2] || ''),
          position: String(row[3] || ''),
          phone: String(row[4] || ''),
          email: String(row[5] || ''),
          remark: String(row[6] || ''),
        };

        if (userData.name) {
          const existingUsers = await getAllUsers();
          const emailExists = userData.email && existingUsers.find(u => u.email === userData.email);
          if (!emailExists) {
            await createUser(userData);
            importedCount++;
          }
        }
      }

      await refreshData();
      alert(`✅ ${importedCount}명 Import 완료!`);
    } catch (err) {
      console.error('Import 오류:', err);
      alert('❌ 엑셀 파일 읽기 오류');
    }
    e.target.value = '';
  };

  return (
    <FixedLayout topNav={<AdminTopNav />} showSidebar={true}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* 헤더 */}
        <div className="bg-[#00587a] px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            👤 {t('사용자 정보 관리')} ({t('직원')}/CFT)
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={handleImport} className="px-3 py-1.5 text-xs font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100">
              📥 Import
            </button>
            <button onClick={handleExport} className="px-3 py-1.5 text-xs font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100">
              📤 Export
            </button>
            <button onClick={handleAdd} disabled={loading} className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed">
              ➕ {t('추가')}
            </button>
            <button
              disabled={loading}
              onClick={() => {
                if (editingUser) {
                  handleSave();
                } else if (selectedId) {
                  const user = users.find(u => u.id === selectedId);
                  if (user) setEditingUser({ ...user });
                } else {
                  alert('수정할 사용자를 선택해주세요.');
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed ${editingUser
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
            >
              {editingUser ? `💾 ${t('저장')}` : `✏️ ${t('수정')}`}
            </button>
            <button onClick={handleDelete} disabled={loading} className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
              🗑️ {t('삭제')}
            </button>
          </div>
        </div>

        {/* 파일 입력 */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />

        {/* 검색 */}
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <input
            type="text"
            placeholder="🔍 검색 (성명/부서/공장/이메일)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 편집 폼 */}
        {editingUser && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
            <p className="text-sm font-semibold text-blue-700 mb-3">
              📝 {t('사용자')} {users.find(u => u.id === editingUser.id) ? t('수정') : t('신규 등록')}
            </p>
            <div className="flex gap-4">
              {/* 프로필 사진 영역 */}
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-gray-600 block mb-1">{t('프로필 사진')}</label>
                <div
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 bg-white"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        alert('파일 크기는 2MB 이하여야 합니다.');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        setEditingUser({ ...editingUser, photoUrl: base64 });
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                  title="클릭하여 사진 업로드"
                >
                  {editingUser.photoUrl ? (
                    <img src={editingUser.photoUrl} alt="프로필" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <span className="text-2xl">📷</span>
                      <p className="text-[10px]">클릭</p>
                    </div>
                  )}
                </div>
                {editingUser.photoUrl && (
                  <button
                    onClick={() => setEditingUser({ ...editingUser, photoUrl: undefined })}
                    className="text-[10px] text-red-500 hover:text-red-700"
                  >삭제</button>
                )}
              </div>
              {/* 입력 필드 */}
              <div className="flex-1 grid grid-cols-7 gap-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t('공장')}</label>
                  <input type="text" value={editingUser.factory} onChange={(e) => setEditingUser({ ...editingUser, factory: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="울산공장" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t('부서')}</label>
                  <input type="text" value={editingUser.department} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="품질보증팀" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t('성명')} *</label>
                  <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="홍길동" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t('직급')}</label>
                  <input type="text" value={editingUser.position} onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="과장" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t('전화번호')}</label>
                  <input type="text" value={editingUser.phone} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="010-1234-5678" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">{t('이메일')}</label>
                  <input type="text" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="user@example.com" />
                </div>
                <div className="flex items-end gap-2 shrink-0">
                  <button onClick={handleSave} className="px-4 py-1.5 text-sm font-semibold bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap">💾 {t('저장')}</button>
                  <button onClick={() => setEditingUser(null)} className="px-4 py-1.5 text-sm font-semibold bg-gray-300 text-gray-700 rounded hover:bg-gray-400 whitespace-nowrap">{t('취소')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 테이블 */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              사용자 정보를 불러오는 중...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              사용자가 없습니다. [➕ 추가] 또는 [📥 Import]로 등록하세요.
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-[#00587a] text-white">
                <tr>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-10">✓</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-12" title="Photo">사진(Photo)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-24" title="Factory">공장(Factory)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32" title="Department">부서(Dept.)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-20" title="Name">성명(Name)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-16" title="Position">직급(Position)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32" title="Phone Number">전화번호(Phone)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold" title="Email">이메일(Email)</th>
                  <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32" title="Remark">비고(Remark)</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedId(user.id)}
                    onDoubleClick={() => setEditingUser({ ...user })}
                    className={`cursor-pointer hover:bg-blue-100 transition-colors ${selectedId === user.id
                      ? 'bg-blue-200'
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                  >
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <input type="radio" checked={selectedId === user.id} onChange={() => setSelectedId(user.id)} className="w-4 h-4" />
                    </td>
                    <td className="border border-gray-300 px-1 py-1 text-center">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover mx-auto" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mx-auto text-gray-400 text-xs">👤</div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{user.factory}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{user.department}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">{user.name}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{user.position || '-'}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{user.phone || '-'}</td>
                    <td className="border border-gray-300 px-2 py-2">{user.email || '-'}</td>
                    <td className="border border-gray-300 px-2 py-2">{user.remark || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-2 border-t border-gray-200 bg-white">
          <span className="text-sm text-gray-500">
            {t('총')} {filteredUsers.length}{t('명')} {selectedId && `| ${t('선택')}: 1${t('명')}`}
          </span>
          <span className="text-xs text-gray-400 ml-4">
            💡 이 데이터는 FMEA 등록화면의 사용자 선택 모달과 자동 동기화됩니다.
          </span>
        </div>
      </div>
    </FixedLayout>
  );
}
