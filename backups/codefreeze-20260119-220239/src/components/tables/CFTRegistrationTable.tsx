/**
 * CFTRegistrationTable.tsx
 * 
 * 목적: CFT 등록 표준 테이블 컴포넌트 (APQP, PFMEA, DFMEA 등에서 공통 사용)
 * 컬럼: CFT역할, 성명, 부서, 직급, 담당업무, Email, 전화번호, 비고
 * 
 * @version 1.0.0
 * @created 2025-12-27
 */

'use client';

import React from 'react';

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
  saveStatus?: 'idle' | 'saved';
  minRows?: number;
}

// 기본 역할 목록
// ★ 단일 역할: Champion, Leader, PM, Moderator는 각각 1명만 허용
// ★ 다중 역할: CFT 팀원만 여러 명 추가 가능
const CFT_ROLES = ['Champion', 'Leader', 'PM', 'Moderator', 'CFT 팀원'];
const SINGLE_ROLE_LIST = ['Champion', 'Leader', 'PM', 'Moderator']; // 각각 1명만 허용

// 초기 멤버 생성
// ★ 수정: 단일 역할(Champion, Leader, PM, Moderator)은 각각 1개만 생성, 나머지는 빈 역할로 생성
export const createInitialCFTMembers = (): CFTMember[] => {
  const members: CFTMember[] = [];
  
  // 단일 역할은 각각 1개만 생성
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
  
  // CFT 팀원은 1개만 생성 (추가 필요시 사용자가 행 추가)
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
  
  // ★ 10행 보장 로직 제거: 필요한 만큼만 생성 (5개: Champion, Leader, PM, Moderator, CFT 팀원)
  return members;
};

export const CFTRegistrationTable: React.FC<CFTRegistrationTableProps> = ({
  title = 'CFT 등록',
  members,
  onMembersChange,
  onUserSearch,
  onSave,
  onReset,
  saveStatus = 'idle',
  minRows = 10,
}) => {
  // 행 추가
  const handleAddRow = () => {
    const newMember: CFTMember = {
      id: Date.now().toString(),
      role: '', // ★ 빈 역할로 시작 (사용자가 선택)
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

  // 행 삭제
  const handleDeleteRow = (index: number) => {
    if (members.length <= 1) {
      alert('최소 1명의 CFT 멤버가 필요합니다.');
      return;
    }
    const updated = members.filter((_, i) => i !== index);
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
  };

  // 빈 행 수 계산
  const emptyRowCount = Math.max(0, minRows - members.length);

  return (
    <div className="bg-white rounded border border-gray-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-[#e8f5e9] px-3 py-1.5 border-b border-gray-300">
        <div className="flex items-center gap-2">
          <span>👥</span>
          <h2 className="text-xs font-bold text-gray-700">{title}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="px-2 py-1 bg-gray-100 border border-gray-400 text-gray-600 text-[10px] rounded hover:bg-gray-200"
          >
            🔄 초기화
          </button>
          <button
            onClick={() => handleDeleteRow(members.length - 1)}
            className="px-2 py-1 bg-red-50 border border-red-400 text-red-600 text-[10px] rounded hover:bg-red-100"
          >
            - 행삭제
          </button>
          <button
            onClick={handleAddRow}
            className="px-2 py-1 bg-green-100 border border-green-500 text-green-700 text-[10px] rounded hover:bg-green-200"
          >
            + 행추가
          </button>
          <button
            onClick={onSave}
            className={`px-2 py-1 text-[10px] font-bold rounded ${
              saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : 'bg-[#1976d2] text-white hover:bg-[#1565c0]'
            }`}
          >
            {saveStatus === 'saved' ? '✓ 저장됨' : '💾 저장'}
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#00587a] text-white" style={{ height: '26px' }}>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-10">No</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-24">CFT역할</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-28">성명</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-24">부서</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-16">직급</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-32">담당업무</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-36">Email</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-28">전화번호</th>
              <th className="border border-white px-2 py-1 text-center align-middle font-semibold w-20">비고</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr
                key={member.id}
                className={`hover:bg-blue-100 ${index % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}`}
                style={{ height: '28px' }}
              >
                {/* No */}
                <td className="border border-gray-300 px-2 py-1 text-center font-bold text-[#00587a]">
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

                {/* 비고 */}
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={member.remark}
                    onChange={(e) => updateField(index, 'remark', e.target.value)}
                    placeholder="비고"
                    className="w-full h-6 text-xs border-0 bg-transparent focus:outline-none text-center placeholder:text-gray-400"
                  />
                </td>
              </tr>
            ))}

            {/* 빈 행 */}
            {Array.from({ length: emptyRowCount }).map((_, idx) => (
              <tr
                key={`empty-${idx}`}
                className={`${(members.length + idx) % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}`}
                style={{ height: '28px' }}
              >
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
                <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CFTRegistrationTable;

