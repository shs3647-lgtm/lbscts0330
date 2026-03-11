/**
 * @file page.tsx
 * @description FMEA 리스트 페이지 - 등록된 FMEA 프로젝트 조회
 * @version 2.0.0
 * @created 2025-12-26
 * @updated 2025-12-27
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PFMEATopNav from '@/components/layout/PFMEATopNav';

// =====================================================
// 타입 정의
// =====================================================
interface FMEAProject {
  id: string;
  project: {
    projectName: string;
    customer: string;
    productName: string;
    partNo: string;
    department: string;
    leader: string;
    startDate: string;
    endDate: string;
  };
  fmeaInfo?: {
    subject?: string;
    fmeaStartDate?: string;
    fmeaRevisionDate?: string;
    modelYear?: string;
    designResponsibility?: string;
    fmeaResponsibleName?: string;
  };
  cftMembers?: Array<{
    id: string;
    name: string;
    role: string;
    department: string;
    position: string;
    email?: string;
    phone?: string;
  }>;
  createdAt: string;
  status?: string;
  step?: number;  // 단계 (1~7)
  revisionNo?: string;  // 개정번호
  fmeaType?: string;  // M=Master, F=Family, P=Part
  parentFmeaId?: string;  // 상위 FMEA ID (상속 시)
  parentFmeaType?: string;  // 상위 FMEA 유형
}

// =====================================================
// 테이블 컬럼 정의 (수정됨)
// =====================================================
const COLUMN_HEADERS = [
  'No',
  'FMEA ID',
  'TYPE',  // M=Master, F=Family, P=Part
  '상위 FMEA',  // 상속받은 FMEA ID
  '프로젝트명',
  'FMEA명',
  '고객사',
  '모델명',
  '공정책임',
  '담당자',
  'CFT',  // CFT 리스트 입력 상태
  '시작일자',
  '개정일자',
  '개정번호',
  '단계',
];

/**
 * FMEA ID에서 유형(TYPE) 추출
 * pfm26-M001 → M, pfm26-F001 → F, pfm26-P001 → P
 */
function extractFmeaType(id: string): { code: string; label: string; color: string } {
  const match = id.match(/pfm\d{2}-([MFP])/i);
  const typeCode = match ? match[1].toUpperCase() : 'P';
  
  const types: Record<string, { label: string; color: string }> = {
    'M': { label: 'Master', color: 'bg-purple-200 text-purple-700' },
    'F': { label: 'Family', color: 'bg-blue-200 text-blue-700' },
    'P': { label: 'Part', color: 'bg-green-200 text-green-700' },
  };
  
  return { code: typeCode, ...types[typeCode] };
}

/**
 * FMEA ID 포맷 생성
 * 형식: pfm{YY}-{T}{NNN}
 * - pfm: PFMEA 약어 (소문자)
 * - YY: 연도 뒤 2자리 (예: 26 = 2026년)
 * - T: 유형 구분자 (M=Master, F=Family, P=Part)
 * - NNN: 시리얼 번호 3자리 (001, 002, ...)
 * 예시: pfm26-M001 (Master), pfm26-F001 (Family), pfm26-P001 (Part)
 */
function formatFmeaId(id: string, index: number): string {
  // ★ 소문자로 통일하여 반환
  if (id) return id.toLowerCase();
  
  // ID가 없으면 기본값 생성 (소문자)
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = (index + 1).toString().padStart(3, '0');
  return `pfm${year}-p${seq}`;
}

// 온프레미스 운영 모드 - 샘플 데이터 없음
// 모든 데이터는 DB에서 조회하거나 신규 등록으로 생성

// 단계 배지 렌더링
function renderStepBadge(step?: number): React.ReactNode {
  const stepNum = step || 1;
  
  const stepColors: Record<number, { bg: string; text: string }> = {
    1: { bg: 'bg-gray-200', text: 'text-gray-700' },
    2: { bg: 'bg-blue-200', text: 'text-blue-700' },
    3: { bg: 'bg-cyan-200', text: 'text-cyan-700' },
    4: { bg: 'bg-amber-200', text: 'text-amber-700' },
    5: { bg: 'bg-orange-200', text: 'text-orange-700' },
    6: { bg: 'bg-green-200', text: 'text-green-700' },
    7: { bg: 'bg-purple-200', text: 'text-purple-700' },
  };

  const { bg, text } = stepColors[stepNum] || stepColors[1];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${bg} ${text}`}>
      {stepNum}단계
    </span>
  );
}

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function FMEAListPage() {
  const [projects, setProjects] = useState<FMEAProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  
  
  // 데이터 로드 (DB API 호출)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. DB에서 프로젝트 목록 조회
      const response = await fetch('/api/fmea/projects');
      const result = await response.json();
      
      if (result.success && result.projects.length > 0) {
        // DB 데이터 사용
        console.log('✅ DB에서 FMEA 목록 로드:', result.projects.length, '건');
        setProjects(result.projects);
      } else {
        // DB에 데이터 없으면 localStorage 확인 (마이그레이션 용)
        const storedPfmea = localStorage.getItem('pfmea-projects');
        const localProjects = storedPfmea ? JSON.parse(storedPfmea) : [];
        
        if (localProjects.length > 0) {
          console.log('📦 localStorage에서 FMEA 목록 로드:', localProjects.length, '건');
          // ID 소문자 정규화
          const normalized = localProjects.map((p: FMEAProject) => ({
            ...p,
            id: p.id.toLowerCase()
          }));
          setProjects(normalized);
        } else {
          // 데이터 없음 - 빈 리스트
          console.log('📭 FMEA 프로젝트 없음 - 신규 등록 필요');
          setProjects([]);
        }
      }
    } catch (error) {
      console.error('❌ FMEA 리스트 로드 실패:', error);
      // API 실패 시 localStorage fallback
      try {
        const storedPfmea = localStorage.getItem('pfmea-projects');
        const localProjects = storedPfmea ? JSON.parse(storedPfmea) : [];
        setProjects(localProjects);
      } catch {
        setProjects([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 데이터 저장
  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('pfmea-projects', JSON.stringify(projects));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('❌ FMEA 리스트 저장 실패:', error);
      setSaveStatus('idle');
      alert('저장에 실패했습니다.');
    }
  }, [projects]);

  // 초기 로드
  useEffect(() => {
    loadData();

    // 실시간 업데이트 이벤트 리스너
    const handleUpdate = () => loadData();
    window.addEventListener('fmea-projects-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    
    return () => {
      window.removeEventListener('fmea-projects-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadData]);

  // 검색 필터링
  const filteredProjects = projects.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(query) ||
      p.project?.projectName?.toLowerCase().includes(query) ||
      p.project?.productName?.toLowerCase().includes(query) ||
      p.fmeaInfo?.subject?.toLowerCase().includes(query) ||
      p.project?.customer?.toLowerCase().includes(query)
    );
  });

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
    if (selectedRows.size === filteredProjects.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredProjects.map(p => p.id)));
    }
  };

  // 선택 삭제
  const handleDeleteSelected = () => {
    if (selectedRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    const remaining = projects.filter(p => !selectedRows.has(p.id));
    localStorage.setItem('pfmea-projects', JSON.stringify(remaining.filter(p => p.id.includes('PFMEA'))));
    localStorage.setItem('fmea-projects', JSON.stringify(remaining.filter(p => !p.id.includes('PFMEA'))));
    setProjects(remaining);
    setSelectedRows(new Set());
  };

  // 선택된 항목 수정
  const handleEditSelected = () => {
    if (selectedRows.size === 0) {
      alert('수정할 항목을 선택해주세요.');
      return;
    }
    if (selectedRows.size > 1) {
      alert('수정은 한 번에 하나의 항목만 가능합니다.');
      return;
    }
    const selectedId = Array.from(selectedRows)[0];
    window.location.href = `/pfmea/register?id=${selectedId}`;
  };

  // 등록화면으로 이동 (CFT 섹션으로 스크롤)
  const handleOpenRegisterPage = (fmeaId: string, section?: 'cft') => {
    const url = section === 'cft' 
      ? `/pfmea/register?id=${fmeaId}#cft-section`
      : `/pfmea/register?id=${fmeaId}`;
    window.location.href = url;
  };

  return (
    <>
      {/* 상단 고정 바로가기 메뉴 */}
      <PFMEATopNav />
      
      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h1 className="text-base font-bold text-gray-800">FMEA 리스트</h1>
          {isLoading ? (
            <span className="text-xs text-blue-500 ml-2">⏳ 로딩 중...</span>
          ) : (
            <span className="text-xs text-gray-500 ml-2">총 {filteredProjects.length}건</span>
          )}
          <span className="text-[10px] text-green-600 ml-2 bg-green-100 px-2 py-0.5 rounded">🔗 DB 연동</span>
      </div>

      {/* 검색 및 액션 바 */}
      <div className="flex items-center justify-between mb-4 gap-4">
        {/* 검색 */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 프로젝트명, FMEA명, 고객사로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 text-xs rounded hover:bg-gray-200 flex items-center gap-1"
          >
            🔄 새로고침
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`px-4 py-2 text-xs font-bold rounded flex items-center gap-1 ${
              saveStatus === 'saved' 
                ? 'bg-green-500 text-white border border-green-600' 
                : 'bg-blue-100 border border-blue-400 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {saveStatus === 'saved' ? '✓ 저장됨' : saveStatus === 'saving' ? '⏳ 저장중...' : '💾 저장'}
          </button>
          <button
            onClick={handleEditSelected}
            disabled={selectedRows.size !== 1}
            className="px-4 py-2 bg-yellow-100 border border-yellow-500 text-yellow-700 text-xs rounded hover:bg-yellow-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✏️ 수정
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedRows.size === 0}
            className="px-4 py-2 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ 선택 삭제 ({selectedRows.size})
          </button>
          <a
            href="/pfmea/register"
            className="px-4 py-2 bg-[#1976d2] text-white text-xs font-bold rounded hover:bg-[#1565c0] flex items-center gap-1"
          >
            ➕ 신규 등록
          </a>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#00587a] text-white" style={{ height: '28px' }}>
              <th className="border border-white px-1 py-1 text-center align-middle w-8">
                <input
                  type="checkbox"
                  checked={filteredProjects.length > 0 && selectedRows.size === filteredProjects.length}
                  onChange={toggleAllRows}
                  className="w-3.5 h-3.5"
                />
              </th>
              {COLUMN_HEADERS.map((header, idx) => (
                <th key={idx} className="border border-white px-2 py-1 text-center align-middle font-semibold whitespace-nowrap text-xs">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 데이터 행 */}
            {filteredProjects.map((p, index) => (
              <tr
                key={`${p.id}-${index}`}
                className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                  index % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'
                } ${selectedRows.has(p.id) ? 'bg-blue-100' : ''}`}
                style={{ height: '28px' }}
                onClick={() => toggleRow(p.id)}
              >
                <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(p.id)}
                    onChange={() => toggleRow(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3.5 h-3.5"
                  />
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-[#00587a]">{index + 1}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle font-semibold text-blue-600">
                  <a href={`/pfmea/register?id=${p.id.toLowerCase()}`} className="hover:underline">
                    {formatFmeaId(p.id, index)}
                  </a>
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {(() => {
                    const type = extractFmeaType(p.id);
                    return (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${type.color}`}>
                        {type.code}
                      </span>
                    );
                  })()}
                </td>
                {/* 상위 FMEA 컬럼 */}
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.parentFmeaId ? (
                    <a 
                      href={`/pfmea/register?id=${p.parentFmeaId.toLowerCase()}`} 
                      className="text-blue-600 hover:underline text-[10px] font-semibold"
                      onClick={(e) => e.stopPropagation()}
                      title={`상위 FMEA: ${p.parentFmeaId?.toLowerCase()}`}
                    >
                      {(() => {
                        const parentType = extractFmeaType(p.parentFmeaId);
                        return (
                          <span className="flex items-center justify-center gap-0.5">
                            <span className={`px-1 py-0 rounded text-[9px] font-bold ${parentType.color}`}>
                              {parentType.code}
                            </span>
                            <span>{p.parentFmeaId?.toLowerCase().split('-').pop()}</span>
                          </span>
                        );
                      })()}
                    </a>
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-left align-middle">
                  {p.project?.projectName ? (
                    <a
                      href={`/apqp/list`}
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.project.projectName}
                    </a>
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-left align-middle">
                  {(() => {
                    const fmeaName = p.fmeaInfo?.subject || p.project?.productName;
                    // FMEA명이 ID와 동일하면 미입력 처리
                    if (!fmeaName || fmeaName === p.id || fmeaName.toLowerCase() === p.id.toLowerCase()) {
                      return (
                        <span 
                          className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRegisterPage(p.id);
                          }}
                          title="클릭하여 등록화면에서 입력"
                        >
                          미입력
                        </span>
                      );
                    }
                          // ★ FMEA명 클릭 시 등록화면으로 이동 (해당 FMEA 정보 표시)
                    return (
                      <a 
                        href={`/pfmea/register?id=${p.id.toLowerCase()}`} 
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        title="클릭하여 FMEA 등록정보 확인"
                      >
                        {fmeaName}
                      </a>
                    );
                  })()}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.project?.customer ? (
                    p.project.customer
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.fmeaInfo?.modelYear ? (
                    p.fmeaInfo.modelYear
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.fmeaInfo?.designResponsibility || p.project?.department ? (
                    p.fmeaInfo?.designResponsibility || p.project?.department
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.fmeaInfo?.fmeaResponsibleName || p.project?.leader ? (
                    p.fmeaInfo?.fmeaResponsibleName || p.project?.leader
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                {/* CFT 컬럼 */}
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.cftMembers && p.cftMembers.length > 0 ? (
                    <span className="text-blue-600 text-[10px] font-semibold">
                      {p.cftMembers.filter(m => m.name && m.name.trim()).length}명
                    </span>
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id, 'cft');
                      }}
                      title="클릭하여 등록화면 CFT 섹션에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.fmeaInfo?.fmeaStartDate || p.project?.startDate ? (
                    p.fmeaInfo?.fmeaStartDate || p.project?.startDate
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {p.fmeaInfo?.fmeaRevisionDate ? (
                    p.fmeaInfo.fmeaRevisionDate
                  ) : (
                    <span 
                      className="text-orange-400 text-[10px] cursor-pointer hover:bg-yellow-50 px-1 py-0.5 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegisterPage(p.id);
                      }}
                      title="클릭하여 등록화면에서 입력"
                    >
                      미입력
                    </span>
                  )}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">{p.revisionNo || 'Rev.00'}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                  {renderStepBadge(p.step)}
                </td>
              </tr>
            ))}
            {/* 빈 행: 1번 행만 유지 (검색 결과 0건 등) */}
            {Array.from({ length: Math.max(0, 1 - filteredProjects.length) }).map((_, idx) => (
              <tr key={`empty-${idx}`} className={`${(filteredProjects.length + idx) % 2 === 0 ? 'bg-[#e3f2fd]' : 'bg-white'}`} style={{ height: '28px' }}>
                <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                  <input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" />
                </td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">{filteredProjects.length + idx + 1}</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                <td className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>조회 결과: {filteredProjects.length}건 / 전체: {projects.length}건</span>
          <span>버전: FMEA Suite v3.0 | 사용자: FMEA Lead</span>
        </div>
      </div>

    </>
  );
}
