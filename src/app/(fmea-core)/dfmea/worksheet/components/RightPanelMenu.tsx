/**
 * 우측 패널 메뉴바 컴포넌트
 *
 * 탭별로 다른 색상의 메뉴바를 표시하며,
 * 레지스트리에 등록된 패널들을 버튼으로 표시
 */

'use client';

import React from 'react';
import { getEnabledPanels, type PanelConfig } from '../panels';

interface RightPanelMenuProps {
  /** 현재 활성화된 탭 (색상 결정) */
  currentTab: string;
  /** 현재 활성화된 패널 ID */
  activePanel: string | null;
  /** 패널 변경 핸들러 */
  onPanelChange: (panelId: string) => void;
  /** 워크시트 상태 (패널 활성화 조건 검사용) */
  state?: any;
}

export default function RightPanelMenu({ 
  currentTab, 
  activePanel, 
  onPanelChange,
  state,
}: RightPanelMenuProps) {
  // 탭별 배경 색상
  const getBackgroundColor = (): string => {
    if (currentTab === 'structure') {
      return 'linear-gradient(to right, #42a5f5, #5c6bc0, #42a5f5)'; // 파란색
    }
    if (currentTab.startsWith('function')) {
      return 'linear-gradient(to right, #66bb6a, #81c784, #66bb6a)'; // 초록색
    }
    if (currentTab.startsWith('failure')) {
      return 'linear-gradient(to right, #ffa726, #ffb74d, #ffa726)'; // 주황색
    }
    return 'linear-gradient(to right, #3949ab, #5c6bc0, #3949ab)'; // 기본 네이비
  };

  // 활성화된 패널 목록 가져오기
  const panels = getEnabledPanels(state);

  return (
    <div style={{
      height: '32px',
      background: getBackgroundColor(),
      borderTop: '1px solid rgba(255,255,255,0.4)',
      borderBottom: '1px solid rgba(255,255,255,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '8px',
      gap: '6px',
      position: 'sticky',
      top: '64px',
      zIndex: 70,
    }}>
      {panels.map((panel) => (
        <button
          key={panel.id}
          onClick={() => onPanelChange(panel.id)}
          className="px-3 py-1 rounded transition-all"
          style={{
            background: activePanel === panel.id 
              ? 'rgba(255,255,255,0.3)' 
              : 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            fontSize: '12px',
            fontWeight: activePanel === panel.id ? 600 : 400,
            cursor: 'pointer',
          }}
          onMouseOver={(e) => {
            if (activePanel !== panel.id) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            }
          }}
          onMouseOut={(e) => {
            if (activePanel !== panel.id) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }
          }}
          title={panel.label}
        >
          {panel.icon} {panel.label}
        </button>
      ))}
    </div>
  );
}










