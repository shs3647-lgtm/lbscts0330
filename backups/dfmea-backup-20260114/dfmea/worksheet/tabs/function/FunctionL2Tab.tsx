/**
 * @file FunctionL2Tab.tsx
 * @description 메인공정(L2) 기능 분석 - 3행 헤더 구조 (L1과 동일한 패턴)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { FunctionTabProps } from './types';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import SpecialCharSelectModal, { SPECIAL_CHAR_DATA } from '@/components/modals/SpecialCharSelectModal';
import {
  specialCharBadgeStyle,
  specialCharIconStyle,
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
      <div onClick={onClick} className="p-1 cursor-pointer text-xs text-gray-400 font-semibold bg-gray-100 h-full flex items-center justify-center whitespace-nowrap">
        - 미지정
      </div>
    );
  }
  
  const bgColor = charData?.color || '#9e9e9e';
  
  const icon = charData?.icon || '';
  
  return (
    <div onClick={onClick} className="py-0.5 px-1 cursor-pointer flex items-center justify-center h-full">
      <span 
        style={specialCharBadgeStyle(bgColor)}
        title={charData?.meaning || value}
      >
        {icon && <span style={specialCharIconStyle}>{icon}</span>}
        {value}
      </span>
    </div>
  );
}

export default function FunctionL2Tab({ state, setState, setDirty, saveToLocalStorage }: FunctionTabProps) {
  const [modal, setModal] = useState<{ type: string; procId: string; funcId?: string; charId?: string; title: string; itemCode: string } | null>(null);
  
  // 특별특성 모달 상태
  const [specialCharModal, setSpecialCharModal] = useState<{ 
    procId: string; 
    funcId: string; 
    charId: string; 
    charName: string;
    currentValue: string;
  } | null>(null);

  // 확정 상태 (state.l2Confirmed 사용)
  const isConfirmed = state.l2Confirmed || false;

  // 플레이스홀더 패턴 체크 함수
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
    let functionCount = 0;   // 메인공정기능 누락
    let charCount = 0;       // 제품특성 누락
    
    state.l2.forEach(proc => {
      // 공정기능 체크
      const funcs = proc.functions || [];
      if (funcs.length === 0) functionCount++;
      funcs.forEach(f => {
        if (isMissing(f.name)) functionCount++;
        // 제품특성 체크
        const chars = f.productChars || [];
        if (chars.length === 0) charCount++;
        chars.forEach(c => {
          if (isMissing(c.name)) charCount++;
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
    setState(prev => ({ ...prev, l2Confirmed: true }));
    saveToLocalStorage?.();
    alert('2L 메인공정 기능분석이 확정되었습니다.');
  }, [missingCount, setState, saveToLocalStorage]);

  // 수정 핸들러
  const handleEdit = useCallback(() => {
    setState(prev => ({ ...prev, l2Confirmed: false }));
    saveToLocalStorage?.(); // 영구 저장
  }, [setState, saveToLocalStorage]);

  // 메인공정 기능 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditFunction = useCallback((procId: string, funcId: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(proc => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: (proc.functions || []).map(f => {
            if (f.id !== funcId) return f;
            return { ...f, name: newValue };
          })
        };
      })
    }));
    setDirty(true);
    saveToLocalStorage?.();
  }, [setState, setDirty, saveToLocalStorage]);

  // 제품특성 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditProductChar = useCallback((procId: string, funcId: string, charId: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      l2: prev.l2.map(proc => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: (proc.functions || []).map(f => {
            if (f.id !== funcId) return f;
            return {
              ...f,
              productChars: (f.productChars || []).map(c => {
                if (c.id !== charId) return c;
                return { ...c, name: newValue };
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
    const { type, procId, funcId } = modal;
    
    // 하위 데이터가 있는 기능 삭제 시 경고
    if (type === 'l2Function') {
      const proc = state.l2.find((p: any) => p.id === procId);
      if (proc) {
        const currentFuncs = proc.functions || [];
        const selectedSet = new Set(selectedValues);
        const funcsToRemove = currentFuncs.filter((f: any) => !selectedSet.has(f.name));
        const funcsWithChildren = funcsToRemove.filter((f: any) => (f.productChars || []).length > 0);
        
        if (funcsWithChildren.length > 0) {
          const childCounts = funcsWithChildren.map((f: any) => 
            `• ${f.name}: 제품특성 ${(f.productChars || []).length}개`
          ).join('\n');
          
          const confirmed = confirm(
            `⚠️ 해제한 기능에 하위 데이터가 있습니다.\n\n` +
            `${childCounts}\n\n` +
            `적용하면 하위 데이터(제품특성)도 함께 삭제됩니다.\n` +
            `정말 적용하시겠습니까?`
          );
          
          if (!confirmed) {
            return; // 적용 취소
          }
        }
      }
    }
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2Function') {
        // 메인공정 기능 저장 (선택된 것만 유지, 나머지 삭제)
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          const currentFuncs = proc.functions || [];
          
          // 기존 funcId가 있으면 해당 기능만 수정
          if (funcId) {
            if (selectedValues.length === 0) {
              // 선택 해제 시 해당 기능 삭제
              return {
                ...proc,
                functions: currentFuncs.filter((f: any) => f.id !== funcId)
              };
            }
            return {
              ...proc,
              functions: currentFuncs.map((f: any) => 
                f.id === funcId 
                  ? { ...f, name: selectedValues[0] || f.name }
                  : f
              )
            };
          }
          
          // [규칙] 새 행은 수동 추가만 허용 - 자동 생성 금지
          // 빈 기능 셀 클릭 시: 첫 번째 선택값만 첫 번째 빈 기능에 적용
          const emptyFunc = currentFuncs.find((f: any) => !f.name || f.name === '');
          
          if (emptyFunc && selectedValues.length > 0) {
            // 빈 기능이 있으면 첫 번째 선택값만 할당 (새 행 생성 안 함)
            return {
              ...proc,
              functions: currentFuncs.map((f: any) => 
                f.id === emptyFunc.id 
                  ? { ...f, name: selectedValues[0] }
                  : f
              )
            };
          }
          
          // 빈 기능이 없으면 기존 기능 유지 (새 행 생성 안 함)
          // 사용자가 "+" 버튼으로 수동 추가해야 함
          return proc;
        });
      } else if (type === 'l2ProductChar') {
        // 제품특성 저장 (특정 기능에 연결)
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            functions: proc.functions.map((f: any) => {
              if (f.id !== funcId) return f;
              const currentChars = f.productChars || [];
              return {
                ...f,
                productChars: selectedValues.map(val => {
                  const existing = currentChars.find((c: any) => c.name === val);
                  return existing || { id: uid(), name: val, specialChar: '' };
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
    const { type, procId, funcId } = modal;
    
    // 하위 데이터 확인 (l2Function 삭제 시)
    if (type === 'l2Function') {
      const proc = state.l2.find((p: any) => p.id === procId);
      if (proc) {
        const funcsToDelete = (proc.functions || []).filter((f: any) => deletedSet.has(f.name));
        const funcsWithChildren = funcsToDelete.filter((f: any) => (f.productChars || []).length > 0);
        
        if (funcsWithChildren.length > 0) {
          const childCounts = funcsWithChildren.map((f: any) => 
            `• ${f.name}: 제품특성 ${(f.productChars || []).length}개`
          ).join('\n');
          
          const confirmed = confirm(
            `⚠️ 선택한 기능에 하위 데이터가 있습니다.\n\n` +
            `${childCounts}\n\n` +
            `삭제하면 하위 데이터(제품특성)도 함께 삭제됩니다.\n` +
            `정말 삭제하시겠습니까?`
          );
          
          if (!confirmed) {
            return; // 삭제 취소
          }
        }
      }
    }
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            functions: proc.functions.filter((f: any) => !deletedSet.has(f.name))
          };
        });
      } else if (type === 'l2ProductChar') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            functions: proc.functions.map((f: any) => {
              if (f.id !== funcId) return f;
              return {
                ...f,
                productChars: (f.productChars || []).filter((c: any) => !deletedSet.has(c.name))
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
    
    const { procId, funcId, charId } = specialCharModal;
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: proc.functions.map((f: any) => {
            if (f.id !== funcId) return f;
            return {
              ...f,
              productChars: (f.productChars || []).map((c: any) => {
                if (c.id !== charId) return c;
                return { ...c, specialChar: symbol };
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

  // 총 행 수 계산
  const getTotalRows = () => {
    if (state.l2.length === 0) return 1;
    return state.l2.reduce((acc, proc) => {
      const funcs = proc.functions || [];
      if (funcs.length === 0) return acc + 1;
      return acc + funcs.reduce((a, f) => a + Math.max(1, (f.productChars || []).length), 0);
    }, 0);
  };

  const totalRows = getTotalRows();

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        <colgroup>
          <col style={colStyle('140px')} />
          <col style={colStyle('280px')} />
          <col style={colStyle('220px')} />
          <col style={colStyle('60px')} />
        </colgroup>
        
        {/* 3행 헤더 구조 */}
        <thead>
          {/* 1행: 단계 구분 */}
          <tr>
            <th style={headerMainRow('#1976d2')}>
              2단계 구조분석
            </th>
            <th colSpan={3} style={headerMainRow('#2e7d32')}>
              <div style={headerFlexContainer}>
                <span>3단계 : 2L 메인공정 기능분석</span>
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
            <th style={headerSubRow('#1976d2')}>
              2. 메인공정명
            </th>
            <th colSpan={3} style={headerSubRow('#388e3c')}>
              2. 메인공정 기능/제품특성
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
              공정NO+공정명
            </th>
            <th style={colHeaderRow('#c8e6c9')}>
              메인공정기능
              {missingCounts.functionCount > 0 && (
                <span style={missingPillInlineStyle}>
                  {missingCounts.functionCount}
                </span>
              )}
            </th>
            <th style={colHeaderRow('#c8e6c9')}>
              제품특성
              {missingCounts.charCount > 0 && (
                <span style={missingPillInlineStyle}>
                  {missingCounts.charCount}
                </span>
              )}
            </th>
            <th style={colHeaderRow('#fff3e0')}>
              특별특성
            </th>
          </tr>
        </thead>
        
        <tbody>
          {state.l2.length === 0 ? (
            <tr style={dataRowStyle('#e8f5e9')}>
              <td style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold })}>
                (구조분석에서 공정 추가)
              </td>
              <td style={dataCellStyle('#e8f5e9', { padding: '0' })}>
                <SelectableCell value="" placeholder="공정기능 선택" bgColor={'#e8f5e9'} onClick={() => {}} />
              </td>
              <td style={dataCellStyle('#e8f5e9', { padding: '0' })}>
                <SelectableCell value="" placeholder="제품특성 선택" bgColor={'#e8f5e9'} onClick={() => {}} />
              </td>
              <td style={dataCellStyle('#fff3e0', { padding: '4px', textAlign: 'center', color: '#999', fontSize: FONT_SIZES.cell })}>
                -
              </td>
            </tr>
          ) : (() => {
            let globalRowIdx = 0;
            return state.l2.map((proc, pIdx) => {
              const funcs = proc.functions || [];
              const procRowSpan = funcs.length === 0 ? 1 : funcs.reduce((a, f) => a + Math.max(1, (f.productChars || []).length), 0);
              
              // 공정에 기능이 없는 경우
              if (funcs.length === 0) {
                const bg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                return (
                  <tr key={proc.id} style={dataRowStyle(bg)}>
                    <td rowSpan={procRowSpan} style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                      {proc.no}. {proc.name}
                    </td>
                    <td style={dataCellStyle(bg, { padding: '0' })}>
                      <SelectableCell value="" placeholder="공정기능 선택" bgColor={bg} onClick={() => setModal({ type: 'l2Function', procId: proc.id, title: '메인공정 기능 선택', itemCode: 'A3' })} />
                    </td>
                    <td style={dataCellStyle(bg, { padding: '0' })}>
                      <SelectableCell value="" placeholder="제품특성 선택" bgColor={bg} onClick={() => {}} />
                    </td>
                    <td style={dataCellStyle('#fff3e0', { padding: '4px', textAlign: 'center', color: '#999', fontSize: FONT_SIZES.cell })}>
                      -
                    </td>
                  </tr>
                );
              }
              
              // 공정에 기능이 있는 경우
              return funcs.map((f, fIdx) => {
                const chars = f.productChars || [];
                const funcRowSpan = Math.max(1, chars.length);
                
                // 기능에 제품특성이 없는 경우
                if (chars.length === 0) {
                  const bg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                  return (
                    <tr key={f.id} style={dataRowStyle(bg)}>
                      {fIdx === 0 && (
                        <td rowSpan={procRowSpan} style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                          {proc.no}. {proc.name}
                        </td>
                      )}
                      <td rowSpan={funcRowSpan} style={dataCellStyle(bg, { padding: '0', verticalAlign: 'middle' })}>
                        <SelectableCell 
                          value={f.name} 
                          placeholder="공정기능" 
                          bgColor={bg} 
                          onClick={() => setModal({ type: 'l2Function', procId: proc.id, title: '메인공정 기능 선택', itemCode: 'A3' })} 
                          onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, f.id, newValue)}
                        />
                      </td>
                      <td style={dataCellStyle(bg, { padding: '0' })}>
                        <SelectableCell value="" placeholder="제품특성 선택" bgColor={bg} onClick={() => setModal({ type: 'l2ProductChar', procId: proc.id, funcId: f.id, title: '제품특성 선택', itemCode: 'A4' })} />
                      </td>
                      <td style={dataCellStyle('#fff3e0', { padding: '4px', textAlign: 'center', color: '#999', fontSize: FONT_SIZES.cell })}>
                        -
                      </td>
                    </tr>
                  );
                }
                
                // 기능에 제품특성이 있는 경우
                return chars.map((c, cIdx) => {
                  const bg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                  return (
                    <tr key={c.id} style={dataRowStyle(bg)}>
                      {fIdx === 0 && cIdx === 0 && (
                        <td rowSpan={procRowSpan} style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                          {proc.no}. {proc.name}
                        </td>
                      )}
                      {cIdx === 0 && (
                        <td rowSpan={funcRowSpan} style={dataCellStyle(bg, { padding: '0', verticalAlign: 'middle' })}>
                          <SelectableCell 
                            value={f.name} 
                            placeholder="공정기능" 
                            bgColor={bg} 
                            onClick={() => setModal({ type: 'l2Function', procId: proc.id, title: '메인공정 기능 선택', itemCode: 'A3' })} 
                            onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, f.id, newValue)}
                          />
                        </td>
                      )}
                      <td style={dataCellStyle(bg, { padding: '0' })}>
                        <SelectableCell 
                          value={c.name} 
                          placeholder="제품특성" 
                          bgColor={bg} 
                          onClick={() => setModal({ type: 'l2ProductChar', procId: proc.id, funcId: f.id, title: '제품특성 선택', itemCode: 'A4' })} 
                          onDoubleClickEdit={(newValue) => handleInlineEditProductChar(proc.id, f.id, c.id, newValue)}
                        />
                      </td>
                      <td style={dataCellStyle(bg, { padding: '0', textAlign: 'center' })}>
                        <SpecialCharBadge 
                          value={(c as any).specialChar || ''} 
                          onClick={() => setSpecialCharModal({ 
                            procId: proc.id, 
                            funcId: f.id, 
                            charId: c.id, 
                            charName: c.name,
                            currentValue: (c as any).specialChar || ''
                          })} 
                        />
                      </td>
                    </tr>
                  );
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
          processName={state.l2.find(p => p.id === modal.procId)?.name}
          processNo={state.l2.find(p => p.id === modal.procId)?.no}
          processList={state.l2.map(p => ({ id: p.id, no: p.no, name: p.name }))}
          onProcessChange={(procId) => {
            const proc = state.l2.find(p => p.id === procId);
            if (proc) setModal(prev => prev ? { ...prev, procId } : null);
          }}
          currentValues={(() => {
            const proc = state.l2.find(p => p.id === modal.procId);
            if (!proc) return [];
            if (modal.type === 'l2Function') return (proc.functions || []).map(f => f.name);
            if (modal.type === 'l2ProductChar') {
              const func = (proc.functions || []).find(f => f.id === modal.funcId);
              return func ? (func.productChars || []).map(c => c.name) : [];
            }
            return [];
          })()}
        />
      )}

      {/* 특별특성 전용 모달 */}
      {specialCharModal && (
        <SpecialCharSelectModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentValue={specialCharModal.currentValue}
          productCharName={specialCharModal.charName}
        />
      )}
    </div>
  );
}
