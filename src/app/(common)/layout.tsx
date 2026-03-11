/**
 * @file 공통 가족 레이아웃
 * @description 인증, 대시보드, 관리자 등 공통 모듈 레이아웃
 * — "한지붕 세가족" 아키텍처의 공통 영역
 */

export default function CommonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
