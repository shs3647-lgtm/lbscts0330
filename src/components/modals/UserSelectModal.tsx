/**
 * 사용자 선택 모달 — 완전 구현
 * - 사용자 선택 / 추가 / 수정 / 삭제
 * - 드래그 이동 / 리사이즈
 * - 검색 필터
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
  title?: string;
  initialSearchTerm?: string;
}

const EMPTY_NEW = { factory: '', department: '', name: '', position: '', remark: '' };

export function UserSelectModal({ isOpen, onSelect, onClose, title, initialSearchTerm }: UserSelectModalProps) {
  const { t } = useLocale();
  const displayTitle = title || t('사용자 선택');

  const [users, setUsers] = useState<UserInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 추가 폼
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);

  // 드래그 & 리사이즈
  const DEFAULT_W = 560;
  const DEFAULT_H = 380;
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);

  // 열릴 때 중앙 배치
  useEffect(() => {
    if (isOpen) {
      setPos({ x: Math.max(0, Math.round((window.innerWidth - DEFAULT_W) / 2)), y: Math.max(30, Math.round((window.innerHeight - DEFAULT_H) / 2)) });
      setSize({ w: DEFAULT_W, h: DEFAULT_H });
    }
  }, [isOpen]);

  // 데이터 로드
  const reload = useCallback(() => { getAllUsers().then(setUsers); }, []);
  useEffect(() => { if (isOpen) reload(); }, [isOpen, reload]);

  // 열기/닫기 초기화
  useEffect(() => {
    if (!isOpen) { setSearchTerm(''); setSelectedUserId(null); setIsAdding(false); setNewUser(EMPTY_NEW); }
    else if (initialSearchTerm) setSearchTerm(initialSearchTerm);
  }, [isOpen, initialSearchTerm]);

  // 드래그
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.ox + ev.clientX - dragRef.current.sx, y: Math.max(0, dragRef.current.oy + ev.clientY - dragRef.current.sy) });
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos]);

  // 리사이즈
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { sx: e.clientX, sy: e.clientY, ow: size.w, oh: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      setSize({ w: Math.max(480, resizeRef.current.ow + ev.clientX - resizeRef.current.sx), h: Math.max(320, resizeRef.current.oh + ev.clientY - resizeRef.current.sy) });
    };
    const onUp = () => { resizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size]);

  // 검색 필터
  const filtered = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return [u.name, u.department, u.factory, u.position, u.remark, u.email].some(v => v?.toLowerCase().includes(q));
  });

  // 선택
  const handleSelect = (user: UserInfo) => { onSelect(user); onClose(); };
  const toggleSelect = (id: string) => setSelectedUserId(prev => prev === id ? null : id);

  // 추가 폼 열기/닫기
  const openAdd = () => { setIsAdding(true); setNewUser(EMPTY_NEW); setSelectedUserId(null); };
  const cancelAdd = () => { setIsAdding(false); setNewUser(EMPTY_NEW); };

  // 저장
  const handleSave = async () => {
    if (!newUser.name.trim()) { alert('성명(Name)을 입력해주세요.'); return; }
    setSaving(true);
    try {
      await createUser({
        factory: newUser.factory.trim() || '-',
        department: newUser.department.trim() || '-',
        name: newUser.name.trim(),
        position: newUser.position.trim() || '-',
        phone: '', email: '',
        remark: newUser.remark.trim() || '',
      });
      cancelAdd();
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!selectedUserId) return;
    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;
    if (!confirm(`"${user.name}" 사용자를 삭제하시겠습니까?`)) return;
    try {
      await deleteUser(selectedUserId);
      setSelectedUserId(null);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  // ESC 키 처리
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (isAdding) cancelAdd(); else onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isAdding, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-[#00587a] rounded-t-lg cursor-move shrink-0"
        onMouseDown={onDragStart}
      >
        <span className="text-[11px] font-bold text-white select-none">👤 {displayTitle}</span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={onClose}
          className="px-1.5 py-0.5 text-[10px] bg-white/20 hover:bg-white/40 text-white rounded"
        >✕</button>
      </div>

      {/* 검색 */}
      <div className="px-3 py-1.5 border-b border-gray-200 shrink-0">
        <input
          type="text"
          placeholder="검색 — 성명/부서/공장/직급/비고"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 text-[11px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#00587a]"
          autoFocus
        />
      </div>

      {/* 추가 폼 (isAdding일 때만) */}
      {isAdding && (
        <div className="px-3 py-2 bg-green-50 border-b border-green-200 shrink-0">
          <p className="text-[10px] text-green-700 font-semibold mb-1.5">신규 사용자 입력 — 성명(*)은 필수</p>
          <div className="flex gap-1">
            {(['factory', 'department', 'name', 'position', 'remark'] as const).map(field => (
              <input
                key={field}
                type="text"
                value={newUser[field]}
                onChange={e => setNewUser(prev => ({ ...prev, [field]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelAdd(); }}
                placeholder={field === 'factory' ? '공장' : field === 'department' ? '부서' : field === 'name' ? '성명*' : field === 'position' ? '직급' : '비고'}
                className={`flex-1 px-1.5 py-1 text-[10px] border rounded focus:outline-none focus:ring-1 ${field === 'name' ? 'border-green-500 ring-green-400 font-semibold' : 'border-gray-300 focus:ring-green-400'}`}
                autoFocus={field === 'factory'}
              />
            ))}
          </div>
          <div className="flex justify-end gap-1 mt-1.5">
            <button onClick={cancelAdd} className="px-3 py-1 text-[10px] font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 rounded">
              ✕ 취소
            </button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1 text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60">
              {saving ? '저장 중...' : '💾 저장'}
            </button>
          </div>
        </div>
      )}

      {/* 툴바 */}
      <div className="flex items-center justify-between px-3 py-1 bg-amber-50 border-b border-amber-200 shrink-0">
        <span className="text-[10px] text-amber-700">
          클릭 → 선택 | 더블클릭 → 즉시 적용
        </span>
        <div className="flex items-center gap-1">
          {/* 추가 */}
          <button
            onClick={openAdd}
            disabled={isAdding}
            title="신규 사용자 추가"
            className={`px-2 py-0.5 text-[9px] font-semibold rounded ${isAdding ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            + 추가
          </button>
          {/* 삭제 */}
          <button
            onClick={handleDelete}
            disabled={!selectedUserId}
            title="선택한 사용자 삭제"
            className={`px-2 py-0.5 text-[9px] font-semibold rounded ${selectedUserId ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            - 삭제
          </button>
          {/* 적용 */}
          <button
            onClick={() => {
              const user = users.find(u => u.id === selectedUserId);
              if (user) handleSelect(user);
              else alert('사용자를 먼저 선택해주세요.');
            }}
            disabled={!selectedUserId}
            title="선택 적용"
            className={`px-2 py-0.5 text-[9px] font-semibold rounded ${selectedUserId ? 'bg-[#00587a] hover:bg-[#004a68] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            ✓ 적용
          </button>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[11px] gap-1">
            <span className="text-2xl">👤</span>
            <span>{searchTerm ? `"${searchTerm}" 검색 결과 없음` : '사용자가 없습니다.'}</span>
            {!searchTerm && !isAdding && (
              <button onClick={openAdd} className="mt-1 px-3 py-1 text-[10px] bg-green-500 text-white rounded hover:bg-green-600">
                + 새 사용자 추가
              </button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 bg-[#00587a] text-white z-10">
              <tr>
                {[['공장','Plant','w-16'],['부서','Dept.',''],['성명','Name','w-16'],['직급','Pos.','w-14'],['비고','Note','']].map(([ko, en, w]) => (
                  <th key={ko} className={`border border-white/30 px-1 py-1 text-center font-semibold ${w}`}>
                    <div className="text-[10px] leading-tight">{ko}</div>
                    <div className="text-[7px] font-normal opacity-60">({en})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => {
                const isSelected = selectedUserId === user.id;
                return (
                  <tr
                    key={user.id}
                    onClick={() => toggleSelect(user.id)}
                    onDoubleClick={() => handleSelect(user)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 font-semibold' : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}`}
                  >
                    <td className="border border-gray-200 px-1 py-1 text-center">{user.factory || '-'}</td>
                    <td className="border border-gray-200 px-1 py-1 text-center">{user.department || '-'}</td>
                    <td className="border border-gray-200 px-1 py-1 text-center font-semibold">{user.name}</td>
                    <td className="border border-gray-200 px-1 py-1 text-center">{user.position || '-'}</td>
                    <td className="border border-gray-200 px-1 py-1 text-left text-gray-500">{user.remark || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 푸터 */}
      <div className="px-3 py-1 border-t border-gray-200 bg-gray-50 rounded-b-lg shrink-0 flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          총 {filtered.length}명{searchTerm && users.length !== filtered.length ? ` / ${users.length}명` : ''}
          {selectedUserId && ` | 선택: ${users.find(u => u.id === selectedUserId)?.name || ''}`}
        </span>
        <span className="text-[9px] text-gray-400">ESC — {isAdding ? '입력 취소' : '닫기'}</span>
      </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-40 hover:opacity-70" onMouseDown={onResizeStart}>
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M12 2v10H2M12 6v6H6" fill="none" stroke="gray" strokeWidth="1.5"/></svg>
      </div>
    </div>,
    document.body
  );
}
