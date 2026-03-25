/**
 * @file layout.tsx
 * @description DFMEA 모듈 레이아웃
 *
 * - layout.tsx는 children만 반환 (이중 패딩 방지)
 * - 각 페이지(page.tsx)에서 FixedLayout 또는 개별 레이아웃 사용
 * - 절대 Sidebar나 Margin을 여기에 추가하지 말 것! (이중 여백 원인)
 */

export default function DFMEALayout({
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
