'use client';

import CommonTopNav, { TopNavMenuItem, TopNavStatItem } from './CommonTopNav';

interface PFDTopNavProps {
  pfdNo?: string;
  linkedFmeaId?: string | null;
  linkedCpNo?: string | null;
  rowCount?: number;
  mainCount?: number;
  inspectCount?: number;
}

/**
 * PFD 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 3.0.0 - CommonTopNav 기반으로 리팩토링
 */
export default function PFDTopNav({ pfdNo, linkedFmeaId, linkedCpNo, rowCount = 0, mainCount = 0, inspectCount = 0 }: PFDTopNavProps) {
  const menuItems: TopNavMenuItem[] = [
    { label: 'PFD 등록', shortLabel: '등록', path: '/pfd/register', icon: '📝' },
    { label: 'PFD 리스트', shortLabel: '리스트', path: '/pfd/list', icon: '📋' },
    // PFD 워크시트는 pfdNo 파라미터 사용 (id가 아님)
    { label: 'PFD 작성화면', shortLabel: '작성', path: pfdNo ? `/pfd/worksheet?pfdNo=${pfdNo}` : '/pfd/worksheet', icon: '✏️' },
    { label: 'PFD 개정관리', shortLabel: '개정', path: '/pfd/revision', icon: '📜' },
  ];

  // ★ 연동된 FMEA가 있으면 PFMEA 바로가기 추가
  if (linkedFmeaId) {
    menuItems.push({
      label: 'PFMEA작성',
      shortLabel: 'PFMEA',
      path: `/pfmea/worksheet?id=${linkedFmeaId}`,
      icon: '📊',
    });
  }

  // ★ 연동된 CP가 있으면 CP 바로가기 추가
  if (linkedCpNo) {
    menuItems.push({
      label: 'CP 작성화면',
      shortLabel: 'CP',
      path: `/control-plan/worksheet?cpNo=${linkedCpNo}`,
      icon: '📋',
    });
  }

  const statItems: TopNavStatItem[] = [
    { label: 'Row', value: rowCount, color: 'blue' },
    { label: '주요', value: mainCount, color: 'green' },
    { label: '검사', value: inspectCount, color: 'orange' },
  ];

  return (
    <CommonTopNav
      title="PFD"
      menuItems={menuItems}
      statItems={[]}
      statLabel=""
      selectedId={pfdNo || undefined}
      gradientFrom="#1565c0"
      gradientTo="#1565c0"
    />
  );
}
