/**
 * 사용자 선택 모달
 * CFT/승인권자 등록 시 사용자 선택
 * @ref C:\01_Next_FMEA\app\fmea\components\UserInfoSelectionModal.tsx
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/lib/locale';
import { UserInfo, USER_STORAGE_KEY } from '@/types/user';
import { getAllUsers, createUser, deleteUser, updateUser } from '@/lib/user-db';
import { downloadStyledExcel } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';

interface UserSelectModalProps {
  isOpen: boolean;
  onSelect: (user: UserInfo) => void;
  onClose: () => void;
  title?: string; // 모달 제목 (기본: '사용자 선택')
  initialSearchTerm?: string; // 역할 자동 추천 시 초기 검색어
}


export function UserSelectModal({
  isOpen,
  onSelect,
  onClose,
  title,
  initialSearchTerm,
}: UserSelectModalProps) {
  const { t } = useLocale();
  const displayTitle = title || t('사용자 선택');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 드래그 & 리사이즈 상태
  const DEFAULT_W = 520;
  const DEFAULT_H = 340;
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // 열릴 때 화면 중앙 배치
  useEffect(() => {
    if (isOpen) {
      const cx = Math.max(0, window.innerWidth - DEFAULT_W - 20);
      const cy = Math.max(30, Math.round((window.innerHeight - DEFAULT_H) / 2 - 30));
      setPos({ x: cx, y: cy });
      setSize({ w: DEFAULT_W, h: DEFAULT_H });
    }
  }, [isOpen]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.origX + (ev.clientX - dragRef.current.startX), y: Math.max(0, dragRef.current.origY + (ev.clientY - dragRef.current.startY)) });
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      setSize({ w: Math.max(500, resizeRef.current.origW + (ev.clientX - resizeRef.current.startX)), h: Math.max(350, resizeRef.current.origH + (ev.clientY - resizeRef.current.startY)) });
    };
    const onUp = () => { resizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size]);

  // 단일 선택
  const selectUser = (id: string) => {
    setSelectedUserId(prev => prev === id ? null : id);
  };

  // 데이터 로드
  useEffect(() => {
    if (!isOpen) return;
    refreshData();
  }, [isOpen]);

  const refreshData = async () => {
    const loadedUsers = await getAllUsers();
    setUsers(loadedUsers);
  };

  // 검색 필터링 (대소문자 무시, 성명/부서/공장/이메일/직급/비고)
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(q) ||
      user.department?.toLowerCase().includes(q) ||
      user.factory?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.position?.toLowerCase().includes(q) ||
      user.remark?.toLowerCase().includes(q)
    );
  });

  // 모달 열기/닫기 시 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedUserId(null);
      setEditingUser(null);
    } else if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [isOpen, initialSearchTerm]);

  // 비모달: body 스크롤 방지 해제됨 — 배경 페이지 조작 가능

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
      if (!editingUser.name || editingUser.name.trim() === '') {
        alert('❌ 성명은 필수입니다(Name is required).');
        return;
      }

      // 필수 필드 검증
      if (!editingUser.factory || editingUser.factory.trim() === '') {
        alert('❌ 공장은 필수입니다(Plant is required).');
        return;
      }
      if (!editingUser.department || editingUser.department.trim() === '') {
        alert('❌ 부서는 필수입니다(Dept. is required).');
        return;
      }

      try {
        const savedId = editingUser.id;
        let savedUser: UserInfo | null = null;

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
          savedUser = users.find(u => u.id === savedId) || null;
        } else {
          // 새 사용자 생성
          savedUser = await createUser({
            factory: editingUser.factory,
            department: editingUser.department,
            name: editingUser.name,
            position: editingUser.position,
            phone: editingUser.phone,
            email: editingUser.email,
            remark: editingUser.remark,
          });
        }

        // 목록 갱신
        await refreshData();

        // 저장된 사용자 선택 (ID 갱신)
        if (savedUser) {
          setSelectedUserId(savedUser.id);
          alert(`✅ "${savedUser.name}" 저장 완료(Saved)!`);
        } else {
          const updatedUsers = await getAllUsers();
          const found = updatedUsers.find(u => u.name === editingUser.name && u.department === editingUser.department);
          if (found) {
            setSelectedUserId(found.id);
            alert(`✅ "${found.name}" 저장 완료(Saved)!`);
          } else {
            alert(`✅ 저장 완료(Saved)! 목록을 확인해주세요.`);
          }
        }

        setEditingUser(null);
      } catch (error: any) {
        console.error('[UserSelectModal] 저장 오류:', error);
        alert(`❌ 저장 실패(Save Failed): ${error.message || '알 수 없는 오류(Unknown error)'}`);
        // 에러 발생해도 편집 모드 유지하여 재시도 가능하게
      }
    }
  };

  // 삭제 (단일)
  const handleDelete = async () => {
    if (!selectedUserId) {
      alert('삭제할 사용자를 선택해주세요(Please select a user to delete).');
      return;
    }
    const user = users.find(u => u.id === selectedUserId);
    if (!user) {
      alert('❌ 선택된 사용자를 찾을 수 없습니다(User not found).');
      return;
    }
    if (!confirm(`"${user.name}" (${user.factory}/${user.department}) 삭제하시겠습니까(Delete)?`)) {
      return;
    }
    try {
      await deleteUser(selectedUserId);
      await refreshData();
      setSelectedUserId(null);
      alert(`✅ "${user.name}" 삭제 완료(Deleted)!`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('[UserSelectModal] 삭제 오류:', error);
      alert(`❌ 삭제 실패(Delete Failed):\n${msg}`);
      await refreshData();
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

      const dataRows = jsonData.slice(1).filter(row => row.length > 0 && row[2]); // 성명 필수

      if (dataRows.length === 0) {
        alert('❌ 데이터가 없습니다(No data found).');
        return;
      }

      let importedCount = 0;
      let skipCount = 0;
      const existingUsers = await getAllUsers();
      const existingEmails = new Set(existingUsers.filter(u => u.email).map(u => u.email!.toLowerCase()));

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
          if (userData.email && existingEmails.has(userData.email.toLowerCase())) {
            skipCount++;
            continue;
          }
          try {
            await createUser(userData);
            if (userData.email) existingEmails.add(userData.email.toLowerCase());
            importedCount++;
          } catch (err) {
            console.error(`[Import] "${userData.name}" 등록 실패:`, err);
          }
        }
      }

      await refreshData();
      const msg = skipCount > 0
        ? `✅ ${importedCount}명 Import 완료(Complete)!\n⚠️ ${skipCount}명 이메일 중복으로 건너뜀(Skipped).`
        : `✅ ${importedCount}명 Import 완료(Complete)!`;
      alert(msg);
    } catch (err) {
      console.error('Import 오류:', err);
      alert(`❌ 엑셀 파일 읽기 오류(Excel read error):\n${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  const handleSelect = (user: UserInfo) => {
    onSelect(user);
    onClose();
  };

  // ✅ 2026-01-22: Portal을 사용하여 레이아웃 영향 방지
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-400"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
        {/* 헤더 (드래그 영역) — 한줄 한글(영어) */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-300 bg-[#00587a] rounded-t-lg cursor-move shrink-0" onMouseDown={onDragStart}>
          <h2 className="text-[11px] font-bold text-white flex items-center gap-1 select-none whitespace-nowrap" title="Select User">
            👤 사용자 선택(Select User)
          </h2>
          <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
            <button onClick={handleImport} title="가져오기(Import)" className="px-2 py-1 text-[10px] font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100">가져오기(Import)</button>
            <button onClick={handleExport} title="내보내기(Export)" className="px-2 py-1 text-[10px] font-semibold bg-white text-[#00587a] rounded hover:bg-gray-100">내보내기(Export)</button>
            <button onClick={handleAdd} title="추가(Add)" className="px-2 py-1 text-[10px] font-semibold bg-green-500 text-white rounded hover:bg-green-600">추가(Add)</button>
            <button
              onClick={() => {
                if (!selectedUserId) { alert('수정할 사용자를 선택해주세요(Please select a user to edit).'); return; }
                const user = users.find(u => u.id === selectedUserId);
                if (user) setEditingUser({ ...user });
              }}
              title="수정(Edit)"
              className="px-2 py-1 text-[10px] font-semibold rounded bg-amber-500 text-white hover:bg-amber-600"
            >수정(Edit)</button>
            <button
              onClick={handleSave}
              disabled={!editingUser}
              title="저장(Save)"
              className={`px-2 py-1 text-[10px] font-semibold rounded ${editingUser ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
            >저장(Save)</button>
            <button onClick={handleDelete} title="삭제(Del)" className="px-2 py-1 text-[10px] font-semibold bg-red-500 text-white rounded hover:bg-red-600">삭제(Del)</button>
            <div className="w-px h-5 bg-white/40 mx-0.5" />
            <button onClick={() => setShowHelp(v => !v)} title="도움말(Help)" className={`px-1.5 py-1 text-[10px] font-semibold rounded ${showHelp ? 'bg-yellow-400 text-gray-800' : 'bg-white text-[#00587a]'} hover:bg-yellow-300`}>?</button>
            <button onClick={onClose} title="닫기(Close)" className="px-1.5 py-1 text-[10px] font-semibold bg-gray-200 text-gray-700 rounded hover:bg-gray-300">✕</button>
          </div>
        </div>

        {/* 도움말 패널 */}
        {showHelp && (
          <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200 text-[10px] text-gray-700 space-y-1">
            <p className="font-bold text-[11px] text-yellow-800 mb-1">사용법(How to Use)</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <p><span className="font-semibold text-blue-700">행 클릭(Click)</span> — 사용자 선택(Select)</p>
              <p><span className="font-semibold text-blue-700">더블클릭(DblClick)</span> — 즉시 적용(Apply)</p>
              <p><span className="font-semibold text-green-700">➕ 추가(Add)</span> — 신규 등록(New)</p>
              <p><span className="font-semibold text-amber-700">✏️ 수정(Edit)</span> — 정보 편집(Modify)</p>
              <p><span className="font-semibold text-blue-700">💾 저장(Save)</span> — DB 저장(Store)</p>
              <p><span className="font-semibold text-red-700">🗑️ 삭제(Del)</span> — DB 삭제(Remove)</p>
              <p><span className="font-semibold text-[#00587a]">📥 Import</span> — 엑셀 일괄등록(Batch)</p>
              <p><span className="font-semibold text-[#00587a]">📤 Export</span> — 엑셀 다운로드(Download)</p>
            </div>
            <p className="text-[9px] text-gray-500 mt-1">* 검색(Search): 성명, 부서, 공장, 직급, 비고</p>
          </div>
        )}

        {/* 파일 입력 (숨김) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls"
          className="hidden"
        />

        {/* 검색 (컴팩트) */}
        <div className="px-3 py-1 border-b border-gray-200">
          <input
            type="text"
            placeholder="🔍 검색(Search) — 성명/부서/공장/직급/비고"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
        </div>

        {/* 편집 폼 (추가/수정 시) */}
        {editingUser ? (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
              <p className="text-xs font-semibold text-blue-700 mb-2">📝 {!users.find(u => u.id === editingUser.id) ? '신규 등록(New User)' : '사용자 수정(Edit User)'}</p>
              <div className="grid grid-cols-4 gap-x-3 gap-y-2">
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">성명<span className="text-[7px] text-gray-400 ml-0.5">(Name)</span> <span className="text-red-500">*</span></label>
                  <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="홍길동" autoFocus />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">공장<span className="text-[7px] text-gray-400 ml-0.5">(Plant)</span></label>
                  <input type="text" value={editingUser.factory} onChange={(e) => setEditingUser({ ...editingUser, factory: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="평택공장" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">부서<span className="text-[7px] text-gray-400 ml-0.5">(Dept.)</span></label>
                  <input type="text" value={editingUser.department} onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="품질보증팀" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 block mb-0.5">직급<span className="text-[7px] text-gray-400 ml-0.5">(Pos.)</span></label>
                  <input type="text" value={editingUser.position} onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="과장" />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-gray-600 block mb-0.5">비고<span className="text-[7px] text-gray-400 ml-0.5">(Note)</span> 역할/담당</label>
                  <input type="text" value={editingUser.remark || ''} onChange={(e) => setEditingUser({ ...editingUser, remark: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Champion / 총괄" />
                </div>
                <div className="flex items-end gap-1">
                  <button onClick={handleSave} title="Save" className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap">💾 저장(Save)</button>
                  <button onClick={() => setEditingUser(null)} title="Cancel" className="px-2 py-0.5 text-[10px] font-semibold bg-gray-300 text-gray-700 rounded hover:bg-gray-400 whitespace-nowrap">취소(Cancel)</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 안내 메시지 + 선택 적용 버튼 */}
            <div className="flex items-center justify-between px-3 py-1 bg-amber-50 border-b border-amber-200">
              <p className="text-[10px] text-amber-700">
                클릭(Click) → 선택(Select) | 더블클릭(DblClick) → 즉시 적용(Apply)
              </p>
              <button
                onClick={() => {
                  if (!selectedUserId) { alert('선택된 사용자가 없습니다(No user selected).'); return; }
                  const user = users.find(u => u.id === selectedUserId);
                  if (user) handleSelect(user);
                }}
                disabled={!selectedUserId || !!editingUser}
                title="Apply Selection"
                className={`px-2 py-0.5 text-[9px] font-semibold rounded ${selectedUserId && !editingUser
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                ✓ 적용<span className="text-[7px] opacity-70 ml-0.5">(Apply)</span>
              </button>
            </div>

            {/* 테이블 */}
            <div className="flex-1 overflow-y-auto px-2 py-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  사용자가 없습니다(No users). [➕ 추가(Add)] 또는 [📥 Import]로 등록하세요.
                </div>
              ) : (
                <table className="w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#00587a] text-white">
                    <tr>
                      <th className="border border-white/40 px-1 py-0.5 text-center align-middle font-semibold w-16"><div className="leading-tight"><div className="text-[10px]">공장</div><div className="text-[7px] font-normal opacity-60">(Plant)</div></div></th>
                      <th className="border border-white/40 px-1 py-0.5 text-center align-middle font-semibold"><div className="leading-tight"><div className="text-[10px]">부서</div><div className="text-[7px] font-normal opacity-60">(Dept.)</div></div></th>
                      <th className="border border-white/40 px-1 py-0.5 text-center align-middle font-semibold w-14"><div className="leading-tight"><div className="text-[10px]">성명</div><div className="text-[7px] font-normal opacity-60">(Name)</div></div></th>
                      <th className="border border-white/40 px-1 py-0.5 text-center align-middle font-semibold w-14"><div className="leading-tight"><div className="text-[10px]">직급</div><div className="text-[7px] font-normal opacity-60">(Pos.)</div></div></th>
                      <th className="border border-white/40 px-1 py-0.5 text-center align-middle font-semibold"><div className="leading-tight"><div className="text-[10px]">비고</div><div className="text-[7px] font-normal opacity-60">(Note)</div></div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user.id}
                        onClick={() => selectUser(user.id)}
                        onDoubleClick={() => handleSelect(user)}
                        className={`cursor-pointer hover:bg-blue-100 transition-colors ${selectedUserId === user.id
                          ? 'bg-blue-200'
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                      >
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{user.factory}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{user.department}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle font-semibold">{user.name}</td>
                        <td className="border border-gray-300 px-1 py-1 text-center align-middle">{user.position || '-'}</td>
                        <td className="border border-gray-300 px-1 py-1 text-left align-middle">{user.remark || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* 푸터 */}
        <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50 rounded-b-lg shrink-0">
          <span className="text-[10px] text-gray-500">
            총(Total) {filteredUsers.length}명 {selectedUserId && `| 선택(Selected): ${users.find(u => u.id === selectedUserId)?.name || ''}`}
          </span>
        </div>

        {/* 리사이즈 핸들 */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절(Resize)">
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
    </div>,
    document.body
  );
}
