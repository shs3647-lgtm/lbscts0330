'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface WSTopNavProps {
    selectedDocumentId?: string | null;
}

/**
 * WS(작업표준서) 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * 
 * @version 1.0.0
 */
export default function WSTopNav({ selectedDocumentId }: WSTopNavProps) {
    const menuItems: TopNavMenuItem[] = [
        { label: 'WS 등록', shortLabel: '등록', path: '/ws/register', icon: '📝' },
        { label: 'WS 리스트', shortLabel: '리스트', path: '/ws/list', icon: '📋' },
        { label: 'WS 작성화면', shortLabel: '작성', path: '/ws/worksheet', icon: '✏️' },
        { label: 'WS 개정관리', shortLabel: '개정', path: '/ws/revision', icon: '📜' },
    ];

    return (
        <CommonTopNav
            title="WS (작업표준서)"
            menuItems={menuItems}
            selectedId={selectedDocumentId || undefined}
            gradientFrom="#5A6C7D"
            gradientTo="#4A5C6D"
        />
    );
}
