/**
 * TreePanel - 트리 뷰 패널
 * 
 * 구조분석, 기능분석, 고장분석 트리를 표시
 * page.tsx에서 이전된 트리 로직
 */

'use client';

import React from 'react';
import { 
  treePanelContainer, 
  treePanelTitle, 
  treePanelContent, 
  treePanelFooter, 
  treeItemStyle, 
  countBadgeStyle, 
  m4BadgeStyle,
  typeContainerStyle,
  typeHeaderStyle,
  functionItemStyle,
  requirementItemStyle,
  failureHeaderStyle,
  severityBadgeStyle
} from './TreePanelStyles';

interface TreePanelProps {
  state: any;
  collapsedIds?: Set<string>;
  setCollapsedIds?: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

// 구분별 색상 정의 - 표준 색상 v2.0 (2026-01-03 확정)
const TYPE_COLORS: Record<string, { bg: string; light: string; text: string; border: string }> = {
  'Your Plant': { bg: '#1976d2', light: '#bbdefb', text: '#0d47a1', border: '#1976d2' },  // 🔵 파란색
  'YP': { bg: '#1976d2', light: '#bbdefb', text: '#0d47a1', border: '#1976d2' },          // 🔵 파란색 (약어)
  'Ship to Plant': { bg: '#f57c00', light: '#ffe0b2', text: '#e65100', border: '#f57c00' }, // 🟠 주황색
  'SP': { bg: '#f57c00', light: '#ffe0b2', text: '#e65100', border: '#f57c00' },          // 🟠 주황색 (약어)
  'User': { bg: '#7b1fa2', light: '#e1bee7', text: '#4a148c', border: '#7b1fa2' },        // 🟣 보라색
};

// 고장분석 트리 색상 정의 - 네이비 기반
const FAILURE_COLORS = {
  header: '#1a237e',       // 딥 인디고
  headerLight: '#3949ab',  // 인디고
  bg: '#f5f6fc',          // 아주 연한 인디고
  bgAlt: '#e8eaf6',       // 연한 인디고
  text: '#1a237e',        // 딥 인디고 텍스트
  textLight: '#5c6bc0',   // 라이트 인디고 텍스트
  accent: '#7986cb',      // 악센트
  severity: { high: '#ffccbc', highText: '#bf360c', low: '#e8eaf6', lowText: '#3949ab' }
};

// 4M별 색상 정의
const M4_COLORS: Record<string, string> = {
  'MN': '#e3f2fd',
  'MC': '#fff3e0',
  'IM': '#e8f5e9',
  'EN': '#fff3e0',
};

export default function TreePanel({ state, collapsedIds, setCollapsedIds }: TreePanelProps) {
  const tab = state.tab;

  // ========== 구조 트리 (structure) ==========
  if (tab === 'structure') {
    return (
      <div style={treePanelContainer()}>
        <div style={treePanelTitle('#1976d2')}>🌳 구조 트리</div>
        <div className="shrink-0 bg-blue-50 py-1.5 px-2.5 border-b border-blue-200">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📦</span>
            <span className="text-xs font-bold">{state.l1.name || '(완제품명 입력)'}</span>
          </div>
        </div>
        <div style={treePanelContent('#f8fafc')}>
          {state.l2.filter((p: any) => !p.name.includes('클릭')).map((proc: any) => (
            <div key={proc.id} className="mb-1.5 ml-2 border-l-2 border-blue-300 pl-2">
              <div style={treeItemStyle('#e8f5e9')}>
                <span>📁</span>
                <span className="text-[11px] font-semibold">{proc.no}-{proc.name}</span>
                <span style={countBadgeStyle}>{proc.l3.filter((w: any) => !w.name.includes('추가')).length}</span>
              </div>
              <div className="ml-4">
                {proc.l3.filter((w: any) => !w.name.includes('추가') && !w.name.includes('클릭')).map((w: any) => (
                  <div key={w.id} className="flex items-center gap-1 py-0.5 px-1 text-[10px]">
                    <span style={m4BadgeStyle(M4_COLORS[w.m4] || '#e0e0e0')}>{w.m4}</span>
                    <span>{w.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={treePanelFooter()}>
          공정: {state.l2.filter((p: any) => !p.name.includes('클릭')).length}개 | 
          작업요소: {state.l2.reduce((sum: number, p: any) => sum + p.l3.filter((w: any) => !w.name.includes('추가')).length, 0)}개
        </div>
      </div>
    );
  }

  // ========== 1L 기능트리 (완제품 기능분석) ==========
  if (tab === 'function-l1') {
    return (
      <div style={treePanelContainer()}>
        <div style={treePanelTitle('#1b5e20')}>
          🎯 1L 기능트리 (완제품)
        </div>
        <div style={treePanelContent('#e8f5e9')}>
          <div style={treeItemStyle('#c8e6c9', { marginBottom: '8px' })}>
            <span className="text-sm">📦</span>
            <span className="text-xs font-bold">{state.l1.name || '(완제품명)'}</span>
          </div>
          {state.l1.types.length === 0 ? (
            <div className="text-gray-500 p-4 text-center bg-gray-100 rounded text-xs">
              구분/기능/요구사항을 정의하세요
            </div>
          ) : state.l1.types.map((t: any) => {
            const color = TYPE_COLORS[t.name] || { bg: '#388e3c', light: '#c8e6c9', text: '#1b5e20', border: '#388e3c' };
            return (
              <div key={t.id} style={typeContainerStyle(color.border)}>
                <div style={typeHeaderStyle(color.bg)}>
                  📋 {t.name}
                </div>
                {t.functions.map((f: any) => (
                  <div key={f.id} className="ml-3 mb-1">
                    <div style={functionItemStyle()}>
                      ⚙️ {f.name}
                    </div>
                    {f.requirements.map((r: any) => (
                      <div key={r.id} style={requirementItemStyle()}>
                        • {r.name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={treePanelFooter()}>
          구분: {state.l1.types.length}개 | 
          기능: {state.l1.types.reduce((s: number, t: any) => s + t.functions.length, 0)}개 | 
          요구사항: {state.l1.types.reduce((s: number, t: any) => s + t.functions.reduce((a: number, f: any) => a + f.requirements.length, 0), 0)}개
        </div>
      </div>
    );
  }

  // ========== 2L 기능트리 (메인공정 기능분석) ==========
  if (tab === 'function-l2') {
    return (
      <div style={treePanelContainer()}>
        <div style={treePanelTitle('#2e7d32')}>
          🔧 2L 기능트리 (메인공정)
        </div>
        <div style={treePanelContent('#e8f5e9')}>
          {state.l2.length === 0 ? (
            <div className="text-gray-500 p-4 text-center bg-gray-100 rounded text-xs">
              구조분석에서 공정을 추가하세요
            </div>
          ) : state.l2.map((proc: any) => (
            <div key={proc.id} style={typeContainerStyle('#4caf50', { borderLeft: '2px solid #4caf50' })}>
              <div style={typeHeaderStyle('#a5d6a7', { color: '#1b5e20', fontWeight: 600 })}>
                🏭 {proc.no}. {proc.name}
              </div>
              {(proc.functions || []).length === 0 ? (
                <div className="ml-3 text-[10px] text-gray-400 p-1 font-medium italic">기능 미정의</div>
              ) : (proc.functions || []).map((f: any) => (
                <div key={f.id} className="ml-3 mb-1">
                  <div style={functionItemStyle({ bg: '#c8e6c9', color: '#2e7d32' })}>
                    ⚙️ {f.name}
                  </div>
                  {(f.productChars || []).map((c: any) => (
                    <div key={c.id} style={requirementItemStyle({ color: '#555', bg: 'transparent' })}>
                      📐 {c.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={treePanelFooter()}>
          공정: {state.l2.length}개 | 
          기능: {state.l2.reduce((s: number, p: any) => s + (p.functions || []).length, 0)}개 | 
          제품특성: {state.l2.reduce((s: number, p: any) => s + (p.functions || []).reduce((a: number, f: any) => a + (f.productChars || []).length, 0), 0)}개
        </div>
      </div>
    );
  }

  // ========== 3L 기능트리 (작업요소 기능분석) ==========
  if (tab === 'function-l3') {
    return (
      <div style={treePanelContainer()}>
        <div style={treePanelTitle('#388e3c')}>
          🛠️ 3L 기능트리 (작업요소)
        </div>
        <div style={treePanelContent('#e8f5e9')}>
          {state.l2.every((p: any) => (p.l3 || []).length === 0) ? (
            <div className="text-gray-500 p-4 text-center bg-gray-100 rounded text-xs">
              구조분석에서 작업요소를 추가하세요
            </div>
          ) : state.l2.filter((p: any) => (p.l3 || []).length > 0).map((proc: any) => (
            <div key={proc.id} style={typeContainerStyle('#4caf50')}>
              <div style={typeHeaderStyle('#a5d6a7', { color: '#1b5e20', fontWeight: 600 })}>
                🏭 {proc.no}. {proc.name}
              </div>
              {(proc.l3 || []).map((we: any) => (
                <div key={we.id} className="ml-3 mb-1.5">
                  <div style={functionItemStyle({ bg: '#c8e6c9', color: '#2e7d32', marginBottom: '2px' })}>
                    [{we.m4}] {we.name}
                  </div>
                  {(we.functions || []).length === 0 ? (
                    <div className="ml-3 text-[9px] text-gray-400 p-0.5 italic">기능 미정의</div>
                  ) : (we.functions || []).map((f: any) => (
                    <div key={f.id} className="ml-3">
                      <div className="text-[9px] text-green-700 p-0.5 font-medium">⚙️ {f.name}</div>
                      {(f.processChars || []).map((c: any) => (
                        <div key={c.id} style={requirementItemStyle({ color: '#555', bg: 'transparent' })}>
                          📏 {c.name}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={treePanelFooter()}>
          작업요소: {state.l2.reduce((s: number, p: any) => s + (p.l3 || []).length, 0)}개 | 
          기능: {state.l2.reduce((s: number, p: any) => s + (p.l3 || []).reduce((a: number, w: any) => a + (w.functions || []).length, 0), 0)}개
        </div>
      </div>
    );
  }

  // ========== 1L 고장영향 트리 (FE) - 네이비 기반 고급 디자인 ==========
  if (tab === 'failure-l1') {
    return (
      <div style={treePanelContainer()}>
        <div style={treePanelTitle(FAILURE_COLORS.header, { whiteSpace: 'nowrap' })}>
          ⚠️ 1L 고장영향 트리 (FE)
        </div>
        <div style={treePanelContent(FAILURE_COLORS.bg)}>
          <div style={typeHeaderStyle(FAILURE_COLORS.bgAlt, { color: FAILURE_COLORS.text, borderLeft: `3px solid ${FAILURE_COLORS.header}`, fontSize: '12px' })}>
            📦 {state.l1.name || '(완제품 공정명)'}
          </div>
          
          {(state.l1.types || []).map((type: any) => (
            <div key={type.id} className="ml-2 mb-2">
              <div style={typeHeaderStyle(FAILURE_COLORS.bgAlt, { color: FAILURE_COLORS.text, borderLeft: `2px solid ${FAILURE_COLORS.accent}` })}>
                🏷️ {type.name}
              </div>
              
              {(type.functions || []).length === 0 ? (
                <div className="ml-3 text-[9px] text-gray-400 italic">(기능 미입력)</div>
              ) : (type.functions || []).map((func: any) => (
                <div key={func.id} className="ml-3 mb-1.5">
                  <div style={functionItemStyle({ bg: '#e8f5e9', color: '#2e7d32', marginBottom: '2px' })}>
                    ⚙️ {func.name}
                  </div>
                  {(func.requirements || []).length === 0 ? (
                    <div className="ml-3 text-[9px] text-gray-400 italic">(요구사항 미입력)</div>
                  ) : (func.requirements || []).map((req: any) => {
                    const effects = (state.l1.failureScopes || []).filter((s: any) => s.reqId === req.id);
                    return (
                      <div key={req.id} className="ml-3 mb-1">
                        <div style={functionItemStyle({ bg: FAILURE_COLORS.bgAlt, color: FAILURE_COLORS.textLight })}>
                          📋 {req.name}
                        </div>
                        {effects.length === 0 ? (
                          <div className="ml-3 text-[9px] text-gray-300 italic">(고장영향 미입력)</div>
                        ) : effects.map((eff: any) => (
                          <div key={eff.id} className="ml-3 flex items-center gap-1.5 py-0.5 text-[9px] text-indigo-900">
                            <span>⚡ {eff.effect || '(미입력)'}</span>
                            {eff.severity && (
                              <span style={severityBadgeStyle(eff.severity >= 8, FAILURE_COLORS)}>
                                S:{eff.severity}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
          
          {(state.l1.types || []).length === 0 && (
            <div className="text-gray-400 p-5 text-center text-[10px]">
              기능분석(L1)에서 구분을 먼저 입력해주세요.
            </div>
          )}
        </div>
        <div style={treePanelFooter({ bg: FAILURE_COLORS.bgAlt, borderTop: `1px solid ${FAILURE_COLORS.bgAlt}`, color: FAILURE_COLORS.text })}>
          구분: {(state.l1.types || []).length}개 | 
          요구사항: {(state.l1.types || []).reduce((s: number, t: any) => s + (t.functions || []).reduce((a: number, f: any) => a + (f.requirements || []).length, 0), 0)}개 | 
          고장영향: {(state.l1.failureScopes || []).filter((s: any) => s.effect).length}개
        </div>
      </div>
    );
  }

  // ========== 2L 고장형태 트리 (FM) - 네이비 기반 고급 디자인 ==========
  if (tab === 'failure-l2') {
    return (
      <div style={treePanelContainer()}>
        <div style={treePanelTitle(FAILURE_COLORS.header)}>
          🔥 2L 고장형태 트리 (FM)
        </div>
        <div style={treePanelContent(FAILURE_COLORS.bg)}>
          {state.l2.filter((p: any) => p.name && !p.name.includes('클릭')).map((proc: any) => {
            const functions = proc.functions || [];
            return (
              <div key={proc.id} className="mb-2.5">
                <div style={typeHeaderStyle(FAILURE_COLORS.bgAlt, { color: FAILURE_COLORS.text, borderLeft: `3px solid ${FAILURE_COLORS.header}` })}>
                  🔧 {proc.no}. {proc.name}
                </div>
                {functions.length > 0 ? functions.map((f: any) => {
                  const productChars = f.productChars || [];
                  return (
                    <div key={f.id} className="ml-3 mb-1">
                      <div className="text-[9px] font-semibold text-green-700">📋 {f.name}</div>
                      {productChars.length > 0 ? productChars.map((pc: any) => (
                        <div key={pc.id} className="ml-3 mb-0.5">
                          <div className="text-[9px] text-indigo-400">🏷️ {pc.name}</div>
                          {(proc.failureModes || []).filter((m: any) => !pc.name || m.productCharId === pc.id || !m.productCharId).slice(0, 3).map((m: any) => (
                            <div key={m.id} className="ml-3 flex gap-1.5 text-[9px] text-indigo-900">
                              <span>└ ⚠️ {m.name}</span>
                            </div>
                          ))}
                        </div>
                      )) : (
                        <div className="ml-3 text-[9px] text-gray-400 italic">└ (제품특성 미입력)</div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="ml-3 text-[9px] text-gray-400 italic">└ (메인공정기능 미입력)</div>
                )}
                {functions.length === 0 && (proc.failureModes || []).map((m: any) => (
                  <div key={m.id} className="ml-4 flex gap-1.5 text-[9px] text-indigo-900">
                    <span>└ ⚠️ {m.name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ========== 3L 고장원인 트리 (FC) - 네이비 기반 고급 디자인 ==========
  if (tab === 'failure-l3') {
    return (
      <div style={treePanelContainer()}>
        <div style={treePanelTitle(FAILURE_COLORS.header)}>
          ⚡ 3L 고장원인 트리 (FC)
        </div>
        <div style={treePanelContent(FAILURE_COLORS.bg)}>
          {state.l2.filter((p: any) => p.name && !p.name.includes('클릭')).map((proc: any) => (
            <div key={proc.id} className="mb-2">
              <div style={typeHeaderStyle(FAILURE_COLORS.bgAlt, { color: FAILURE_COLORS.text, borderLeft: `3px solid ${FAILURE_COLORS.header}` })}>
                🔧 {proc.no}. {proc.name}
              </div>
              {(proc.l3 || []).filter((w: any) => w.name && !w.name.includes('클릭')).map((we: any) => (
                <div key={we.id} className="ml-3 mb-1">
                  <div className="text-[9px] font-semibold text-indigo-400">
                    [{we.m4}] {we.name}
                  </div>
                  {(we.failureCauses || []).map((c: any) => (
                    <div key={c.id} className="ml-4 flex gap-2 text-[9px] text-gray-600">
                      <span>└ {c.name}</span>
                      {c.occurrence && (
                        <span style={severityBadgeStyle(c.occurrence >= 7, FAILURE_COLORS)}>
                          O:{c.occurrence}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== 기본 폴백 ==========
  return (
    <div style={treePanelContainer('#f8fafc')}>
      <div style={treePanelTitle('#1976d2')}>
        🌳 트리
      </div>
      <div className="flex-1 flex justify-center items-center text-[11px] text-gray-400 italic">
        해당 탭에서는 트리가 표시되지 않습니다
      </div>
    </div>
  );
}
