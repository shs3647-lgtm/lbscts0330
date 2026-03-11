'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface PMTopNavProps {
    selectedDocumentId?: string | null;
}

/**
 * PM(예방보전) 상단 바로가기 메뉴바
 * @version 1.0.0
 */
export default function PMTopNav({ selectedDocumentId }: PMTopNavProps) {
    const menuItems: TopNavMenuItem[] = [
        { label: 'PM 등록', shortLabel: '등록', path: '/pm/register', icon: '📝' },
        { label: 'PM 리스트', shortLabel: '리스트', path: '/pm/list', icon: '📋' },
        { label: 'PM 작성화면', shortLabel: '작성', path: '/pm/worksheet', icon: '✏️' },
        { label: 'PM 개정관리', shortLabel: '개정', path: '/pm/revision', icon: '📜' },
    ];

    return (
        <CommonTopNav
            title="PM (예방보전)"
            menuItems={menuItems}
            selectedId={selectedDocumentId || undefined}
            gradientFrom="#4A148C"
            gradientTo="#6A1B9A"
        />
    );
}
