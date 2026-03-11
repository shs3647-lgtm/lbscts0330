/**
 * @file layout.tsx
 * @description Project 모듈 레이아웃
 * 
 * ★★★ UI/UX 코드프리즈 - 2026-02-01 ★★★
 * - layout.tsx는 children만 반환 (레이아웃 충돌 방지)
 * - 각 페이지에서 FixedLayout(showSidebar=true) 사용
 * 
 * ⚠️ 이 파일 수정 금지 - 레이아웃 충돌 발생 위험
 */

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
