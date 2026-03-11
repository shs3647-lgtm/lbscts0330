/**
 * @file page.tsx
 * @description Control Plan 리스트 페이지 - PFMEA list와 동일한 구조
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import CPTopNav from '@/components/layout/CPTopNav';

// =====================================================
// 타입 정의
// =====================================================
interface CPProject {
  id: string;
  cpInfo?: {
    subject?: string;
    cpStartDate?: string;
    cpRevisionDate?: string;
    customerName?: string;
    modelYear?: string;
    processResponsibility?: string;
    cpResponsibleName?: string;
    cpProjectName?: string;
  };
  linkedFmeaId?: string;
  parentApqpNo?: string;   // ★ 상위 APQP (최상위)
  parentFmeaId?: string;   // 상위 FMEA
  parentCpId?: string;     // 상위 CP
  createdAt: string;
  status?: string;
  revisionNo?: string;
  cftCount?: number;
  processCount?: number;
}

// =====================================================
// 테이블 컬럼 정의
// =====================================================
const COLUMN_HEADERS = [
  'No',
  'CP ID',
  'CP명',
  '고객사',
  '담당자',
  '시작일자',
  '개정일자',
  '상위 APQP',
  '상위 FMEA',
  '상위 CP',
];

// CP ID 포맷 생성 (표시용 - 대문자로 표시)
function formatCpId(id: string, index: number): string {
  // 소문자로 시작하는 경우 대문자로 변환
  if (id && id.length > 0) {
    const upperId = id.toUpperCase();
    if (upperId.match(/^CP\d{2}-[MFP]\d{3}$/)) {
      return upperId;
    }
  }
  // 형식이 맞지 않으면 기본 형식으로 생성
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = (index + 1).toString().padStart(3, '0');
  return `CP${year}-${seq}`;
}

// ★ 2026-01-18: 레거시 샘플 데이터 제거 - DB 데이터만 표시
const DEFAULT_SAMPLE_DATA: CPProject[] = [];

// =====================================================
// 메인 컴포넌트
// =====================================================
export default function CPListPage() {
  // ★ 2026-01-18: 빈 배열로 시작 (DB 데이터만 표시)
  const [projects, setProjects] = useState<CPProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ★ 2026-01-18: DB 우선 로드 (레거시 localStorage 캐시 제거, DB 데이터만 표시)
  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // DB에서 직접 로드
      const res = await fetch('/api/control-plan');
      if (!res.ok) {
        throw new Error('API 호출 실패');
      }

      const result = await res.json();

      if (result?.success && result?.data) {
        const dbProjects: CPProject[] = result.data.map((cp: any) => {
          // parentApqpNo 정규화 (빈 문자열, null, undefined 처리)
          const normalizedParentApqpNo = cp.parentApqpNo && cp.parentApqpNo.trim() !== ''
            ? cp.parentApqpNo.trim()
            : null;

          console.log('🔍 CP 로드:', {
            cpNo: cp.cpNo,
            parentApqpNo_raw: cp.parentApqpNo,
            parentApqpNo_normalized: normalizedParentApqpNo,
            subject: cp.subject,
          });

          return {
            id: cp.cpNo,
            cpInfo: {
              subject: cp.subject || '',
              cpProjectName: cp.subject || '',
              cpStartDate: cp.cpStartDate || '',
              cpRevisionDate: cp.cpRevisionDate || '',
              customerName: cp.customerName || '',
              modelYear: cp.modelYear || '',
              processResponsibility: cp.processResponsibility || '',
              cpResponsibleName: cp.cpResponsibleName || '',
            },
            linkedFmeaId: cp.fmeaNo || cp.fmeaId || null,
            parentApqpNo: normalizedParentApqpNo,
            parentFmeaId: cp.fmeaId || cp.fmeaNo || null,
            parentCpId: cp.parentCpId || null,
            createdAt: cp.createdAt || new Date().toISOString(),
            status: cp.status || 'draft',
            revisionNo: 'Rev.00',
            cftCount: cp._count?.cftMembers || 0,
            processCount: cp._count?.processes || 0,
          };
        });

        // 최신순 정렬
        const sorted = dbProjects.sort((a: CPProject, b: CPProject) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );

        setProjects(sorted);
        console.log(`✅ CP 목록 로드 완료: ${sorted.length}건`);
      } else {
        setProjects([]);
        console.log('ℹ️ 등록된 CP가 없습니다.');
      }
    } catch (error: any) {
      console.error('❌ 데이터 로드 실패:', error);
      setError(error?.message || '데이터 로드 실패');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ★ 2026-01-18: 저장 버튼은 DB 새로고침으로 변경 (localStorage 저장 제거)
  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    loadData().then(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }).catch(() => {
      setSaveStatus('idle');
    });
  }, [loadData]);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 검색 필터링
  const filteredProjects = projects.filter(p => {
    if (!p || !p.id) return false;
    const query = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(query) ||
      p.cpInfo?.cpProjectName?.toLowerCase().includes(query) ||
      p.cpInfo?.subject?.toLowerCase().includes(query) ||
      p.cpInfo?.customerName?.toLowerCase().includes(query)
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

  // 선택 삭제 (DB + localStorage)
  const handleDeleteSelected = async () => {
    if (selectedRows.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedRows.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    // DB에서 삭제
    for (const cpNo of selectedRows) {
      try {
        await fetch(`/api/control-plan?cpNo=${cpNo}`, { method: 'DELETE' });
      } catch (e) {
        console.error(`CP ${cpNo} DB 삭제 실패:`, e);
      }
    }

    // localStorage 및 UI 업데이트
    const remaining = projects.filter(p => !selectedRows.has(p.id));
    localStorage.setItem('cp-projects', JSON.stringify(remaining));
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
    // CP ID를 소문자로 정규화하여 전달
    const normalizedId = selectedId.toLowerCase();
    window.location.href = `/control-plan/register?id=${normalizedId}`;
  };

  return (
    <>
      <CPTopNav selectedCpId="" />

      <div className="min-h-screen bg-[#f0f0f0] px-3 py-3 pt-9 font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📋</span>
          <h1 className="text-base font-bold text-gray-800">Control Plan 리스트</h1>
          <span className="text-xs text-gray-500 ml-2">
            {loading ? '로딩 중...' : `총 ${filteredProjects.length}건`}
          </span>
          {error && <span className="text-xs text-red-500 ml-2">❌ {error}</span>}
        </div>

        {/* 검색 및 액션 바 */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="🔍 프로젝트명, CP명, 고객사로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-400 rounded bg-white focus:outline-none focus:border-teal-500"
            />
          </div>

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
                  : 'bg-teal-100 border border-teal-400 text-teal-700 hover:bg-teal-200'
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
              href="/control-plan/register"
              className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded hover:bg-teal-700 flex items-center gap-1"
            >
              ➕ 신규 등록
            </a>
          </div>
        </div>

        {/* 테이블 */}
        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#0d9488] text-white h-7">
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
              {filteredProjects.map((p, index) => (
                <tr
                  key={`${p.id}-${index}`}
                  className={`hover:bg-teal-50 cursor-pointer transition-colors h-7 ${
                    index % 2 === 0 ? 'bg-teal-50/50' : 'bg-white'
                  } ${selectedRows.has(p.id) ? 'bg-teal-100' : ''}`}
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
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle font-bold text-teal-700">{index + 1}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle font-semibold text-teal-600">
                    {/* ★ 2026-01-18: CP ID 클릭 시 워크시트로 이동 */}
                    <a href={`/control-plan/worksheet?cpNo=${p.id.toLowerCase()}`} className="hover:underline">
                      {formatCpId(p.id, index)}
                    </a>
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-left align-middle">
                    {/* ★ 2026-01-18: CP명 클릭 시 워크시트로 이동 */}
                    <a href={`/control-plan/worksheet?cpNo=${p.id.toLowerCase()}`} className="text-teal-600 hover:underline font-semibold">
                      {p.cpInfo?.subject || <span className="text-red-500 italic">미입력</span>}
                    </a>
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                    {p.cpInfo?.customerName || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                    {p.cpInfo?.cpResponsibleName || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                    {p.cpInfo?.cpStartDate || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                    {p.cpInfo?.cpRevisionDate || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                    {p.parentApqpNo && p.parentApqpNo.trim() !== '' ? (
                      <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">{p.parentApqpNo}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                    {p.parentFmeaId || p.linkedFmeaId ? (
                      <a href={`/pfmea/worksheet?id=${p.parentFmeaId || p.linkedFmeaId}`} className="text-yellow-600 hover:underline font-semibold">
                        🔗 {p.parentFmeaId || p.linkedFmeaId}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-center align-middle">
                    {p.parentCpId ? (
                      <a href={`/control-plan?id=${p.parentCpId}`} className="text-green-600 hover:underline font-semibold">
                        🔗 {p.parentCpId}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {/* 빈 행 */}
              {Array.from({ length: Math.max(0, 10 - filteredProjects.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`} className={`h-7 ${(filteredProjects.length + idx) % 2 === 0 ? 'bg-teal-50/50' : 'bg-white'}`}>
                  <td className="border border-gray-400 px-1 py-0.5 text-center align-middle">
                    <input type="checkbox" disabled className="w-3.5 h-3.5 opacity-30" />
                  </td>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <td key={i} className="border border-gray-400 px-2 py-1 text-center align-middle text-gray-300">-</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 하단 상태바 */}
        <div className="mt-3 px-4 py-2 bg-white rounded border border-gray-300 flex justify-between text-xs text-gray-500">
          <span>조회 결과: {filteredProjects.length}건 / 전체: {projects.length}건</span>
          <span>버전: CP Suite v1.0 | 사용자: CP Lead</span>
        </div>
      </div>
    </>
  );
}

