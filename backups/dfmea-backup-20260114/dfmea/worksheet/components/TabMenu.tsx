/**
 * @file TabMenu.tsx
 * @description 워크시트 탭 메뉴 (구조분석, 기능분석, 고장분석 등)
 */

'use client';

import React from 'react';
import { WorksheetState, ANALYSIS_TABS, COLORS } from '../constants';
import StepToggleButtons from './StepToggleButtons';
import { tabMenuContainerStyle, tabButtonStyle } from './TabMenuStyles';

interface TabMenuProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  onOpen5AP?: () => void;
  onOpen6AP?: () => void;
}

export default function TabMenu({ state, setState, onOpen5AP, onOpen6AP }: TabMenuProps) {
  const structureConfirmed = (state as any).structureConfirmed || false;
  const failureLinks = (state as any).failureLinks || [];
  const hasFailureLinks = failureLinks.length > 0; // 고장연결 완료 여부
  
  // 탭 활성화 조건
  const isTabEnabled = (tabId: string) => {
    if (tabId === 'structure') return true;
    if (tabId.startsWith('function-')) return structureConfirmed;
    if (tabId.startsWith('failure-')) return structureConfirmed;
    // 평가 탭 (리스크분석, 최적화)은 고장연결 후 활성화
    if (tabId === 'risk' || tabId === 'opt') return hasFailureLinks;
    return structureConfirmed;
  };

  // 분석 탭 + 평가 탭 (구분선으로 구분)
  const analysisTabs = ANALYSIS_TABS;
  const evaluationTabs = [
    { id: 'risk', label: '리스크분석', step: 5 },
    { id: 'opt', label: '최적화', step: 6 },
  ];
  
  return (
    <div 
      className="flex-shrink-0" 
      style={tabMenuContainerStyle}
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-2">
          {/* 분석 탭 */}
          <div className="flex gap-1">
            {analysisTabs.map(tab => {
              const isActive = state.tab === tab.id;
              const isEnabled = isTabEnabled(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (!isEnabled) {
                      alert('⚠️ 구조분석을 먼저 확정해주세요.');
                      return;
                    }
                    setState(prev => ({ ...prev, tab: tab.id }));
                  }}
                  style={tabButtonStyle(isActive, isEnabled)}
                  onMouseOver={(e) => {
                    if (isEnabled && !isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.color = '#ffd600';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  title={!isEnabled ? '구조분석 확정 후 사용 가능' : ''}
                >
                  {tab.label}
                  {!isEnabled && <span className="ml-1 text-[9px]">🔒</span>}
                </button>
              );
            })}
          </div>

          {/* 단계별 토글 버튼 - 모든 탭에서 표시 */}
          <div className="w-px h-5 bg-white/30 mx-2" />
          <StepToggleButtons state={state} setState={setState} />
        </div>

      </div>
    </div>
  );
}

