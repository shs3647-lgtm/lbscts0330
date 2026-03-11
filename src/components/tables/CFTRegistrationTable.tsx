/**
 * CFTRegistrationTable.tsx
 * CODEFREEZE
 *
 * 목적: CFT 등록 표준 테이블 컴포넌트 (APQP, PFMEA, DFMEA 등에서 공통 사용)
 * 컬럼: CFT역할, 성명, 부서, 직급, 담당업무, Email, 전화번호
 *
 * ★ CFT 기본 6행 구조 (수정 금지):
 *   1. Champion (필수, 1명)
 *   2. Technical Leader (필수, 1명)
 *   3. Leader (필수, 1명)
 *   4. PM (필수, 1명)
 *   5. Moderator (필수, 1명)
 *   6. CFT 팀원 (최소 1행, 복수 가능)
 *
 * - REQUIRED_ROLES: 5개 필수 역할 삭제 불가
 * - ensureRequiredRoles(): 누락된 필수 역할 자동 복원 + CFT 팀원 최소 1행 보장
 * - createInitialCFTMembers(): 초기 7행 생성 (필수 5 + CFT 팀원 1 + 추가 placeholder 1)
 *
 * @version 2.0.0
 * @created 2025-12-27
 * @updated 2026-02-16
 */

'use client';

import React, { useState } from 'react';

export interface CFTMember {
  id: string;
  role: string;
  name: string;
  department: string;
  position: string;
  task: string;        // 담당업무
  email: string;
  phone: string;
  remark: string;
}

interface CFTRegistrationTableProps {
  title?: string;
  members: CFTMember[];
  onMembersChange: (members: CFTMember[]) => void;
  onUserSearch: (index: number) => void;
  onSave: () => void;
  onReset: () => void;
  onRoleChange?: (index: number, role: string) => void;
  onNavigateWorksheet?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
  minRows?: number;
  themeColor?: string;
  extraHeaderContent?: React.ReactNode;
}

// ─── CODEFREEZE: CFT 기본 6행 구조 (수정 금지) ───────────────────
// 기본 역할 목록
// ★ 단일 역할: Champion, Technical Leader, Leader, PM, Moderator는 각각 1명만 허용
// ★ 다중 역할: CFT 팀원만 여러 명 추가 가능
const CFT_ROLES = ['Champion', 'Technical Leader', 'Leader', 'PM', 'Moderator', 'CFT 팀원'];
const SINGLE_ROLE_LIST = ['Champion', 'Technical Leader', 'Leader', 'PM', 'Moderator']; // 각각 1명만 허용

/** CODEFREEZE: 필수 역할 5개 — 항상 존재해야 하며 삭제 불가 */
export const REQUIRED_ROLES: string[] = ['Champion', 'Technical Leader', 'Leader', 'PM', 'Moderator'];

/**
 * CODEFREEZE: CFT 멤버 배열에 필수 역할이 누락되어 있으면 자동으로 추가하고,
 * 필수 역할이 상단에 정렬된 배열을 반환한다.
 * - 필수 5역할 + CFT 팀원 최소 1행 = 기본 6행 보장
 * - 이 함수의 로직을 변경하거나 삭제하지 말 것
 */
export function ensureRequiredRoles(members: CFTMember[]): CFTMember[] {
  const result = [...members];
  for (const role of REQUIRED_ROLES) {
    if (!result.some(m => m.role === role)) {
      result.push({
        id: `req-${role.replace(/\s/g, '')}-${Date.now()}`,
        role, name: '', department: '', position: '',
        task: '', email: '', phone: '', remark: '',
      });
    }
  }
  // CFT 팀원 최소 1행 보장
  if (!result.some(m => m.role === 'CFT 팀원')) {
    result.push({
      id: `cft-member-${Date.now()}`,
      role: 'CFT 팀원', name: '', department: '', position: '',
      task: '', email: '', phone: '', remark: '',
    });
  }
  // 정렬: 필수 역할(REQUIRED_ROLES 순서) → 기타 멤버
  const sorted: CFTMember[] = [];
  for (const role of REQUIRED_ROLES) {
    const member = result.find(m => m.role === role);
    if (member) sorted.push(member);
  }
  const others = result.filter(m => !REQUIRED_ROLES.includes(m.role));
  return [...sorted, ...others];
}

// CODEFREEZE: 초기 멤버 생성
// ★ 단일 역할(Champion, Technical Leader, Leader, PM, Moderator) 각 1개 + CFT 팀원 1개 + CFT 추가 = 기본 7행
export const createInitialCFTMembers = (): CFTMember[] => {
  const members: CFTMember[] = [];

  // 단일 역할은 각각 1개만 생성 (Champion, Technical Leader, Leader, PM, Moderator)
  SINGLE_ROLE_LIST.forEach((role, idx) => {
    members.push({
      id: (idx + 1).toString(),
      role,
      name: '',
      department: '',
      position: '',
      task: '',
      email: '',
      phone: '',
      remark: '',
    });
  });

  // CFT 팀원 1개 생성
  members.push({
    id: (members.length + 1).toString(),
    role: 'CFT 팀원',
    name: '',
    department: '',
    position: '',
    task: '',
    email: '',
    phone: '',
    remark: '',
  });

  // ★ CFT 추가용 플레이스홀더 행 (마지막 행)
  members.push({
    id: (members.length + 1).toString(),
    role: 'CFT 팀원',
    name: 'CFT 추가',  // ★ 플레이스홀더
    department: '',
    position: '',
    task: '',
    email: '',
    phone: '',
    remark: '',
  });

  return members;
};

export const CFTRegistrationTable: React.FC<CFTRegistrationTableProps> = ({
  title = 'CFT 등록',
  members,
  onMembersChange,
  onUserSearch,
  onSave,
  onReset,
  onRoleChange,
  onNavigateWorksheet,
  saveStatus = 'idle',
  minRows = 6,
  themeColor = '#00587a',
  extraHeaderContent,
}) => {
  // 체크박스 선택 상태 (삭제 대상)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const headerBgColor = themeColor === '#0d9488' ? '#ccfbf1'
    : themeColor === '#1e3a5f' ? '#e0e7ff'
      : '#e8f5e9';
  const rowAltBgColor = themeColor === '#0d9488' ? '#ccfbf1'
    : themeColor === '#1e3a5f' ? '#e0e7ff'
      : '#e3f2fd';

  // 체크박스 토글
  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 삭제 가능한 행만 전체 선택/해제
  const deletableMembers = members.filter(m => !REQUIRED_ROLES.includes(m.role));
  const allDeletableChecked = deletableMembers.length > 0 && deletableMembers.every(m => checkedIds.has(m.id));
  const toggleAllCheck = () => {
    if (allDeletableChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(deletableMembers.map(m => m.id)));
    }
  };

  // 행 추가
  const handleAddRow = () => {
    const newMember: CFTMember = {
      id: Date.now().toString(),
      role: 'CFT 팀원', // ★ 기본 역할: CFT 팀원
      name: '',
      department: '',
      position: '',
      task: '',
      email: '',
      phone: '',
      remark: '',
    };
    onMembersChange([...members, newMember]);
  };

  // 체크된 행 삭제 (필수 역할은 경고 후 확인 시 삭제)
  const handleDeleteChecked = () => {
    if (checkedIds.size === 0) {
      alert('삭제할 행을 체크박스로 선택해주세요.');
      return;
    }
    const toDelete = members.filter(m => checkedIds.has(m.id));
    const requiredInDelete = toDelete.filter(m => REQUIRED_ROLES.includes(m.role));

    if (requiredInDelete.length > 0) {
      const names = requiredInDelete.map(m => `  • ${m.role} (${m.name || '미입력'})`).join('\n');
      const ok = confirm(`⚠️ 필수 역할이 포함되어 있습니다:\n${names}\n\n삭제하면 저장 시 자동 복원됩니다.\n정말 삭제하시겠습니까?`);
      if (!ok) return;
    }

    const updated = members.filter(m => !checkedIds.has(m.id));
    setCheckedIds(new Set());
    onMembersChange(updated);
  };

  // 필드 업데이트
  const updateField = (index: number, field: keyof CFTMember, value: string) => {
    // ★ 단일 역할 중복 방지 (Champion, Leader, PM, Moderator는 각각 1명만 허용)
    if (field === 'role' && SINGLE_ROLE_LIST.includes(value)) {
      const existingMember = members.find((m, idx) => idx !== index && m.role === value);
      if (existingMember) {
        const roleName = value === 'Champion' ? 'Champion' : value === 'Leader' ? 'Leader' : value === 'PM' ? 'PM' : 'Moderator';
        alert(`${roleName}은 한 명만 등록할 수 있습니다.\n기존 ${roleName}: ${existingMember.name || '(이름 없음)'} (${existingMember.department || '부서 없음'})\n\n기존 ${roleName}의 역할을 먼저 변경해주세요.`);
        return; // 변경하지 않음
      }
    }

    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    onMembersChange(updated);

    // 역할 변경 시 성명이 비어있으면 자동 추천 트리거
    if (field === 'role' && value && !members[index].name && onRoleChange) {
      onRoleChange(index, value);
    }
  };

  return (
    <div className="bg-white rounded border border-gray-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-300" style={{ backgroundColor: headerBgColor }}>
        <div className="flex items-center gap-2">
          <span>👥</span>
          <h2 className="text-xs font-bold text-gray-700">{title}</h2>
          {extraHeaderContent}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="px-2 py-1 bg-gray-100 border border-gray-400 text-gray-600 text-[10px] rounded hover:bg-gray-200"
          >
            🔄 초기화
          </button>
          <button
            onClick={handleDeleteChecked}
            className={`px-2 py-1 text-[10px] rounded ${checkedIds.size > 0 ? 'bg-red-500 border border-red-600 text-white hover:bg-red-600' : 'bg-red-50 border border-red-400 text-red-600 hover:bg-red-100'}`}
          >
            - 삭제 {checkedIds.size > 0 && `(${checkedIds.size})`}
          </button>
          <button
            onClick={handleAddRow}
            className="px-2 py-1 bg-green-100 border border-green-500 text-green-700 text-[10px] rounded hover:bg-green-200"
          >
            + 행추가
          </button>
          <button
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className={`px-2 py-1 text-[10px] font-bold rounded ${saveStatus === 'saving'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : saveStatus === 'saved'
              ? 'bg-green-500 text-white'
              : 'bg-[#1976d2] text-white hover:bg-[#1565c0]'
              }`}
          >
            {saveStatus === 'saving' ? '⏳ 저장 중...' : saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
          </button>
          {onNavigateWorksheet && (
            <button
              onClick={onNavigateWorksheet}
              className="px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700"
            >
              📝 작성화면 →
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr style={{ backgroundColor: themeColor, height: '26px' }} className="text-white">
              <th className="border border-white px-1 py-1 text-center align-middle font-semibold w-8">
                <input type="checkbox" checked={allDeletableChecked && deletableMembers.length > 0} onChange={toggleAllCheck} className="w-3 h-3 cursor-pointer accent-red-500" title="전체 선택" />
              </th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-10 leading-tight">No</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-24 leading-tight">CFT역할<br/><span className="text-[8px] font-normal opacity-70">(Role)</span></th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-28 leading-tight">성명<br/><span className="text-[8px] font-normal opacity-70">(Name)</span></th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-24 leading-tight">부서<br/><span className="text-[8px] font-normal opacity-70">(Dept.)</span></th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-16 leading-tight">직급<br/><span className="text-[8px] font-normal opacity-70">(Position)</span></th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-32 leading-tight">담당업무<br/><span className="text-[8px] font-normal opacity-70">(Task)</span></th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-36 leading-tight">Email</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-28 leading-tight">전화번호<br/><span className="text-[8px] font-normal opacity-70">(Phone)</span></th>

            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr
                key={member.id}
                className="hover:bg-blue-100"
                style={{ height: '28px', backgroundColor: index % 2 === 0 ? rowAltBgColor : 'white' }}
              >
                {/* 체크박스 */}
                <td className="border border-gray-300 px-1 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(member.id)}
                    onChange={() => toggleCheck(member.id)}
                    className="w-3 h-3 cursor-pointer accent-red-500"
                  />
                </td>
                {/* No */}
                <td className="border border-gray-300 px-2 py-1 text-center font-bold" style={{ color: themeColor }}>
                  {index + 1}
                </td>

                {/* CFT역할 */}
                <td className="border border-gray-300 px-1 py-1">
                  <select
                    value={member.role}
                    onChange={(e) => updateField(index, 'role', e.target.value)}
                    className="w-full h-6 text-xs border-0 bg-transparent focus:outline-none text-center font-semibold text-gray-800"
                  >
                    <option value="">- 선택 -</option>
                    {CFT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>

                {/* 성명 */}
                <td
                  className="border border-gray-300 px-1 py-1 cursor-pointer"
                  onClick={() => onUserSearch(index)}
                >
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={member.name}
                      readOnly
                      placeholder="성명"
                      className="flex-1 h-6 text-xs border-0 bg-transparent focus:outline-none text-center cursor-pointer placeholder:text-gray-400"
                    />
                    <span className="text-blue-500">🔍</span>
                  </div>
                </td>

                {/* 부서 */}
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={member.department}
                    onChange={(e) => updateField(index, 'department', e.target.value)}
                    placeholder="부서"
                    className="w-full h-6 text-xs border-0 bg-transparent focus:outline-none text-center placeholder:text-gray-400"
                  />
                </td>

                {/* 직급 */}
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={member.position}
                    onChange={(e) => updateField(index, 'position', e.target.value)}
                    placeholder="직급"
                    className="w-full h-6 text-xs border-0 bg-transparent focus:outline-none text-center placeholder:text-gray-400"
                  />
                </td>

                {/* 담당업무 */}
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={member.task}
                    onChange={(e) => updateField(index, 'task', e.target.value)}
                    placeholder="담당업무 입력"
                    className="w-full h-6 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400"
                  />
                </td>

                {/* Email */}
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={member.email}
                    onChange={(e) => updateField(index, 'email', e.target.value)}
                    placeholder="Email"
                    className="w-full h-6 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400"
                  />
                </td>

                {/* 전화번호 */}
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={member.phone}
                    onChange={(e) => updateField(index, 'phone', e.target.value)}
                    placeholder="전화번호"
                    className="w-full h-6 text-xs border-0 bg-transparent focus:outline-none text-center placeholder:text-gray-400"
                  />
                </td>


              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CFTRegistrationTable;

