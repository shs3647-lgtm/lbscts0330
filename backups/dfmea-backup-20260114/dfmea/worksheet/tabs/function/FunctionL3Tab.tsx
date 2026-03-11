/**
 * @file FunctionL3Tab.tsx
 * @description 작업요소(L3) 기능 분석 - 3행 헤더 구조 (L1과 동일한 패턴)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { FunctionTabProps } from './types';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import SpecialCharSelectModal, { SPECIAL_CHAR_DATA } from '@/components/modals/SpecialCharSelectModal';
import {
  containerStyle,
  tableStyle,
  colStyle,
  headerMainRow,
  headerFlexContainer,
  headerButtonGroup,
  confirmButtonStyle,
  confirmBadgeStyle,
  missingBadgeStyle,
  headerSubRow,
  missingPillStyle,
  missingPillInlineStyle,
  colHeaderRow,
  headerRowBg,
  dataRowStyle,
  dataCellStyle,
  dataCellStyleL3,
  specialCharButtonStyle,
  colHeaderRowL3,
} from './FunctionTabStyles';

// 스타일 함수
const BORDER = '1px solid #b0bec5';
const cellBase: React.CSSProperties = { border: BORDER, padding: '4px 6px', fontSize: FONT_SIZES.cell, verticalAlign: 'middle' };
const headerStyle = (bg: string, color = '#fff'): React.CSSProperties => ({ ...cellBase, background: bg, color, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center' });
const dataCell = (bg: string): React.CSSProperties => ({ ...cellBase, background: bg });

// 특별특성 배지 컴포넌트
function SpecialCharBadge({ value, onClick }: { value: string; onClick: () => void }) {
  const charData = SPECIAL_CHAR_DATA.find(d => d.symbol === value);
  
  if (!value) {
    return (
      <button onClick={onClick} className="w-full py-1 px-2 bg-gray-100 border border-dashed border-gray-400 rounded text-xs text-gray-400 font-semibold cursor-pointer">
        - 미지정
      </button>
    );
  }

  const bgColor = charData?.color || '#e0e0e0';
  
  return (
    <button
      onClick={onClick}
      className="py-1 px-1.5 text-white border-none rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
      style={specialCharButtonStyle(bgColor)}
      title={charData?.meaning || value}
    >
      {value}
    </button>
  );
}

export default function FunctionL3Tab({ state, setState, setDirty, saveToLocalStorage }: FunctionTabProps) {
  const [modal, setModal] = useState<{ 
    type: string; 
    procId: string; 
    l3Id: string; 
    funcId?: string;
    title: string; 
    itemCode: string;
    workElementName?: string;
  } | null>(null);

  // 특별특성 모달 상태
  const [specialCharModal, setSpecialCharModal] = useState<{ 
    procId: string; 
    l3Id: string;
    funcId: string; 
    charId: string; 
  } | null>(null);

  // 확정 상태 (state.l3Confirmed 사용)
  const isConfirmed = state.l3Confirmed || false;

  // 누락 건수 계산 (플레이스홀더 패턴 모두 체크)
  const isMissing = (name: string | undefined) => {
    if (!name) return true;
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === '-') return true;
    if (name.includes('클릭')) return true;
    if (name.includes('추가')) return true;
    if (name.includes('선택')) return true;
    if (name.includes('입력')) return true;
    if (name.includes('필요')) return true;
    return false;
  };

  // 항목별 누락 건수 분리 계산 (특별특성은 누락건 제외)
  const missingCounts = React.useMemo(() => {
    let functionCount = 0;  // 작업요소기능 누락
    let charCount = 0;      // 공정특성 누락
    
    state.l2.forEach(proc => {
      const l3List = proc.l3 || [];
      l3List.forEach(we => {
        // 작업요소 기능 체크
        const funcs = we.functions || [];
        if (funcs.length === 0) functionCount++;
        funcs.forEach(f => {
          if (isMissing(f.name)) functionCount++;
          // 공정특성 체크
          const chars = f.processChars || [];
          if (chars.length === 0) charCount++;
          chars.forEach(c => {
            if (isMissing(c.name)) charCount++;
          });
        });
      });
    });
    return { functionCount, charCount, total: functionCount + charCount };
  }, [state.l2]);
  
  // 총 누락 건수 (기존 호환성)
  const missingCount = missingCounts.total;

  // 확정 핸들러
  const handleConfirm = useCallback(() => {
    if (missingCount > 0) {
      alert(`누락된 항목이 ${missingCount}건 있습니다.\n먼저 입력을 완료해주세요.`);
      return;
    }
    setState(prev => ({ ...prev, l3Confirmed: true }));
    saveToLocalStorage?.();
    alert('3L 작업요소 기능분석이 확정되었습니다.');
  }, [missingCount, setState, saveToLocalStorage]);

  // 수정 핸들러
  const handleEdit = useCallback(() => {
    setState(prev => ({ ...prev, l3Confirmed: false }));
    saveToLocalStorage?.(); // 영구 저장
  }, [setState, saveToLocalStorage]);

  // 작업요소 기능 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditFunction = useCallback((procId: string, l3Id: string, funcId: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(proc => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          l3: proc.l3.map(we => {
            if (we.id !== l3Id) return we;
            return {
              ...we,
              functions: (we.functions || []).map(f => {
                if (f.id !== funcId) return f;
                return { ...f, name: newValue };
              })
            };
          })
        };
      })
    }));
    setDirty(true);
    saveToLocalStorage?.();
  }, [setState, setDirty, saveToLocalStorage]);

  // 공정특성 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditProcessChar = useCallback((procId: string, l3Id: string, funcId: string, charId: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(proc => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          l3: proc.l3.map(we => {
            if (we.id !== l3Id) return we;
            return {
              ...we,
              functions: (we.functions || []).map(f => {
                if (f.id !== funcId) return f;
                return {
                  ...f,
                  processChars: (f.processChars || []).map(c => {
                    if (c.id !== charId) return c;
                    return { ...c, name: newValue };
                  })
                };
              })
            };
          })
        };
      })
    }));
    setDirty(true);
    saveToLocalStorage?.();
  }, [setState, setDirty, saveToLocalStorage]);

  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, procId, l3Id, funcId } = modal;

      if (type === 'l3Function') {
        // [규칙] 새 행은 수동 추가만 허용 - 자동 생성 금지
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              const currentFuncs = we.functions || [];
              
              // funcId가 있으면 해당 기능만 수정
              if (funcId) {
                return {
                  ...we,
                  functions: currentFuncs.map((f: any) => 
                    f.id === funcId 
                      ? { ...f, name: selectedValues[0] || f.name }
                      : f
                  )
                };
              }
              
              // 빈 기능 셀 클릭 시: 첫 번째 선택값만 첫 번째 빈 기능에 적용
              const emptyFunc = currentFuncs.find((f: any) => !f.name || f.name === '' || f.name.includes('클릭하여'));
              
              if (emptyFunc && selectedValues.length > 0) {
                return {
                  ...we,
                  functions: currentFuncs.map((f: any) => 
                    f.id === emptyFunc.id 
                      ? { ...f, name: selectedValues[0] }
                      : f
                  )
                };
              }
              
              // 빈 기능이 없으면 기존 유지 (새 행 생성 안 함)
              return we;
            })
          };
        });
      } else if (type === 'l3ProcessChar') {
        // 공정특성 저장 (특정 기능에 연결)
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              return {
                ...we,
                functions: (we.functions || []).map((f: any) => {
                  if (f.id !== funcId) return f;
                  const currentChars = f.processChars || [];
                  return {
                    ...f,
                    processChars: selectedValues.map(val => {
                      const existing = currentChars.find((c: any) => c.name === val);
                      return existing || { id: uid(), name: val };
                    })
                  };
                })
              };
            })
          };
        });
      }
      
      return newState;
    });
    
    setDirty(true);
    setModal(null);
    saveToLocalStorage?.(); // 영구 저장
  }, [modal, setState, setDirty, saveToLocalStorage]);

  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    const deletedSet = new Set(deletedValues);
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, procId, l3Id, funcId } = modal;

      if (type === 'l3Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              return {
                ...we,
                functions: (we.functions || []).filter((f: any) => !deletedSet.has(f.name))
              };
            })
          };
        });
      } else if (type === 'l3ProcessChar') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              return {
                ...we,
                functions: (we.functions || []).map((f: any) => {
                  if (f.id !== funcId) return f;
                  return {
                    ...f,
                    processChars: (f.processChars || []).filter((c: any) => !deletedSet.has(c.name))
                  };
                })
              };
            })
          };
        });
      }
      
      return newState;
    });
    
    setDirty(true);
    if (saveToLocalStorage) setTimeout(() => saveToLocalStorage(), 100);
  }, [modal, setState, setDirty, saveToLocalStorage]);

  // 특별특성 선택 핸들러
  const handleSpecialCharSelect = useCallback((symbol: string) => {
    if (!specialCharModal) return;
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { procId, l3Id, funcId, charId } = specialCharModal;
      
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          l3: (proc.l3 || []).map((we: any) => {
            if (we.id !== l3Id) return we;
            return {
              ...we,
              functions: (we.functions || []).map((f: any) => {
                if (f.id !== funcId) return f;
                return {
                  ...f,
                  processChars: (f.processChars || []).map((c: any) => {
                    if (c.id !== charId) return c;
                    return { ...c, specialChar: symbol };
                  })
                };
              })
            };
          })
        };
      });
      
      return newState;
    });
    
    setDirty(true);
    setSpecialCharModal(null);
    if (saveToLocalStorage) setTimeout(() => saveToLocalStorage(), 100);
  }, [specialCharModal, setState, setDirty, saveToLocalStorage]);

  // 공정의 총 행 수 계산
  const getProcRowSpan = (proc: any) => {
    const l3List = proc.l3 || [];
    if (l3List.length === 0) return 1;
    return l3List.reduce((acc: number, we: any) => {
      const funcs = we.functions || [];
      if (funcs.length === 0) return acc + 1;
      return acc + funcs.reduce((a: number, f: any) => a + Math.max(1, (f.processChars || []).length), 0);
    }, 0);
  };

  // 작업요소의 총 행 수 계산
  const getWeRowSpan = (we: any) => {
    const funcs = we.functions || [];
    if (funcs.length === 0) return 1;
    return funcs.reduce((a: number, f: any) => a + Math.max(1, (f.processChars || []).length), 0);
  };

  const hasAnyL3 = state.l2.some(p => (p.l3 || []).length > 0);

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <colgroup>
          <col style={colStyle('120px')} />
          <col style={colStyle('50px')} />
          <col style={colStyle('140px')} />
          <col style={colStyle('180px')} />
          <col style={colStyle('180px')} />
          <col style={colStyle('80px')} />
        </colgroup>
        
        {/* 3행 헤더 구조 */}
        <thead>
          {/* 1행: 단계 구분 */}
          <tr>
            <th colSpan={3} style={headerMainRow('#1976d2')}>
              2단계 구조분석
            </th>
            <th colSpan={3} style={headerMainRow('#388e3c')}>
              <div style={headerFlexContainer}>
                <span>3단계 : 3L 작업요소 기능분석</span>
                <div style={headerButtonGroup}>
                  {isConfirmed ? (
                    <span style={confirmBadgeStyle}>
                      ✓ 확정됨
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirm}
                      style={confirmButtonStyle('#4caf50')}
                    >
                      확정
                    </button>
                  )}
                  <span style={missingBadgeStyle(missingCount > 0)}>
                    누락 {missingCount}건
                  </span>
                  {isConfirmed && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      style={confirmButtonStyle('#ff9800')}
                    >
                      수정
                    </button>
                  )}
                </div>
              </div>
            </th>
          </tr>
          
          {/* 2행: 항목 그룹 */}
          <tr>
            <th colSpan={3} style={headerSubRow('#1976d2')}>
              3. 작업요소 (4M)
            </th>
            <th colSpan={3} style={headerSubRow('#388e3c')}>
              3. 작업요소 기능/공정특성/특별특성
              {missingCount > 0 && (
                <span style={missingPillStyle}>
                  누락 {missingCount}건
                </span>
              )}
            </th>
          </tr>
          
          {/* 3행: 세부 컬럼 */}
          <tr style={headerRowBg}>
            <th style={colHeaderRow('#e3f2fd')}>
              소속 공정
            </th>
            <th style={colHeaderRow('#e3f2fd')}>
              4M
            </th>
            <th style={colHeaderRow('#e3f2fd')}>
              작업요소
            </th>
            <th style={colHeaderRow('#c8e6c9')}>
              작업요소기능
              {missingCounts.functionCount > 0 && (
                <span style={missingPillInlineStyle}>
                  {missingCounts.functionCount}
                </span>
              )}
            </th>
            <th style={colHeaderRowL3('#c8e6c9', { borderRight: '3px solid #f57c00' })}>
              공정특성
              {missingCounts.charCount > 0 && (
                <span style={missingPillInlineStyle}>
                  {missingCounts.charCount}
                </span>
              )}
            </th>
            <th style={colHeaderRowL3('#f57c00', { borderLeft: 'none', color: 'white', textAlign: 'center' })}>
              특별특성
            </th>
          </tr>
        </thead>
        
        <tbody>
          {!hasAnyL3 ? (
            <tr style={dataRowStyle('#e8f5e9')}>
              <td colSpan={3} style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontSize: FONT_SIZES.header1, color: '#666' })}>
                (구조분석에서 작업요소 추가)
              </td>
              <td style={dataCellStyle('#e8f5e9', { padding: '0' })}>
                <SelectableCell value="" placeholder="작업요소기능 선택" bgColor={'#e8f5e9'} onClick={() => {}} />
              </td>
              <td style={dataCellStyle('#e8f5e9', { padding: '0', borderRight: `3px solid ${'#f57c00'}` })}>
                <SelectableCell value="" placeholder="공정특성 선택" bgColor={'#e8f5e9'} onClick={() => {}} />
              </td>
              <td style={dataCellStyle('#fff3e0', { padding: '4px', textAlign: 'center', borderLeft: 'none' })}>
                <SpecialCharBadge value="" onClick={() => {}} />
              </td>
            </tr>
          ) : (() => {
            let globalRowIdx = 0;
            return state.l2.flatMap((proc) => {
              const l3List = proc.l3 || [];
              if (l3List.length === 0) return [];
              
              const procRowSpan = getProcRowSpan(proc);
              let isFirstProcRow = true;
              
              return l3List.flatMap((we, weIdx) => {
                const funcs = we.functions || [];
                const weRowSpan = getWeRowSpan(we);
                
                // 작업요소에 기능이 없는 경우
                if (funcs.length === 0) {
                  const zebraBg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                  const row = (
                    <tr key={we.id} style={dataRowStyle(zebraBg)}>
                      {isFirstProcRow && (
                        <td rowSpan={procRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '8px', textAlign: 'center', fontSize: FONT_SIZES.cell, fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                          {proc.no}. {proc.name}
                        </td>
                      )}
                      <td rowSpan={weRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '4px', textAlign: 'center', fontSize: FONT_SIZES.cell, fontWeight: 500, verticalAlign: 'middle' })}>
                        {we.m4}
                      </td>
                      <td rowSpan={weRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '8px', fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.header1, verticalAlign: 'middle' })}>
                        {we.name}
                      </td>
                      <td style={dataCellStyleL3(zebraBg, { padding: '0' })}>
                        <SelectableCell value="" placeholder="작업요소기능 선택" bgColor={zebraBg} onClick={() => setModal({ type: 'l3Function', procId: proc.id, l3Id: we.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name })} />
                      </td>
                      <td style={dataCellStyleL3(zebraBg, { padding: '0', borderRight: `3px solid ${'#f57c00'}` })}>
                        <SelectableCell value="" placeholder="공정특성 선택" bgColor={zebraBg} onClick={() => {}} />
                      </td>
                      <td style={dataCellStyleL3('#fff3e0', { padding: '4px', textAlign: 'center', borderLeft: 'none' })}>
                        <SpecialCharBadge value="" onClick={() => {}} />
                      </td>
                    </tr>
                  );
                  isFirstProcRow = false;
                  return [row];
                }
                
                // 작업요소에 기능이 있는 경우
                return funcs.flatMap((f, fIdx) => {
                  const chars = f.processChars || [];
                  const funcRowSpan = Math.max(1, chars.length);
                  
                  // 기능에 공정특성이 없는 경우
                  if (chars.length === 0) {
                    const zebraBg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                    const row = (
                      <tr key={f.id} style={dataRowStyle(zebraBg)}>
                        {isFirstProcRow && (
                          <td rowSpan={procRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '8px', textAlign: 'center', fontSize: FONT_SIZES.cell, fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                            {proc.no}. {proc.name}
                          </td>
                        )}
                        {fIdx === 0 && (
                          <>
                            <td rowSpan={weRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '4px', textAlign: 'center', fontSize: FONT_SIZES.cell, fontWeight: 500, verticalAlign: 'middle' })}>
                              {we.m4}
                            </td>
                            <td rowSpan={weRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '8px', fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.header1, verticalAlign: 'middle' })}>
                              {we.name}
                            </td>
                          </>
                        )}
                        <td rowSpan={funcRowSpan} style={dataCellStyleL3(zebraBg, { padding: '0', verticalAlign: 'middle' })}>
                          <SelectableCell 
                            value={f.name} 
                            placeholder="작업요소기능" 
                            bgColor={zebraBg} 
                            onClick={() => setModal({ type: 'l3Function', procId: proc.id, l3Id: we.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name })} 
                            onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, we.id, f.id, newValue)}
                          />
                        </td>
                        <td style={dataCellStyleL3(zebraBg, { padding: '0', borderRight: `3px solid ${'#f57c00'}` })}>
                          <SelectableCell value="" placeholder="공정특성 선택" bgColor={zebraBg} onClick={() => setModal({ type: 'l3ProcessChar', procId: proc.id, l3Id: we.id, funcId: f.id, title: '공정특성 선택', itemCode: 'B3', workElementName: we.name })} />
                        </td>
                        <td style={dataCellStyleL3('#fff3e0', { padding: '4px', textAlign: 'center', borderLeft: 'none' })}>
                          <SpecialCharBadge value="" onClick={() => {}} />
                        </td>
                      </tr>
                    );
                    isFirstProcRow = false;
                    return [row];
                  }
                  
                  // 기능에 공정특성이 있는 경우
                  return chars.map((c, cIdx) => {
                    const zebraBg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                    const row = (
                      <tr key={c.id} style={dataRowStyle(zebraBg)}>
                        {isFirstProcRow && (
                          <td rowSpan={procRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '8px', textAlign: 'center', fontSize: FONT_SIZES.cell, fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                            {proc.no}. {proc.name}
                          </td>
                        )}
                        {fIdx === 0 && cIdx === 0 && (
                          <>
                            <td rowSpan={weRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '4px', textAlign: 'center', fontSize: FONT_SIZES.cell, fontWeight: 500, verticalAlign: 'middle' })}>
                              {we.m4}
                            </td>
                            <td rowSpan={weRowSpan} style={dataCellStyleL3('#e3f2fd', { padding: '8px', fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.header1, verticalAlign: 'middle' })}>
                              {we.name}
                            </td>
                          </>
                        )}
                        {cIdx === 0 && (
                          <td rowSpan={funcRowSpan} style={dataCellStyleL3(zebraBg, { padding: '0', verticalAlign: 'middle' })}>
                            <SelectableCell 
                              value={f.name} 
                              placeholder="작업요소기능" 
                              bgColor={zebraBg} 
                              onClick={() => setModal({ type: 'l3Function', procId: proc.id, l3Id: we.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name })} 
                              onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, we.id, f.id, newValue)}
                            />
                          </td>
                        )}
                        <td style={dataCellStyleL3(zebraBg, { padding: '0', borderRight: `3px solid ${'#f57c00'}` })}>
                          <SelectableCell 
                            value={c.name} 
                            placeholder="공정특성" 
                            bgColor={zebraBg} 
                            onClick={() => setModal({ type: 'l3ProcessChar', procId: proc.id, l3Id: we.id, funcId: f.id, title: '공정특성 선택', itemCode: 'B3', workElementName: we.name })} 
                            onDoubleClickEdit={(newValue) => handleInlineEditProcessChar(proc.id, we.id, f.id, c.id, newValue)}
                          />
                        </td>
                        <td style={dataCellStyleL3('#fff3e0', { padding: '4px', textAlign: 'center', borderLeft: 'none' })}>
                          <SpecialCharBadge 
                            value={c.specialChar || ''} 
                            onClick={() => setSpecialCharModal({ procId: proc.id, l3Id: we.id, funcId: f.id, charId: c.id })} 
                          />
                        </td>
                      </tr>
                    );
                    isFirstProcRow = false;
                    return row;
                  });
                });
              });
            });
          })()}
        </tbody>
      </table>

      {modal && (
        <DataSelectModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          title={modal.title}
          itemCode={modal.itemCode}
          singleSelect={false}
          workElementName={modal.workElementName}
          processName={state.l2.find(p => p.id === modal.procId)?.name}
          processNo={state.l2.find(p => p.id === modal.procId)?.no}
          processList={state.l2.map(p => ({ id: p.id, no: p.no, name: p.name }))}
          onProcessChange={(procId) => {
            setModal(prev => prev ? { ...prev, procId } : null);
          }}
          currentValues={(() => {
            const proc = state.l2.find(p => p.id === modal.procId);
            if (!proc) return [];
            const we = (proc.l3 || []).find(w => w.id === modal.l3Id);
            if (!we) return [];
            if (modal.type === 'l3Function') return (we.functions || []).map(f => f.name);
            if (modal.type === 'l3ProcessChar') {
              const func = (we.functions || []).find(f => f.id === modal.funcId);
              return func ? (func.processChars || []).map(c => c.name) : [];
            }
            return [];
          })()}
        />
      )}

      {/* 특별특성 선택 모달 */}
      {specialCharModal && (
        <SpecialCharSelectModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentValue={(() => {
            const proc = state.l2.find(p => p.id === specialCharModal.procId);
            if (!proc) return '';
            const we = (proc.l3 || []).find(w => w.id === specialCharModal.l3Id);
            if (!we) return '';
            const func = (we.functions || []).find(f => f.id === specialCharModal.funcId);
            if (!func) return '';
            const char = (func.processChars || []).find(c => c.id === specialCharModal.charId);
            return char?.specialChar || '';
          })()}
          productCharName={(() => {
            const proc = state.l2.find(p => p.id === specialCharModal.procId);
            if (!proc) return '';
            const we = (proc.l3 || []).find(w => w.id === specialCharModal.l3Id);
            if (!we) return '';
            const func = (we.functions || []).find(f => f.id === specialCharModal.funcId);
            if (!func) return '';
            const char = (func.processChars || []).find(c => c.id === specialCharModal.charId);
            return char?.name || '';
          })()}
        />
      )}
    </div>
  );
}
