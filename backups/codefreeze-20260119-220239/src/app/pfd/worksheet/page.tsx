'use client';

/**
 * @file pfd/worksheet/page.tsx
 * @description PFD 워크시트 메인 페이지
 * @module pfd/worksheet
 */

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePfdSync } from './hooks/usePfdSync';

// ============================================================================
// 타입 정의
// ============================================================================

interface PfdRow {
  id?: string;
  processNo: string;
  processName: string;
  processDesc: string;
  workElement: string;
  equipment: string;
  productChar: string;
  processChar: string;
  specialChar: string;
}

interface PfdHeader {
  id?: string;
  pfdNo: string;
  partName: string;
  partNo: string;
  subject: string;
  customerName: string;
  modelYear: string;
  companyName: string;
  processOwner: string;
  createdBy: string;
  status: string;
  fmeaId: string | null;
  cpNo: string | null;
}

// ============================================================================
// 초기값
// ============================================================================

const EMPTY_ROW: PfdRow = {
  processNo: '',
  processName: '',
  processDesc: '',
  workElement: '',
  equipment: '',
  productChar: '',
  processChar: '',
  specialChar: '',
};

const INITIAL_HEADER: PfdHeader = {
  pfdNo: '',
  partName: '',
  partNo: '',
  subject: '',
  customerName: '',
  modelYear: '',
  companyName: '',
  processOwner: '',
  createdBy: '',
  status: 'draft',
  fmeaId: null,
  cpNo: null,
};

// ============================================================================
// 컬럼 정의
// ============================================================================

const COLUMNS = [
  { key: 'processNo', label: '공정번호', width: 80 },
  { key: 'processName', label: '공정명', width: 150 },
  { key: 'processDesc', label: '공정설명', width: 200 },
  { key: 'workElement', label: '작업요소', width: 150 },
  { key: 'equipment', label: '설비/금형/지그', width: 150 },
  { key: 'productChar', label: '제품특성', width: 150 },
  { key: 'processChar', label: '공정특성', width: 150 },
  { key: 'specialChar', label: '특별특성', width: 80 },
] as const;

// ============================================================================
// 워크시트 컨텐츠 컴포넌트
// ============================================================================

function PfdWorksheetContent() {
  const searchParams = useSearchParams();
  const pfdNoParam = searchParams.get('pfdNo');

  // 상태
  const [header, setHeader] = useState<PfdHeader>(INITIAL_HEADER);
  const [rows, setRows] = useState<PfdRow[]>([{ ...EMPTY_ROW }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);

  // 동기화 훅
  const {
    syncStatus,
    handleFmeaStructureSync,
    handleCpStructureSync,
    handleDataSync,
  } = usePfdSync(header.id || '', header.fmeaId, header.cpNo);

  // 데이터 로드
  useEffect(() => {
    if (pfdNoParam) {
      loadPfd(pfdNoParam);
    }
  }, [pfdNoParam]);

  const loadPfd = async (pfdNo: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pfd/${pfdNo}`);
      const result = await res.json();

      if (result.success) {
        const data = result.data;
        setHeader({
          id: data.id,
          pfdNo: data.pfdNo,
          partName: data.partName || '',
          partNo: data.partNo || '',
          subject: data.subject || '',
          customerName: data.customerName || '',
          modelYear: data.modelYear || '',
          companyName: data.companyName || '',
          processOwner: data.processOwner || '',
          createdBy: data.createdBy || '',
          status: data.status || 'draft',
          fmeaId: data.fmeaId,
          cpNo: data.cpNo,
        });

        if (data.items && data.items.length > 0) {
          setRows(data.items.map((item: any) => ({
            id: item.id,
            processNo: item.processNo || '',
            processName: item.processName || '',
            processDesc: item.processDesc || '',
            workElement: item.workElement || '',
            equipment: item.equipment || '',
            productChar: item.productChar || '',
            processChar: item.processChar || '',
            specialChar: item.specialChar || '',
          })));
        }
      } else {
        showMessage('error', result.error || 'PFD 로드 실패');
      }
    } catch (err: any) {
      showMessage('error', err.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  // 메시지 표시
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 헤더 변경
  const handleHeaderChange = (field: keyof PfdHeader, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  // 행 변경
  const handleCellChange = useCallback((rowIdx: number, field: keyof PfdRow, value: string) => {
    setRows((prev) => {
      const newRows = [...prev];
      newRows[rowIdx] = { ...newRows[rowIdx], [field]: value };
      return newRows;
    });
  }, []);

  // 행 추가
  const handleAddRow = useCallback(() => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }, []);

  // 행 삭제
  const handleDeleteRow = useCallback((rowIdx: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return [{ ...EMPTY_ROW }];
      }
      return prev.filter((_, idx) => idx !== rowIdx);
    });
    setSelectedRowIdx(null);
  }, []);

  // 저장
  const handleSave = async () => {
    if (!header.pfdNo) {
      showMessage('error', 'PFD 번호를 입력하세요');
      return;
    }

    try {
      setSaving(true);

      // 헤더 저장/생성
      const headerMethod = header.id ? 'PUT' : 'POST';
      const headerUrl = header.id ? `/api/pfd/${header.id}` : '/api/pfd';
      
      const headerRes = await fetch(headerUrl, {
        method: headerMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(header),
      });
      const headerResult = await headerRes.json();

      if (!headerResult.success) {
        throw new Error(headerResult.error);
      }

      const pfdId = headerResult.data.id;
      setHeader((prev) => ({ ...prev, id: pfdId }));

      // 항목 저장
      const itemsRes = await fetch(`/api/pfd/${pfdId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows }),
      });
      const itemsResult = await itemsRes.json();

      if (!itemsResult.success) {
        throw new Error(itemsResult.error);
      }

      showMessage('success', `저장 완료 (${itemsResult.count}개 항목)`);
    } catch (err: any) {
      showMessage('error', err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // 새 PFD 번호 생성
  const generatePfdNo = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `pfd${year}-${random}`;
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* 상단 메뉴바 */}
      <header className="bg-white shadow-sm border-b px-4 py-2">
        <div className="flex items-center justify-between">
          {/* 좌측: 네비게이션 */}
          <div className="flex items-center gap-4">
            <Link href="/pfd/list" className="text-gray-500 hover:text-gray-700 text-sm">
              ← 목록
            </Link>
            <h1 className="text-lg font-bold text-gray-900">PFD 워크시트</h1>
            {header.pfdNo && (
              <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                {header.pfdNo}
              </span>
            )}
          </div>

          {/* 우측: 액션 버튼 */}
          <div className="flex items-center gap-2">
            {/* 동기화 드롭다운 */}
            <div className="relative group">
              <button className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-1">
                연동
                <span className="text-xs">▼</span>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={handleFmeaStructureSync}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  disabled={syncStatus === 'syncing'}
                >
                  FMEA 구조연동
                </button>
                <button
                  onClick={handleCpStructureSync}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  disabled={syncStatus === 'syncing'}
                >
                  CP 구조연동
                </button>
                <hr />
                <button
                  onClick={handleDataSync}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  disabled={syncStatus === 'syncing'}
                >
                  데이터 동기화
                </button>
              </div>
            </div>

            {/* 이동 드롭다운 */}
            <div className="relative group">
              <button className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center gap-1">
                이동
                <span className="text-xs">▼</span>
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  href={header.fmeaId ? `/pfmea/worksheet?id=${header.fmeaId}` : '/pfmea/list'}
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                >
                  FMEA 이동
                </Link>
                <Link
                  href={header.cpNo ? `/control-plan/worksheet?cpNo=${header.cpNo}` : '/control-plan/list'}
                  className="block px-4 py-2 text-sm hover:bg-gray-100"
                >
                  CP 이동
                </Link>
              </div>
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </header>

      {/* 메시지 */}
      {message && (
        <div
          className={`mx-4 mt-2 px-4 py-2 rounded text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 헤더 정보 */}
      <div className="bg-white mx-4 mt-4 p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">PFD 번호 *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={header.pfdNo}
                onChange={(e) => handleHeaderChange('pfdNo', e.target.value)}
                className="flex-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="pfd26-xxxx"
              />
              {!header.id && (
                <button
                  onClick={() => handleHeaderChange('pfdNo', generatePfdNo())}
                  className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300"
                >
                  생성
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">부품명</label>
            <input
              type="text"
              value={header.partName}
              onChange={(e) => handleHeaderChange('partName', e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">부품번호</label>
            <input
              type="text"
              value={header.partNo}
              onChange={(e) => handleHeaderChange('partNo', e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">고객사</label>
            <input
              type="text"
              value={header.customerName}
              onChange={(e) => handleHeaderChange('customerName', e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">제목</label>
            <input
              type="text"
              value={header.subject}
              onChange={(e) => handleHeaderChange('subject', e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">모델연도</label>
            <input
              type="text"
              value={header.modelYear}
              onChange={(e) => handleHeaderChange('modelYear', e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">회사명</label>
            <input
              type="text"
              value={header.companyName}
              onChange={(e) => handleHeaderChange('companyName', e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">담당자</label>
            <input
              type="text"
              value={header.processOwner}
              onChange={(e) => handleHeaderChange('processOwner', e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="flex-1 mx-4 my-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 border text-center text-xs font-medium text-gray-500 w-12">
                  #
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 border text-center text-xs font-medium text-gray-500"
                    style={{ minWidth: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-2 py-2 border text-center text-xs font-medium text-gray-500 w-16">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`${selectedRowIdx === rowIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedRowIdx(rowIdx)}
                >
                  <td className="px-2 py-1 border text-center text-xs text-gray-500">
                    {rowIdx + 1}
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-1 py-1 border">
                      <input
                        type="text"
                        value={(row as any)[col.key] || ''}
                        onChange={(e) => handleCellChange(rowIdx, col.key as keyof PfdRow, e.target.value)}
                        className="w-full px-2 py-1 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 border text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRow(rowIdx);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 행 추가 버튼 */}
        <div className="p-2 border-t bg-gray-50">
          <button
            onClick={handleAddRow}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            + 행 추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 페이지 (Suspense 래핑)
// ============================================================================

export default function PfdWorksheetPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-500">로딩 중...</div>}>
      <PfdWorksheetContent />
    </Suspense>
  );
}
