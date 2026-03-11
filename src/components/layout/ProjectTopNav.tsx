'use client';

import CommonTopNav, { TopNavMenuItem } from './CommonTopNav';

interface ProjectTopNavProps {
    selectedProjectId?: string | null;
}

/**
 * Project 상단 바로가기 메뉴바
 * - CommonTopNav 기반 반응형 구현
 * - 간트 차트, 대시보드 등 프로젝트 관리 메뉴
 * 
 * @version 1.0.0 - 초기 생성
 */
export default function ProjectTopNav({ selectedProjectId }: ProjectTopNavProps) {
    const menuItems: TopNavMenuItem[] = [
        { label: '간트 차트', shortLabel: '간트', path: '/project?view=gantt', icon: '📊' },
        { label: '대시보드', shortLabel: '대시보드', path: '/project?view=dashboard', icon: '📈' },
        { label: '프로젝트 등록', shortLabel: '등록', path: '/project?view=register', icon: '📝' },
        { label: '프로젝트 리스트', shortLabel: '리스트', path: '/project?view=list', icon: '📋' },
        { label: 'CFT 관리', shortLabel: 'CFT', path: '/project?view=cft', icon: '👥' },
        { label: '개정 관리', shortLabel: '개정', path: '/project?view=revision', icon: '📜' },
    ];

    return (
        <CommonTopNav
            title="Project"
            menuItems={menuItems}
            selectedId={selectedProjectId || undefined}
            gradientFrom="#1a237e"
            gradientTo="#283593"
        />
    );
}
