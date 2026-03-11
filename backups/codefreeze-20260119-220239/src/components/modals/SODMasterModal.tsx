/**
 * @file SODMasterModal.tsx
 * @description SOD(심각도/발생도/검출도) 마스터 등록 모달
 * P-FMEA 및 D-FMEA의 SOD 기준표 관리
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  SODItem,
  DEFAULT_PFMEA_SEVERITY,
  DEFAULT_PFMEA_OCCURRENCE,
  DEFAULT_PFMEA_DETECTION,
  DEFAULT_DFMEA_SEVERITY,
  DEFAULT_DFMEA_OCCURRENCE,
  DEFAULT_DFMEA_DETECTION,
  uid,
} from './SODMasterData';

interface SODMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 상수 데이터는 SODMasterData.ts로 분리됨 (약 290줄 절감)

// 스타일 함수들
const ratingCellStyle = (bg: string, text: string): React.CSSProperties => ({
  padding: '8px', border: '1px solid #e0e0e0', textAlign: 'center', fontWeight: 700,
  background: bg, color: text
});
const tdBaseStyle: React.CSSProperties = { padding: '4px', border: '1px solid #e0e0e0' };
const tdContentStyle: React.CSSProperties = { padding: '6px', border: '1px solid #e0e0e0', verticalAlign: 'top' };
const inputEditStyle: React.CSSProperties = { width: '100%', border: '1px solid #2196f3', padding: '4px', fontSize: '12px', background: '#e3f2fd', borderRadius: '3px' };
const textContainerStyle: React.CSSProperties = { fontSize: '11px', lineHeight: '1.5' };
const lineStyle = (isEnglish: boolean): React.CSSProperties => ({
  color: isEnglish ? '#1565c0' : '#333',
  fontStyle: isEnglish ? 'italic' : 'normal',
  fontSize: isEnglish ? '10px' : '11px'
});

export default function SODMasterModal({ isOpen, onClose }: SODMasterModalProps) {
  const [items, setItems] = useState<SODItem[]>([]);
  const [activeTab, setActiveTab] = useState<'P-FMEA' | 'D-FMEA'>('P-FMEA');
  const [activeCategory, setActiveCategory] = useState<'S' | 'O' | 'D'>('S');
  const [mounted, setMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // 수정/저장 토글

  useEffect(() => {
    setMounted(true);
  }, []);

  // 데이터 로드 (v2: controlType, preventionControl 필드 추가로 인한 마이그레이션)
  useEffect(() => {
    if (!isOpen) return;

    const savedData = localStorage.getItem('sod_master_data');
    const needsMigration = savedData ? (() => {
      const parsed = JSON.parse(savedData);
      // 발생도(O) 데이터에 controlType 필드가 없으면 마이그레이션 필요
      const occurrenceItem = parsed.find((item: SODItem) => item.category === 'O');
      return occurrenceItem && !occurrenceItem.controlType;
    })() : false;

    // D-FMEA 데이터 존재 여부 확인
    const needsDfmeaMigration = savedData ? (() => {
      const parsed = JSON.parse(savedData);
      const dfmeaItem = parsed.find((item: SODItem) => item.fmeaType === 'D-FMEA');
      return !dfmeaItem;
    })() : false;

    if (savedData && !needsMigration && !needsDfmeaMigration) {
      setItems(JSON.parse(savedData));
    } else {
      // 기본 데이터 생성 (신규 또는 마이그레이션) - P-FMEA + D-FMEA
      const defaultItems: SODItem[] = [
        // P-FMEA
        ...DEFAULT_PFMEA_SEVERITY.map(item => ({ ...item, id: uid() })),
        ...DEFAULT_PFMEA_OCCURRENCE.map(item => ({ ...item, id: uid() })),
        ...DEFAULT_PFMEA_DETECTION.map(item => ({ ...item, id: uid() })),
        // D-FMEA
        ...DEFAULT_DFMEA_SEVERITY.map(item => ({ ...item, id: uid() })),
        ...DEFAULT_DFMEA_OCCURRENCE.map(item => ({ ...item, id: uid() })),
        ...DEFAULT_DFMEA_DETECTION.map(item => ({ ...item, id: uid() })),
      ];
      setItems(defaultItems);
      localStorage.setItem('sod_master_data', JSON.stringify(defaultItems));
      console.log('[SOD] 데이터 마이그레이션 완료 - P-FMEA + D-FMEA 데이터 추가');
    }
  }, [isOpen]);

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

  // 내보내기
  const handleExport = useCallback(() => {
    const filteredItems = items.filter(item => item.fmeaType === activeTab && item.category === activeCategory);
    const csvContent = [
      ['등급', '레벨(한글)', '레벨(영문)', 'Your Plant', 'Ship to Plant', 'End User', '기준', '설명'].join(','),
      ...filteredItems.map(item => [
        item.rating,
        item.levelKr,
        item.levelEn,
        item.yourPlant || '',
        item.shipToPlant || '',
        item.endUser || '',
        item.criteria || '',
        item.description || ''
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab}_${activeCategory === 'S' ? '심각도' : activeCategory === 'O' ? '발생도' : '검출도'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [items, activeTab, activeCategory]);

  // 가져오기
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(1); // 헤더 제외
        
        const importedItems: SODItem[] = lines
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
            return {
              id: uid(),
              fmeaType: activeTab,
              category: activeCategory,
              rating: parseInt(values[0]) || 1,
              levelKr: values[1] || '',
              levelEn: values[2] || '',
              yourPlant: values[3] || undefined,
              shipToPlant: values[4] || undefined,
              endUser: values[5] || undefined,
              criteria: values[6] || undefined,
              description: values[7] || undefined,
            };
          });

        // 기존 데이터에서 해당 탭/카테고리 제외하고 새 데이터 추가
        setItems(prev => [
          ...prev.filter(item => !(item.fmeaType === activeTab && item.category === activeCategory)),
          ...importedItems
        ]);
        alert(`${importedItems.length}개 항목을 가져왔습니다.`);
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  }, [activeTab, activeCategory]);

  // 필터링된 아이템
  const filteredItems = items
    .filter(item => item.fmeaType === activeTab && item.category === activeCategory)
    .sort((a, b) => b.rating - a.rating);

  // 셀 수정
  const updateItem = useCallback((id: string, field: keyof SODItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  if (!mounted || !isOpen) return null;

  const categoryLabels = {
    S: { kr: '심각도', en: 'Severity', color: '#c62828', full: '심각도(Severity)' },
    O: { kr: '발생도', en: 'Occurrence', color: '#1565c0', full: '발생도(Occurrence)' },
    D: { kr: '검출도', en: 'Detection', color: '#2e7d32', full: '검출도(Detection)' },
  };

  // 스타일 함수
  const btnStyle = (bg: string): React.CSSProperties => ({ 
    padding: '6px 12px', background: bg, color: 'white', border: 'none', borderRadius: '4px', 
    fontSize: '12px', fontWeight: 600, cursor: 'pointer' 
  });

  // 헤더 그라데이션 스타일 함수
  const headerGradientStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)' };
  const categoryBtnStyle = (cat: 'S' | 'O' | 'D', active: boolean): React.CSSProperties => ({
    background: active ? categoryLabels[cat].color : '#e0e0e0',
    color: active ? 'white' : '#666'
  });
  const theadRowStyle = (color: string): React.CSSProperties => ({
    background: color,
    color: 'white'
  });

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/50">
      <div className="bg-white rounded-xl w-[95%] max-w-[1200px] max-h-[90vh] flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="text-white py-4 px-6 rounded-t-xl flex justify-between items-center" style={headerGradientStyle}>
          <div className="flex items-center gap-3">
            <div>
              <h2 className="m-0 text-lg font-bold">📊 SOD 기준표 관리 (SOD Criteria Management)</h2>
              <p className="mt-1 text-xs opacity-80">심각도(Severity) / 발생도(Occurrence) / 검출도(Detection) 기준표 등록 및 관리</p>
            </div>
            {isEditMode && (
              <span className="bg-orange-500 text-white py-1 px-3 rounded-xl text-xs font-bold animate-pulse">✏️ 수정중</span>
            )}
          </div>
          <div className="flex gap-2 items-center">
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

        {/* FMEA 타입 탭 */}
        <div className="flex border-b border-gray-200 bg-gray-100">
          {(['P-FMEA', 'D-FMEA'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 p-3 border-none cursor-pointer text-sm ${activeTab === tab ? 'bg-white font-bold text-indigo-900 border-b-[3px] border-indigo-900' : 'bg-transparent text-gray-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* SOD 카테고리 탭 */}
        <div className="flex gap-2 py-3 px-6 bg-gray-50">
          {(['S', 'O', 'D'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="py-2 px-6 border-none rounded-full cursor-pointer font-semibold text-sm transition-all"
              style={categoryBtnStyle(cat, activeCategory === cat)}
            >
              {cat} - {categoryLabels[cat].full}
            </button>
          ))}
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto p-4 px-6">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={theadRowStyle(categoryLabels[activeCategory].color)}>
                <th className="p-2.5 border border-gray-300 w-[70px] whitespace-nowrap text-center">
                  등급<br/><span className="text-[10px] opacity-90">Rating</span>
                </th>
                <th className="p-2.5 border border-gray-300 w-[100px] whitespace-nowrap text-center">
                  레벨(한글)<br/><span className="text-[10px] opacity-90">Level(KR)</span>
                </th>
                <th className="p-2.5 border border-gray-300 w-[100px] whitespace-nowrap text-center">
                  레벨(영문)<br/><span className="text-[10px] opacity-90">Level(EN)</span>
                </th>
                {activeCategory === 'S' ? (
                  activeTab === 'P-FMEA' ? (
                    // P-FMEA 심각도: 3개 컬럼
                    <>
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                        귀사의 공장에 미치는 영향<br/><span className="text-[10px] opacity-90">Impact to Your Plant</span>
                      </th>
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                        고객사에 미치는 영향<br/><span className="text-[10px] opacity-90">Impact to Ship-to-Plant</span>
                      </th>
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                        최종사용자에 대한 영향<br/><span className="text-[10px] opacity-90">Impact to End User</span>
                      </th>
                    </>
                  ) : (
                    // D-FMEA 심각도: 1개 컬럼
                    <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                      DFMEA 심각도 기준<br/><span className="text-[10px] opacity-90">DFMEA Severity Criteria</span>
                    </th>
                  )
                ) : activeCategory === 'O' ? (
                  activeTab === 'P-FMEA' ? (
                    // P-FMEA 발생도: 3개 컬럼
                    <>
                      {/* 기준 - 노란색 계열 */}
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-amber-600 text-white">
                        관리유형<br/><span className="text-[10px] opacity-90">Type of Control</span>
                      </th>
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-amber-600 text-white">
                        예방관리<br/><span className="text-[10px] opacity-90">Prevention Controls</span>
                      </th>
                      {/* 대안1 - 빨간색 계열 */}
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-red-800 text-white">
                        FMEA 대안1 발생빈도<br/><span className="text-[10px] opacity-90">Incidents per 1,000 items</span>
                      </th>
                    </>
                  ) : (
                    // D-FMEA 발생도: 2개 컬럼
                    <>
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                        DFMEA 발생도 기준<br/><span className="text-[10px] opacity-90">DFMEA Occurrence Criteria</span>
                      </th>
                      {/* 대안1 - 빨간색 계열 */}
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-red-800 text-white">
                        FMEA 대안1<br/><span className="text-[10px] opacity-90">Incidents per 1,000 item/vehicles</span>
                      </th>
                    </>
                  )
                ) : (
                  <>
                    <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                      검출방법 성숙도<br/><span className="text-[10px] opacity-90">Detection Method Maturity</span>
                    </th>
                    <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                      검출기회<br/><span className="text-[10px] opacity-90">Opportunity for Detection</span>
                    </th>
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
                  // 9-10: 적색 (매우 위험)
                  rowBgColor = '#ffcdd2';
                  ratingBgColor = '#c62828';
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
                      <input
                        type="text"
                        value={item.levelKr}
                        onChange={(e) => updateItem(item.id, 'levelKr', e.target.value)}
                        style={inputEditStyle}
                      />
                    ) : (
                      <span className="text-xs p-1 block">{item.levelKr}</span>
                    )}
                  </td>
                  <td style={tdBaseStyle}>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={item.levelEn}
                        onChange={(e) => updateItem(item.id, 'levelEn', e.target.value)}
                        style={inputEditStyle}
                      />
                    ) : (
                      <span className="text-xs p-1 block">{item.levelEn}</span>
                    )}
                  </td>
                  {activeCategory === 'S' ? (
                    activeTab === 'P-FMEA' ? (
                      // P-FMEA 심각도: 3개 컬럼
                      <>
                        <td style={tdContentStyle}>
                          <div className="text-[11px] leading-[1.5]">
                            <div className="text-gray-800 mb-1">{(item.yourPlant || '').split('(')[0].trim()}</div>
                            <div className="text-blue-700 text-[10px] italic">
                              {(item.yourPlant || '').includes('(') ? '(' + (item.yourPlant || '').split('(').slice(1).join('(') : ''}
                            </div>
                          </div>
                        </td>
                        <td style={tdContentStyle}>
                          <div className="text-[11px] leading-[1.5]">
                            <div className="text-gray-800 mb-1">{(item.shipToPlant || '').split('(')[0].trim()}</div>
                            <div className="text-blue-700 text-[10px] italic">
                              {(item.shipToPlant || '').includes('(') ? '(' + (item.shipToPlant || '').split('(').slice(1).join('(') : ''}
                            </div>
                          </div>
                        </td>
                        <td style={tdContentStyle}>
                          <div className="text-[11px] leading-[1.5]">
                            <div className="text-gray-800 mb-1">{(item.endUser || '').split('(')[0].trim()}</div>
                            <div className="text-blue-700 text-[10px] italic">
                              {(item.endUser || '').includes('(') ? '(' + (item.endUser || '').split('(').slice(1).join('(') : ''}
                            </div>
                          </div>
                        </td>
                      </>
                    ) : (
                      // D-FMEA 심각도: 1개 컬럼 (endUser 필드에 저장)
                      <td style={tdContentStyle}>
                        <div className="text-[11px] leading-[1.6]">
                          {(item.endUser || '').split('\n').map((line, i) => (
                            <div key={i} style={lineStyle(i !== 0)}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </td>
                    )
                  ) : activeCategory === 'O' ? (
                    activeTab === 'P-FMEA' ? (
                      // P-FMEA 발생도: 3개 컬럼
                      <>
                        {/* 관리유형 - 기준 (노란색 배경) */}
                        <td className="p-1.5 border border-gray-300 align-top bg-amber-50">
                          <div className="text-[11px] leading-[1.6]">
                            {(item.controlType || '').split('\n').map((line, i) => (
                              <div key={i} style={lineStyle(i !== 0)}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                        {/* 예방관리 - 기준 (노란색 배경) */}
                        <td className="p-1.5 border border-gray-300 align-top bg-amber-50">
                          <div className="text-[11px] leading-[1.6]">
                            {(item.preventionControl || '').split('\n').map((line, i) => (
                              <div key={i} style={lineStyle(i % 2 !== 0)}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                        {/* 발생빈도 - 대안1 (빨간색 배경) */}
                        <td className="p-1.5 border border-gray-300 align-top bg-red-50">
                          <div className="text-[11px] leading-[1.6]">
                            {(item.description || '').split('\n').map((line, i) => (
                              <div key={i} className={i === 0 ? 'text-red-800 font-semibold text-[11px]' : 'text-blue-700 font-normal italic text-[10px]'}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                      </>
                    ) : (
                      // D-FMEA 발생도: 2개 컬럼 (criteria + description)
                      <>
                        {/* DFMEA 발생도 기준 */}
                        <td style={tdContentStyle}>
                          <div className="text-[11px] leading-[1.6]">
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
                        <td className="p-1.5 border border-gray-300 align-top bg-red-50">
                          <div className="text-[11px] leading-[1.6]">
                            {(item.description || '').split('\n').map((line, i) => (
                              <div key={i} className={i === 0 ? 'text-red-800 font-semibold text-[11px]' : 'text-blue-700 font-normal italic text-[10px]'}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </td>
                      </>
                    )
                  ) : (
                    <>
                      {/* 검출도 - 등급 1은 셀 병합 */}
                      {item.rating === 1 ? (
                        <td colSpan={2} className="p-1.5 border border-gray-300 align-top text-center">
                          <div className="text-[11px] leading-[1.6]">
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
                            <div className="text-[11px] leading-[1.6]">
                              {(item.criteria || '').split('(').map((part, i) => (
                                <div key={i} style={lineStyle(i !== 0)}>
                                  {i === 0 ? part.trim() : '(' + part}
                                </div>
                              ))}
                            </div>
                          </td>
                          {/* 검출도 - 검출기회 */}
                          <td style={tdContentStyle}>
                            <div className="text-[11px] leading-[1.6]">
                              {(item.description || '').split('(').map((part, i) => (
                                <div key={i} style={lineStyle(i !== 0)}>
                                  {i === 0 ? part.trim() : '(' + part}
                                </div>
                              ))}
                            </div>
                          </td>
                        </>
                      )}
                    </>
                  )}
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* 푸터 */}
        <div className="py-3 px-6 bg-gray-100 border-t border-gray-300 text-[11px] text-gray-600">
          총 {filteredItems.length}개 항목 (Total {filteredItems.length} items) | {activeTab} {categoryLabels[activeCategory].full} 기준표
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

