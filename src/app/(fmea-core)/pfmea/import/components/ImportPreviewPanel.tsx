/**
 * @file ImportPreviewPanel.tsx
 * @description PFMEA Import 좌측 미리보기 패널
 * @author AI Assistant
 * @created 2026-01-21
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


'use client';

import React, { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, GitCompare, Download } from 'lucide-react';
import { tw } from '../tailwindClasses';
import { PREVIEW_OPTIONS } from '../sampleData';
import { ImportedFlatData } from '../types';

interface Props {
  previewData: ImportedFlatData[];
  previewColumn: string;
  setPreviewColumn: (col: string) => void;
  selectedRows: Set<string>;
  processNoMap: Map<string, string>;
  isCompareMode: boolean;
  dbData: ImportedFlatData[];
  confirmSelections: Set<string>;
  isSaved: boolean;
  isSaving: boolean;
  flatData: ImportedFlatData[];
  onDownloadPreview: () => void;
  onDownloadAll: () => void;
  onAllDelete: () => void;
  onDeleteSelected: () => void;
  onSave: () => void;
  onShowBackup: () => void;
  onRowSelect: (id: string) => void;
  onEditCell: (id: string, value: string) => void;
  onEditM4?: (bk: string, m4: string) => void;
  onReorder: (from: number, to: number) => void;
  getDisplayProcessNo: (processNo: string) => string;
  onSelectAllConfirm: (checked: boolean) => void;
  onConfirmSave: () => void;
  onCancelCompare: () => void;
  onToggleConfirm: (id: string) => void;
  onStartCompare: () => void;
  onSelectAllRows: (checked: boolean) => void;
  onNavigateWorksheet?: () => void;
  /** 마스터 데이타 적용 시에만 비교 버튼 표시 */
  isMasterApplied?: boolean;
  /** 현재 FMEA의 BD ID (예: BD-M26-001) */
  bdId?: string;
  /** 현재 FMEA의 저장 여부 (BD 존재 여부) */
  hasBdData?: boolean;
  /** 상위 FMEA BD ID (예: BD-M26-001 ← 출처 표시) */
  parentBdId?: string;
  /** ★ 2026-02-18: Import 버튼 핸들러 (파일 선택 트리거) */
  onImportFile?: () => void;
  /** ★ 2026-02-18: Export 버튼 핸들러 (flatData → Excel) */
  onExportAll?: () => void;
}

// ★★★ 4M 분류 배지 색상 (엑셀 양식과 동일) ★★★
// ──────────────────────────────────────────────────────
// 4M 분류 추론 가이드 (PFMEA 기초정보 B1 작업요소 전용)
// ──────────────────────────────────────────────────────
// MN (사람/Man)     : 작업자, 검사원, 운전자 등 사람이 수행하는 작업요소
// MC (설비/Machine) : 설비, 금형, 지그, 치구, 계측기, 공구 등 장비류
//                     지게차, 크레인, 대차, 운반구, 리프트, 컨베이어 등 운반장비 포함
//                     게이지 블록, 마스터 샘플 등 검사장비 포함
//                     (※ MD(금형)/JG(지그)는 파서에서 MC로 자동 변환)
// IM (부자재/Input Material) — BOM에 포함되지 않는 생산보조자재
//    ⚠️ 원자재(제품을 구성하는 주재료)가 아님 → 원자재는 D-FMEA 영역
//    판별 기준: "이 재료가 최종 제품의 일부인가?" → YES=원자재(IM제외), NO=부자재(IM)
//    ── 자동차 부품 ──
//    세척/청소   : 에어건 필터, 세척액, 클리닝 와이프, 면장갑, 정전기 방지 장갑
//    표시/식별   : 마킹펜, 라벨스티커, 합격/불합격 태그, 로트 표시 카드
//    보호/포장   : 비닐팩, 기포완충재(뽁뽁이), 건조제(실리카겔), PE폼, 스트레치 필름
//    소모공구    : 사포, 연마디스크, 절삭유, 드릴비트, 탭
//    접착/실링   : 실리콘 실란트, 나사풀림방지제(록타이트), 가스켓시트, 테프론테이프
//    용접        : 스패터방지제, 용접팁(콘택트팁), 노즐, 세라믹 백킹재
//    열처리      : 담금질유(퀜칭오일), 침탄가스, 방청유
//    윤활        : 그리스, 윤활유, 작동유, 충격방지 패드
//    ── 전자/반도체 ──
//    클린룸      : 정전기 방지 매트, ESD 손목밴드, 크린룸 와이퍼, 이온화 에어건
//    솔더링      : 솔더페이스트, 플럭스, 솔더링 팁, 클리닝 스폰지
//    접착/코팅   : 에폭시, 컨포멀코팅제, UV접착제, 방습제
//    포장        : 정전기 방지 봉투(ESD백), 트레이, 매거진 랙
//    ❌ 도장공정의 도료 = 원자재(제품 일부) → IM 아님
// EN (환경/Environment) : 온도, 습도, 조명, 청정도, 분진 등 작업 환경 조건
// ──────────────────────────────────────────────────────
const M4_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  MN: { bg: 'bg-red-100', text: 'text-red-700', label: 'MN' },
  MC: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'MC' },
  IM: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'IM' },
  EN: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'EN' },
};

// ★★★ IM 원자재 블랙리스트 - 도료/페인트 등 원자재는 IM이 아님 ★★★
const IM_RAW_MATERIAL_KEYWORDS = [
  '도료', '도장', '페인트', '프라이머', '클리어코트', '코팅제',
];
function isImInvalid(item: { m4?: string; value?: string }): boolean {
  if (item.m4 !== 'IM' || !item.value?.trim()) return false;
  const val = item.value.toLowerCase();
  return IM_RAW_MATERIAL_KEYWORDS.some(kw => val.includes(kw));
}

export function ImportPreviewPanel(props: Props) {
  const {
    previewData, previewColumn, setPreviewColumn, selectedRows, processNoMap,
    isCompareMode, dbData, confirmSelections, isSaved, isSaving,
    flatData, onDownloadPreview, onDownloadAll, onAllDelete, onDeleteSelected, onSave, onShowBackup,
    onRowSelect, onEditCell, onEditM4, onReorder, getDisplayProcessNo,
    onSelectAllConfirm, onConfirmSave, onCancelCompare, onToggleConfirm, onStartCompare, onSelectAllRows,
    onNavigateWorksheet,
    isMasterApplied,
    bdId,
    hasBdData,
    parentBdId,
    onImportFile,
    onExportAll,
  } = props;

  // ★★★ 2026-02-08: 전체 다운로드 팝업 ★★★
  const [showAllPopup, setShowAllPopup] = useState(false);

  // ★★★ 2026-02-08: 드래그 앤 드롭 행 이동 ★★★
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ★★★ IM 원자재 오류 모달 ★★★
  const [showImErrorModal, setShowImErrorModal] = useState(false);

  // ★★★ 2026-02-16: 비즈니스 키 헬퍼 - B1~B5 전체 m4 포함 ★★★
  const getBK = (d: ImportedFlatData) => {
    if (['B1', 'B2', 'B3', 'B4', 'B5'].includes(d.itemCode) && d.m4) return `${d.processNo}|${d.itemCode}|${d.m4}|${d.value}`;
    return `${d.processNo}|${d.itemCode}|${d.value}`;
  };

  // ★★★ 2026-02-16: B1~B5 전체 4M 컬럼 표시 ★★★
  const showM4Column = ['B1', 'B2', 'B3', 'B4', 'B5'].includes(previewColumn);
  // ★★★ 2026-02-22: A4/B3 특별특성 컬럼 표시 ★★★
  const showSpecialCharColumn = ['A4', 'B3'].includes(previewColumn);

  // 현재 선택된 항목 라벨
  const currentItemLabel = PREVIEW_OPTIONS.find(o => o.value === previewColumn)?.label || previewColumn;

  // ★★★ 2026-02-02: value가 객체일 때 name 속성 추출 (object Object 버그 수정) ★★★
  const getValueString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      // { name: '...', severity: 10 } 형태의 객체 처리
      if ('name' in value) return String(value.name || '');
      // 배열인 경우
      if (Array.isArray(value)) return value.map(v => getValueString(v)).join(', ');
      // 기타 객체는 JSON 문자열로 반환
      return JSON.stringify(value);
    }
    return String(value);
  };

  // ★★★ 2026-02-07: B1(작업요소)은 값+4M 모두 카운트 (항목×2) ★★★
  const valueValidCount = previewData.filter(d => getValueString(d.value).trim() !== '').length;
  const valueEmptyCount = previewData.filter(d => getValueString(d.value).trim() === '').length;
  const m4ValidCount = showM4Column ? previewData.filter(d => d.m4 && d.m4.trim() !== '').length : 0;
  const m4EmptyCount = showM4Column ? previewData.filter(d => !d.m4 || d.m4.trim() === '').length : 0;
  const totalItems = showM4Column ? previewData.length * 2 : previewData.length;
  const validCount = showM4Column ? valueValidCount + m4ValidCount : valueValidCount;
  const emptyCount = showM4Column ? valueEmptyCount + m4EmptyCount : valueEmptyCount;
  const imErrorCount = flatData.filter(d => isImInvalid(d)).length;

  // 비교 모드에서 변경/신규 여부 확인
  const isItemChanged = (item: ImportedFlatData) => {
    if (!isCompareMode) return false;
    const dbItem = dbData.find(d => d.processNo === item.processNo && d.itemCode === item.itemCode);
    if (!dbItem) return true; // 신규
    return dbItem.value !== item.value;
  };

  const isItemNew = (item: ImportedFlatData) => {
    if (!isCompareMode) return false;
    return !dbData.find(d => d.processNo === item.processNo && d.itemCode === item.itemCode);
  };

  return (
    <div className="min-w-[400px] max-w-[750px] flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg" style={{ flex: '1 1 650px' }}>
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 text-sm font-bold flex items-center justify-between">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span>📋</span> FMEA Basic Data
        </div>
        <div className="flex items-center gap-2 text-[11px] font-normal">
          <span className="bg-white/20 px-2 py-0.5 rounded whitespace-nowrap">항목: <b className="text-yellow-300">{totalItems}</b></span>
          <span className="bg-green-500/50 px-2 py-0.5 rounded whitespace-nowrap">데이타: <b className="text-green-200">{validCount}</b></span>
          <span className={`px-2 py-0.5 rounded whitespace-nowrap ${emptyCount > 0 ? 'bg-red-500/50' : 'bg-gray-500/50'}`}>
            누락: <b className={emptyCount > 0 ? 'text-red-200' : 'text-gray-200'}>{emptyCount}</b>
          </span>
          {imErrorCount > 0 && (
            <span
              className="bg-red-600/70 px-2 py-0.5 rounded whitespace-nowrap cursor-pointer hover:bg-red-500/80"
              onClick={() => setShowImErrorModal(true)}
            >
              오류: <b className="text-red-100">{imErrorCount}</b>
            </span>
          )}
          {showM4Column && (
            <span className={`px-2 py-0.5 rounded whitespace-nowrap ${m4EmptyCount > 0 ? 'bg-orange-500/50' : 'bg-blue-500/50'}`}>
              4M: <b className={m4EmptyCount > 0 ? 'text-orange-200' : 'text-blue-200'}>{m4ValidCount}/{previewData.length}</b>
            </span>
          )}
        </div>
      </div>

      {/* ★ 기초정보 BD ID + 구조분석 이동 + 도움말 */}
      {onNavigateWorksheet && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border-b border-amber-200 text-[11px] text-gray-700 shrink-0">
          <span className="text-amber-500 font-bold">★</span>
          <span>Basic Data :</span>
          {bdId ? (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              hasBdData
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-gray-100 text-gray-500 border border-gray-300'
            }`}>
              {bdId}
            </span>
          ) : (
            <span className="text-gray-400 text-[10px]">Basic Data 미생성</span>
          )}
          {parentBdId && (
            <span className="text-gray-400 text-[9px]">← {parentBdId}</span>
          )}
          {hasBdData && (
            <span className="text-green-600 text-[9px] font-bold">
              ({new Set(flatData.map(d => d.itemCode)).size}항목 {flatData.filter(d => d.value?.trim()).length}개)
            </span>
          )}
          {!hasBdData && bdId && (
            <span className="text-orange-500 text-[9px]">(미저장)</span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={onNavigateWorksheet} className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-500 transition-colors cursor-pointer">
              구조분석 이동
            </button>
            <div className="relative group">
              <span className="px-2 py-0.5 bg-gray-500 text-white rounded text-[9px] font-bold cursor-help hover:bg-gray-600 transition-colors">도움말</span>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-[320px] bg-gray-900 text-white text-[10px] rounded-lg shadow-xl p-2.5 z-50 leading-relaxed max-h-[70vh] overflow-y-auto">
                <div className="font-bold text-yellow-300 mb-1.5">Basic Data 패널 도움말</div>
                <div className="mb-1 pb-1 border-b border-gray-700"><b className="text-gray-400">헤더 배지</b></div>
                <div className="mb-1"><b className="text-yellow-300">항목</b> 현재 항목의 전체 셀 수</div>
                <div className="mb-1"><b className="text-green-300">데이타</b> 값이 입력된 셀 수</div>
                <div className="mb-1"><b className="text-red-300">누락</b> 값이 비어있는 셀 수</div>
                <div className="mb-1"><b className="text-blue-300">4M</b> B1(작업요소) 시 4M 지정/미지정 비율</div>
                <div className="mb-1 pb-1 border-b border-gray-700"><b className="text-gray-400">버튼 기능</b></div>
                <div className="mb-1"><b className="text-blue-300">다운로드</b> 현재 항목을 엑셀로 내보내기</div>
                <div className="mb-1"><b className="text-red-300">All Del.</b> 현재 항목의 전체 데이터 삭제</div>
                <div className="mb-1"><b className="text-yellow-200">Del.</b> 체크된 행만 선택 삭제</div>
                <div className="mb-1"><b className="text-blue-300">비교</b> DB 기존 데이터와 비교 후 선택 반영</div>
                <div className="mb-1 pb-1 border-b border-gray-700"><b className="text-gray-400">4M 분류 기준 (B1 작업요소)</b></div>
                <div className="mb-1"><b className="text-red-300">MN</b> 사람 — 작업자, 검사원, 운전자</div>
                <div className="mb-0.5 text-gray-400">CP/PFD 매핑 제외</div>
                <div className="mb-1 mt-1"><b className="text-blue-300">MC</b> 설비 — 설비, 금형, 지그, 치구, 계측기, 공구</div>
                <div className="mb-0.5 text-gray-300">지게차, 크레인, 대차, 운반구, 리프트, 컨베이어</div>
                <div className="mb-0.5 text-gray-300">게이지 블록, 마스터 샘플 등 검사장비</div>
                <div className="mb-0.5 text-gray-400">MD(금형)/JG(지그) → MC 자동 변환</div>
                <div className="mb-0.5 text-gray-400">CP/PFD 설비금형지그 컬럼에 매핑</div>
                <div className="mb-1 mt-1"><b className="text-orange-300">IM</b> 부자재 — BOM 미포함 생산보조자재</div>
                <div className="mb-0.5 text-gray-300">세척: 세척액, 클리닝 와이프, 에어건 필터</div>
                <div className="mb-0.5 text-gray-300">표시: 마킹펜, 라벨스티커, 합격/불합격 태그</div>
                <div className="mb-0.5 text-gray-300">보호: 비닐팩, 건조제, PE폼, 스트레치 필름</div>
                <div className="mb-0.5 text-gray-300">소모: 사포, 연마디스크, 절삭유, 드릴비트</div>
                <div className="mb-0.5 text-gray-300">접착: 실리콘 실란트, 록타이트, 테프론테이프</div>
                <div className="mb-0.5 text-gray-300">용접: 스패터방지제, 용접팁, 백킹재</div>
                <div className="mb-0.5 text-gray-300">열처리: 담금질유, 침탄가스, 방청유</div>
                <div className="mb-0.5 text-gray-300">윤활: 그리스, 윤활유, 작동유</div>
                <div className="mb-0.5 text-gray-300">전자: ESD매트, 솔더페이스트, 플럭스</div>
                <div className="mb-0.5 text-red-300">X 도료(원자재) → D-FMEA 영역</div>
                <div className="mb-0.5 text-gray-400">판별: 최종 제품의 일부? Yes=원자재, No=IM</div>
                <div className="mt-1"><b className="text-pink-300">EN</b> 환경 — 온도, 습도, 조명, 청정도, 분진</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* 탭 + 버튼 */}
        <div className="flex w-full border-b border-gray-400 shrink-0">
          {/* 좌우 화살표 + 드롭다운 */}
          <div className="flex items-center bg-[#e0f2fb] shrink-0">
            <button
              onClick={() => {
                const idx = PREVIEW_OPTIONS.findIndex(o => o.value === previewColumn);
                if (idx > 0) setPreviewColumn(PREVIEW_OPTIONS[idx - 1].value);
              }}
              className="px-0.5 py-1.5 text-[#00587a] hover:bg-[#c0e2f5] transition-colors"
              title="이전 항목 (←)"
            >
              <ChevronLeft size={12} />
            </button>
            <select value={previewColumn} onChange={(e) => setPreviewColumn(e.target.value)} className="w-[90px] px-0 py-1.5 border-none font-bold bg-[#e0f2fb] text-[#00587a] text-[10px] text-center">
              {PREVIEW_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button
              onClick={() => {
                const idx = PREVIEW_OPTIONS.findIndex(o => o.value === previewColumn);
                if (idx < PREVIEW_OPTIONS.length - 1) setPreviewColumn(PREVIEW_OPTIONS[idx + 1].value);
              }}
              className="px-0.5 py-1.5 text-[#00587a] hover:bg-[#c0e2f5] transition-colors"
              title="다음 항목 (→)"
            >
              <ChevronRight size={12} />
            </button>
          </div>
          {onImportFile && (
            <button onClick={onImportFile} className="flex-1 px-1.5 py-1.5 bg-blue-50 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center justify-center gap-0.5" title="Excel 파일 Import">
              <Download size={10} className="rotate-180" />Import
            </button>
          )}
          {!onImportFile && (
            <button onClick={onDownloadPreview} className="flex-1 px-1.5 py-1.5 bg-blue-50 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center justify-center gap-0.5" title="현재 항목만 다운로드">
              <Download size={10} />Item
            </button>
          )}
          <button onClick={onExportAll || (() => setShowAllPopup(true))} className="flex-1 px-1.5 py-1.5 bg-green-50 text-green-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center justify-center gap-0.5" title="전체 항목 Excel 다운로드">
            <Download size={10} />Export
          </button>
          <button onClick={onAllDelete} className="flex-1 px-1.5 py-1.5 bg-red-50 text-red-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center justify-center">All Del.</button>
          <button onClick={onDeleteSelected} className="flex-1 px-1.5 py-1.5 bg-yellow-100 text-yellow-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center justify-center">Del.</button>
          <button onClick={onSave} disabled={isSaving} className={`flex-1 px-2 py-1.5 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center justify-center bg-blue-700 text-white hover:bg-blue-800`} title="Basic Data 저장">{isSaving ? '저장중...' : '저장'}</button>
          <div className="w-[1px] bg-gray-400 self-stretch shrink-0" />
          {isCompareMode ? (
            <>
              <button onClick={() => onSelectAllConfirm(true)} className="flex-1 px-1.5 py-1.5 bg-purple-100 text-purple-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] flex items-center justify-center gap-0.5 hover:bg-purple-200 transition-colors whitespace-nowrap">전체</button>
              <button onClick={onConfirmSave} className="flex-1 px-1.5 py-1.5 bg-green-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] flex items-center justify-center gap-0.5 whitespace-nowrap">확정({confirmSelections.size})</button>
              <button onClick={onCancelCompare} className="flex-1 px-1.5 py-1.5 bg-gray-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] whitespace-nowrap flex items-center justify-center">취소</button>
            </>
          ) : isMasterApplied ? (
            <button onClick={onStartCompare} className="flex-1 px-1.5 py-1.5 bg-blue-100 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[10px] flex items-center justify-center gap-0.5 whitespace-nowrap"><GitCompare className="w-3 h-3" />비교</button>
          ) : null}
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-y-auto max-h-[350px] border-t border-gray-200 bg-gray-50">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col className="w-[22px]" />
              <col className="w-[28px]" />
              <col className="w-[28px]" />
              <col className="w-[48px]" />
              {showM4Column && <col className="w-[45px]" />}
              <col />
              {showSpecialCharColumn && <col className="w-[40px]" />}
            </colgroup>
            <thead className="sticky top-0 z-[1]">
              <tr>
                <th className={tw.headerCell}><input type="checkbox" checked={previewData.length > 0 && previewData.every(d => selectedRows.has(getBK(d)))} onChange={(e) => onSelectAllRows(e.target.checked)} /></th>
                <th className={tw.headerCell}>NO</th>
                <th className={tw.headerCell}>이동</th>
                <th className={tw.headerCell}>공정번호</th>
                {showM4Column && <th className={tw.headerCell}>4M</th>}
                <th className={tw.headerCell}>{PREVIEW_OPTIONS.find(o => o.value === previewColumn)?.label || previewColumn}</th>
                {showSpecialCharColumn && <th className={tw.headerCell}>특별특성</th>}
              </tr>
            </thead>
            <tbody>
              {previewData.length === 0 ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className={tw.cellCenter}><input type="checkbox" /></td>
                    <td className={tw.cellCenter}>{i + 1}</td>
                    <td className={`${tw.cellCenter} align-middle`}>
                      <ArrowUpDown className="w-3 h-3 text-gray-300 mx-auto" />
                    </td>
                    <td className={tw.cellPad}><input type="text" placeholder="공정번호" className={tw.input} /></td>
                    {showM4Column && <td className={tw.cellCenter}><span className="text-gray-300 text-[8px]">-</span></td>}
                    <td className={tw.cellPad}><input type="text" placeholder="클릭하여 입력" className={tw.input} /></td>
                    {showSpecialCharColumn && <td className={tw.cellCenter}><span className="text-gray-300 text-[8px]">-</span></td>}
                  </tr>
                ))
              ) : (
                previewData.map((item, i) => {
                  const isChanged = isItemChanged(item);
                  const isNew = isItemNew(item);
                  const itemBK = getBK(item);
                  const isConfirmed = confirmSelections.has(itemBK);

                  const imInvalid = showM4Column && isImInvalid(item);
                  let rowBgClass = '';
                  if (imInvalid) {
                    rowBgClass = 'bg-red-50';
                  } else if (isCompareMode) {
                    if (isConfirmed) rowBgClass = 'bg-purple-100 ring-2 ring-purple-400 ring-inset';
                    else if (isNew) rowBgClass = 'bg-green-100';
                    else if (isChanged) rowBgClass = 'bg-yellow-200';
                  } else if (selectedRows.has(itemBK)) {
                    rowBgClass = 'bg-orange-50';
                  }

                  return (
                    <tr
                      key={item.id}
                      className={`${rowBgClass} ${dragIdx === i ? 'opacity-40' : ''} ${dragOverIdx === i && dragIdx !== i ? 'border-t-2 border-blue-500' : ''}`}
                      draggable={!isCompareMode}
                      onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIdx !== null && dragIdx !== i) onReorder(dragIdx, i);
                        setDragIdx(null);
                        setDragOverIdx(null);
                      }}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    >
                      <td className={tw.cellCenter}>
                        {isCompareMode ? (
                          <input type="checkbox" checked={isConfirmed} onChange={() => onToggleConfirm(itemBK)} className="cursor-pointer" />
                        ) : (
                          <input type="checkbox" checked={selectedRows.has(itemBK)} onChange={() => onRowSelect(itemBK)} className="cursor-pointer" />
                        )}
                      </td>
                      <td className={tw.cellCenter}>{i + 1}</td>
                      <td className={`${tw.cellCenter} align-middle cursor-grab active:cursor-grabbing`}>
                        <ArrowUpDown className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700 mx-auto drop-shadow-sm" />
                      </td>
                      <td className={tw.cellPad}>
                        <span className="text-xs text-gray-700">{getDisplayProcessNo(item.processNo)}</span>
                      </td>
                      {showM4Column && (
                        <td className={tw.cellCenter}>
                          <select
                            value={item.m4 || ''}
                            onChange={(e) => onEditM4?.(itemBK, e.target.value)}
                            className={`w-full text-[9px] font-bold border-0 rounded cursor-pointer text-center py-0 px-0 ${
                              imInvalid
                                ? 'bg-red-200 text-red-800 ring-1 ring-red-500'
                                : !item.m4?.trim()
                                ? 'bg-red-50 text-red-400'
                                : M4_BADGE[item.m4]
                                ? `${M4_BADGE[item.m4].bg} ${M4_BADGE[item.m4].text}`
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <option value="">누락</option>
                            <option value="MN">MN</option>
                            <option value="MC">MC</option>
                            <option value="IM">IM</option>
                            <option value="EN">EN</option>
                          </select>
                        </td>
                      )}
                      <td className={tw.cellPad}>
                        {isCompareMode ? (
                          <div className="flex items-center gap-1">
                            {isConfirmed && <span className="text-purple-600">✓</span>}
                            <span className={`${isChanged || isNew ? 'font-bold' : ''}`}>{getValueString(item.value)}</span>
                            {isNew && <span className="text-green-600 text-[10px] ml-1">(신규)</span>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input type="text" value={getValueString(item.value)} onChange={(e) => onEditCell(itemBK, e.target.value)}
                              className={`${tw.input} ${imInvalid ? 'text-red-700 font-bold' : ''}`} />
                            {imInvalid && <span className="text-red-600 text-[9px] whitespace-nowrap" title="IM(부자재)에 해당하지 않는 항목 - 4M 분류를 확인하세요">원자재</span>}
                          </div>
                        )}
                      </td>
                      {showSpecialCharColumn && (
                        <td className={tw.cellCenter}>
                          <span className={`text-[10px] font-bold ${item.specialChar ? 'text-red-700' : 'text-gray-300'}`}>
                            {item.specialChar || '-'}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div className="px-4 h-[28px] flex items-center justify-center bg-gradient-to-br from-[#e0f2fb] to-gray-100 border-t-2 border-gray-800 text-[11px] text-gray-700 shrink-0 font-bold">
          ▼ 총 {previewData.length}건 ━━ 데이터 끝 ━━ ▼
        </div>
      </div>

      {/* ★★★ 2026-02-08: 전체 시트 현황 팝업 ★★★ */}
      {showAllPopup && (() => {
        const stats = PREVIEW_OPTIONS.map(opt => {
          const items = flatData.filter(d => d.itemCode === opt.value);
          const filled = items.filter(d => {
            const v = typeof d.value === 'string' ? d.value : '';
            return v.trim() !== '';
          }).length;
          return { code: opt.value, label: opt.label, total: items.length, filled };
        });
        const grandTotal = stats.reduce((s, r) => s + r.total, 0);
        const grandFilled = stats.reduce((s, r) => s + r.filled, 0);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAllPopup(false)}>
            <div className="bg-white rounded-lg shadow-2xl w-[420px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white px-4 py-2.5 rounded-t-lg font-bold text-sm flex items-center justify-between">
                <span>전체 시트 현황</span>
                <button onClick={() => setShowAllPopup(false)} className="text-white/70 hover:text-white text-lg leading-none cursor-pointer">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1 text-left">레벨</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">항목</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-[50px]">행수</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-[50px]">입력</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-[50px]">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map(r => {
                      const level = r.code.startsWith('A') ? 'L2' : r.code.startsWith('B') ? 'L3' : 'L1';
                      const pct = r.total > 0 ? Math.round((r.filled / r.total) * 100) : 0;
                      return (
                        <tr key={r.code} className={r.total === 0 ? 'text-gray-400' : ''}>
                          <td className="border border-gray-200 px-2 py-0.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              level === 'L1' ? 'bg-orange-100 text-orange-700' :
                              level === 'L2' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>{level}</span>
                          </td>
                          <td className="border border-gray-200 px-2 py-0.5">{r.label.split(' ').slice(1).join(' ') || r.label}</td>
                          <td className="border border-gray-200 px-2 py-0.5 text-center font-bold">{r.total}</td>
                          <td className="border border-gray-200 px-2 py-0.5 text-center">{r.filled}</td>
                          <td className="border border-gray-200 px-2 py-0.5 text-center">
                            {r.total === 0 ? <span className="text-gray-300">-</span> :
                             pct === 100 ? <span className="text-green-600 font-bold">완료</span> :
                             <span className={pct > 0 ? 'text-yellow-600' : 'text-red-500'}>{pct}%</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="border border-gray-300 px-2 py-1" colSpan={2}>합계</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{grandTotal}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{grandFilled}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {grandTotal > 0 ? `${Math.round((grandFilled / grandTotal) * 100)}%` : '-'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                <button onClick={() => setShowAllPopup(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300 cursor-pointer">닫기</button>
                <button onClick={() => { onDownloadAll(); setShowAllPopup(false); }} className="px-3 py-1.5 bg-[#00587a] text-white rounded text-xs font-bold hover:bg-[#007a9e] cursor-pointer flex items-center gap-1">
                  <Download size={12} />전체 다운로드
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ★★★ IM 원자재 오류 상세 모달 ★★★ */}
      {showImErrorModal && (() => {
        const errors = flatData.filter(d => isImInvalid(d));
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowImErrorModal(false)}>
            <div className="bg-white rounded-lg shadow-2xl w-[480px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="bg-red-600 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
                <span className="font-bold text-sm">IM 원자재 오류 ({errors.length}건)</span>
                <button onClick={() => setShowImErrorModal(false)} className="text-white/80 hover:text-white text-lg font-bold cursor-pointer">&times;</button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-center w-8">NO</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-center w-14">공정</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-center w-10">4M</th>
                      <th className="border border-gray-300 px-2 py-1.5">값</th>
                      <th className="border border-gray-300 px-2 py-1.5 w-16">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((d, i) => (
                      <tr key={i} className="bg-red-50">
                        <td className="border border-gray-300 px-2 py-1 text-center">{i + 1}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{d.processNo}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          <span className="bg-red-200 text-red-800 px-1 rounded text-[10px] font-bold">{d.m4}</span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 font-medium">{getValueString(d.value)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-red-600 font-bold text-center">원자재</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-gray-700">
                  <b>IM(부자재) 판별 기준:</b> "이 재료가 최종 제품의 일부인가?"<br/>
                  YES → 원자재 (IM 해당 아님, D-FMEA 영역)<br/>
                  NO → 부자재 (IM 해당)
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-200 flex justify-end">
                <button onClick={() => setShowImErrorModal(false)} className="px-4 py-1.5 bg-gray-700 text-white rounded text-xs font-bold hover:bg-gray-800 cursor-pointer">확인</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default ImportPreviewPanel;
