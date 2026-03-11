/**
 * @file page.tsx
 * @description 습득교훈 화면 (Lessons Learned)
 * @reference PRD-023-lessons-learned-screen.md
 * 
 * 디자인 원칙 (IMPROVEMENT 화면과 동일):
 * - 헤더: #00587a (진한 남청색) + 흰색 글자
 * - 첫 번째 열: #00587a + 흰색 글자
 * - 짝수 행: #e0f2fb (연한 하늘색)
 * - 홀수 행: #ffffff (흰색)
 * - 테두리: 1px solid #999
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Download, Upload, Trash2, RefreshCw, Save } from 'lucide-react';
import { downloadStyledExcel } from '@/lib/excel-utils';
import * as XLSX from 'xlsx';

import { 
  LessonsLearnedRow, 
  COLUMNS, 
  STATUS_COLORS, 
  TARGET_OPTIONS, 
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  LessonsStats 
} from './types';
import { LESSONS_SAMPLE_DATA, createEmptyRow } from './mock-data';

// 엑셀 헤더 정의 (★ 2026-01-12: 완료일자/적용결과/적용일자 변경)
const EXCEL_HEADERS = ['LLD_No', '차종', '대상', '고장형태', '발생장소', '발생원인', '구분', '개선대책', '완료일자', '적용결과', '상태', '적용일자'];
const EXCEL_COL_WIDTHS = [12, 10, 8, 30, 15, 30, 12, 30, 12, 15, 8, 12];

// 상단 네비게이션 메뉴 (FMEA 관련 화면 빠른 이동)
const TOP_NAV_ITEMS = [
  { label: '바로가기', href: '/', icon: '🏠' },
  { label: 'FMEA등록', href: '/pfmea/register', icon: '📝' },
  { label: 'FMEA 리스트', href: '/pfmea/list', icon: '📋' },
  { label: 'FMEA 작성화면', href: '/pfmea/worksheet', icon: '✏️', active: false },
  { label: 'FMEA 개정관리', href: '/pfmea/revision', icon: '📑' },
  { label: '습득교훈', href: '/pfmea/lessons-learned', icon: '📚', active: true },
];

/**
 * 습득교훈 페이지
 */
export default function LessonsLearnedPage() {
  // 상태 관리
  const [data, setData] = useState<LessonsLearnedRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTarget, setFilterTarget] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // ★ 페이지 로드 시 DB에서 데이터 로드, 없으면 샘플 데이터 자동 저장
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const res = await fetch('/api/lessons-learned');
        const result = await res.json();
        
        if (result.success && result.items && result.items.length > 0) {
          // DB에 데이터가 있으면 로드
          setData(result.items.map((item: LessonsLearnedRow & { id: string }) => ({
            ...item,
            target: item.target as '설계' | '부품' | '제조',
            category: item.category as '예방관리' | '검출관리',
            status: item.status as 'G' | 'Y' | 'R',
          })));
          console.log(`✅ DB에서 ${result.items.length}건 로드 완료`);
        } else {
          // DB가 비어있으면 샘플 데이터 저장
          console.log('🔥 DB가 비어있음 → 샘플 데이터 저장 중...');
          const saveRes = await fetch('/api/lessons-learned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: LESSONS_SAMPLE_DATA })
          });
          const saveResult = await saveRes.json();
          if (saveResult.success) {
            setData(LESSONS_SAMPLE_DATA);
            console.log(`✅ 샘플 데이터 ${LESSONS_SAMPLE_DATA.length}건 저장 완료`);
          }
        }
      } catch (error) {
        console.error('DB 로드 오류:', error);
        // 오류 시 샘플 데이터로 시작
        setData(LESSONS_SAMPLE_DATA);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFromDB();
  }, []);

  // 통계 계산
  const stats = useMemo<LessonsStats>(() => {
    return {
      total: data.length,
      completed: data.filter(d => d.status === 'G').length,
      inProgress: data.filter(d => d.status === 'Y').length,
      pending: data.filter(d => d.status === 'R').length,
    };
  }, [data]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return data.filter(row => {
      // 검색어 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !row.vehicle.toLowerCase().includes(search) &&
          !row.failureMode.toLowerCase().includes(search) &&
          !row.cause.toLowerCase().includes(search) &&
          !row.improvement.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      // 상태 필터
      if (filterStatus !== 'all' && row.status !== filterStatus) {
        return false;
      }
      // 대상 필터
      if (filterTarget !== 'all' && row.target !== filterTarget) {
        return false;
      }
      return true;
    });
  }, [data, searchTerm, filterStatus, filterTarget]);

  // 샘플 데이터 로드
  const handleLoadSample = () => {
    setData(LESSONS_SAMPLE_DATA);
  };

  // 새로고침 (초기화)
  const handleRefresh = () => {
    if (confirm('데이터를 초기화하시겠습니까?')) {
      setData([]);
    }
  };

  // 행 추가 (LLD26-XXX 시리얼 번호 자동 생성)
  const handleAddRow = () => {
    setData(prev => {
      // 현재 데이터에서 가장 큰 시퀀스 번호 찾기
      let maxSeq = 0;
      prev.forEach(row => {
        const match = row.lldNo.match(/LLD26-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      });
      return [...prev, createEmptyRow(maxSeq + 1)];
    });
  };

  // 행 삭제
  const handleDeleteRow = (id: string) => {
    if (confirm('선택한 행을 삭제하시겠습니까?')) {
      setData(prev => prev.filter(row => row.id !== id));
    }
  };

  // 셀 수정
  const handleCellChange = (id: string, field: keyof LessonsLearnedRow, value: string) => {
    setData(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // 파일 input 레퍼런스
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Excel 다운로드 (현재 데이터)
  const handleExportExcel = () => {
    if (data.length === 0) {
      alert('다운로드할 데이터가 없습니다. 샘플 데이터를 로드하거나 데이터를 추가하세요.');
      return;
    }

    // 데이터를 2차원 배열로 변환
    const excelData = data.map(row => [
      row.lldNo,
      row.vehicle,
      row.target,
      row.failureMode,
      row.location,
      row.cause,
      row.category,
      row.improvement,
      row.completedDate,  // ★ 완료일자 (LLD 완료된 날짜, 수동)
      row.fmeaId,         // ★ 적용결과 (FMEA ID, 자동)
      row.status,
      row.appliedDate,    // ★ 적용일자 (FMEA에 입력된 날짜, 자동)
    ]);

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadStyledExcel(
      EXCEL_HEADERS,
      excelData,
      EXCEL_COL_WIDTHS,
      '습득교훈',
      `습득교훈_LLD_${today}.xlsx`
    );
  };


  // Excel 업로드 (파일 선택 트리거)
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Excel 파일 파싱 및 데이터 로드
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // JSON으로 변환 (헤더 포함)
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          alert('데이터가 없거나 헤더만 있는 파일입니다.');
          return;
        }

        // 첫 행은 헤더, 나머지는 데이터
        const rows = jsonData.slice(1);
        const importedData: LessonsLearnedRow[] = rows
          .filter(row => row && row.length > 0 && row[0]) // 빈 행 제외
          .map((row, idx) => ({
            id: `ll-import-${Date.now()}-${idx}`,
            lldNo: String(row[0] || `LLD26-${String(idx + 1).padStart(3, '0')}`),
            vehicle: String(row[1] || ''),
            target: (['설계', '부품', '제조'].includes(String(row[2])) ? String(row[2]) : '설계') as '설계' | '부품' | '제조',
            failureMode: String(row[3] || ''),
            location: String(row[4] || ''),
            cause: String(row[5] || ''),
            category: (['예방관리', '검출관리'].includes(String(row[6])) ? String(row[6]) : '예방관리') as '예방관리' | '검출관리',
            improvement: String(row[7] || ''),
            completedDate: String(row[8] || ''),  // ★ 완료일자
            fmeaId: String(row[9] || ''),         // ★ 적용결과 (FMEA ID)
            status: (['G', 'Y', 'R'].includes(String(row[10])) ? String(row[10]) : 'R') as 'G' | 'Y' | 'R',
            appliedDate: String(row[11] || ''),   // ★ 적용일자
          }));

        if (importedData.length === 0) {
          alert('유효한 데이터가 없습니다.');
          return;
        }

        // 기존 데이터에 추가 또는 대체
        if (data.length > 0) {
          if (confirm(`기존 ${data.length}건의 데이터가 있습니다.\n\n[확인] 기존 데이터 유지 + 새 데이터 추가\n[취소] 새 데이터로 대체`)) {
            setData(prev => [...prev, ...importedData]);
          } else {
            setData(importedData);
          }
        } else {
          setData(importedData);
        }

        alert(`${importedData.length}건의 데이터를 불러왔습니다.`);
      } catch (error) {
        console.error('Excel 파싱 오류:', error);
        alert('Excel 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);

    // 파일 input 초기화 (같은 파일 재선택 가능)
    e.target.value = '';
  };

  // DB 저장
  const handleSave = async () => {
    if (data.length === 0) {
      alert('저장할 데이터가 없습니다.');
      return;
    }

    try {
      const response = await fetch('/api/lessons-learned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: data }),
      });

      if (!response.ok) {
        throw new Error('저장 실패');
      }

      const result = await response.json();
      alert(`${result.count}건의 데이터가 저장되었습니다.`);
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // 상태 배지 스타일
  const getStatusBadgeStyle = (status: 'G' | 'Y' | 'R') => {
    const colors = STATUS_COLORS[status];
    return {
      backgroundColor: colors.background,
      color: colors.color,
      border: 'none',
      fontWeight: 600,
    };
  };

  const pathname = usePathname();

  return (
    <div className="min-h-full" style={{ background: '#f5f5f5', fontFamily: '"Malgun Gothic", sans-serif' }}>
      {/* ★★★ 상단 네비게이션 (다른 화면 빠른 이동) ★★★ */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 border-b-2 border-[#1a237e]">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center gap-1 h-10">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    px-4 py-2 text-xs font-medium rounded-t transition-all whitespace-nowrap
                    ${isActive 
                      ? 'bg-purple-600 text-white border border-purple-400' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-2">
        {/* 페이지 헤더 (간소화) */}
        <div className="max-w-[1600px] mx-auto mb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#00587a]">📚 습득교훈 (Lessons Learned)</h1>
          <span className="text-xs text-gray-500">FMEA 과정에서 축적된 습득교훈 관리</span>
        </div>

      {/* 통계 테이블 (간소화) */}
      <div className="max-w-[1600px] mx-auto mb-2">
        <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="bg-[#00587a] text-white font-bold px-2 py-1 text-center text-xs" style={{ border: '1px solid #999' }}>전체</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-1 text-center text-xs" style={{ border: '1px solid #999' }}>완료 (G)</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-1 text-center text-xs" style={{ border: '1px solid #999' }}>진행중 (Y)</th>
                <th className="bg-[#00587a] text-white font-bold px-2 py-1 text-center text-xs" style={{ border: '1px solid #999' }}>미완료 (R)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="bg-white text-center text-[#00587a] font-bold text-lg py-1" style={{ border: '1px solid #999' }}>{stats.total}</td>
                <td className="bg-[#e0f2fb] text-center font-bold text-lg py-1" style={{ border: '1px solid #999', color: '#2e7d32' }}>{stats.completed}</td>
                <td className="bg-white text-center font-bold text-lg py-1" style={{ border: '1px solid #999', color: '#f59e0b' }}>{stats.inProgress}</td>
                <td className="bg-[#e0f2fb] text-center font-bold text-lg py-1" style={{ border: '1px solid #999', color: '#dc2626' }}>{stats.pending}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 액션 바 (간소화) */}
      <div className="max-w-[1600px] mx-auto mb-2">
        <div className="bg-white p-2 rounded-lg" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="차종, 고장형태, 원인 검색..."
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: '1px solid #999' }}
                />
              </div>

              {/* 대상 필터 */}
              <Select value={filterTarget} onValueChange={setFilterTarget}>
                <SelectTrigger className="w-28" style={{ border: '1px solid #999' }}>
                  <SelectValue placeholder="대상" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 대상</SelectItem>
                  {TARGET_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 상태 필터 */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-28" style={{ border: '1px solid #999' }}>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{STATUS_COLORS[opt].label} ({opt})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[#3B82F6] text-[#3B82F6] hover:bg-blue-50"
                onClick={handleLoadSample}
              >
                📋 샘플
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-400 text-gray-600 hover:bg-gray-50"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                새로고침
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[#8B5CF6] text-[#8B5CF6] hover:bg-purple-50"
                onClick={handleExportExcel}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[#F59E0B] text-[#F59E0B] hover:bg-orange-50"
                onClick={handleImportClick}
              >
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                size="sm"
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                저장
              </Button>
              {/* 숨겨진 파일 input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button
                size="sm"
                className="bg-[#10B981] hover:bg-[#059669] text-white font-bold"
                onClick={handleAddRow}
              >
                <Plus className="h-4 w-4 mr-1" />
                행추가
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 (전체폭) */}
      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {COLUMNS.map((col, i) => (
                    <th 
                      key={col.key} 
                      className="bg-[#00587a] text-white font-bold text-center whitespace-nowrap"
                      style={{ padding: '1px', border: '1px solid #999', minWidth: col.width }}
                    >
                      {col.name}
                    </th>
                  ))}
                  <th className="bg-[#00587a] text-white font-bold text-center" style={{ padding: '1px', border: '1px solid #999', width: 60 }}>
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={row.id}>
                    {/* LLD_No 열 */}
                    <td className="bg-[#00587a] text-white font-bold text-center whitespace-nowrap" style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      {row.lldNo}
                    </td>
                    {/* 차종 */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Input 
                        value={row.vehicle} 
                        onChange={(e) => handleCellChange(row.id, 'vehicle', e.target.value)}
                        className="h-[22px] text-xs text-center border-0 bg-transparent p-0"
                      />
                    </td>
                    {/* 대상 */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Select value={row.target} onValueChange={(v) => handleCellChange(row.id, 'target', v)}>
                        <SelectTrigger className="h-[22px] text-xs border-0 bg-transparent p-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* 고장형태 */}
                    <td className={`text-left ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Input 
                        value={row.failureMode} 
                        onChange={(e) => handleCellChange(row.id, 'failureMode', e.target.value)}
                        className="h-[22px] text-xs border-0 bg-transparent p-0"
                      />
                    </td>
                    {/* 발생장소 */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Input 
                        value={row.location} 
                        onChange={(e) => handleCellChange(row.id, 'location', e.target.value)}
                        className="h-[22px] text-xs text-center border-0 bg-transparent p-0"
                      />
                    </td>
                    {/* 발생원인 */}
                    <td className={`text-left ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Input 
                        value={row.cause} 
                        onChange={(e) => handleCellChange(row.id, 'cause', e.target.value)}
                        className="h-[22px] text-xs border-0 bg-transparent p-0"
                      />
                    </td>
                    {/* 구분 */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Select value={row.category} onValueChange={(v) => handleCellChange(row.id, 'category', v)}>
                        <SelectTrigger className="h-[22px] text-xs border-0 bg-transparent p-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* 개선대책 */}
                    <td className={`text-left ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Input 
                        value={row.improvement} 
                        onChange={(e) => handleCellChange(row.id, 'improvement', e.target.value)}
                        className="h-[22px] text-xs border-0 bg-transparent p-0"
                      />
                    </td>
                    {/* ★ 완료일자 (LLD 완료된 날짜, 수동 입력) */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Input 
                        type="date"
                        value={row.completedDate || ''} 
                        onChange={(e) => handleCellChange(row.id, 'completedDate', e.target.value)}
                        className="h-[22px] text-xs text-center border-0 bg-transparent p-0"
                        title="LLD 완료된 날짜 (수동 입력)"
                      />
                    </td>
                    {/* ★ 적용결과 (FMEA ID, 자동 입력) */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <span 
                        className="text-xs font-mono"
                        style={{ 
                          color: row.fmeaId ? '#00587a' : '#999',
                          fontWeight: row.fmeaId ? 600 : 400,
                        }}
                        title={row.fmeaId ? `FMEA에서 자동 입력됨: ${row.fmeaId}` : 'FMEA에서 습득교훈 선택 시 자동 입력됩니다'}
                      >
                        {row.fmeaId || '-'}
                      </span>
                    </td>
                    {/* 상태 */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Select value={row.status} onValueChange={(v) => handleCellChange(row.id, 'status', v as 'G' | 'Y' | 'R')}>
                        <SelectTrigger className="h-[22px] text-xs border-0 bg-transparent p-0">
                          <Badge style={getStatusBadgeStyle(row.status)}>{row.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>
                              <Badge style={getStatusBadgeStyle(opt)}>{opt} - {STATUS_COLORS[opt].label}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* ★ 적용일자 (FMEA에 입력된 날짜, 자동) */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <span 
                        className="text-xs"
                        style={{ color: row.appliedDate ? '#333' : '#999' }}
                        title={row.appliedDate ? `FMEA 적용일: ${row.appliedDate}` : 'FMEA에서 습득교훈 선택 시 자동 기록됩니다'}
                      >
                        {row.appliedDate || '-'}
                      </span>
                    </td>
                    {/* 작업 */}
                    <td className={`text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ padding: '1px', border: '1px solid #999', height: 25 }}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-[22px] w-[22px] p-0 hover:bg-red-50" 
                        onClick={() => handleDeleteRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 결과 없음 */}
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {data.length === 0 
                ? '📋 샘플 버튼을 클릭하여 샘플 데이터를 로드하거나, 행추가 버튼으로 새 데이터를 입력하세요.'
                : '조건에 맞는 데이터가 없습니다.'
              }
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}

