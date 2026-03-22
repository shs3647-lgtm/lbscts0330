// CODEFREEZE
/**
 * @file SODSelectModal.tsx
 * @description SOD(심각도/발생도/검출도) 선택 모달
 *
 * @version 2.1.0 - 컴팩트 디자인 + 드래그 이동 + 브라우저 전체 높이
 */

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  uid,
} from './SODMasterData';
import { normalizeScope, SCOPE_YP, SCOPE_SP, SCOPE_USER } from '@/lib/fmea/scope-constants';

interface SODSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rating: number, item: SODItem) => void;
  category: 'S' | 'O' | 'D';
  fmeaType?: 'P-FMEA' | 'D-FMEA';
  currentValue?: number;
  /** PFMEA: 'YP' | 'SP' | 'USER', DFMEA: '법규' | '기본' | '보조' | '관능' */
  scope?: string;
  /** 고장영향(FE) 원문 — 심각도 모달에서 참조 표시 */
  feText?: string;
  /** 키워드 매칭 기반 추천 등급 (1~10) */
  recommendedRating?: number;
}

/** 공통 스타일 */
const tw = {
  overlay: 'fixed inset-0 z-[99999]',
  modal: 'bg-white rounded-lg flex flex-col shadow-2xl border border-gray-300',
  header: 'text-white py-1.5 px-4 rounded-t-lg flex justify-between items-center cursor-move select-none',
  closeBtn: 'bg-white/20 border-none text-white w-6 h-6 rounded cursor-pointer text-sm hover:bg-white/30',
  content: 'flex-1 overflow-auto p-1',
  table: 'w-full border-collapse text-[10px]',
  th: 'py-1 px-1 border border-red-900 text-center text-[10px] whitespace-nowrap',
  td: 'py-0.5 px-1 border border-gray-300 cursor-pointer',
  footer: 'py-1 px-3 border-t border-gray-200 bg-gray-100 rounded-b-lg flex justify-between items-center',
  cancelBtn: 'py-1 px-3 bg-gray-500 text-white border-none rounded text-[10px] cursor-pointer hover:bg-gray-600',
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
  isOpen, onClose, onSelect, category, fmeaType = 'P-FMEA', currentValue, scope, feText, recommendedRating
}: SODSelectModalProps) {
  const [items, setItems] = useState<SODItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // 드래그 상태
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({
    dragging: false, startX: 0, startY: 0, origX: 0, origY: 0
  });

  useEffect(() => { setMounted(true); }, []);

  // 모달 열릴 때 중앙 위치 초기화
  useEffect(() => {
    if (isOpen) {
      const w = 600;
      const h = window.innerHeight - 40;
      setPos({ x: Math.round((window.innerWidth - w) / 2), y: 20 });
      setInitialized(true);
    } else {
      setInitialized(false);
    }
  }, [isOpen]);

  // 드래그 핸들러
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.dragging) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 200, d.origX + (e.clientX - d.startX))),
        y: Math.max(0, Math.min(window.innerHeight - 100, d.origY + (e.clientY - d.startY))),
      });
    };
    const onMouseUp = () => { dragRef.current.dragging = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const savedData = localStorage.getItem('sod_master_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setItems(parsed);
      } catch (e) {
        console.error('[SODSelectModal] localStorage 파싱 오류:', e);
        initializeDefaultSODData();
      }
    } else {
      initializeDefaultSODData();
    }
  }, [isOpen]);

  const initializeDefaultSODData = () => {
    const defaultItems: SODItem[] = [
      ...DEFAULT_PFMEA_SEVERITY.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_PFMEA_OCCURRENCE.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_PFMEA_DETECTION.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_DFMEA_SEVERITY.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_DFMEA_OCCURRENCE.map(item => ({ ...item, id: uid() })),
      ...DEFAULT_DFMEA_DETECTION.map(item => ({ ...item, id: uid() })),
    ];

    setItems(defaultItems);
    localStorage.setItem('sod_master_data', JSON.stringify(defaultItems));
  };

  const filteredItems = useMemo(() => {
    const activeStd = (typeof window !== 'undefined')
      ? localStorage.getItem('sod_active_standard') || DEFAULT_STANDARD
      : DEFAULT_STANDARD;
    return items
      .filter(item => (item.standard || DEFAULT_STANDARD) === activeStd && item.fmeaType === fmeaType && item.category === category)
      .sort((a, b) => b.rating - a.rating);
  }, [items, fmeaType, category]);


  const categoryLabels = {
    S: { kr: '심각도', en: 'Severity', full: '심각도(Severity)' },
    O: { kr: '발생도', en: 'Occurrence', full: '발생도(Occurrence)' },
    D: { kr: '검출도', en: 'Detection', full: '검출도(Detection)' },
  };

  const handleSelect = (item: SODItem) => {
    onSelect(item.rating, item);
    onClose();
  };

  if (!mounted || !isOpen || !initialized) return null;

  const scopeNorm = scope ? normalizeScope(scope) : undefined;
  const headerBg =
    scopeNorm === SCOPE_YP || scope === '기본' ? 'bg-blue-600' :
      scopeNorm === SCOPE_SP || scope === '보조' ? 'bg-orange-600' :
        scopeNorm === SCOPE_USER || scope === '관능' ? 'bg-purple-700' :
          scope === '법규' ? 'bg-red-700' :
            categoryColors[category].bg;

  const hasDetectionExamples = SHOW_EXAMPLES_COLUMN && category === 'D' && filteredItems.some(item => item.detectionExamples);
  const modalWidth = category === 'S' ? 1000 : hasDetectionExamples ? 800 : 600;

  const modalContent = (
    <>
      <div
        className={tw.modal}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: modalWidth,
          maxHeight: `calc(100vh - ${pos.y}px - 10px)`,
          zIndex: 99999,
        }}
      >
        {/* 헤더 - 드래그 핸들 */}
        <div className={`${tw.header} ${headerBg}`} onMouseDown={onMouseDown}>
          <span className="text-xs font-bold">
            {category === 'S' ? `[${fmeaType}] ${categoryLabels[category].full}` :
              `${categoryLabels[category].full} 선택`}
            <span className="ml-2 font-normal opacity-80 text-[10px]">
              {fmeaType} | 현재: {currentValue ?? 0}
            </span>
          </span>
          <button onClick={onClose} className={tw.closeBtn}>✕</button>
        </div>

        {/* FE 텍스트 참조 표시 (심각도 모달에서만) */}
        {category === 'S' && feText && (
          <div className="px-3 py-1.5 bg-yellow-50 border-b border-yellow-200 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="font-bold text-yellow-800">고장영향(FE):</span>
              <span className="text-gray-700">{feText.length > 80 ? feText.slice(0, 80) + '...' : feText}</span>
            </div>
            {recommendedRating && (
              <div className="mt-0.5 flex items-center gap-1">
                <span className="bg-blue-600 text-white px-1.5 py-0 rounded text-[9px] font-bold">AI추천 S={recommendedRating}</span>
                <span className="text-gray-500 text-[9px]">키워드 매칭 기반 예비평가 — 기준표 확인 후 선택하세요</span>
              </div>
            )}
          </div>
        )}

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
                  <th className={`${tw.th} w-[40px]`} title="Rating">등급(Rating)</th>
                  <th className={`${tw.th} w-[80px]`} title="Level">레벨(Level)</th>
                  {category === 'S' ? (
                    <>
                      <th className={`${tw.th} bg-red-800`} title="Impact to Your Plant">귀사 공장 영향(YP)<div className="text-[8px] font-normal opacity-80">Impact to Your Plant</div></th>
                      <th className={`${tw.th} bg-red-800`} title="Impact to Ship-to-Plant">고객사 영향(SP)<div className="text-[8px] font-normal opacity-80">Impact to Ship-to-Plant</div></th>
                      <th className={`${tw.th} bg-red-800`} title="Impact to End User">최종사용자 영향(User)<div className="text-[8px] font-normal opacity-80">Impact to End User</div></th>
                    </>
                  ) : category === 'O' ? (
                    fmeaType === 'P-FMEA' ? (
                      <>
                        <th className={`${tw.th} bg-amber-600`} title="Type of Control">관리유형(ToC)</th>
                        <th className={`${tw.th} bg-amber-600`} title="Prevention Controls">예방관리(PC)</th>
                        <th className={`${tw.th} bg-red-800`} title="Occurrence Frequency">발생빈도(Freq.)</th>
                      </>
                    ) : (
                      <>
                        <th className={tw.th} title="DFMEA Occurrence Criteria">DFMEA 발생도(O) 기준</th>
                        <th className={`${tw.th} bg-red-800`}>FMEA 대안1</th>
                      </>
                    )
                  ) : (
                    <>
                      <th className={tw.th} title="Detection Method Maturity">검출방법 성숙도(Maturity)</th>
                      <th className={tw.th} title="Opportunity for Detection">검출기회(Opp.)</th>
                      {filteredItems.some(item => item.detectionExamples) && (
                        <th className={`${tw.th} bg-teal-700`} title="Detection Method Examples">검출방법 사례(Examples)</th>
                      )}
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
                    const cellScope = scope ? normalizeScope(scope) : SCOPE_YP;

                    if (cellScope === SCOPE_YP) {
                      content = item.yourPlant;
                    } else if (cellScope === SCOPE_SP) {
                      content = item.shipToPlant;
                      if (!content) {
                        content = item.yourPlant || item.endUser || item.description;
                      }
                    } else if (cellScope === SCOPE_USER || scope === '법규' || scope === '기본' || scope === '보조' || scope === '관능') {
                      content = item.endUser || item.yourPlant || item.description;
                    } else {
                      content = item.yourPlant || item.endUser || item.description;
                    }
                  }

                  const lineStyle = (isEnglish: boolean) => ({
                    color: isEnglish ? '#1565c0' : '#333',
                    fontStyle: isEnglish ? 'italic' as const : 'normal' as const,
                    fontSize: isEnglish ? '9px' : '10px'
                  });

                  const isRecommended = category === 'S' && recommendedRating === item.rating;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`${getRatingBg(item.rating)} hover:opacity-80 ${isSelected ? 'border-l-4 border-l-blue-600 bg-blue-100' : ''} ${isRecommended ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                    >
                      <td className={`${tw.td} text-center font-bold text-xs`}>
                        {isRecommended && <div className="text-[8px] text-blue-700 font-bold leading-none mb-0.5">추천</div>}
                        {item.rating}
                      </td>
                      <td className={`${tw.td} text-center text-[10px] leading-tight`}>
                        <div>{item.levelKr}</div>
                        <div className="text-[9px] italic text-blue-700">{item.levelEn}</div>
                      </td>
                      {category === 'S' ? (
                        <>
                          <td className={`${tw.td} leading-tight text-[10px] align-top`}>
                            {(item.yourPlant || '').split('\n').map((line, i) => (
                              <div key={i} style={lineStyle(/^[A-Z\[]/.test(line.trim()))}>{line}</div>
                            ))}
                          </td>
                          <td className={`${tw.td} leading-tight text-[10px] align-top`}>
                            {(item.shipToPlant || '').split('\n').map((line, i) => (
                              <div key={i} style={lineStyle(/^[A-Z\[]/.test(line.trim()))}>{line}</div>
                            ))}
                          </td>
                          <td className={`${tw.td} leading-tight text-[10px] align-top`}>
                            {(item.endUser || '').split('\n').map((line, i) => (
                              <div key={i} style={lineStyle(/^[A-Z\[]/.test(line.trim()))}>{line}</div>
                            ))}
                          </td>
                        </>
                      ) : category === 'O' ? (
                        fmeaType === 'P-FMEA' ? (
                          <>
                            <td className="py-0.5 px-1 border border-gray-300 align-top bg-amber-50">
                              <div className="text-[10px] leading-[1.3]">
                                {(item.controlType || '').split('\n').map((line, i) => (
                                  <div key={i} style={lineStyle(i !== 0)}>{line}</div>
                                ))}
                              </div>
                            </td>
                            <td className="py-0.5 px-1 border border-gray-300 align-top bg-amber-50">
                              <div className="text-[10px] leading-[1.3]">
                                {(item.preventionControl || '').split('\n').map((line, i) => (
                                  <div key={i} style={lineStyle(i % 2 !== 0)}>{line}</div>
                                ))}
                              </div>
                            </td>
                            <td className="py-0.5 px-1 border border-gray-300 align-top bg-red-50">
                              <div className="text-[10px] leading-[1.3]">
                                {(item.description || '').split('\n').map((line, i) => (
                                  <div key={i} className={i === 0 ? 'text-red-800 font-semibold text-[10px]' : 'text-blue-700 italic text-[9px]'}>{line}</div>
                                ))}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`${tw.td} align-top`}>
                              <div className="text-[10px] leading-[1.3]">
                                {(item.criteria || '').split('\n').map((line, i) => (
                                  <div key={i} style={lineStyle(i !== 0)}>{line}</div>
                                ))}
                              </div>
                            </td>
                            <td className="py-0.5 px-1 border border-gray-300 align-top bg-red-50">
                              <div className="text-[10px] leading-[1.3]">
                                {(item.description || '').split('\n').map((line, i) => (
                                  <div key={i} className={i === 0 ? 'text-red-800 font-semibold text-[10px]' : 'text-blue-700 italic text-[9px]'}>{line}</div>
                                ))}
                              </div>
                            </td>
                          </>
                        )
                      ) : (
                        <>
                          <td className={`${tw.td} align-top`}>
                            <div className="text-[10px] leading-[1.3]">
                              {(item.criteria || '').split('(').map((part, i) => (
                                <div key={i} style={lineStyle(i !== 0)}>{i === 0 ? part.trim() : '(' + part}</div>
                              ))}
                            </div>
                          </td>
                          <td className={`${tw.td} align-top`}>
                            <div className="text-[10px] leading-[1.3]">
                              {(item.description || '').split('(').map((part, i) => (
                                <div key={i} style={lineStyle(i !== 0)}>{i === 0 ? part.trim() : '(' + part}</div>
                              ))}
                            </div>
                          </td>
                          {hasDetectionExamples && (
                            <td className={`${tw.td} align-top bg-teal-50`}>
                              {item.detectionExamples ? (
                                <div className="text-[9px] leading-[1.3] text-gray-600">
                                  {item.detectionExamples.split('\n').slice(0, 3).map((line, i) => (
                                    <div key={i}><span className="text-teal-600">•</span> {line}</div>
                                  ))}
                                  {item.detectionExamples.split('\n').length > 3 && (
                                    <div className="text-[8px] text-teal-500 italic">+{item.detectionExamples.split('\n').length - 3}건 더</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[9px] text-gray-400 italic">-</div>
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
          )}
        </div>

        {/* 푸터 */}
        <div className={tw.footer}>
          <span className="text-[10px] text-gray-600">
            {filteredItems.length}개 항목
          </span>
          <button onClick={onClose} className={tw.cancelBtn}>
            취소 (Cancel)
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
