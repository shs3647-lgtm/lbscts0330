/**
 * @file FunctionL1Tab.tsx
 * @description 완제품(L1) 기능 분석 - 3행 헤더 구조 (구조분석 + 기능분석)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { FunctionTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
import {
  containerStyle,
  tableStyle,
  colStyle,
  headerMainRow,
  headerSubRow,
  missingPillStyle,
  missingPillInlineStyle,
  headerRowBg,
  dataRowStyle,
  dataCellStyle,
  headerMainRowL1,
  headerFlexContainerL1,
  headerButtonGroupL1,
  confirmButtonStyleL1,
  missingBadgeStyleL1,
  headerFlexSpan,
  colHeaderRowL1,
} from './FunctionTabStyles';

// 구분(Type)별 색상 정의
const TYPE_COLORS: Record<string, { bg: string; light: string; text: string }> = {
  'Your Plant': { bg: '#1976d2', light: '#bbdefb', text: '#0d47a1' },
  'Ship to Plant': { bg: '#f57c00', light: '#ffe0b2', text: '#e65100' },
  'User': { bg: '#7b1fa2', light: '#e1bee7', text: '#4a148c' },
};

const getTypeColor = (typeName: string) => TYPE_COLORS[typeName] || { bg: '#388e3c', light: '#c8e6c9', text: '#1b5e20' };

// 스타일 함수
const BORDER = '1px solid #b0bec5';
const cellBase: React.CSSProperties = { border: BORDER, padding: '4px 6px', fontSize: FONT_SIZES.cell, verticalAlign: 'middle' };
const headerStyle = (bg: string, color = '#fff'): React.CSSProperties => ({ ...cellBase, background: bg, color, fontWeight: FONT_WEIGHTS.bold, textAlign: 'center' });
const dataCell = (bg: string): React.CSSProperties => ({ ...cellBase, background: bg });

export default function FunctionL1Tab({ state, setState, setDirty, saveToLocalStorage }: FunctionTabProps) {
  const [modal, setModal] = useState<{ type: string; id: string; title: string; itemCode: string; parentFunction?: string; parentCategory?: string } | null>(null);
  
  // 확정 상태는 state에서 관리 (localStorage에 저장됨)
  const isConfirmed = (state as any).l1Confirmed || false;

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

  // 항목별 누락 건수 분리 계산
  const missingCounts = React.useMemo(() => {
    let functionCount = 0;     // 완제품기능 누락
    let requirementCount = 0;  // 요구사항 누락
    
    // 구분이 없으면 누락
    if (state.l1.types.length === 0) {
      functionCount += 1;
    }
    state.l1.types.forEach(t => {
      // 기능이 없으면 누락
      if (t.functions.length === 0) {
        functionCount += 1;
      }
      t.functions.forEach(f => {
        // 기능 이름 체크
        if (isMissing(f.name)) functionCount++;
        // 요구사항이 없으면 누락
        if (!f.requirements || f.requirements.length === 0) {
          requirementCount += 1;
        }
        // 요구사항 이름 체크
        (f.requirements || []).forEach(r => {
          if (isMissing(r.name)) requirementCount++;
        });
      });
    });
    return { functionCount, requirementCount, total: functionCount + requirementCount };
  }, [state.l1.types]);
  
  // 총 누락 건수 (기존 호환성)
  const missingCount = missingCounts.total;

  // 확정 핸들러
  const handleConfirm = () => {
    if (missingCount > 0) {
      alert(`누락된 항목이 ${missingCount}건 있습니다.\n모든 항목을 입력 후 확정해 주세요.`);
      return;
    }
    setState((prev: any) => ({ ...prev, l1Confirmed: true }));
    setDirty(true);
    saveToLocalStorage?.(); // 영구 저장
    alert('✅ 완제품 기능분석이 확정되었습니다.');
  };

  // 수정 핸들러
  const handleEdit = () => {
    setState((prev: any) => ({ ...prev, l1Confirmed: false }));
    setDirty(true);
    saveToLocalStorage?.(); // 영구 저장
    alert('🔓 수정 모드로 전환되었습니다.');
  };

  // 인라인 편집 핸들러 - 요구사항 (더블클릭)
  const handleInlineEditRequirement = useCallback((typeId: string, funcId: string, reqId: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      l1: {
        ...prev.l1,
        types: prev.l1.types.map(t => {
          if (t.id !== typeId) return t;
          return {
            ...t,
            functions: t.functions.map(f => {
              if (f.id !== funcId) return f;
              return {
                ...f,
                requirements: f.requirements.map(r => {
                  if (r.id !== reqId) return r;
                  return { ...r, name: newValue };
                })
              };
            })
          };
        })
      }
    }));
    setDirty(true);
    saveToLocalStorage?.(); // 영구 저장
  }, [setState, setDirty, saveToLocalStorage]);

  // 인라인 편집 핸들러 - 기능 (더블클릭)
  const handleInlineEditFunction = useCallback((typeId: string, funcId: string, newValue: string) => {
    setState(prev => ({
      ...prev,
      l1: {
        ...prev.l1,
        types: prev.l1.types.map(t => {
          if (t.id !== typeId) return t;
          return {
            ...t,
            functions: t.functions.map(f => {
              if (f.id !== funcId) return f;
              return { ...f, name: newValue };
            })
          };
        })
      }
    }));
    setDirty(true);
    saveToLocalStorage?.(); // 영구 저장
  }, [setState, setDirty, saveToLocalStorage]);

  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    
    setState(prev => {
      const newState = { ...prev };
      const { type, id } = modal;

      // [규칙] 새 행은 수동 추가만 허용 - 자동 생성 금지
      if (type === 'l1Type') {
        const currentTypes = newState.l1.types;
        // 빈 타입이 있으면 첫 번째 선택값만 할당
        const emptyType = currentTypes.find(t => !t.name || t.name === '' || t.name.includes('클릭하여'));
        
        if (emptyType && selectedValues.length > 0) {
          newState.l1.types = currentTypes.map(t => 
            t.id === emptyType.id 
              ? { ...t, name: selectedValues[0] }
              : t
          );
        }
        // 빈 타입이 없으면 기존 유지 (새 행 생성 안 함)
      } 
      else if (type === 'l1Function') {
        newState.l1.types = newState.l1.types.map(t => {
          if (t.id !== id) return t;
          const currentFuncs = t.functions;
          
          // 빈 기능이 있으면 첫 번째 선택값만 할당
          const emptyFunc = currentFuncs.find(f => !f.name || f.name === '' || f.name.includes('클릭하여'));
          
          if (emptyFunc && selectedValues.length > 0) {
            return {
              ...t,
              functions: currentFuncs.map(f => 
                f.id === emptyFunc.id 
                  ? { ...f, name: selectedValues[0] }
                  : f
              )
            };
          }
          // 빈 기능이 없으면 기존 유지 (새 행 생성 안 함)
          return t;
        });
      }
      else if (type === 'l1Requirement') {
        newState.l1.types = newState.l1.types.map(t => ({
          ...t,
          functions: t.functions.map(f => {
            if (f.id !== id) return f;
            const currentReqs = f.requirements || [];
            
            // 빈 요구사항이 있으면 첫 번째 선택값만 할당
            const emptyReq = currentReqs.find(r => !r.name || r.name === '' || r.name.includes('클릭하여'));
            
            if (emptyReq && selectedValues.length > 0) {
              return {
                ...f,
                requirements: currentReqs.map(r => 
                  r.id === emptyReq.id 
                    ? { ...r, name: selectedValues[0] }
                    : r
                )
              };
            }
            // 빈 요구사항이 없으면 기존 유지 (새 행 생성 안 함)
            return f;
          })
        }));
      }
      
      return newState;
    });
    
    setDirty(true);
    setModal(null);
    saveToLocalStorage?.(); // 영구 저장
  }, [modal, setState, setDirty, saveToLocalStorage]);

  // 워크시트 데이터 삭제 핸들러
  const handleDelete = useCallback((deletedValues: string[]) => {
    console.log('[FunctionL1Tab] handleDelete 호출됨');
    console.log('[FunctionL1Tab] deletedValues:', deletedValues);
    console.log('[FunctionL1Tab] modal:', modal);
    
    if (!modal) {
      console.error('[FunctionL1Tab] modal이 없음!');
      return;
    }
    
    const { type, id } = modal;
    const deletedSet = new Set(deletedValues);
    console.log('[FunctionL1Tab] type:', type, 'id:', id);
    
    setState(prev => {
      const newState = JSON.parse(JSON.stringify(prev)); // Deep clone
      
      if (type === 'l1Type') {
        // 구분 삭제 - 해당 타입과 하위 모든 데이터 삭제
        console.log('[FunctionL1Tab] l1Type 삭제, 이전 types:', newState.l1.types.map((t: any) => t.name));
        newState.l1.types = newState.l1.types.filter((t: any) => !deletedSet.has(t.name));
        console.log('[FunctionL1Tab] l1Type 삭제 후 types:', newState.l1.types.map((t: any) => t.name));
      } 
      else if (type === 'l1Function') {
        // 완제품 기능 삭제 - 모든 타입에서 삭제 (id가 비어있을 수 있음)
        console.log('[FunctionL1Tab] l1Function 삭제');
        newState.l1.types = newState.l1.types.map((t: any) => {
          if (id && t.id !== id) return t;
          const beforeCount = t.functions.length;
          const newFunctions = t.functions.filter((f: any) => !deletedSet.has(f.name));
          console.log(`[FunctionL1Tab] type ${t.name}: ${beforeCount} -> ${newFunctions.length} functions`);
          return { ...t, functions: newFunctions };
        });
      }
      else if (type === 'l1Requirement') {
        // 요구사항 삭제
        console.log('[FunctionL1Tab] l1Requirement 삭제');
        newState.l1.types = newState.l1.types.map((t: any) => ({
          ...t,
          functions: t.functions.map((f: any) => {
            if (id && f.id !== id) return f;
            const beforeCount = (f.requirements || []).length;
            const newReqs = (f.requirements || []).filter((r: any) => !deletedSet.has(r.name));
            console.log(`[FunctionL1Tab] function ${f.name}: ${beforeCount} -> ${newReqs.length} requirements`);
            return { ...f, requirements: newReqs };
          })
        }));
      }
      
      console.log('[FunctionL1Tab] 새 상태 반환');
      return newState;
    });
    
    setDirty(true);
    
    // 즉시 저장
    if (saveToLocalStorage) {
      console.log('[FunctionL1Tab] 100ms 후 저장 예약');
      setTimeout(() => {
        console.log('[FunctionL1Tab] 저장 실행');
        saveToLocalStorage();
      }, 100);
    }
  }, [modal, setState, setDirty, saveToLocalStorage]);

  // 총 행 수 계산
  const getTotalRows = () => {
    if (state.l1.types.length === 0) return 1;
    return state.l1.types.reduce((acc, t) => {
      if (t.functions.length === 0) return acc + 1;
      return acc + t.functions.reduce((a, f) => a + Math.max(1, f.requirements.length), 0);
    }, 0);
  };

  const totalRows = getTotalRows();

  return (
    <div style={containerStyle}>
      <table style={tableStyle}>
        {/* 컬럼 너비: 완제품공정명 150px, 구분 90px, 완제품기능 auto, 요구사항 200px */}
        <colgroup>
          <col style={colStyle('150px')} />
          <col style={colStyle('90px')} />
          <col />
          <col style={colStyle('200px')} />
        </colgroup>
        
        {/* 3행 헤더 구조 */}
        <thead>
          {/* 1행: 단계 구분 */}
          <tr>
            <th style={headerMainRow('#1976d2', FONT_WEIGHTS.semibold)}>
              2단계 구조분석
            </th>
            <th colSpan={3} style={headerMainRowL1('#1b5e20')}>
              <div style={headerFlexContainerL1}>
                <span style={headerFlexSpan}>3단계 : 1L 완제품 공정 기능분석</span>
                <div style={headerButtonGroupL1}>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isConfirmed}
                    style={confirmButtonStyleL1('#4caf50', isConfirmed)}
                  >
                    {isConfirmed ? '✓ 확정됨' : '확정'}
                  </button>
                  <span style={missingBadgeStyleL1(missingCount > 0)}>
                    누락 {missingCount}건
                  </span>
                  <button
                    type="button"
                    onClick={handleEdit}
                    disabled={!isConfirmed}
                    style={confirmButtonStyleL1('#2196f3', !isConfirmed)}
                  >
                    수정
                  </button>
                </div>
              </div>
            </th>
          </tr>
          
          {/* 2행: 항목 그룹 */}
          <tr>
            <th style={headerSubRow('#1976d2')}>
              1. 완제품 공정명
            </th>
            <th colSpan={3} style={headerSubRow('#388e3c')}>
              1. 완제품 공정기능/요구사항
              {missingCount > 0 && (
                <span style={missingPillStyle}>
                  누락 {missingCount}건
                </span>
              )}
            </th>
          </tr>
          
          {/* 3행: 세부 컬럼 */}
          <tr style={headerRowBg}>
            <th style={colHeaderRowL1('#e3f2fd')}>
              완제품 공정명
            </th>
            <th style={colHeaderRowL1('#c8e6c9')}>
              구분
            </th>
            <th style={colHeaderRowL1('#c8e6c9')}>
              완제품기능
              {missingCounts.functionCount > 0 && (
                <span style={missingPillInlineStyle}>
                  {missingCounts.functionCount}
                </span>
              )}
            </th>
            <th style={colHeaderRowL1('#fff3e0', '#e65100')}>
              요구사항
              {missingCounts.requirementCount > 0 && (
                <span style={missingPillInlineStyle}>
                  {missingCounts.requirementCount}
                </span>
              )}
            </th>
          </tr>
        </thead>
        
        <tbody>
          {state.l1.types.length === 0 ? (
            <tr style={dataRowStyle('#e8f5e9')}>
              <td style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold })}>
                {state.l1.name || '(구조분석에서 입력)'}
              </td>
              <td style={dataCellStyle('#e8f5e9', { padding: '0' })}>
                <SelectableCell value="" placeholder="구분 선택" bgColor={'#e8f5e9'} onClick={() => setModal({ type: 'l1Type', id: state.l1.id, title: '구분 선택', itemCode: 'C1' })} />
              </td>
              <td style={dataCellStyle('#e8f5e9', { padding: '0' })}>
                <SelectableCell value="" placeholder="기능 선택" bgColor={'#e8f5e9'} onClick={() => setModal({ type: 'l1Function', id: '', title: '완제품 기능 선택', itemCode: 'C2' })} />
              </td>
              <td style={dataCellStyle('#e8f5e9', { padding: '0' })}>
                <SelectableCell value="" placeholder="요구사항 선택" bgColor={'#e8f5e9'} onClick={() => setModal({ type: 'l1Requirement', id: '', title: '요구사항 선택', itemCode: 'C3', parentFunction: '' })} />
              </td>
            </tr>
          ) : (() => {
            let globalRowIdx = 0;
            return state.l1.types.map((t, tIdx) => {
              // 각 구분(type)별 행 수 계산
              const typeRowSpan = t.functions.length === 0 ? 1 : t.functions.reduce((a, f) => a + Math.max(1, f.requirements.length), 0);
              
              return t.functions.length === 0 ? (
                (() => {
                  const bg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                  return (
                    <tr key={t.id} style={dataRowStyle(bg)}>
                      {/* 완제품 공정명 - 각 구분과 1:1 매칭 */}
                      <td rowSpan={typeRowSpan} style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                        {state.l1.name || '(구조분석에서 입력)'}
                      </td>
                      <td rowSpan={typeRowSpan} style={dataCellStyle(getTypeColor(t.name).light, { padding: '0', verticalAlign: 'middle' })}>
                        <SelectableCell value={t.name} placeholder="구분" bgColor={getTypeColor(t.name).light} textColor={getTypeColor(t.name).text} textAlign="center" onClick={() => setModal({ type: 'l1Type', id: state.l1.id, title: '구분 선택', itemCode: 'C1' })} />
                      </td>
                      <td style={dataCellStyle(bg, { padding: '0' })}>
                        <SelectableCell value="" placeholder="기능 선택" bgColor={bg} onClick={() => setModal({ type: 'l1Function', id: t.id, title: '완제품 기능 선택', itemCode: 'C2' })} />
                      </td>
                      <td style={dataCellStyle(bg, { padding: '0' })}>
                        <SelectableCell value="" placeholder="요구사항 선택" bgColor={bg} onClick={() => setModal({ type: 'l1Requirement', id: '', title: '요구사항 선택', itemCode: 'C3', parentFunction: '' })} />
                      </td>
                    </tr>
                  );
                })()
              ) : t.functions.map((f, fIdx) => {
                const funcRowSpan = Math.max(1, f.requirements.length);
                
                return f.requirements.length === 0 ? (
                  (() => {
                    const bg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                    return (
                      <tr key={f.id} style={dataRowStyle(bg)}>
                        {/* 완제품 공정명 - 각 구분의 첫 행에서만 표시 (1:1 매칭) */}
                        {fIdx === 0 && (
                          <td rowSpan={typeRowSpan} style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                            {state.l1.name || '(구조분석에서 입력)'}
                          </td>
                        )}
                        {fIdx === 0 && (
                          <td rowSpan={typeRowSpan} style={dataCellStyle(getTypeColor(t.name).light, { padding: '0', verticalAlign: 'middle' })}>
                            <SelectableCell value={t.name} placeholder="구분" bgColor={getTypeColor(t.name).light} textColor={getTypeColor(t.name).text} textAlign="center" onClick={() => setModal({ type: 'l1Type', id: state.l1.id, title: '구분 선택', itemCode: 'C1' })} />
                          </td>
                        )}
                        <td rowSpan={funcRowSpan} style={dataCellStyle(bg, { padding: '0', verticalAlign: 'middle' })}>
                          <SelectableCell value={f.name} placeholder="기능" bgColor={bg} textColor="#000000" onClick={() => setModal({ type: 'l1Function', id: t.id, title: '완제품 기능 선택', itemCode: 'C2' })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(t.id, f.id, newValue)} />
                        </td>
                        <td style={dataCellStyle(bg, { padding: '0' })}>
                          <SelectableCell value="" placeholder="요구사항 선택" bgColor={bg} textColor={COLORS.function.text} onClick={() => setModal({ type: 'l1Requirement', id: f.id, title: '요구사항 선택', itemCode: 'C3', parentFunction: f.name, parentCategory: t.name })} />
                        </td>
                      </tr>
                    );
                  })()
                ) : f.requirements.map((r, rIdx) => {
                  const bg = globalRowIdx++ % 2 === 1 ? '#c8e6c9' : '#e8f5e9';
                  return (
                    <tr key={r.id} style={dataRowStyle(bg)}>
                      {/* 완제품 공정명 - 각 구분의 첫 행에서만 표시 (1:1 매칭) */}
                      {fIdx === 0 && rIdx === 0 && (
                        <td rowSpan={typeRowSpan} style={dataCellStyle('#e3f2fd', { padding: '10px', textAlign: 'center', fontWeight: FONT_WEIGHTS.semibold, verticalAlign: 'middle' })}>
                          {state.l1.name || '(구조분석에서 입력)'}
                        </td>
                      )}
                      {fIdx === 0 && rIdx === 0 && (
                        <td rowSpan={typeRowSpan} style={dataCellStyle(getTypeColor(t.name).light, { padding: '0', verticalAlign: 'middle' })}>
                          <SelectableCell value={t.name} placeholder="구분" bgColor={getTypeColor(t.name).light} textColor={getTypeColor(t.name).text} textAlign="center" onClick={() => setModal({ type: 'l1Type', id: state.l1.id, title: '구분 선택', itemCode: 'C1' })} />
                        </td>
                      )}
                      {rIdx === 0 && (
                        <td rowSpan={funcRowSpan} style={dataCellStyle(bg, { padding: '0', verticalAlign: 'middle' })}>
                          <SelectableCell value={f.name} placeholder="기능" bgColor={bg} textColor="#000000" onClick={() => setModal({ type: 'l1Function', id: t.id, title: '완제품 기능 선택', itemCode: 'C2' })} onDoubleClickEdit={(newValue) => handleInlineEditFunction(t.id, f.id, newValue)} />
                        </td>
                      )}
                      <td style={dataCellStyle(bg, { padding: '0' })}>
                        <SelectableCell 
                          value={r.name} 
                          placeholder="요구사항" 
                          bgColor={bg} 
                          textColor={COLORS.function.text} 
                          onClick={() => setModal({ type: 'l1Requirement', id: f.id, title: '요구사항 선택', itemCode: 'C3', parentFunction: f.name, parentCategory: t.name })} 
                          onDoubleClickEdit={(newValue) => handleInlineEditRequirement(t.id, f.id, r.id, newValue)}
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
          processName={state.l1.name || '완제품 공정'}
          parentFunction={modal.parentFunction}
          parentCategory={modal.parentCategory}
          currentValues={(() => {
            if (modal.type === 'l1Type') return state.l1.types.map(t => t.name);
            if (modal.type === 'l1Function') return state.l1.types.find(t => t.id === modal.id)?.functions.map(f => f.name) || [];
            if (modal.type === 'l1Requirement') {
              for (const t of state.l1.types) {
                const f = t.functions.find(f => f.id === modal.id);
                if (f) return f.requirements.map(r => r.name);
              }
            }
            return [];
          })()}
        />
      )}
    </div>
  );
}
