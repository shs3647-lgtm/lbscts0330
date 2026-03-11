// @ts-nocheck
/**
 * @file TreePanel.tsx
 * @description FMEA 워크시트 트리 패널 (BaseTreePanel 기반 리팩토링)
 * @version 3.1.0 - AI 추천 통합
 * @updated 2026-01-04
 */

'use client';

import React from 'react';
import BaseTreePanel, { TreeItem, TreeBranch, TreeLeaf, TreeEmpty, TreeBadge, tw } from './BaseTreePanel';
import { getL1TypeColor, TREE_FUNCTION, TREE_FUNCTION_L3, TREE_FAILURE } from '@/styles/level-colors';
import TreeAIRecommend from '@/components/ai/TreeAIRecommend';

interface TreePanelProps {
  state: any;
  collapsedIds?: Set<string>;
  setCollapsedIds?: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  onAddAIItem?: (type: 'cause' | 'mode' | 'effect', value: string, context?: any) => void;
}

// 4M 색상
const M4_COLORS: Record<string, { bg: string; text: string }> = {
  MN: { bg: '#ffebee', text: '#d32f2f' },
  MC: { bg: '#e3f2fd', text: '#1565c0' },
  IM: { bg: '#e8f5e9', text: '#2e7d32' },
  EN: { bg: '#fff3e0', text: '#f57c00' },
};

export default function TreePanel({ state, onAddAIItem }: TreePanelProps) {
  const tab = state.tab;

  // ========== 구조 트리 ==========
  if (tab === 'structure') {
    const s2Count = state.l2.filter((p: any) => p.name && !p.name.includes('클릭')).length;
    const s3Count = state.l2.reduce((sum: number, p: any) => 
      sum + (p.l3 || []).filter((w: any) => w.name && !w.name.includes('추가') && !w.name.includes('클릭')).length, 0);
    
    return (
      <BaseTreePanel config={{
        icon: '🌳',
        title: '구조트리',
        counts: [{ label: '완제품', value: 1 }, { label: '메인공정', value: s2Count }, { label: '작업요소', value: s3Count }],
        theme: 'structure',
        subHeader: { icon: '📦', label: state.l1.name || '(완제품명 입력)', bgColor: '#1976d2', textColor: '#fff' },
      }}>
        {state.l2.filter((p: any) => !p.name.includes('클릭')).map((proc: any, pIdx: number) => (
          <TreeBranch key={proc.id} borderColor="#1976d2">
            {/* 공정명: 파란색 */}
            <TreeItem icon="📁" label={`${proc.no}-${proc.name}`} count={(proc.l3 || []).filter((w: any) => !w.name.includes('추가')).length} bgColor={pIdx % 2 === 0 ? '#e3f2fd' : '#bbdefb'} textColor="#1565c0" />
            <div className="ml-4">
              {(proc.l3 || []).filter((w: any) => !w.name.includes('추가') && !w.name.includes('클릭')).map((w: any, wIdx: number) => (
                // 작업요소: 파란색
                <TreeLeaf key={w.id} icon="" label={w.name} bgColor={wIdx % 2 === 0 ? '#e3f2fd' : '#bbdefb'} textColor="#1565c0" indent={0} badge={<TreeBadge label={w.m4} bgColor="#1976d2" textColor="#fff" />} />
              ))}
            </div>
          </TreeBranch>
        ))}
      </BaseTreePanel>
    );
  }

  // ========== 1L 기능트리 ==========
  if (tab === 'function-l1') {
    // ✅ 의미 있는 데이터만 필터링
    const meaningfulTypes = (state.l1.types || []).filter((t: any) => {
      const name = t.name || '';
      return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
    });
    
    const funcCount = meaningfulTypes.reduce((s: number, t: any) => {
      const meaningfulFuncs = (t.functions || []).filter((f: any) => {
        const name = f.name || '';
        return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
      });
      return s + meaningfulFuncs.length;
    }, 0);
    
    const reqCount = meaningfulTypes.reduce((s: number, t: any) => {
      const meaningfulFuncs = (t.functions || []).filter((f: any) => {
        const name = f.name || '';
        return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
      });
      return s + meaningfulFuncs.reduce((a: number, f: any) => {
        const meaningfulReqs = (f.requirements || []).filter((r: any) => {
          const name = r.name || '';
          return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
        });
        return a + meaningfulReqs.length;
      }, 0);
    }, 0);
    
    return (
      <BaseTreePanel config={{
        icon: '🎯',
        title: '1L 기능트리',
        counts: [{ label: '완제품', value: 1 }, { label: '기능', value: funcCount }, { label: '요구사항', value: reqCount }],
        theme: 'function-l1',
      }}>
        <TreeItem icon="📦" label={state.l1.name || '(완제품명)'} bgColor="#bbf7d0" textColor="#166534" className="mb-2" />
        {meaningfulTypes.length === 0 ? (
          <TreeEmpty message="구분/기능/요구사항을 정의하세요" />
        ) : meaningfulTypes.map((t: any) => {
          const typeColor = getL1TypeColor(t.name);
          // ✅ 의미 있는 기능만 필터링
          const meaningfulFuncs = (t.functions || []).filter((f: any) => {
            const name = f.name || '';
            return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
          });
          
          return (
            <TreeBranch key={t.id} borderColor={typeColor.bg}>
              <TreeItem icon="📋" label={t.name} bgColor={typeColor.bg} textColor="#fff" />
              {meaningfulFuncs.length === 0 ? (
                <TreeEmpty message="(기능 미입력)" small />
              ) : meaningfulFuncs.map((f: any) => {
                // ✅ 의미 있는 요구사항만 필터링
                const meaningfulReqs = (f.requirements || []).filter((r: any) => {
                  const name = r.name || '';
                  return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
                });
                
                return (
                  <div key={f.id} className="ml-3 mb-1">
                    <TreeLeaf icon="⚙️" label={f.name} bgColor={typeColor.light} textColor={typeColor.text} indent={0} />
                    {meaningfulReqs.map((r: any) => (
                      <TreeLeaf key={r.id} icon="•" label={r.name} bgColor="#f3e5f5" textColor="#7b1fa2" indent={4} />
                    ))}
                  </div>
                );
              })}
            </TreeBranch>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 2L 기능트리 ==========
  // ✅ 의미 있는 항목인지 체크하는 헬퍼 (placeholder 제외)
  const isMeaningful = (name: string | undefined | null) => {
    if (!name || name.trim() === '') return false;
    const placeholders = ['클릭', '선택', '추가', '입력', '필요'];
    return !placeholders.some(ph => name.includes(ph));
  };

  if (tab === 'function-l2') {
    const procCount = state.l2.filter((p: any) => isMeaningful(p.name)).length;
    const funcCount = state.l2.reduce((s: number, p: any) => s + (p.functions || []).filter((f: any) => isMeaningful(f.name)).length, 0);
    const charCount = state.l2.reduce((s: number, p: any) => s + (p.functions || []).reduce((a: number, f: any) => a + (f.productChars || []).filter((c: any) => isMeaningful(c.name)).length, 0), 0);
    
    return (
      <BaseTreePanel config={{
        icon: '🔧',
        title: '2L 기능트리',
        counts: [{ label: '공정', value: procCount }, { label: '기능', value: funcCount }, { label: '제품특성', value: charCount }],
        theme: 'function-l2',
      }}>
        {state.l2.length === 0 ? (
          <TreeEmpty message="구조분석에서 공정을 추가하세요" />
        ) : state.l2.filter((p: any) => isMeaningful(p.name)).map((proc: any) => {
          const meaningfulFuncs = (proc.functions || []).filter((f: any) => isMeaningful(f.name));
          return (
            <TreeBranch key={proc.id} borderColor={TREE_FUNCTION.border}>
              <TreeItem icon="🏭" label={`${proc.no}. ${proc.name}`} bgColor={TREE_FUNCTION.procBg} textColor={TREE_FUNCTION.procText} />
              {meaningfulFuncs.length === 0 ? (
                <TreeEmpty message="기능 미정의" small />
              ) : meaningfulFuncs.map((f: any) => {
                const meaningfulChars = (f.productChars || []).filter((c: any) => isMeaningful(c.name));
                return (
                  <div key={f.id} className="ml-3 mb-1">
                    <TreeLeaf icon="⚙️" label={f.name} bgColor={TREE_FUNCTION.itemBg} textColor={TREE_FUNCTION.itemText} indent={0} />
                    {meaningfulChars.map((c: any) => (
                      <TreeLeaf 
                        key={c.id} 
                        icon="📐" 
                        label={c.name} 
                        bgColor={c.specialChar ? '#fed7aa' : '#fff7ed'} 
                        textColor="#e65100" 
                        indent={4}
                        badge={c.specialChar && <TreeBadge label={c.specialChar} bgColor="#f97316" textColor="#fff" />}
                      />
                    ))}
                  </div>
                );
              })}
            </TreeBranch>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 3L 기능트리 (공정:파란색, 기능:녹색, 공정특성:주황색) ==========
  if (tab === 'function-l3') {
    const weCount = state.l2.reduce((s: number, p: any) => s + (p.l3 || []).filter((w: any) => isMeaningful(w.name)).length, 0);
    const funcCount = state.l2.reduce((s: number, p: any) => s + (p.l3 || []).reduce((a: number, w: any) => a + (w.functions || []).filter((f: any) => isMeaningful(f.name)).length, 0), 0);
    const charCount = state.l2.reduce((s: number, p: any) => s + (p.l3 || []).reduce((a: number, w: any) => a + (w.functions || []).reduce((b: number, f: any) => b + (f.processChars || []).filter((c: any) => isMeaningful(c.name)).length, 0), 0), 0);
    
    return (
      <BaseTreePanel config={{
        icon: '🛠️',
        title: '3L 기능트리',
        counts: [{ label: '작업요소', value: weCount }, { label: '기능', value: funcCount }, { label: '공정특성', value: charCount }],
        theme: 'function-l3',
      }}>
        {state.l2.every((p: any) => (p.l3 || []).length === 0) ? (
          <TreeEmpty message="구조분석에서 작업요소를 추가하세요" />
        ) : state.l2.filter((p: any) => (p.l3 || []).some((w: any) => isMeaningful(w.name))).map((proc: any) => {
          const meaningfulWEs = (proc.l3 || []).filter((w: any) => isMeaningful(w.name));
          return (
            <TreeBranch key={proc.id} borderColor="#1976d2">
              {/* 공정명: 파란색 */}
              <TreeItem icon="🏭" label={`${proc.no}. ${proc.name}`} bgColor="#1976d2" textColor="#fff" />
              {meaningfulWEs.map((we: any, weIdx: number) => {
                const meaningfulFuncs = (we.functions || []).filter((f: any) => isMeaningful(f.name));
                return (
                  <div key={we.id} className="ml-3 mb-1.5">
                    {/* 작업요소: 파란색 */}
                    <TreeLeaf icon="" label={`[${we.m4}] ${we.name}`} bgColor={weIdx % 2 === 0 ? '#e3f2fd' : '#bbdefb'} textColor="#1565c0" indent={0} />
                    {meaningfulFuncs.length === 0 ? (
                      <TreeEmpty message="기능 미정의" small />
                    ) : meaningfulFuncs.map((f: any, fIdx: number) => {
                      const meaningfulChars = (f.processChars || []).filter((c: any) => isMeaningful(c.name));
                      return (
                        <div key={f.id} className="ml-3">
                          {/* 기능: 녹색 */}
                          <TreeLeaf icon="⚙️" label={f.name} bgColor={fIdx % 2 === 0 ? '#e8f5e9' : '#c8e6c9'} textColor="#1b5e20" indent={0} />
                          {meaningfulChars.map((c: any, cIdx: number) => (
                            // 공정특성: 주황색
                            <TreeLeaf 
                              key={c.id} 
                              icon="📏" 
                              label={c.name} 
                              bgColor={cIdx % 2 === 0 ? '#f3e5f5' : '#e1bee7'}
                              textColor="#7b1fa2"
                              indent={3}
                              badge={c.specialChar && <TreeBadge label={c.specialChar} bgColor="#f57c00" textColor="#fff" />}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </TreeBranch>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 1L 고장영향 트리 (공정명:파란색, 기능:녹색, 고장:주황색) ==========
  if (tab === 'failure-l1') {
    const reqCount = (state.l1.types || []).reduce((s: number, t: any) => s + (t.functions || []).reduce((a: number, f: any) => a + (f.requirements || []).length, 0), 0);
    const feCount = (state.l1.failureScopes || []).filter((s: any) => s.effect).length;
    
    return (
      <BaseTreePanel config={{
        icon: '⚠️',
        title: '1L 고장영향',
        counts: [{ label: '요구사항', value: reqCount }, { label: '고장영향', value: feCount }],
        theme: 'failure-l1',
      }}>
        {/* 공정명: 파란색 */}
        <TreeItem icon="📦" label={state.l1.name || '(완제품 공정명)'} bgColor="#1976d2" textColor="#fff" className="mb-2 border-l-[3px] border-[#1a237e]" />
        {(state.l1.types || []).length === 0 ? (
          <div className="text-center text-gray-500 text-[10px] p-5">기능분석(L1)에서 구분을 먼저 입력해주세요.</div>
        ) : (state.l1.types || []).map((type: any) => {
          const typeColor = getL1TypeColor(type.name);
          return (
            <div key={type.id} className="ml-2 mb-2">
              {/* 구분(YP/SP/User): 고유색상 유지 */}
              <TreeItem icon="🏷️" label={type.name} bgColor={typeColor.bg} textColor="#fff" />
              {(type.functions || []).length === 0 ? (
                <TreeEmpty message="(기능 미입력)" small />
              ) : (type.functions || []).map((func: any) => (
                <div key={func.id} className="ml-3 mb-1.5">
                  {/* 기능: 녹색 */}
                  <TreeLeaf icon="⚙️" label={func.name} bgColor={TREE_FUNCTION.itemBg} textColor={TREE_FUNCTION.itemText} indent={0} />
                  {(func.requirements || []).length === 0 ? (
                    <TreeEmpty message="(요구사항 미입력)" small />
                  ) : (func.requirements || []).map((req: any) => {
                    const effects = (state.l1.failureScopes || []).filter((s: any) => s.reqId === req.id);
                    return (
                      <div key={req.id} className="ml-3 mb-1">
                        {/* 요구사항: 연보라색 ★ */}
                        <TreeLeaf icon="📋" label={req.name} bgColor="#f3e5f5" textColor="#7b1fa2" indent={0} />
                        {effects.length === 0 ? (
                          <TreeEmpty message="(고장영향 미입력)" small />
                        ) : effects.map((eff: any) => (
                          <TreeLeaf 
                            key={eff.id} 
                            icon="⚡" 
                            label={eff.effect || '(미입력)'} 
                            bgColor="#e1bee7"
                            textColor="#7b1fa2"
                            indent={3}
                            badge={eff.severity && <TreeBadge label={`S:${eff.severity}`} bgColor={eff.severity >= 8 ? '#f97316' : '#fbbf24'} textColor="#000" />}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 2L 고장형태 트리 (공정명:파란색, 기능:녹색, 제품특성/고장:주황색) ==========
  if (tab === 'failure-l2') {
    const isL2Confirmed = state.failureL2Confirmed || false;
    const charCount = state.l2.reduce((s: number, p: any) => s + (p.functions || []).reduce((a: number, f: any) => a + (f.productChars || []).filter((c: any) => isMeaningful(c.name)).length, 0), 0);
    const fmCount = state.l2.reduce((s: number, p: any) => s + (p.failureModes || []).filter((m: any) => isMeaningful(m.name)).length, 0);
    
    return (
      <BaseTreePanel config={{
        icon: '🔥',
        title: '2L 고장형태',
        counts: [{ label: '제품특성', value: charCount }, { label: '고장형태', value: fmCount }],
        theme: 'failure-l2',
        extra: !isL2Confirmed && <span className="ml-1 text-yellow-300 text-[9px]">(미확정)</span>,
      }}>
        {state.l2.filter((p: any) => isMeaningful(p.name)).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">📋 구조분석에서 메인공정을 입력해주세요</div>
        ) : state.l2.filter((p: any) => isMeaningful(p.name)).map((proc: any) => {
          const meaningfulFuncs = (proc.functions || []).filter((f: any) => isMeaningful(f.name));
          const confirmedModes = (proc.failureModes || []).filter((m: any) => isMeaningful(m.name));
          return (
            <div key={proc.id} className="mb-2.5">
              {/* 공정명: 파란색 */}
              <TreeItem icon="🔧" label={`${proc.no}. ${proc.name}`} bgColor="#1976d2" textColor="#fff" className="border-l-[3px] border-[#1565c0]" />
              {meaningfulFuncs.length > 0 ? meaningfulFuncs.map((f: any) => {
                const meaningfulChars = (f.productChars || []).filter((c: any) => isMeaningful(c.name));
                return (
                  <div key={f.id} className="ml-3 mb-1">
                    {/* 기능: 녹색 */}
                    <TreeLeaf icon="📋" label={f.name} bgColor={TREE_FUNCTION.itemBg} textColor={TREE_FUNCTION.itemText} indent={0} />
                    {meaningfulChars.length > 0 ? meaningfulChars.map((pc: any, pcIdx: number) => (
                      <div key={pc.id} className="ml-3 mb-0.5">
                        {/* 제품특성: 연보라 줄무늬 (진한/연한 번갈아) */}
                        <TreeLeaf 
                          icon="🏷️" 
                          label={pc.name} 
                          bgColor={pc.specialChar ? '#ce93d8' : (pcIdx % 2 === 0 ? '#e1bee7' : '#f3e5f5')}
                          textColor="#7b1fa2"
                          indent={0}
                          badge={pc.specialChar && <TreeBadge label={pc.specialChar} bgColor="#f97316" textColor="#fff" />}
                        />
                        {/* 고장형태: 주황색 */}
                        {confirmedModes.filter((m: any) => !pc.name || m.productCharId === pc.id || !m.productCharId).slice(0, 3).map((m: any) => (
                          <TreeLeaf key={m.id} icon="└ ⚠️" label={m.name} bgColor="#ffe0b2" textColor="#e65100" indent={3} />
                        ))}
                        {/* AI 추천: 고장형태 */}
                        {onAddAIItem && confirmedModes.filter((m: any) => m.productCharId === pc.id).length < 3 && (
                          <TreeAIRecommend
                            context={{
                              processName: proc.name,
                              productChar: pc.name,
                            }}
                            type="mode"
                            onAccept={(value) => onAddAIItem('mode', value, { processId: proc.id, productCharId: pc.id })}
                            existingItems={confirmedModes.map((m: any) => m.name)}
                            maxItems={3}
                          />
                        )}
                      </div>
                    )) : <TreeEmpty message="└ (제품특성 미입력)" small />}
                  </div>
                );
              }) : <TreeEmpty message="└ (메인공정기능 미입력)" small />}
              {meaningfulFuncs.length === 0 && confirmedModes.map((m: any) => (
                <TreeLeaf key={m.id} icon="└ ⚠️" label={m.name} bgColor="#ffe0b2" textColor="#e65100" indent={4} />
              ))}
            </div>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 3L 고장원인 트리 (공정명/작업요소:파란색, 공정특성:녹색, 고장원인:주황색) ==========
  if (tab === 'failure-l3') {
    const isL3Confirmed = state.failureL3Confirmed || false;
    let processCharCount = 0, failureCauseCount = 0;
    state.l2.forEach((proc: any) => {
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          processCharCount += (f.processChars || []).filter((c: any) => isMeaningful(c.name)).length;
        });
      });
      failureCauseCount += (proc.failureCauses || []).filter((c: any) => isMeaningful(c.name)).length;
    });
    
    return (
      <BaseTreePanel config={{
        icon: '⚡',
        title: '3L 고장원인 트리 (FC)',
        counts: [{ label: '공정특성', value: processCharCount }, { label: '고장원인', value: failureCauseCount }],
        theme: 'failure-l3',
        extra: !isL3Confirmed && <span className="ml-2 text-yellow-300 text-[9px]">(미확정)</span>,
      }}>
        {state.l2.filter((p: any) => isMeaningful(p.name)).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-xs">📋 구조분석에서 메인공정을 입력해주세요</div>
        ) : state.l2.filter((p: any) => isMeaningful(p.name)).map((proc: any) => {
          const meaningfulCauses = (proc.failureCauses || []).filter((c: any) => isMeaningful(c.name));
          const meaningfulWEs = (proc.l3 || []).filter((w: any) => isMeaningful(w.name));
          return (
            <div key={proc.id} className="mb-2">
              {/* 공정명: 파란색 */}
              <TreeItem icon="🔧" label={`${proc.no}. ${proc.name}`} bgColor="#1976d2" textColor="#fff" className="border-l-[3px] border-[#1565c0]" />
              {meaningfulWEs.map((we: any) => {
                const processChars: any[] = [];
                (we.functions || []).filter((f: any) => isMeaningful(f.name)).forEach((f: any) => {
                  (f.processChars || []).filter((pc: any) => isMeaningful(pc.name)).forEach((pc: any) => { processChars.push(pc); });
                });
                return (
                  <div key={we.id} className="ml-3 mb-1">
                    {/* 작업요소: 파란색 */}
                    <TreeLeaf icon="" label={`[${we.m4}] ${we.name}`} bgColor="#bbdefb" textColor="#1565c0" indent={0} />
                    {processChars.map((pc: any) => {
                      const linkedCauses = meaningfulCauses.filter((c: any) => c.processCharId === pc.id);
                      return (
                        <div key={pc.id} className="ml-2">
                          {/* 공정특성: 녹색 */}
                          <TreeLeaf 
                            icon="└" 
                            label={pc.name} 
                            bgColor={TREE_FUNCTION.itemBg}
                            textColor={TREE_FUNCTION.itemText}
                            indent={0}
                            badge={pc.specialChar && <TreeBadge label={pc.specialChar} bgColor="#2e7d32" textColor="#fff" />}
                          />
                          {/* 고장원인: 주황색 */}
                          {linkedCauses.map((c: any) => (
                            <TreeLeaf 
                              key={c.id} 
                              icon="└" 
                              label={c.name} 
                              bgColor="#ffe0b2"
                              textColor="#e65100"
                              indent={4}
                              badge={c.occurrence && <TreeBadge label={`O:${c.occurrence}`} bgColor={c.occurrence >= 7 ? '#f97316' : '#fb923c'} textColor="#fff" />}
                            />
                          ))}
                          {/* AI 추천: 고장원인 */}
                          {onAddAIItem && linkedCauses.length < 3 && (
                            <TreeAIRecommend
                              context={{
                                processName: proc.name,
                                workElement: we.name,
                                m4Category: we.m4,
                              }}
                              type="cause"
                              onAccept={(value) => onAddAIItem('cause', value, { processId: proc.id, workElementId: we.id, processCharId: pc.id })}
                              existingItems={linkedCauses.map((c: any) => c.name)}
                              maxItems={3}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </BaseTreePanel>
    );
  }

  // ========== 기본 폴백 ==========
  return (
    <BaseTreePanel config={{
      icon: '🌳',
      title: '트리',
      counts: [],
      theme: 'structure',
    }}>
      <div className="flex-1 flex justify-center items-center text-[11px] text-gray-500">
        해당 탭에서는 트리가 표시되지 않습니다
      </div>
    </BaseTreePanel>
  );
}
