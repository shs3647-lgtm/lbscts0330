/**
 * 사용자 선택 모달
 * CFT/승인권자 등록 시 인원 선택 — public.cft_public_members (로그인 users와 분리)
 * @ref C:\01_Next_FMEA\app\fmea\components\UserInfoSelectionModal.tsx
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/lib/locale';
import { UserInfo } from '@/types/user';
import { getAllUsers, createUser, deleteUser } from '@/lib/user-db';

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
  const [showHelp, setShowHelp] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ factory: '', department: '', name: '', position: '', remark: '' });

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
    getAllUsers().then(setUsers);
  }, [isOpen]);

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
    } else if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [isOpen, initialSearchTerm]);

  const reloadUsers = useCallback(() => {
    getAllUsers().then(setUsers);
  }, []);

  // 비모달: body 스크롤 방지 해제됨 — 배경 페이지 조작 가능

  if (!isOpen) return null;

  const handleSelect = (user: UserInfo) => {
    onSelect(user);
    onClose();
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim()) { alert('성명을 입력해주세요.'); return; }
    try {
      await createUser({
        factory: newUser.factory.trim() || '-',
        department: newUser.department.trim() || '-',
        name: newUser.name.trim(),
        position: newUser.position.trim() || '-',
        phone: '',
        email: '',
        remark: newUser.remark.trim() || '',
      });
      setNewUser({ factory: '', department: '', name: '', position: '', remark: '' });
      setIsAdding(false);
      reloadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '사용자 추가 실패';
      alert(msg);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) { alert('삭제할 사용자를 선택해주세요.'); return; }
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;
    if (!confirm(`"${user.name}" 사용자를 삭제하시겠습니까?`)) return;
    try {
      await deleteUser(selectedUserId);
      setSelectedUserId(null);
      reloadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '사용자 삭제 실패';
      alert(msg);
    }
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
            👤 {displayTitle}
          </h2>
          <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
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
            </div>
            <p className="text-[9px] text-gray-500 mt-1">* 검색(Search): 성명, 부서, 공장, 직급, 비고</p>
          </div>
        )}

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

        {/* 안내 메시지 + 버튼 영역 */}
        <div className="flex items-center justify-between px-3 py-1 bg-amber-50 border-b border-amber-200">
          <p className="text-[10px] text-amber-700">
            클릭(Click) → 선택(Select) | 더블클릭(DblClick) → 즉시 적용(Apply)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setIsAdding(v => !v); setNewUser({ factory: '', department: '', name: '', position: '', remark: '' }); }}
              title="사용자 추가(Add)"
              className={`px-2 py-0.5 text-[9px] font-semibold rounded ${isAdding ? 'bg-orange-500 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              {isAdding ? '취소' : '+ 추가'}
            </button>
            <button
              onClick={() => { if (!isAdding) setIsAdding(true); else handleAddUser(); }}
              title="저장(Save)"
              className="px-2 py-0.5 text-[9px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              저장
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={!selectedUserId}
              title="사용자 삭제(Delete)"
              className={`px-2 py-0.5 text-[9px] font-semibold rounded ${selectedUserId
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              - 삭제
            </button>
            <button
              onClick={() => {
                if (!selectedUserId) { alert('선택된 사용자가 없습니다(No user selected).'); return; }
                const user = users.find(u => u.id === selectedUserId);
                if (user) handleSelect(user);
              }}
              disabled={!selectedUserId}
              title="Apply Selection"
              className={`px-2 py-0.5 text-[9px] font-semibold rounded ${selectedUserId
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              ✓ 적용<span className="text-[7px] opacity-70 ml-0.5">(Apply)</span>
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs">
              사용자가 없습니다(No users).
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
                {isAdding && (
                  <tr className="bg-green-50">
                    {(['factory', 'department', 'name', 'position', 'remark'] as const).map(field => (
                      <td key={field} className="border border-gray-300 px-0.5 py-0.5">
                        <input
                          type="text"
                          value={newUser[field]}
                          onChange={e => setNewUser(prev => ({ ...prev, [field]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddUser(); if (e.key === 'Escape') setIsAdding(false); }}
                          placeholder={field === 'factory' ? '공장' : field === 'department' ? '부서' : field === 'name' ? '성명*' : field === 'position' ? '직급' : '비고'}
                          className={`w-full px-1 py-0.5 text-[10px] border rounded focus:outline-none focus:ring-1 focus:ring-green-400 ${field === 'name' ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                          autoFocus={field === 'factory'}
                        />
                      </td>
                    ))}
                  </tr>
                )}
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
