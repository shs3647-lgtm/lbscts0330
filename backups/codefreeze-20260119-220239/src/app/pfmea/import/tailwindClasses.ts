/**
 * @file tailwindClasses.ts
 * @description PFMEA Import 페이지용 Tailwind CSS 클래스 정의
 */

// Tailwind CSS 클래스 정의 (인라인 스타일 대체)
export const tw = {
  // 테이블 래퍼
  tableWrapper: 'rounded-lg overflow-hidden border border-gray-400',
  // 헤더 셀
  headerCell: 'bg-[#00587a] text-white border border-gray-400 px-1.5 py-1 font-bold text-center whitespace-nowrap h-7 text-[11px]',
  headerCellSm: 'bg-[#00587a] text-white border border-gray-400 px-1.5 py-1 font-bold text-center whitespace-nowrap h-7 text-[10px]',
  // 행 헤더
  rowHeader: 'bg-[#00587a] text-white border border-gray-400 px-1.5 py-1 font-bold text-center whitespace-nowrap h-7 text-[11px]',
  rowHeaderSm: 'bg-[#00587a] text-white border border-gray-400 px-1.5 py-1 font-bold text-center whitespace-nowrap h-7 text-[10px]',
  // 일반 셀
  cell: 'bg-white border border-gray-400 px-1.5 py-1 whitespace-nowrap h-7 text-[11px]',
  cellCenter: 'bg-white border border-gray-400 px-1.5 py-1 whitespace-nowrap h-7 text-[11px] text-center',
  cellPad: 'bg-white border border-gray-400 p-0.5 whitespace-nowrap h-7 text-[11px] text-center',
  cellBlue: 'bg-[#e0f2fb] border border-gray-400 px-1.5 py-1 whitespace-nowrap h-7 text-[11px]',
  // 버튼
  btnPrimary: 'px-2 py-0.5 bg-[#00587a] text-white border-none rounded cursor-pointer whitespace-nowrap text-[10px]',
  btnSuccess: 'w-full px-2 py-1.5 bg-[#4caf50] text-white border-none rounded cursor-pointer text-[11px] font-bold',
  btnSuccessDisabled: 'w-full px-2 py-1.5 bg-gray-300 text-white border-none rounded cursor-not-allowed text-[11px] font-bold',
  btnDanger: 'px-2 py-0.5 bg-red-500 text-white border-none rounded cursor-pointer whitespace-nowrap text-[10px]',
  btnBlue: 'px-2 py-0.5 bg-blue-500 text-white border-none rounded cursor-pointer whitespace-nowrap text-[10px]',
  btnGreen: 'px-2 py-0.5 bg-green-500 text-white border-none rounded cursor-pointer whitespace-nowrap text-[10px]',
  btnBrowse: 'block px-2 py-1.5 bg-gray-100 border border-gray-300 rounded text-center text-[11px] font-medium',
  // 입력
  select: 'p-0.5 border border-gray-300 rounded w-full text-[10px]',
  selectBold: 'flex-1 px-2.5 py-1.5 border border-gray-400 rounded bg-white font-bold text-[12px]',
  selectTab: 'flex-1 px-2 py-2 border-none font-bold bg-[#e0f2fb] text-[#00587a] text-[12px]',
  input: 'w-full border border-gray-200 rounded-sm px-1 py-0.5 bg-[#fffef0] text-[11px]',
  inputCenter: 'w-full border border-gray-200 rounded-sm px-1 py-0.5 bg-[#fffef0] text-[11px] text-center',
  // 레이아웃
  page: 'px-3 pt-9 pb-3 bg-gray-100 min-h-screen font-[Malgun_Gothic,sans-serif]',
  title: 'text-base font-bold text-[#00587a] mb-3',
  sectionTitle: 'text-[13px] font-bold mb-1.5 text-[#00587a]',
  flexRow: 'flex gap-5 items-start mb-5',
  flexStretch: 'flex gap-5 items-stretch',
  // 패널
  panel: 'flex-1 flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg',
  panelFixed: 'w-[400px] shrink-0 flex flex-col border-2 border-[#00587a] rounded-lg overflow-hidden bg-white shadow-lg',
  panelHeader: 'text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2 bg-gradient-to-br from-[#00587a] to-[#007a9e]',
  panelToolbar: 'flex w-full border-b border-gray-400 shrink-0',
  panelContent: 'flex-1 overflow-y-auto border-t border-gray-200 bg-gray-50 max-h-[350px]',
  panelFooter: 'px-4 py-2 border-t-2 border-gray-800 text-center font-bold text-[11px] text-gray-700 shrink-0 bg-gradient-to-br from-[#e0f2fb] to-gray-100',
  // 툴바 버튼
  toolBtn: 'px-2.5 py-2 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]',
  toolBtnDl: 'px-2.5 py-2 bg-blue-50 text-blue-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]',
  toolBtnDel: 'px-2.5 py-2 bg-red-50 text-red-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]',
  toolBtnDelSel: 'px-2.5 py-2 bg-yellow-100 text-yellow-700 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px]',
  toolBtnSave: 'px-3 py-2 bg-purple-100 text-purple-800 border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] transition-colors',
  toolBtnSaved: 'px-3 py-2 bg-green-500 text-white border-none border-l border-gray-400 cursor-pointer font-bold text-[11px] transition-colors',
  // 경고
  warning: 'flex items-center gap-4 mb-4 px-4 py-2.5 bg-amber-50 border border-amber-400 rounded',
  warningText: 'font-bold text-red-600 whitespace-nowrap text-[12px]',
  // 순서 아이콘
  orderIcons: 'flex flex-col items-center justify-center gap-0',
};

// 레거시 인라인 스타일 (점진적 마이그레이션용)
export const headerStyle = { 
  background: '#00587a', 
  color: 'white', 
  border: '1px solid #999', 
  padding: '4px 6px', 
  fontWeight: 'bold', 
  textAlign: 'center' as const, 
  whiteSpace: 'nowrap' as const, 
  height: '28px', 
  fontSize: '11px' 
};

export const rowHeaderStyle = headerStyle;

export const cellStyle = { 
  background: 'white', 
  border: '1px solid #999', 
  padding: '4px 6px', 
  whiteSpace: 'nowrap' as const, 
  height: '28px', 
  fontSize: '11px' 
};

export const lightBlueStyle = { 
  background: '#e0f2fb', 
  border: '1px solid #999', 
  padding: '4px 6px', 
  whiteSpace: 'nowrap' as const, 
  height: '28px', 
  fontSize: '11px' 
};

export const tableWrapperStyle = { 
  borderRadius: '8px', 
  overflow: 'hidden', 
  border: '1px solid #999' 
};

export const sectionTitleStyle = { 
  fontSize: '13px', 
  fontWeight: 'bold', 
  marginBottom: '6px', 
  color: '#00587a' 
};


