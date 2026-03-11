/**
 * @file SODSelectModal.tsx
 * @description SOD(심각도/발생도/검출도) 선택 모달
 * 
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

interface SODSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rating: number, item: SODItem) => void;
  category: 'S' | 'O' | 'D';
  fmeaType?: 'P-FMEA' | 'D-FMEA';
  currentValue?: number;
  scope?: 'Your Plant' | 'Ship to Plant' | 'User';
}

/** 공통 스타일 */
const tw = {
  overlay: 'fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center',
  modal: 'bg-white rounded-xl w-[800px] max-w-[95%] max-h-[80vh] flex flex-col shadow-2xl',
  header: 'text-white py-4 px-5 rounded-t-xl flex justify-between items-center',
  closeBtn: 'bg-white/20 border-none text-white w-7 h-7 rounded cursor-pointer text-base hover:bg-white/30',
  content: 'flex-1 overflow-auto p-3',
  table: 'w-full border-collapse text-[11px]',
  th: 'py-2 px-1.5 border border-red-900 text-center',
  td: 'py-2 px-1.5 border border-gray-300 cursor-pointer',
  footer: 'p-3 border-t border-gray-200 bg-gray-100 rounded-b-xl flex justify-between items-center',
  cancelBtn: 'py-1.5 px-4 bg-gray-500 text-white border-none rounded text-xs cursor-pointer hover:bg-gray-600',
  empty: 'text-center py-10 text-gray-500',
};

/** 카테고리별 색상 */
const categoryColors = {
  S: { bg: 'bg-red-700', color: '#c62828' },
  O: { bg: 'bg-blue-700', color: '#1565c0' },
  D: { bg: 'bg-green-700', color: '#2e7d32' },
};

/** 등급별 배경색 클래스 */
const getRatingBg = (rating: number): string => {
  if (rating >= 9) return 'bg-red-400 text-white';
  if (rating >= 7) return 'bg-orange-200';
  if (rating >= 5) return 'bg-yellow-200';
  return 'bg-green-200';
};

export default function SODSelectModal({
  isOpen, onClose, onSelect, category, fmeaType = 'P-FMEA', currentValue, scope
}: SODSelectModalProps) {
  const [items, setItems] = useState<SODItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    
    // ✅ localStorage에서 데이터 로드, 없으면 SODMasterData의 기본 데이터 사용
    const savedData = localStorage.getItem('sod_master_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        console.log('[SODSelectModal] localStorage 데이터 로드:', parsed.length, '개');
        setItems(parsed);
      } catch (e) {
        console.error('[SODSelectModal] localStorage 파싱 오류:', e);
        // 파싱 오류 시 기본 데이터 사용
        initializeDefaultSODData();
      }
    } else {
      // localStorage에 데이터가 없으면 기본 데이터 초기화
      initializeDefaultSODData();
    }
  }, [isOpen]);

  const initializeDefaultSODData = () => {
    // ✅ SODMasterData.ts의 기본 데이터 사용
    const defaultItems: SODItem[] = [
      ...DEFAULT_PFMEA_SEVERITY.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_PFMEA_OCCURRENCE.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_PFMEA_DETECTION.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_DFMEA_SEVERITY.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_DFMEA_OCCURRENCE.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_DFMEA_DETECTION.map(item => ({ ...item, id: uid() })),
    ];
    
    console.log('[SODSelectModal] 기본 데이터 초기화:', defaultItems.length, '개');
    setItems(defaultItems);
    localStorage.setItem('sod_master_data', JSON.stringify(defaultItems));
  };

  const filteredItems = useMemo(() => {
    return items
      .filter(item => item.fmeaType === fmeaType && item.category === category)
      .sort((a, b) => b.rating - a.rating);
  }, [items, fmeaType, category]);

  // ✅ 디버깅: scope 값 확인 (강화)
  useEffect(() => {
    if (isOpen) {
      console.log('[SODSelectModal] 모달 열림:', { 
        scope, 
        category, 
        fmeaType, 
        currentValue,
        scopeType: typeof scope,
        scopeValue: scope === 'Your Plant' ? 'YP' : scope === 'Ship to Plant' ? 'SP' : scope === 'User' ? 'User' : '없음'
      });
      
      // ✅ scope가 없으면 경고
      if (!scope) {
        console.warn('[SODSelectModal] ⚠️ scope가 전달되지 않았습니다!');
      }
    }
  }, [isOpen, scope, category, fmeaType, currentValue ?? undefined]);

  const categoryLabels = {
    S: { kr: '심각도', en: 'Severity', full: '심각도(Severity)' },
    O: { kr: '발생도', en: 'Occurrence', full: '발생도(Occurrence)' },
    D: { kr: '검출도', en: 'Detection', full: '검출도(Detection)' },
  };

  const handleSelect = (item: SODItem) => {
    onSelect(item.rating, item);
    onClose();
  };

  if (!mounted || !isOpen) return null;

  const headerBg = scope === 'Your Plant' ? 'bg-blue-600' : scope === 'Ship to Plant' ? 'bg-orange-600' : scope === 'User' ? 'bg-purple-700' : categoryColors[category].bg;

  const modalContent = (
    <div className={tw.overlay} onClick={onClose}>
      <div className={tw.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={`${tw.header} ${headerBg}`}>
          <div>
            <h3 className="m-0 text-base font-bold">
              {scope === 'Your Plant' ? 'YOUR PLANT 심각도 기준' : 
               scope === 'Ship to Plant' ? 'SHIP TO PLANT 심각도 기준' : 
               scope === 'User' ? 'USER 심각도 기준' : 
               `${categoryLabels[category].full} 선택`}
            </h3>
            <p className="mt-1 mb-0 text-[11px] opacity-90">
              {fmeaType} | 현재 값: {currentValue ?? '미선택'}
              {scope && ` | 구분: ${scope === 'Your Plant' ? 'YP (Your Plant)' : scope === 'Ship to Plant' ? 'SP (Ship to Plant)' : 'User'}`}
            </p>
          </div>
          <button onClick={onClose} className={tw.closeBtn}>✕</button>
        </div>

        {/* 테이블 */}
        <div className={tw.content}>
          {filteredItems.length === 0 ? (
            <div className={tw.empty}>
              <p>등록된 {categoryLabels[category].full} 기준이 없습니다.</p>
              <p className="text-xs">No {categoryLabels[category].en} criteria registered.</p>
              <p className="text-xs mt-2">메뉴바의 📊SOD 버튼에서 등록해주세요.</p>
            </div>
          ) : (
            <table className={tw.table}>
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className={`${tw.th} w-[45px]`}>등급<br/><span className="text-[9px] opacity-80">Rating</span></th>
                  <th className={`${tw.th} w-[70px]`}>레벨(한글)<br/><span className="text-[9px] opacity-80">Level(KR)</span></th>
                  <th className={`${tw.th} w-[70px]`}>레벨(영문)<br/><span className="text-[9px] opacity-80">Level(EN)</span></th>
                  {category === 'S' ? (
                    <th className={tw.th}>
                      {scope === 'Your Plant' ? 'YOUR PLANT 심각도 기준' : 
                       scope === 'Ship to Plant' ? 'SHIP TO PLANT 심각도 기준' : 
                       scope === 'User' ? 'USER 심각도 기준' : 
                       '설명'}
                      <br/><span className="text-[9px] opacity-80">
                        {scope === 'Your Plant' ? 'Your Plant Severity Criteria' : 
                         scope === 'Ship to Plant' ? 'Ship to Plant Severity Criteria' : 
                         scope === 'User' ? 'User Severity Criteria' : 
                         'Description'}
                      </span>
                    </th>
                  ) : category === 'O' ? (
                    fmeaType === 'P-FMEA' ? (
                      <>
                        <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-amber-600 text-white">
                          관리유형<br/><span className="text-[9px] opacity-90">Type of Control</span>
                        </th>
                        <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-amber-600 text-white">
                          예방관리<br/><span className="text-[9px] opacity-90">Prevention Controls</span>
                        </th>
                        <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-red-800 text-white">
                          FMEA 대안1 발생빈도<br/><span className="text-[9px] opacity-90">Incidents per 1,000 items</span>
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                          DFMEA 발생도 기준<br/><span className="text-[9px] opacity-90">DFMEA Occurrence Criteria</span>
                        </th>
                        <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center bg-red-800 text-white">
                          FMEA 대안1<br/><span className="text-[9px] opacity-90">Incidents per 1,000 item/vehicles</span>
                        </th>
                      </>
                    )
                  ) : (
                    <>
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                        검출방법 성숙도<br/><span className="text-[9px] opacity-90">Detection Method Maturity</span>
                      </th>
                      <th className="p-2.5 border border-gray-300 whitespace-nowrap text-center">
                        검출기회<br/><span className="text-[9px] opacity-90">Opportunity for Detection</span>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = currentValue === item.rating;
                  
                  // ✅ scope에 따라 올바른 필드 선택 (명시적 체크)
                  let content: string | undefined = '';
                  if (category === 'S') {
                    // 축약형(YP, SP) 또는 전체 이름 모두 처리
                    const scopeStr = scope as string;
                    const normalizedScope =
                      scopeStr === 'YP' || scopeStr === 'Your Plant' ? 'Your Plant' :
                      scopeStr === 'SP' || scopeStr === 'Ship to Plant' ? 'Ship to Plant' :
                      scopeStr === 'User' || scopeStr === 'End User' ? 'User' : scope;
                    
                    if (normalizedScope === 'Your Plant') {
                      content = item.yourPlant;
                    } else if (normalizedScope === 'Ship to Plant') {
                      content = item.shipToPlant;
                      if (!content) {
                        content = item.yourPlant || item.endUser || item.description;
                      }
                    } else if (normalizedScope === 'User') {
                      content = item.endUser;
                    } else {
                      content = item.yourPlant || item.endUser || item.description;
                    }
                  }
                  
                  const lineStyle = (isEnglish: boolean) => ({
                    color: isEnglish ? '#1565c0' : '#333',
                    fontStyle: isEnglish ? 'italic' : 'normal',
                    fontSize: isEnglish ? '10px' : '11px'
                  });
                  
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => handleSelect(item)}
                      className={`${getRatingBg(item.rating)} hover:opacity-80 ${isSelected ? 'border-l-4 border-l-blue-600 bg-blue-100' : ''}`}
                    >
                      <td className={`${tw.td} text-center font-bold text-sm`}>{item.rating}</td>
                      <td className={`${tw.td} text-center`}>{item.levelKr}</td>
                      <td className={`${tw.td} text-center`}>{item.levelEn}</td>
                      {category === 'S' ? (
                        <td className={`${tw.td} leading-relaxed`}>
                          <div className="font-medium">{content}</div>
                          {content && (
                            <div className={`text-[10px] mt-0.5 italic ${item.rating >= 9 ? 'text-white/80' : 'text-gray-600'}`}>
                              {scope === 'Your Plant' && item.shipToPlant && `(고객사: ${item.shipToPlant?.slice(0, 30)}...)`}
                              {scope === 'Ship to Plant' && item.yourPlant && `(귀사: ${item.yourPlant?.slice(0, 30)}...)`}
                              {scope === 'User' && item.yourPlant && `(귀사: ${item.yourPlant?.slice(0, 30)}...)`}
                            </div>
                          )}
                        </td>
                      ) : category === 'O' ? (
                        fmeaType === 'P-FMEA' ? (
                          <>
                            <td className="p-1.5 border border-gray-300 align-top bg-amber-50">
                              <div className="text-[11px] leading-[1.6]">
                                {(item.controlType || '').split('\n').map((line, i) => (
                                  <div key={i} style={lineStyle(i !== 0)}>
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-1.5 border border-gray-300 align-top bg-amber-50">
                              <div className="text-[11px] leading-[1.6]">
                                {(item.preventionControl || '').split('\n').map((line, i) => (
                                  <div key={i} style={lineStyle(i % 2 !== 0)}>
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </td>
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
                          <>
                            <td className={`${tw.td} align-top`}>
                              <div className="text-[11px] leading-[1.6]">
                                {(item.criteria || '').split('\n').map((line, i) => (
                                  <div key={i} style={lineStyle(i !== 0)}>
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </td>
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
                          <td className={`${tw.td} align-top`}>
                            <div className="text-[11px] leading-[1.6]">
                              {(item.criteria || '').split('(').map((part, i) => (
                                <div key={i} style={lineStyle(i !== 0)}>
                                  {i === 0 ? part.trim() : '(' + part}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className={`${tw.td} align-top`}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 푸터 */}
        <div className={tw.footer}>
          <span className="text-[11px] text-gray-600">
            {filteredItems.length}개 항목 ({filteredItems.length} items)
          </span>
          <button onClick={onClose} className={tw.cancelBtn}>
            취소 (Cancel)
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
