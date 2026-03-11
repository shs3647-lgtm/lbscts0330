/**
 * @file stepToggleStyles.ts
 * @description 단계별 토글 버튼 스타일 상수 (공용)
 * @updated 2026-02-02 - 125% 줌 최적화
 */

/**
 * 단계별 토글 버튼 Tailwind CSS 클래스 상수
 */
export const STEP_TOGGLE_STYLES = {
  button: {
    base: 'px-1.5 py-px rounded transition-all cursor-pointer text-[10px] font-bold',
    active: 'bg-indigo-700 border border-yellow-400 text-yellow-400',
    inactive: 'bg-indigo-500 border border-white/30 text-white hover:bg-indigo-400 hover:text-yellow-400',
  },
  divider: 'w-px h-3.5 bg-white/30 mx-0.5',
  container: 'flex gap-1 items-center',
  buttonGroup: 'flex gap-0.5',
} as const;






