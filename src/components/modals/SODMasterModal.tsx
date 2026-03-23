// CODEFREEZE
/**
 * @file SODMasterModal.tsx
 * @description SOD(심각도/발생도/검출도) 마스터 등록 모달
 * P-FMEA 및 D-FMEA의 SOD 기준표 관리
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import {
  SODItem,
  DEFAULT_PFMEA_SEVERITY,
  DEFAULT_PFMEA_OCCURRENCE,
  DEFAULT_PFMEA_DETECTION,
  DEFAULT_DFMEA_SEVERITY,
  DEFAULT_DFMEA_OCCURRENCE,
  DEFAULT_DFMEA_DETECTION,
  DEFAULT_STANDARD,
  SHOW_EXAMPLES_COLUMN,
  SOD_ERRATA_NOTES,
  uid,
} from './SODMasterData';
// ★ 업종참조 제거 (2026-02-28): getDetectionExamples, getIndustryNames 미사용
import { exportSODToExcel, importSODFromExcel } from './SODExcelUtils';

interface SODMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 상수 데이터는 SODMasterData.ts로 분리됨 (약 290줄 절감)

// 스타일 함수들
const ratingCellStyle = (bg: string, text: string): React.CSSProperties => ({
  padding: '2px 4px', border: '1px solid #e0e0e0', textAlign: 'center', fontWeight: 700,
  fontSize: '11px', background: bg, color: text
});
const tdBaseStyle: React.CSSProperties = { padding: '1px 3px', border: '1px solid #e0e0e0' };
const tdContentStyle: React.CSSProperties = { padding: '2px 4px', border: '1px solid #e0e0e0', verticalAlign: 'top' };
const inputEditStyle: React.CSSProperties = { width: '100%', border: '1px solid #2196f3', padding: '2px', fontSize: '10px', background: '#e3f2fd', borderRadius: '3px' };
const lineStyle = (isEnglish: boolean): React.CSSProperties => ({
  color: isEnglish ? '#1565c0' : '#333',
  fontStyle: isEnglish ? 'italic' : 'normal',
  fontSize: isEnglish ? '9px' : '10px'
});

export default function SODMasterModal({ isOpen, onClose }: SODMasterModalProps) {
  const [items, setItems] = useState<SODItem[]>([]);
  const [activeTab, setActiveTab] = useState<'P-FMEA' | 'D-FMEA'>('P-FMEA');
  const [activeCategory, setActiveCategory] = useState<'S' | 'O' | 'D'>('S');
  const [activeStandard, setActiveStandard] = useState<string>(DEFAULT_STANDARD);
  // ★ selectedIndustry 제거 (업종참조 기능 삭제)
  const [mounted, setMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 수정/저장 토글
  const [showErrata, setShowErrata] = useState(false); // 정오표 도움말 토글
  // 화면의 70% 크기로 최적화
  const modalW = typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.7) : 1100;
  const modalH = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.7) : 600;
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: modalW, height: modalH, minWidth: 800, minHeight: 400
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // 데이터 로드 (v3: standard 필드 추가 마이그레이션 포함)
  useEffect(() => {
    if (!isOpen) return;

    // 활성 표준 복원
    const savedStandard = localStorage.getItem('sod_active_standard');
    if (savedStandard) setActiveStandard(savedStandard);
    // ★ 업종 선택 복원 제거 (2026-02-28)

    const savedData = localStorage.getItem('sod_master_data');
    const needsMigration = savedData ? (() => {
      const parsed = JSON.parse(savedData);
      const occurrenceItem = parsed.find((item: SODItem) => item.category === 'O');
      return occurrenceItem && !occurrenceItem.controlType;
    })() : false;

    const needsDfmeaMigration = savedData ? (() => {
      const parsed = JSON.parse(savedData);
      return !parsed.find((item: SODItem) => item.fmeaType === 'D-FMEA');
    })() : false;

    if (savedData && !needsMigration && !needsDfmeaMigration) {
      let parsed: SODItem[] = JSON.parse(savedData);
      // v3 마이그레이션: standard 필드 없는 아이템에 기본 표준 부여
      const needsStandardMigration = parsed.some((item: SODItem) => !item.standard);
      if (needsStandardMigration) {
        parsed = parsed.map(item => item.standard ? item : { ...item, standard: DEFAULT_STANDARD });
        localStorage.setItem('sod_master_data', JSON.stringify(parsed));
      }
      setItems(parsed);
    } else {
      const defaultItems: SODItem[] = [
        ...DEFAULT_PFMEA_SEVERITY.map(item => ({ ...item, id: uid(), standard: DEFAULT_STANDARD })),
        ...DEFAULT_PFMEA_OCCURRENCE.map(item => ({ ...item, id: uid(), standard: DEFAULT_STANDARD })),
        ...DEFAULT_PFMEA_DETECTION.map(item => ({ ...item, id: uid(), standard: DEFAULT_STANDARD })),
        ...DEFAULT_DFMEA_SEVERITY.map(item => ({ ...item, id: uid(), standard: DEFAULT_STANDARD })),
        ...DEFAULT_DFMEA_OCCURRENCE.map(item => ({ ...item, id: uid(), standard: DEFAULT_STANDARD })),
        ...DEFAULT_DFMEA_DETECTION.map(item => ({ ...item, id: uid(), standard: DEFAULT_STANDARD })),
      ];
      setItems(defaultItems);
      localStorage.setItem('sod_master_data', JSON.stringify(defaultItems));
    }
  }, [isOpen]);

  // 사용 가능한 표준 목록 (items에서 추출)
  const availableStandards = Array.from(new Set(items.map(i => i.standard || DEFAULT_STANDARD)));
  if (!availableStandards.includes(DEFAULT_STANDARD)) availableStandards.unshift(DEFAULT_STANDARD);

  // 표준 전환
  const handleChangeStandard = useCallback((std: string) => {
    setActiveStandard(std);
    localStorage.setItem('sod_active_standard', std);
  }, []);

  // 표준 추가
  const handleAddStandard = useCallback(() => {
    const name = prompt('새 기준 표준 이름을 입력하세요.\n(예: BMW, Hyundai-Kia, VW)');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (availableStandards.includes(trimmed)) {
      alert(`"${trimmed}" 표준이 이미 존재합니다.`);
      return;
    }
    const copyFrom = confirm(`기존 ${DEFAULT_STANDARD} 데이터를 복사하시겠습니까?\n\n확인 = 복사, 취소 = 빈 기준표 생성`);
    let newItems: SODItem[] = [];
    if (copyFrom) {
      // 기본 표준 데이터 복사
      const srcItems = items.filter(i => (i.standard || DEFAULT_STANDARD) === DEFAULT_STANDARD);
      newItems = srcItems.map(i => ({ ...i, id: uid(), standard: trimmed }));
    } else {
      // 빈 기준표: P-FMEA + D-FMEA × S/O/D × 등급 1~10 (뼈대만)
      for (const fmeaType of ['P-FMEA', 'D-FMEA'] as const) {
        for (const category of ['S', 'O', 'D'] as const) {
          for (let rating = 10; rating >= 1; rating--) {
            newItems.push({ id: uid(), fmeaType, category, standard: trimmed, rating, levelKr: '', levelEn: '' });
          }
        }
      }
    }
    const updated = [...items, ...newItems];
    setItems(updated);
    localStorage.setItem('sod_master_data', JSON.stringify(updated));
    handleChangeStandard(trimmed);
    alert(`"${trimmed}" 표준이 ${copyFrom ? '복사' : '생성'}되었습니다.`);
  }, [items, availableStandards, handleChangeStandard]);

  // 표준 삭제
  const handleDeleteStandard = useCallback(() => {
    if (activeStandard === DEFAULT_STANDARD) {
      alert(`${DEFAULT_STANDARD}는 기본 표준이므로 삭제할 수 없습니다.`);
      return;
    }
    if (!confirm(`"${activeStandard}" 표준의 모든 데이터가 삭제됩니다.\n계속하시겠습니까?`)) return;
    const updated = items.filter(i => (i.standard || DEFAULT_STANDARD) !== activeStandard);
    setItems(updated);
    localStorage.setItem('sod_master_data', JSON.stringify(updated));
    handleChangeStandard(DEFAULT_STANDARD);
    alert(`"${activeStandard}" 표준이 삭제되었습니다.`);
  }, [items, activeStandard, handleChangeStandard]);

  // 저장 (수정모드에서 저장 후 보기모드로 전환)
  const handleSave = useCallback(() => {
    localStorage.setItem('sod_master_data', JSON.stringify(items));
    setIsEditMode(false);
    alert('저장되었습니다.');
  }, [items]);

  // 수정모드 토글
  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  // 내보내기 (Excel .xlsx) - SODExcelUtils로 분리
  const handleExport = useCallback(async () => {
    await exportSODToExcel(items, activeTab, activeCategory, activeStandard);
  }, [items, activeTab, activeCategory, activeStandard]);

  // 가져오기 (Excel .xlsx) - SODExcelUtils로 분리
  const handleImport = useCallback(() => {
    importSODFromExcel(activeTab, activeCategory, activeStandard, (importedItems) => {
      setItems(prev => [
        ...prev.filter(item => !(item.fmeaType === activeTab && item.category === activeCategory && (item.standard || DEFAULT_STANDARD) === activeStandard)),
        ...importedItems,
      ]);
    });
  }, [activeTab, activeCategory, activeStandard]);

  // 필터링된 아이템 (표준 + FMEA타입 + 카테고리)
  const filteredItems = items
    .filter(item => (item.standard || DEFAULT_STANDARD) === activeStandard && item.fmeaType === activeTab && item.category === activeCategory)
    .sort((a, b) => b.rating - a.rating);

  // 셀 수정
  const updateItem = useCallback((id: string, field: keyof SODItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  if (!mounted || !isOpen) return null;

  const categoryLabels = {
    S: { kr: '심각도', en: 'Severity', color: '#d32f2f', full: '심각도(Severity)' },
    O: { kr: '발생도', en: 'Occurrence', color: '#1565c0', full: '발생도(Occurrence)' },
    D: { kr: '검출도', en: 'Detection', color: '#2e7d32', full: '검출도(Detection)' },
  };

  // 스타일 함수
  const btnStyle = (bg: string): React.CSSProperties => ({
    padding: '3px 8px', background: bg, color: 'white', border: 'none', borderRadius: '3px',
    fontSize: '10px', fontWeight: 600, cursor: 'pointer'
  });

  // 헤더 그라데이션 스타일 함수
  const headerGradientStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)' };
  const theadRowStyle = (color: string): React.CSSProperties => ({
    background: color,
    color: 'white'
  });

  const modalContent = (
    <div
      className="fixed z-[9999] bg-white rounded-xl flex flex-col shadow-2xl select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
        {/* 헤더 (컴팩트) */}
        <div className="text-white py-1 px-2 rounded-t-xl flex justify-between items-center cursor-move shrink-0" style={headerGradientStyle} onMouseDown={onDragStart}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" title="SOD Criteria Management">📊 SOD 기준(SOD Criteria)</span>
            {isEditMode && (
              <span className="bg-orange-500 text-white py-0.5 px-2 rounded text-[10px] font-bold animate-pulse">수정중</span>
            )}
          </div>
          <div className="flex gap-1.5 items-center" onMouseDown={e => e.stopPropagation()}>
            <button onClick={handleImport} style={btnStyle('#4caf50')}>Import</button>
            <button onClick={handleExport} style={btnStyle('#ff9800')}>Export</button>
            {isEditMode ? (
              <button onClick={handleSave} style={btnStyle('#4caf50')}>💾 저장</button>
            ) : (
              <button onClick={handleToggleEditMode} style={btnStyle('#2196f3')}>✏️ 수정</button>
            )}
            {isEditMode && <button onClick={() => setIsEditMode(false)} style={btnStyle('#9e9e9e')}>취소</button>}
            <button onClick={onClose} style={btnStyle('#f44336')}>닫기</button>
          </div>
        </div>

        {/* 네비게이션 바 (기준표준 + FMEA타입 + SOD카테고리 + 업종참조 — 1줄) */}
        <div className="flex items-center gap-1 py-1 px-3 bg-gray-50 border-b border-gray-200 flex-wrap shrink-0">
          {/* 기준표준 */}
          <div className="flex items-center gap-1 mr-2">
            {availableStandards.map(std => (
              <button
                key={std}
                onClick={() => handleChangeStandard(std)}
                className={`py-0.5 px-2 rounded text-[10px] font-semibold border transition-all ${
                  activeStandard === std
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {std}
                {std !== DEFAULT_STANDARD && activeStandard === std && (
                  <span onClick={(e) => { e.stopPropagation(); handleDeleteStandard(); }} className="ml-1 text-white/70 hover:text-white cursor-pointer">×</span>
                )}
              </button>
            ))}
            <button onClick={handleAddStandard} className="py-0.5 px-1.5 rounded text-[10px] font-bold border border-dashed border-gray-400 text-gray-400 hover:border-indigo-500 hover:text-indigo-600" title="새 기준 표준 추가">+</button>
          </div>

          {/* 구분선 */}
          <div className="w-px h-5 bg-gray-300 mr-1" />

          {/* FMEA 타입 */}
          {(['P-FMEA', 'D-FMEA'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-0.5 px-3 rounded text-[10px] font-semibold border transition-all ${
                activeTab === tab
                  ? 'bg-indigo-900 text-white border-indigo-900'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {tab}
            </button>
          ))}

          {/* 구분선 */}
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* SOD 카테고리 */}
          {(['S', 'O', 'D'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`py-0.5 px-3 rounded-full text-[10px] font-semibold border transition-all ${
                activeCategory === cat
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-300'
              }`}
              style={activeCategory === cat ? { background: categoryLabels[cat].color, borderColor: categoryLabels[cat].color } : undefined}
            >
              {cat}-{categoryLabels[cat].kr}
            </button>
          ))}

          {/* ★ 업종참조 드롭다운 제거 (2026-02-28) */}
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto p-2 px-3">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr style={theadRowStyle(categoryLabels[activeCategory].color)}>
                <th className="py-0.5 px-1 border border-gray-300 w-[70px] whitespace-nowrap text-center" title="Rating">
                  등급(Rating)<br/><span className="text-[8px] opacity-80">Rating</span>
                </th>
                <th className="py-0.5 px-1 border border-gray-300 w-[100px] whitespace-nowrap text-center" title="Level">
                  레벨(Level)<br/><span className="text-[8px] opacity-80">Level</span>
                </th>
                {activeCategory === 'S' ? (
                  activeTab === 'P-FMEA' ? (
                    // P-FMEA 심각도: 3개 컬럼
                    <>
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center" title="Impact to Your Plant">
                        귀사공장 영향(YP)<br/><span className="text-[8px] opacity-80">Impact to Your Plant</span>
                      </th>
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center" title="Impact to Ship-to-Plant">
                        고객사 영향(SP)<br/><span className="text-[8px] opacity-80">Impact to Ship-to-Plant</span>
                      </th>
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center" title="Impact to End User">
                        최종사용자 영향(User)<br/><span className="text-[8px] opacity-80">Impact to End User</span>
                      </th>
                      {SHOW_EXAMPLES_COLUMN && (
                        <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-teal-700 text-white">
                          심각도 사례(SE)<br/><span className="text-[8px] opacity-80">Severity Examples</span>
                        </th>
                      )}
                    </>
                  ) : (
                    // D-FMEA 심각도: 1개 컬럼
                    <>
                    <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center" title="DFMEA Severity Criteria">
                      DFMEA 심각도 기준(S)<br/><span className="text-[8px] opacity-80">DFMEA Severity Criteria</span>
                    </th>
                    {SHOW_EXAMPLES_COLUMN && (
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-teal-700 text-white">
                        심각도 사례(SE)<br/><span className="text-[8px] opacity-80">Severity Examples</span>
                      </th>
                    )}
                    </>
                  )
                ) : activeCategory === 'O' ? (
                  activeTab === 'P-FMEA' ? (
                    // P-FMEA 발생도: 3개 컬럼
                    <>
                      {/* 기준 - 노란색 계열 */}
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-amber-600 text-white" title="Type of Control">
                        관리유형(TC)<br/><span className="text-[8px] opacity-80">Type of Control</span>
                      </th>
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-amber-600 text-white" title="Prevention Controls">
                        예방관리(PC)<br/><span className="text-[8px] opacity-80">Prevention Controls</span>
                      </th>
                      {/* 대안1 - 빨간색 계열 */}
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-red-800 text-white" title="Incidents per 1,000 items">
                        대안1 발생빈도(Alt1)<br/><span className="text-[8px] opacity-80">Incidents per 1,000 items</span>
                      </th>
                      {SHOW_EXAMPLES_COLUMN && (
                        <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-teal-700 text-white">
                          발생도 사례(OE)<br/><span className="text-[8px] opacity-80">Occurrence Examples</span>
                        </th>
                      )}
                    </>
                  ) : (
                    // D-FMEA 발생도: 2개 컬럼
                    <>
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center" title="DFMEA Occurrence Criteria">
                        DFMEA 발생도 기준(O)<br/><span className="text-[8px] opacity-80">DFMEA Occurrence Criteria</span>
                      </th>
                      {/* 대안1 - 빨간색 계열 */}
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-red-800 text-white" title="Incidents per 1,000 item/vehicles">
                        대안1(Alt1)<br/><span className="text-[8px] opacity-80">Incidents per 1,000 item/vehicles</span>
                      </th>
                      {SHOW_EXAMPLES_COLUMN && (
                        <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-teal-700 text-white">
                          발생도 사례(OE)<br/><span className="text-[8px] opacity-80">Occurrence Examples</span>
                        </th>
                      )}
                    </>
                  )
                ) : (
                  <>
                    <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center" title="Detection Method Maturity">
                      검출방법 성숙도(DM)<br/><span className="text-[8px] opacity-80">Detection Method Maturity</span>
                    </th>
                    <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center" title="Opportunity for Detection">
                      검출기회(OD)<br/><span className="text-[8px] opacity-80">Opportunity for Detection</span>
                    </th>
                    {SHOW_EXAMPLES_COLUMN && (
                      <th className="py-0.5 px-1 border border-gray-300 whitespace-nowrap text-center bg-teal-700 text-white">
                        검출방법 사례(DE)<br/><span className="text-[8px] opacity-80">Detection Method Examples</span>
                      </th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                // 등급(Rating) 숫자 기준 위험도 색상: 10=적색(위험), 1=녹색(안전)
                const rating = item.rating;
                let rowBgColor = '#fff';
                let ratingBgColor = '#e0e0e0';
                let ratingTextColor = '#333';
                
                if (rating >= 9) {
                  // 9-10: 부드러운 적색 (과포화 방지)
                  rowBgColor = '#ffebee';
                  ratingBgColor = '#e57373';
                  ratingTextColor = '#fff';
                } else if (rating >= 7) {
                  // 7-8: 주황색 (위험)
                  rowBgColor = '#ffe0b2';
                  ratingBgColor = '#ef6c00';
                  ratingTextColor = '#fff';
                } else if (rating >= 5) {
                  // 5-6: 노란색 (보통)
                  rowBgColor = '#fff9c4';
                  ratingBgColor = '#f9a825';
                  ratingTextColor = '#333';
                } else if (rating >= 3) {
                  // 3-4: 연두색 (낮음)
                  rowBgColor = '#dcedc8';
                  ratingBgColor = '#7cb342';
                  ratingTextColor = '#fff';
                } else {
                  // 1-2: 녹색 (매우 낮음/안전)
                  rowBgColor = '#c8e6c9';
                  ratingBgColor = '#2e7d32';
                  ratingTextColor = '#fff';
                }
                
                return (
                <tr key={item.id} style={{ background: rowBgColor }}>
                  <td style={ratingCellStyle(ratingBgColor, ratingTextColor)}>
                    {item.rating}
                  </td>
                  <td style={tdBaseStyle}>
                    {isEditMode ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={item.levelKr}
                          onChange={(e) => updateItem(item.id, 'levelKr', e.target.value)}
                          style={inputEditStyle}
                          placeholder="한글"
                        />
                        <input
                          type="text"
                          value={item.levelEn}
                          onChange={(e) => updateItem(item.id, 'levelEn', e.target.value)}
                          style={{ ...inputEditStyle, fontStyle: 'italic' }}
                          placeholder="English"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-[9px] leading-none p-0.5">
                        <div>{item.levelKr}</div>
                        <div className="text-[8px] italic text-blue-700">{item.levelEn}</div>
                      </div>
                    )}
                  </td>
                  {activeCategory === 'S' ? (
                    activeTab === 'P-FMEA' ? (
                      // P-FMEA 심각도: 3개 컬럼
                      <>
                        <td style={tdContentStyle}>
                          <div className="text-[9px] leading-[1.2]">
                            <div className="text-gray-800">{(item.yourPlant || '').split('(')[0].trim()}</div>
                            <div className="text-blue-700 text-[8px] italic">
                              {(item.yourPlant || '').includes('(') ? '(' + (item.yourPlant || '').split('(').slice(1).join('(') : ''}
                            </div>
                          </div>
                        </td>
                        <td style={tdContentStyle}>
                          <div className="text-[9px] leading-[1.2]">
                            <div className="text-gray-800">{(item.shipToPlant || '').split('(')[0].trim()}</div>
                            <div className="text-blue-700 text-[8px] italic">
                              {(item.shipToPlant || '').includes('(') ? '(' + (item.shipToPlant || '').split('(').slice(1).join('(') : ''}
                            </div>
                          </div>
                        </td>
                        <td style={tdContentStyle}>
                          <div className="text-[9px] leading-[1.2]">
                            <div className="text-gray-800">{(item.endUser || '').split('(')[0].trim()}</div>
                            <div className="text-blue-700 text-[8px] italic">
                              {(item.endUser || '').includes('(') ? '(' + (item.endUser || '').split('(').slice(1).join('(') : ''}
                            </div>
                          </div>
                        </td>
                        {SHOW_EXAMPLES_COLUMN && (
                          <td className="p-0.5 border border-gray-300 align-top bg-teal-50">
                            {isEditMode ? (
                              <textarea value={item.severityExamples || ''} onChange={(e) => updateItem(item.id, 'severityExamples', e.target.value)} className="w-full border border-teal-400 p-1 text-[10px] bg-teal-50 rounded resize-y min-h-[50px]" placeholder="심각도 사례 입력" />
                            ) : (
                              <div className="text-[9px] leading-[1.2]">{(item.severityExamples || '').split('\n').map((line, i) => (<div key={i} className="text-gray-700">{line && <span className="text-teal-600 mr-0.5">•</span>}{line}</div>))}</div>
                            )}
                          </td>
                        )}
                      </>
                    ) : (
                      // D-FMEA 심각도: 1개 컬럼 (endUser 필드에 저장)
                      <>
                      <td style={tdContentStyle}>
                        <div className="text-[9px] leading-[1.2]">
                          {(item.endUser || '').split('\n').map((line, i) => (
                            <div key={i} style={lineStyle(i !== 0)}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </td>
                      {SHOW_EXAMPLES_COLUMN && (
                        <td className="p-0.5 border border-gray-300 align-top bg-teal-50">
                          {isEditMode ? (
                            <textarea value={item.severityExamples || ''} onChange={(e) => updateItem(item.id, 'severityExamples', e.target.value)} className="w-full border border-teal-400 p-1 text-[10px] bg-teal-50 rounded resize-y min-h-[50px]" placeholder="심각도 사례 입력" />
                          ) : (
                            <div className="text-[9px] leading-[1.2]">{(item.severityExamples || '').split('\n').map((line, i) => (<div key={i} className="text-gray-700">{line && <span className="text-teal-600 mr-0.5">•</span>}{line}</div>))}</div>
                          )}
                        </td>
                      )}
                      </>
                    )
                  ) : activeCategory === 'O' ? (
                    activeTab === 'P-FMEA' ? (
                      // P-FMEA 발생도: 3개 컬럼
                      <>
                        {/* 관리유형 - 기준 (노란색 배경) */}
                        <td className="p-0.5 border border-gray-300 align-top bg-amber-50">
                          <div className="text-[9px] leading-[1.2]">
                            {(item.controlType || '').split('\n').map((line, i) => (
                              <div key={i} style={lineStyle(i !== 0)}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                        {/* 예방관리 - 기준 (노란색 배경) */}
                        <td className="p-0.5 border border-gray-300 align-top bg-amber-50">
                          <div className="text-[9px] leading-[1.2]">
                            {(item.preventionControl || '').split('\n').map((line, i) => (
                              <div key={i} style={lineStyle(i % 2 !== 0)}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                        {/* 발생빈도 - 대안1 (빨간색 배경) */}
                        <td className="p-0.5 border border-gray-300 align-top bg-red-50">
                          <div className="text-[9px] leading-[1.2]">
                            {(item.description || '').split('\n').map((line, i) => (
                              <div key={i} className={i === 0 ? 'text-red-800 font-semibold text-[9px]' : 'text-blue-700 font-normal italic text-[8px]'}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                        {SHOW_EXAMPLES_COLUMN && (
                          <td className="p-0.5 border border-gray-300 align-top bg-teal-50">
                            {isEditMode ? (
                              <textarea value={item.occurrenceExamples || ''} onChange={(e) => updateItem(item.id, 'occurrenceExamples', e.target.value)} className="w-full border border-teal-400 p-1 text-[10px] bg-teal-50 rounded resize-y min-h-[50px]" placeholder="발생도 사례 입력" />
                            ) : (
                              <div className="text-[9px] leading-[1.2]">{(item.occurrenceExamples || '').split('\n').map((line, i) => (<div key={i} className="text-gray-700">{line && <span className="text-teal-600 mr-0.5">•</span>}{line}</div>))}</div>
                            )}
                          </td>
                        )}
                      </>
                    ) : (
                      // D-FMEA 발생도: 2개 컬럼 (criteria + description)
                      <>
                        {/* DFMEA 발생도 기준 */}
                        <td style={tdContentStyle}>
                          <div className="text-[9px] leading-[1.2]">
                            {(item.criteria || '').split('\n').map((line, i) => {
                              // 영문은 파란색 이탤릭
                              const isEnglish = /^[①②③④⑤]?\s*[A-Z]/.test(line) || /^[A-Z]/.test(line.trim());
                              return (
                                <div key={i} style={lineStyle(isEnglish)}>
                                  {line}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        {/* FMEA 대안1 (빨간색 배경) */}
                        <td className="p-0.5 border border-gray-300 align-top bg-red-50">
                          <div className="text-[9px] leading-[1.2]">
                            {(item.description || '').split('\n').map((line, i) => (
                              <div key={i} className={i === 0 ? 'text-red-800 font-semibold text-[9px]' : 'text-blue-700 font-normal italic text-[8px]'}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                        {SHOW_EXAMPLES_COLUMN && (
                          <td className="p-0.5 border border-gray-300 align-top bg-teal-50">
                            {isEditMode ? (
                              <textarea value={item.occurrenceExamples || ''} onChange={(e) => updateItem(item.id, 'occurrenceExamples', e.target.value)} className="w-full border border-teal-400 p-1 text-[10px] bg-teal-50 rounded resize-y min-h-[50px]" placeholder="발생도 사례 입력" />
                            ) : (
                              <div className="text-[9px] leading-[1.2]">{(item.occurrenceExamples || '').split('\n').map((line, i) => (<div key={i} className="text-gray-700">{line && <span className="text-teal-600 mr-0.5">•</span>}{line}</div>))}</div>
                            )}
                          </td>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {/* 검출도 - 등급 1은 성숙도+검출기회 셀 병합 */}
                      {item.rating === 1 ? (
                        <td colSpan={2} className="p-0.5 border border-gray-300 align-top text-center">
                          <div className="text-[9px] leading-[1.2]">
                            {(item.criteria || '').split('(').map((part, i) => (
                              <div key={i} style={lineStyle(i !== 0)}>
                                {i === 0 ? part.trim() : '(' + part}
                              </div>
                            ))}
                          </div>
                        </td>
                      ) : (
                        <>
                          {/* 검출도 - 검출방법 성숙도 */}
                          <td style={tdContentStyle}>
                            <div className="text-[9px] leading-[1.2]">
                              {(item.criteria || '').split('(').map((part, i) => (
                                <div key={i} style={lineStyle(i !== 0)}>
                                  {i === 0 ? part.trim() : '(' + part}
                                </div>
                              ))}
                            </div>
                          </td>
                          {/* 검출도 - 검출기회 */}
                          <td style={tdContentStyle}>
                            <div className="text-[9px] leading-[1.2]">
                              {(item.description || '').split('(').map((part, i) => (
                                <div key={i} style={lineStyle(i !== 0)}>
                                  {i === 0 ? part.trim() : '(' + part}
                                </div>
                              ))}
                            </div>
                          </td>
                        </>
                      )}
                      {/* 검출도 - 검출방법 사례 */}
                      {SHOW_EXAMPLES_COLUMN && (
                        <td className="p-0.5 border border-gray-300 align-top bg-teal-50">
                          {isEditMode ? (
                            <textarea
                              value={item.detectionExamples || ''}
                              onChange={(e) => updateItem(item.id, 'detectionExamples', e.target.value)}
                              className="w-full border border-teal-400 p-1 text-[10px] bg-teal-50 rounded resize-y min-h-[50px]"
                              placeholder="검출방법 사례 입력 (줄바꿈으로 구분)"
                            />
                          ) : (
                            <div className="text-[9px] leading-[1.2]">
                              {(item.detectionExamples || '').split('\n').map((line, i) => (
                                <div key={i} className="text-gray-700">
                                  {line && <span className="text-teal-600 mr-0.5">•</span>}
                                  {line}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* 정오표 도움말 (토글) */}
        {showErrata && (
          <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-200 text-[10px] max-h-[120px] overflow-y-auto shrink-0">
            <div className="font-bold text-amber-700 mb-1">AIAG & VDA FMEA Handbook 1st Edition — 2차 정오표 (Errata V2, 2020-06-02)</div>
            <table className="w-full border-collapse">
              <tbody>
                {SOD_ERRATA_NOTES.map((note, i) => (
                  <tr key={i} className="border-b border-amber-100 last:border-0">
                    <td className="py-0.5 pr-1 text-amber-600 font-medium whitespace-nowrap align-top">p.{note.page}</td>
                    <td className="py-0.5 pr-1 text-gray-500 whitespace-nowrap align-top">{note.target}</td>
                    <td className="py-0.5 text-gray-700">{note.corrected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 푸터 */}
        <div className="py-1 px-3 bg-gray-100 border-t border-gray-300 text-[10px] text-gray-500 shrink-0 rounded-b-xl flex justify-between items-center">
          <span>{filteredItems.length}개 | [{activeStandard}] {activeTab} {categoryLabels[activeCategory].kr}</span>
          <button
            onClick={() => setShowErrata(v => !v)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${showErrata ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-gray-400 border-gray-300 hover:text-amber-600 hover:border-amber-400'}`}
          >
            {showErrata ? '정오표 닫기' : '정오표 보기'}
          </button>
        </div>

        {/* 리사이즈 핸들 */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
          <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

