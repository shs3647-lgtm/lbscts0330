'use client';

/**
 * @file 사용자정보 기초정보 페이지
 * @description UserSelectModal과 동일한 데이터 소스(localStorage) 사용 - 양방향 동기화
 * @version 1.0.0
 * @created 2026-01-10
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserInfo, USER_STORAGE_KEY } from '@/types/user';
import { getAllUsers, createSampleUsers, deleteUser, createUser, updateUser } from '@/lib/user-db';
import { downloadStyledExcel } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';

// UUID 생성
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function UserMasterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      await createSampleUsers();
      await refreshData();
    };
    loadData();
  }, []);

  const refreshData = async () => {
    const loadedUsers = await getAllUsers();
    setUsers(loadedUsers);
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
      id: generateUUID(),
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
      
      // DB에 저장 (createUser 또는 updateUser)
      if (editingUser.id && users.find(u => u.id === editingUser.id)) {
        // 기존 사용자 수정
        await updateUser(editingUser.id, {
          factory: editingUser.factory,
          department: editingUser.department,
          name: editingUser.name,
          position: editingUser.position,
          phone: editingUser.phone,
          email: editingUser.email,
          remark: editingUser.remark,
        });
      } else {
        // 새 사용자 생성
        await createUser({
          factory: editingUser.factory,
          department: editingUser.department,
          name: editingUser.name,
          position: editingUser.position,
          phone: editingUser.phone,
          email: editingUser.email,
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
    if (selectedId) {
      if (confirm('선택한 사용자를 삭제하시겠습니까?')) {
        await deleteUser(selectedId);
        await refreshData();
        setSelectedId(null);
      }
    } else {
      alert('삭제할 사용자를 선택해주세요.');
    }
  };

  // Export (엑셀 다운로드)
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

  // Import (엑셀 업로드)
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

      for (const row of dataRows) {
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
          // 이메일 중복 체크
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
    <div className="h-full flex flex-col bg-gray-50 pt-8">
      {/* 헤더 */}
      <div className="bg-[#00587a] px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          👤 사용자 정보 관리
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={handleImport} className="px-3 py-1.5 text-xs font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100">
            📥 Import
          </button>
          <button onClick={handleExport} className="px-3 py-1.5 text-xs font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100">
            📤 Export
          </button>
          <button onClick={handleAdd} className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded hover:bg-green-600">
            ➕ 추가
          </button>
          <button 
            onClick={() => {
              if (editingUser) {
                handleSave();
              } else if (selectedId) {
                const user = users.find(u => u.id === selectedId);
                if (user) setEditingUser({...user});
              } else {
                alert('수정할 사용자를 선택해주세요.');
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${
              editingUser 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {editingUser ? '💾 저장' : '✏️ 수정'}
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600">
            🗑️ 삭제
          </button>
        </div>
      </div>

      {/* 파일 입력 (숨김) */}
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
            📝 사용자 {users.find(u => u.id === editingUser.id) ? '수정' : '신규 등록'}
          </p>
          <div className="grid grid-cols-7 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">공장</label>
              <input type="text" value={editingUser.factory} onChange={(e) => setEditingUser({...editingUser, factory: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="울산공장" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">부서</label>
              <input type="text" value={editingUser.department} onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="품질보증팀" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">성명 *</label>
              <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="홍길동" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">직급</label>
              <input type="text" value={editingUser.position} onChange={(e) => setEditingUser({...editingUser, position: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="과장" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">전화번호</label>
              <input type="text" value={editingUser.phone} onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="010-1234-5678" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">이메일</label>
              <input type="text" value={editingUser.email} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="user@example.com" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSave} className="px-4 py-1.5 text-sm font-semibold bg-blue-500 text-white rounded hover:bg-blue-600">💾 저장</button>
              <button onClick={() => setEditingUser(null)} className="px-4 py-1.5 text-sm font-semibold bg-gray-300 text-gray-700 rounded hover:bg-gray-400">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            사용자가 없습니다. [➕ 추가] 또는 [📥 Import]로 등록하세요.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[#00587a] text-white">
              <tr>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-10">✓</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-24">공장</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32">부서</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-20">성명</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-16">직급</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32">전화번호</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold">이메일</th>
                <th className="border border-white/50 px-2 py-2 text-center font-semibold w-32">비고</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedId(user.id)}
                  onDoubleClick={() => setEditingUser({...user})}
                  className={`cursor-pointer hover:bg-blue-100 transition-colors ${
                    selectedId === user.id 
                      ? 'bg-blue-200' 
                      : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <input type="radio" checked={selectedId === user.id} onChange={() => setSelectedId(user.id)} className="w-4 h-4" />
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
          총 {filteredUsers.length}명 {selectedId && '| 선택: 1명'}
        </span>
        <span className="text-xs text-gray-400 ml-4">
          💡 이 데이터는 FMEA 등록화면의 사용자 선택 모달과 자동 동기화됩니다.
        </span>
      </div>
    </div>
  );
}



