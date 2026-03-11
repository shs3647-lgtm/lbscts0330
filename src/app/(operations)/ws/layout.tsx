/**
 * @file layout.tsx
 * @description WS(작업표준서) 모듈 레이아웃
 * @version 1.0.0 - 2026-02-01
 * 
 * ★★★ UI/UX 코드프리즈 - 2026-02-01 ★★★
 * - layout.tsx는 children만 반환 (레이아웃 충돌 방지)
 * - 각 페이지에서 Sidebar/TopNav 사용
 * 
 * ⚠️ 이 파일 수정 금지 - 레이아웃 충돌 발생 위험
 */

export default function WSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
