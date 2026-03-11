/**
 * @file page.tsx
 * @description Control Plan CFT 등록 페이지 - PFMEA CFT와 동일한 구조
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import CPTopNav from '@/components/layout/CPTopNav';
import { FixedLayout } from '@/components/layout';

// =====================================================
// 타입 정의
// =====================================================
interface CFTMember {
  id: string;
  name: string;
  department: string;
  position: string;
  role: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

interface CPProject {
  id: string;
  cpInfo?: {
    cpProjectName?: string;
    subject?: string;
  };
}

// =====================================================
// 초기 CFT 멤버 생성
// =====================================================
const createEmptyCFTMember = (): CFTMember => ({
  id: `CFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: '',
  department: '',
  position: '',
  role: '',
  email: '',
  phone: '',
  joinDate: new Date().toISOString().split('T')[0],
  status: 'active',
});

// 역할 옵션
const ROLE_OPTIONS = [
  'Champion',
  'Leader',
  'PM',
  'Moderator',
  'CFT 팀원(Team Member)',
];

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function CPCFTPage() {
  const [projectList, setProjectList] = useState<CPProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [members, setMembers] = useState<CFTMember[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // 프로젝트 목록 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cp-projects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjectList(parsed.filter((p: CPProject) => p && p.id));
          if (!selectedProjectId && parsed.length > 0) {
            setSelectedProjectId(parsed[0].id);
          }
        }
      }
    } catch (error) {
      console.error('❌ CP 목록 로드 실패:', error);
    }
  }, [selectedProjectId]);

  // CFT 멤버 로드
  useEffect(() => {
    if (!selectedProjectId) {
      // 기본 5개 빈 행
      setMembers(Array.from({ length: 5 }, () => createEmptyCFTMember()));
      return;
    }

    try {
      const stored = localStorage.getItem(`cp-cft-${selectedProjectId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // ★ Champion 중복 제거 (첫 번째 Champion만 유지, 나머지는 빈 역할로 변경)
        const champions = parsed.filter((m: CFTMember) => m.role === 'Champion');
        if (champions.length > 1) {
          // 첫 번째 Champion만 유지하고 나머지는 역할 제거
          let firstChampionFound = false;
          parsed.forEach((m: CFTMember) => {
            if (m.role === 'Champion') {
              if (!firstChampionFound) {
                firstChampionFound = true;
              } else {
                m.role = ''; // 중복 Champion의 역할 제거
              }
            }
          });
        }
        
        // 최소 5개 행 보장
        while (parsed.length < 5) {
          parsed.push(createEmptyCFTMember());
        }
        setMembers(parsed);
      } else {
        // 기본 5개 빈 행
        setMembers(Array.from({ length: 5 }, () => createEmptyCFTMember()));
      }
    } catch (error) {
      console.error('❌ CFT 멤버 로드 실패:', error);
      setMembers(Array.from({ length: 5 }, () => createEmptyCFTMember()));
    }
  }, [selectedProjectId]);

  // 필드 업데이트
  const updateField = useCallback((id: string, field: keyof CFTMember, value: string) => {
    setMembers(prev => {
      // Champion 중복 체크 (이름 유무와 관계없이 한 명만 허용)
      if (field === 'role' && value === 'Champion') {
        const existingChampion = prev.find(m => m.id !== id && m.role === 'Champion');
        if (existingChampion) {
          alert(`Champion은 한 명만 등록할 수 있습니다.\n기존 Champion: ${existingChampion.name || '(이름 없음)'} (${existingChampion.department || '부서 없음'})\n\n기존 Champion의 역할을 먼저 변경해주세요.`);
          return prev; // 변경하지 않음
        }
      }
      
      // 다른 역할로 변경할 때, 기존에 Champion이었고 다른 곳에 Champion이 없으면 허용
      if (field === 'role' && value !== 'Champion') {
        // 역할 변경은 허용
        return prev.map(m => m.id === id ? { ...m, [field]: value } : m);
      }
      
      return prev.map(m => m.id === id ? { ...m, [field]: value } : m);
    });
  }, []);

  // 멤버 추가
  const handleAddMember = useCallback(() => {
    setMembers(prev => [...prev, createEmptyCFTMember()]);
  }, []);

  // 선택 삭제
  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.size === 0) {
      alert('삭제할 멤버를 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedRows.size}명의 멤버를 삭제하시겠습니까?`)) {
      return;
    }

    const remaining = members.filter(m => !selectedRows.has(m.id));
    // 최소 5개 행 보장
    while (remaining.length < 5) {
      remaining.push(createEmptyCFTMember());
    }
    setMembers(remaining);
    setSelectedRows(new Set());
  }, [members, selectedRows]);

  // 저장
  const handleSave = useCallback(() => {
    if (!selectedProjectId) {
      alert('CP 프로젝트를 선택해주세요.');
      return;
    }

    // 저장 전 Champion 중복 체크
    const champions = members.filter(m => m.role === 'Champion');
    if (champions.length > 1) {
      const championNames = champions.map(m => m.name || '(이름 없음)').join(', ');
      alert(`Champion은 한 명만 등록할 수 있습니다.\n\n현재 Champion: ${champions.length}명\n${championNames}\n\n중복된 Champion의 역할을 변경해주세요.`);
      setSaveStatus('idle');
      return;
    }

    setSaveStatus('saving');
    try {
      localStorage.setItem(`cp-cft-${selectedProjectId}`, JSON.stringify(members));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ CFT 저장 실패:', error);
      alert('저장에 실패했습니다.');
      setSaveStatus('idle');
    }
  }, [selectedProjectId, members]);

  // 행 선택 토글
  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  // 전체 선택 토글
  const toggleAllRows = () => {
    if (selectedRows.size === members.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(members.map(m => m.id)));
    }
  };

  // 프로젝트 라벨
  const selectedProject = projectList.find(p => p.id === selectedProjectId);
  const projectLabel = selectedProject
    ? `${selectedProject.cpInfo?.cpProjectName || selectedProject.cpInfo?.subject || selectedProject.id}`
    : 'CP를 선택하세요';

  return (
    <FixedLayout topNav={<CPTopNav selectedCpId={selectedProjectId} />} topNavHeight={48} showSidebar={true} contentPadding="px-3 py-3">
      <div className="font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">👥</span>
          <h1 className="text-base font-bold text-gray-800">CP CFT 등록(Registration)</h1>
          <span className="text-xs text-gray-500 ml-2">총 {members.filter(m => m.name).length}명</span>
        </div>

        {/* 프로젝트 선택 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 mb-4 bg-white">
          <div className="flex items-center gap-4 px-4 py-2 bg-[#00587a] text-white">
            <span className="text-sm font-bold">📋 CP 프로젝트 선택</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1 rounded border-0 bg-white/20 text-white min-w-[200px] text-xs"
            >
              <option value="" className="text-gray-800">-- CP 선택 --</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id} className="text-gray-800">
                  {p.cpInfo?.cpProjectName || p.cpInfo?.subject || p.id}
                </option>
              ))}
            </select>
            <span className="text-xs text-white/80">선택된 CP: {projectLabel}</span>
          </div>
        </div>

        {/* CFT 멤버 테이블 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          {/* 테이블 헤더 바 */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
            <span className="text-sm font-bold">👥 CFT 멤버 관리 - {projectLabel}</span>
            <div className="flex gap-2">
              <button
                onClick={handleAddMember}
                className="px-3 py-1.5 bg-green-100 border border-green-500 text-green-700 text-xs rounded hover:bg-green-200"
              >
                + 추가(Add)
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedRows.size === 0}
                className="px-3 py-1.5 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200 disabled:opacity-50"
              >
                − 삭제(Delete) ({selectedRows.size})
              </button>
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`px-3 py-1.5 text-xs font-semibold rounded ${
                  saveStatus === 'saved' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saveStatus === 'saved' ? '✅ 저장됨(Saved)' : saveStatus === 'saving' ? '⏳ 저장중...(Saving)' : '💾 저장(Save)'}
              </button>
            </div>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[1000px]">
              <thead>
                <tr className="bg-[#00587a] text-white h-7">
                  <th className="border border-white px-2 py-1 text-center align-middle w-10">
                    <input
                      type="checkbox"
                      checked={members.length > 0 && selectedRows.size === members.length}
                      onChange={toggleAllRows}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-10">No</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24">성명(Name)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-28">부서(Dept.)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">직급(Position)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24">역할(Role)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-40">이메일(Email)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-28">연락처(Phone)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-24">참여일(Join Date)</th>
                  <th className="border border-white px-2 py-1 text-center align-middle w-20">상태(Status)</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member, index) => (
                  <tr 
                    key={member.id} 
                    className={`hover:bg-blue-50 h-7 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'} ${selectedRows.has(member.id) ? 'bg-blue-100' : ''}`}
                  >
                    <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(member.id)}
                        onChange={() => toggleRow(member.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-blue-600">
                      {index + 1}
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateField(member.id, 'name', e.target.value)}
                        placeholder="성명(Name)"
                        className="w-full h-6 px-2 text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        value={member.department}
                        onChange={(e) => updateField(member.id, 'department', e.target.value)}
                        placeholder="부서(Department)"
                        className="w-full h-6 px-2 text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        value={member.position}
                        onChange={(e) => updateField(member.id, 'position', e.target.value)}
                        placeholder="직급(Position)"
                        className="w-full h-6 px-2 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select
                        value={member.role}
                        onChange={(e) => updateField(member.id, 'role', e.target.value)}
                        className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none"
                      >
                        <option value="">선택</option>
                        {ROLE_OPTIONS.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateField(member.id, 'email', e.target.value)}
                        placeholder="email@company.com"
                        className="w-full h-6 px-2 text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        value={member.phone}
                        onChange={(e) => updateField(member.id, 'phone', e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full h-6 px-2 text-xs text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="date"
                        value={member.joinDate}
                        onChange={(e) => updateField(member.id, 'joinDate', e.target.value)}
                        className="w-full h-6 px-1 text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      <select
                        value={member.status}
                        onChange={(e) => updateField(member.id, 'status', e.target.value as 'active' | 'inactive')}
                        className={`w-full h-6 px-1 text-xs border-0 rounded ${
                          member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <option value="active">활성(Active)</option>
                        <option value="inactive">비활성(Inactive)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>총 {members.filter(m => m.name).length}명 등록 | 활성: {members.filter(m => m.status === 'active' && m.name).length}명</span>
          <span>버전: CP Suite v1.0 | 사용자: CP Lead</span>
        </div>
      </div>
    </FixedLayout>
  );
}

















