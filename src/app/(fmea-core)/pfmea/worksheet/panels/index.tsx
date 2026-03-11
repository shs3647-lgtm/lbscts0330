/**
 * 우측 패널 플러그인 레지스트리
 * 
 * 새 패널 추가 방법:
 * 1. panels/ 하위에 새 폴더 생성 (예: NewPanel/)
 * 2. index.tsx에서 React.lazy()로 export
 * 3. 아래 PANEL_REGISTRY에 추가
 * 
 * 예시:
 * {
 *   id: 'new-panel',
 *   label: 'NEW',
 *   icon: '🆕',
 *   component: lazy(() => import('./NewPanel')),
 *   order: 9,
 * }
 */

import { lazy, ComponentType } from 'react';
import dynamic from 'next/dynamic';

export interface PanelConfig {
  /** 패널 고유 ID */
  id: string;
  /** 버튼에 표시될 라벨 */
  label: string;
  /** 버튼 아이콘 (이모지) */
  icon: string;
  /** 레이지 로딩될 컴포넌트 (React.lazy 또는 next/dynamic) */
  component: React.LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
  /** 버튼 색상 (선택사항) */
  color?: string;
  /** 표시 순서 */
  order: number;
  /** 활성화 조건 (선택사항) */
  enabled?: (state: any) => boolean;
}

/**
 * 패널 레지스트리
 * 
 * 레이지 로딩으로 각 패널은 클릭할 때만 로드됨
 * 이로 인해 초기 번들 크기가 크게 감소
 */
/**
 * 플러그인 패널 레지스트리
 * 
 * 우측 트리뷰 영역에 표시되는 패널들
 * - 5AP/6AP: TopMenuBar에서 모달로 표시 (여기서 제거)
 * - LLD: TopMenuBar로 이동 (여기서 제거)
 */
export const PANEL_REGISTRY: PanelConfig[] = [
  {
    id: 'tree',
    label: 'TREE',
    icon: '🌳',
    component: lazy(() => import('./TreePanel')),
    order: 1,
  },
  {
    id: 'pdf',
    label: 'PDF',
    icon: '📄',
    component: dynamic(() => import('./PDFViewer'), {
      ssr: false,
      loading: () => <div className="flex items-center justify-center h-full text-sm text-gray-400">PDF 로딩 중...</div>,
    }),
    order: 2,
  },
  {
    id: 'rpn',
    label: 'RPN',
    icon: '📊',
    component: dynamic(() => import('./RPNChart/ParetoChart'), {
      ssr: false,
      loading: () => <div className="flex items-center justify-center h-full text-sm text-gray-400">차트 로딩 중...</div>,
    }),
    order: 3,
  },
  {
    id: '5ap',
    label: '5AP',
    icon: '🎯',
    component: lazy(() => import('./APTable/APTable5')),
    color: '#1e3a5f',
    order: 4,
  },
  {
    id: '6ap',
    label: '6AP',
    icon: '✅',
    component: lazy(() => import('./APTable/APTable6')),
    color: '#2e7d32',
    order: 5,
  },
  {
    id: 'rpn-chart',
    label: 'RPN',
    icon: '📊',
    component: lazy(() => import('./APTable/RPNChart')),
    color: '#7c3aed',
    order: 6,
  },
  {
    id: 'lld',
    label: '구조',
    icon: '📚',
    component: lazy(() => import('./LLDViewer')),
    color: '#4f46e5',
    order: 8,
  },
  {
    id: 'gap',
    label: 'GAP',
    icon: '🔍',
    component: lazy(() => import('./GAPAnalysis')),
    color: '#7c3aed',
    order: 9,
  },
];

/**
 * 패널 ID로 패널 설정 찾기
 */
export const getPanelById = (id: string): PanelConfig | undefined =>
  PANEL_REGISTRY.find(p => p.id === id);

/**
 * 순서대로 정렬된 패널 목록
 */
export const getSortedPanels = (): PanelConfig[] =>
  [...PANEL_REGISTRY].sort((a, b) => a.order - b.order);

/**
 * 활성화된 패널 목록 (조건 검사)
 */
export const getEnabledPanels = (state: any): PanelConfig[] =>
  getSortedPanels().filter(p => !p.enabled || p.enabled(state));

