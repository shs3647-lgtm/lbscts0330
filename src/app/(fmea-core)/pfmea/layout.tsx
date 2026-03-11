/**
 * @file layout.tsx
 * @description PFMEA 모듈 레이아웃
 * 
 * ★★★ UI/UX 코드프리즈 - 2026-01-27 ★★★
 * - layout.tsx는 children만 반환 (이중 패딩 방지)
 * - 각 페이지(page.tsx)에서 FixedLayout 또는 개별 레이아웃 사용
 * - 절대 Sidebar나 Margin을 여기에 추가하지 말 것! (이중 여백 원인)
 * 
 * ⚠️ 이 파일 수정 금지 - 레이아웃 충돌 발생 위험
 */

export default function PFMEALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
