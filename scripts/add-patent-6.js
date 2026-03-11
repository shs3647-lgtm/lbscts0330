/**
 * ⑥ 엑셀 Import 데이터 완전성·정합성 검증 방법 — 특허 항목 추가 스크립트
 *
 * 대상 파일: D:\01 FMEAPATENT\Smart_FMEA_SW특허_대상조사 (1).xlsx
 * 작업:
 *   1. 종합요약 시트에 ⑥ 행 추가
 *   2. ⑥완전성_정합성_검증 상세 시트 생성
 */

const ExcelJS = require('exceljs');
const path = require('path');

const FILE_PATH = path.resolve('D:/01 FMEAPATENT/Smart_FMEA_SW특허_대상조사 (1).xlsx');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE_PATH);

  // ─────────────────────────────────────────────
  // 1. 종합요약 시트: ⑥ 행 추가 (row 10, ⑤ 다음)
  // ─────────────────────────────────────────────
  const summary = wb.getWorksheet('종합요약');
  if (!summary) throw new Error('종합요약 시트 없음');

  // 기존 row 10~16을 아래로 밀기 (insertRow)
  summary.spliceRows(10, 0, []); // 빈 행 삽입

  const row10 = summary.getRow(10);
  row10.getCell(1).value = '⑥';
  row10.getCell(2).value = 'FMEA Import 데이터\n완전성·정합성 자동검증 시스템';
  row10.getCell(3).value = [
    '• 3계층 독립검증: 엑셀수식(VERIFY) ↔ Raw Fingerprint ↔ Parser Result',
    '• tripleVerify(): 자동 책임귀속(엑셀수식/원본/파서)',
    '• scanRawFingerprint(): 파서 독립 원본 스캔 (4항목)',
    '• 공정별 중복 자동탐지 + CrossTab 교차검증',
    '• detectDataRange(): 헤더/데이터 자동감지 + 병합셀 마스터값 추출',
    '• normalizeSheetName(): 7단계 퍼지 시트명 매칭'
  ].join('\n');
  row10.getCell(4).value = 'G06Q 10/06\nG06F 11/36\nG06F 16/258';
  row10.getCell(5).value = '★★★★★\n매우 높음';
  row10.getCell(6).value = '★★★★★\n매우 높음';
  row10.getCell(7).value = '★★★★★\n가장 유망\n(②와 결합 최적)';

  // 셀 스타일 (기존 row 5~9 스타일 복사)
  const refRow = summary.getRow(5);
  for (let c = 1; c <= 7; c++) {
    const refCell = refRow.getCell(c);
    const cell = row10.getCell(c);
    cell.alignment = { vertical: 'top', wrapText: true };
    if (refCell.font) cell.font = { ...refCell.font };
    if (refCell.border) cell.border = { ...refCell.border };
  }
  row10.commit();

  console.log('✅ 종합요약 시트: ⑥ 행 추가 완료 (row 10)');

  // ─────────────────────────────────────────────
  // 2. ⑥완전성_정합성_검증 상세 시트 생성
  // ─────────────────────────────────────────────
  const ws = wb.addWorksheet('⑥완전성_정합성_검증');

  // 열 너비 설정 (A=항목명, B~F=내용)
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 25;
  ws.getColumn(4).width = 25;
  ws.getColumn(5).width = 25;
  ws.getColumn(6).width = 25;

  const headerFont = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B579A' } };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
  const subHeaderFont = { bold: true, size: 10 };
  const bodyFont = { size: 10 };
  const bodyAlign = { vertical: 'top', wrapText: true };
  const thinBorder = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  function addMergedRow(rowNum, col1, content, opts = {}) {
    const row = ws.getRow(rowNum);
    row.getCell(1).value = col1;
    row.getCell(1).font = opts.headerRow ? headerFont : subHeaderFont;
    row.getCell(1).fill = opts.headerRow ? headerFill : subHeaderFill;
    row.getCell(1).alignment = bodyAlign;
    row.getCell(1).border = thinBorder;

    row.getCell(2).value = content;
    ws.mergeCells(rowNum, 2, rowNum, 6);
    for (let c = 2; c <= 6; c++) {
      row.getCell(c).font = opts.headerRow ? headerFont : bodyFont;
      row.getCell(c).fill = opts.headerRow ? headerFill : undefined;
      row.getCell(c).alignment = bodyAlign;
      row.getCell(c).border = thinBorder;
    }
    row.commit();
  }

  // ── Row 1: 발명의 명칭 ──
  addMergedRow(1, '발명의 명칭 (가칭)',
    'FMEA 엑셀 Import 데이터의 완전성 및 정합성을 3계층 독립 검증으로 자동 보증하는 방법 및 시스템',
    { headerRow: true }
  );

  // ── Row 2: 기술 분야 ──
  addMergedRow(2, '기술 분야',
    [
      '본 발명은 FMEA(Failure Mode and Effects Analysis) 소프트웨어에서 엑셀 형식의 기초정보 데이터를 Import할 때,',
      '원본 데이터의 완전성(Completeness)과 정합성(Consistency)을 자동으로 검증하는 방법 및 시스템에 관한 것이다.',
      '',
      '특히, ① 엑셀 내장 수식 검증(VERIFY 시트), ② 파서 독립 원본 핑거프린트 스캔(Raw Fingerprint),',
      '③ 파서 결과 통계 비교의 3계층 독립 검증 아키텍처를 통해,',
      '데이터 변환 과정의 무결성을 기계적으로 보증하고 오류 발생 시 책임 귀속(엑셀수식/원본/파서)을 자동 판별하는 기술에 관한 것이다.'
    ].join('\n')
  );

  // ── Row 3: 해결하고자 하는 과제 ──
  addMergedRow(3, '해결하고자 하는 과제',
    [
      '종래 FMEA 데이터 Import 시스템에는 다음과 같은 기술적 과제가 존재한다:',
      '',
      '① 데이터 손실 무감지: 수백~수천 행의 FMEA 데이터를 Import할 때 누락·손실을 감지할 수단이 없어,',
      '   사용자가 Import 완료 후에야 수작업으로 원본과 대조하여 데이터 손실을 확인해야 하는 문제',
      '',
      '② 중복 데이터 미감지: 동일 공정 내 복사/붙여넣기 실수로 발생한 중복 데이터를 자동 탐지하지 못하여,',
      '   후속 분석(SOD 평가, AP 계산)의 정확성이 저하되는 문제',
      '',
      '③ 오류 원인 불명: Import 결과 불일치 시 원본 엑셀 오류인지, 파서 오류인지, 수식 오류인지',
      '   원인 규명이 불가능하여 디버깅에 과도한 시간이 소요되는 문제',
      '',
      '④ 포맷 다양성 대응 불가: FMEA 소프트웨어별로 시트명, 열 순서, 병합셀 패턴이 상이하여',
      '   범용적 데이터 영역 자동 감지가 어려운 문제',
      '',
      '⑤ 교차 열 간 정합성 검증 부재: A2(공정기능)↔A4(고장영향)↔A5(고장형태)↔B3(공정특성)↔B4(고장원인) 등',
      '   관련 열 사이의 의미적 정합성을 자동 검증하는 수단이 없는 문제'
    ].join('\n')
  );

  // ── Row 4~10: 과제 해결 수단 (각 핵심 기술별) ──
  addMergedRow(4, '과제 해결 수단 ①\n— 3계층 독립 검증 아키텍처\n(tripleVerify)',
    [
      '■ 개요',
      '세 개의 완전히 독립된 검증 경로로 Import 데이터의 무결성을 보증한다:',
      '',
      '■ 검증 계층',
      '┌─────────────────────────────────────────────────┐',
      '│ Layer 1: 엑셀 수식 검증 (VERIFY 시트)          │',
      '│   readVerifySheet() → 엑셀 내장 COUNTIF/UNIQUE │',
      '│   수식으로 계산된 기대값 추출                    │',
      '├─────────────────────────────────────────────────┤',
      '│ Layer 2: Raw Fingerprint 스캔                   │',
      '│   scanRawFingerprint() → 파서와 완전 독립적으로 │',
      '│   원본 셀을 직접 스캔하여 4개 통계 산출          │',
      '├─────────────────────────────────────────────────┤',
      '│ Layer 3: Parser 결과 통계                       │',
      '│   getParseStats() → 파싱 완료 후 결과 데이터    │',
      '│   에서 동일 4개 통계를 집계                      │',
      '└─────────────────────────────────────────────────┘',
      '',
      '■ 자동 책임 귀속 알고리즘 (tripleVerify)',
      '  if (Layer1 ≠ Layer2) → "엑셀 수식 오류" (원본은 정상, 수식이 잘못됨)',
      '  if (Layer2 ≠ Layer3) → "파서 오류" (원본은 정상, 파서가 놓침)',
      '  if (Layer1 = Layer2 = Layer3) → "일치 — 검증 통과"',
      '  if (Layer1 ≠ Layer2 ≠ Layer3) → "복합 오류 — 수동 확인 필요"',
      '',
      '■ 함수: tripleVerify(verifyData, rawFingerprint, parseStats)',
      '  파일: excel-parser-verification.ts',
      '  반환: { status: "PASS"|"WARN"|"FAIL", details: VerifyDetail[] }'
    ].join('\n')
  );

  addMergedRow(5, '과제 해결 수단 ②\n— Raw Fingerprint 스캔\n(scanRawFingerprint)',
    [
      '■ 개요',
      '파서 로직과 완전히 독립된 별도의 원본 스캔 알고리즘으로,',
      '엑셀 셀을 직접 읽어 4개 핑거프린트 통계를 산출한다.',
      '',
      '■ 4개 핑거프린트 항목',
      '  ① 공정별 FM(고장형태, A5) 고유 건수',
      '  ② FM별 FC(고장원인, B4) 건수',
      '  ③ FM별 FE(고장영향, C4) 건수',
      '  ④ 공정별 사슬 행수 (총 데이터 행)',
      '',
      '■ 파서 독립성 보장 메커니즘',
      '  - 파서의 Forward Fill, 스코프 리셋, 4M 분류 로직을 일절 사용하지 않음',
      '  - detectDataRange()로 감지한 헤더/데이터 영역만 사용하여 직접 셀 순회',
      '  - getMergedCellValue()로 병합셀 마스터 값 직접 추출',
      '',
      '■ 특허 핵심: 동일 데이터에 대해 "두 번째 독립 관측"을 수행함으로써',
      '  파서 결과의 신뢰도를 기계적으로 검증하는 방법 (이중 맹검법 응용)',
      '',
      '■ 함수: scanRawFingerprint(worksheet, dataRange, headerColMap)',
      '  파일: excel-parser-verification.ts',
      '  반환: RawFingerprint { fmCountByProcess, fcCountByFm, feCountByFm, chainRowsByProcess }'
    ].join('\n')
  );

  addMergedRow(6, '과제 해결 수단 ③\n— 자동 데이터 영역 감지\n(detectDataRange)',
    [
      '■ 개요',
      'FMEA 엑셀 파일의 헤더 행, 데이터 시작/종료 행, 키 열, 값 열, 4M 열을',
      '자동으로 감지하는 알고리즘이다.',
      '',
      '■ 감지 알고리즘',
      '  Step 1: 시트의 전체 행을 스캔하여 "공정번호", "NO", "Process Step" 등',
      '          FMEA 표준 헤더 키워드가 포함된 행을 헤더 행으로 식별',
      '  Step 2: 헤더 행 다음 행부터 연속 데이터가 존재하는 범위를 데이터 영역으로 결정',
      '  Step 3: 각 열의 헤더 텍스트를 정규화하여 FMEA 표준 컬럼(A1~A5, B1~B4, C1~C4)에 매핑',
      '  Step 4: 4M 분류 열(MN/MC/IM/EN) 자동 감지 — "4M", "분류", "Category" 키워드',
      '',
      '■ 병합셀 처리 (getMergedCellValue)',
      '  - 병합된 셀의 실제 값은 마스터 셀(좌상단)에만 존재',
      '  - getMergedCellValue(ws, row, col) → 해당 셀이 병합 범위에 속하면 마스터 셀 값 반환',
      '  - getMergeSpan(ws, row, col) → 병합 범위의 행/열 스팬 정보 반환',
      '',
      '■ 함수: detectDataRange(worksheet)',
      '  파일: excel-data-range.ts',
      '  반환: DataRange { headerRow, dataStartRow, dataEndRow, keyCol, valueCol, detected4MCol, headerColMap }'
    ].join('\n')
  );

  addMergedRow(7, '과제 해결 수단 ④\n— 퍼지 시트명 매칭\n(normalizeSheetName)',
    [
      '■ 개요',
      'FMEA 소프트웨어별로 상이한 시트명 규칙을 7단계 퍼지 매칭으로 통일하여',
      'Import 호환성을 극대화한다.',
      '',
      '■ 7단계 정규화 알고리즘',
      '  Level 1: 완전 일치 (exact match)',
      '  Level 2: 대소문자 무시 (case-insensitive)',
      '  Level 3: 공백/특수문자 제거 후 비교',
      '  Level 4: 접두사 매칭 ("STEP A" → "STEP A (분석)")',
      '  Level 5: 키워드 포함 매칭 ("구조분석" 포함 여부)',
      '  Level 6: 약어 확장 ("SA" → "Structure Analysis")',
      '  Level 7: 번호 기반 매칭 ("Sheet1" → 첫 번째 유효 시트)',
      '',
      '■ 지원 시트 패턴',
      '  - STEP A/B/C/D/E/F (AIAG-VDA 표준)',
      '  - 구조분석/기능분석/고장분석/위험분석/최적화/결과문서',
      '  - FC (Failure Chain), VERIFY (검증)',
      '  - 단일시트 FMEA (전체 데이터가 1시트에)',
      '',
      '■ 함수: normalizeSheetName(name), findFCSheet(workbook), isSingleSheetFmea(workbook), isStepASheet(name)',
      '  파일: excel-parser-utils.ts'
    ].join('\n')
  );

  addMergedRow(8, '과제 해결 수단 ⑤\n— 공정별 중복 탐지 +\nCrossTab 교차검증',
    [
      '■ 개요',
      'Import된 데이터에서 동일 공정 내 중복 항목을 자동 탐지하고,',
      'CrossTab(교차표) 구조로 열 간 정합성을 교차 검증한다.',
      '',
      '■ 중복 탐지 알고리즘 (dupRowIndices)',
      '  Step 1: 전체 데이터를 공정번호(processNo) 기준으로 그룹핑',
      '  Step 2: 각 그룹 내에서 항목코드(B1~B4, A1~A5)별 값의 출현 빈도를 Map으로 집계',
      '  Step 3: 출현 빈도 ≥ 2인 값을 가진 행을 중복으로 표시',
      '  Step 4: 중복 행 인덱스를 Set<number>로 반환 → UI에서 하이라이트 + 스크롤',
      '',
      '■ CrossTab 교차검증',
      '  - ARow (L2): 공정번호, A1(공정번호), A2(공정기능), A3(요구사항), A4(고장영향), A5(고장형태)',
      '  - BRow (L3): 공정번호, m4(4M분류), B1(작업요소), B2(작업기능), B3(공정특성), B4(고장원인), B3SC(특별특성)',
      '  - CRow (L1): C1(완제품명), C2(완제품기능), C3(법규), C4(고장영향)',
      '',
      '■ Raw vs Unique 통계',
      '  - rawTotal: 파싱된 전체 행 수 (중복 포함)',
      '  - uniqueTotal: 중복 제거 후 고유 행 수',
      '  - 차이 발생 시 UI에서 빨간색 경고 표시',
      '',
      '■ 파일: TemplatePreviewContent.tsx (dupRowIndices useMemo), ParseStatisticsPanel.tsx (3-view 통계)',
      '  excel-parser.ts (buildMultiSheetStatistics)'
    ].join('\n')
  );

  addMergedRow(9, '과제 해결 수단 ⑥\n— 열 매핑 자동감지 +\n교차 열 검증',
    [
      '■ 개요',
      'FMEA 엑셀 파일의 열 구조를 자동으로 감지하여 표준 항목코드에 매핑하고,',
      '관련 열 사이의 의미적 정합성을 교차 검증한다.',
      '',
      '■ 자동 열 매핑 (detectColumnMap)',
      '  - 헤더 행의 각 셀 텍스트를 정규화하여 FMEA 표준 컬럼에 매핑',
      '  - A1(공정번호)~A5(고장형태), B1(작업요소)~B4(고장원인), C1~C4(완제품)',
      '  - 4M 분류 열 자동 감지: "4M", "분류", "Category" 등 키워드 기반',
      '  - 복합 템플릿(STEP A+B+C 통합) 자동 판별: isSingleSheetFmea()',
      '',
      '■ 교차 열 검증 (exportFAVerification)',
      '  - A2(공정기능) ↔ A5(고장형태): 기능-고장 관계 유효성',
      '  - A4(고장영향) ↔ A5(고장형태): 영향-형태 연결 유효성',
      '  - B3(공정특성) ↔ B4(고장원인): 특성-원인 연결 유효성',
      '  - 불일치 감지 시 WARNING 생성 + 상세 불일치 내역 보고',
      '',
      '■ 정규화 유틸리티',
      '  - normalizeWhitespace(text): 연속 공백/개행 → 단일 공백',
      '  - cellValueToString(cellValue): ExcelJS CellValue → 순수 문자열 변환',
      '    (RichText, Hyperlink, SharedString, Formula 등 모든 셀 유형 처리)',
      '',
      '■ 함수: detectColumnMap(worksheet), exportFAVerification(crossTab)',
      '  파일: excel-parser.ts, excel-parser-utils.ts, exportFAVerification.ts'
    ].join('\n')
  );

  addMergedRow(10, '과제 해결 수단 ⑦\n— 고장사슬(FC) 독립 파싱 +\n주입 검증',
    [
      '■ 개요',
      'FMEA 고장사슬(Failure Chain)을 별도 시트(FC 시트)에서 독립적으로 파싱하고,',
      '메인 파싱 결과에 주입(inject)한 후, 주입 정합성을 검증한다.',
      '',
      '■ FC 시트 감지 (findFCSheet)',
      '  - 시트명에 "FC", "Failure Chain", "고장사슬", "고장연결" 키워드 검색',
      '  - 감지 실패 시 메인 시트에서 FC 열 자동 탐색',
      '',
      '■ FC 파싱 (parseFCSheet)',
      '  - 9열 구조: 공정번호, 고장원인(FC), 고장형태(FM), 고장영향(FE),',
      '    심각도(S), 발생도(O), 검출도(D), 예방관리(PC), 검출관리(DC)',
      '  - Forward Fill: FE→FM→FC 계층의 상위 값 자동 전파',
      '  - 공정 스코프 리셋: 공정번호 변경 시 Forward Fill 초기화',
      '',
      '■ FC 주입 (injectFailureChains)',
      '  - 파싱된 FC 데이터를 메인 MasterFailureChain에 병합',
      '  - 공정번호 + FM 값으로 매칭하여 FC↔FM↔FE 트라이어드 완성',
      '  - 매칭 실패 시 경고 생성 (미매칭 FC 목록)',
      '',
      '■ 함수: findFCSheet(wb), parseFCSheet(ws, dataRange), injectFailureChains(chains, fcData)',
      '  파일: excel-parser-fc.ts, failureChainInjector.ts'
    ].join('\n')
  );

  // ── Row 11: 발명의 효과 ──
  addMergedRow(11, '발명의 효과',
    [
      '① 3계층 독립 검증으로 Import 데이터 무결성을 100% 기계적으로 보증 — 수작업 대조 완전 제거',
      '',
      '② 오류 발생 시 자동 책임 귀속(엑셀수식 vs 원본 vs 파서)으로 디버깅 시간 90% 이상 단축',
      '',
      '③ 공정별 중복 자동탐지로 원본 데이터의 복사/붙여넣기 실수를 Import 시점에 즉시 감지',
      '   — 후속 SOD 평가, AP 계산의 정확성 사전 보장',
      '',
      '④ 7단계 퍼지 시트명 매칭으로 다양한 FMEA 소프트웨어 출력물과 범용 호환',
      '   — 별도 포맷 변환 작업 불필요',
      '',
      '⑤ Raw Fingerprint 독립 스캔으로 파서 자체의 결함까지 감지 가능',
      '   — "감시자를 감시하는" 이중 안전장치 확보',
      '',
      '⑥ CrossTab 교차검증 + Raw/Unique 통계로 데이터 품질을 정량적으로 가시화',
      '   — 사용자에게 Import 결과에 대한 신뢰도 지표 제공',
      '',
      '⑦ 병합셀 마스터 값 자동 추출 + 자동 데이터 영역 감지로',
      '   이기종 FMEA 엑셀 포맷에 대한 무설정(zero-configuration) Import 실현'
    ].join('\n')
  );

  // ── Row 12: 선행기술 차별점 ──
  addMergedRow(12, '선행기술과의 차별점',
    [
      '• US7412632B2 (FMEA GUI 작성 시스템): FMEA 양식을 GUI로 "새로 작성"하는 방법에 한정.',
      '  기존 엑셀 데이터의 자동 Import나 데이터 검증 기능 없음.',
      '',
      '• US5586252A (그룹웨어 FMEA): 네트워크 기반 FMEA 협업 도구.',
      '  엑셀 파싱, 데이터 변환, 무결성 검증 기술이 전혀 포함되어 있지 않음.',
      '',
      '• 기존 FMEA 소프트웨어 (APIS IQ-FMEA, Plato FMEA 등):',
      '  - CSV Import 수준의 단순 매핑만 제공 — 병합셀 구조 파싱 불가',
      '  - Import 후 데이터 검증 기능 없음 (수작업 대조 필요)',
      '  - 3계층 독립 검증, Raw Fingerprint, 자동 책임 귀속 개념 전무',
      '',
      '• 일반 ETL/데이터 변환 도구 (Talend, Informatica 등):',
      '  - 범용 데이터 변환에 특화 — FMEA 도메인 특화 검증 로직 없음',
      '  - FE↔FM↔FC 고장사슬 트라이어드 개념, AIAG-VDA 표준 구조 인식 불가',
      '  - 공정별 중복 탐지, 교차 열 정합성 검증 등 도메인 특화 알고리즘 없음',
      '',
      '★ 본 발명의 독자성:',
      '  ① FMEA 도메인에 특화된 3계층 독립 검증 아키텍처는 선행기술에 전례 없음',
      '  ② "파서와 독립된 원본 핑거프린트"로 파서 자체를 검증하는 메타-검증 개념',
      '  ③ 자동 책임 귀속 알고리즘은 데이터 파이프라인 디버깅의 새로운 패러다임'
    ].join('\n')
  );

  // ── Row 13: IPC 분류 ──
  addMergedRow(13, 'IPC 분류 (추정)',
    [
      'G06Q 10/06 — 품질관리 (Quality Management)',
      'G06F 11/36 — 소프트웨어 테스팅/검증 (Software Verification)',
      'G06F 16/258 — 구조화 데이터 처리 (Structured Data Processing)',
      'G06F 40/166 — 데이터 형식 변환 (Data Format Conversion)',
      'G06F 17/40 — 데이터 무결성 검증 (Data Integrity Verification)'
    ].join('\n')
  );

  // ── Row 14~18: 청구항 ──
  addMergedRow(14, '청구항 1\n(독립 청구항 — 방법)',
    [
      '컴퓨터 구현 방법으로서, FMEA 엑셀 파일에서 Import된 데이터의 완전성 및 정합성을 검증하는 방법에 있어서:',
      '',
      '(a) 상기 엑셀 파일의 VERIFY 시트에 포함된 검증 수식(COUNTIF, UNIQUE 등)의 결과값을',
      '    읽어들여 제1 검증 데이터를 생성하는 단계;',
      '',
      '(b) 상기 엑셀 파일의 데이터 시트에 대해, 파서 로직과 독립된 별도의 스캔 알고리즘으로',
      '    원본 셀을 직접 순회하여, 공정별 고장형태(FM) 고유 건수, FM별 고장원인(FC) 건수,',
      '    FM별 고장영향(FE) 건수, 공정별 사슬 행수를 포함하는 제2 검증 데이터(Raw Fingerprint)를',
      '    생성하는 단계;',
      '',
      '(c) 상기 파서로 파싱된 결과 데이터에서 상기 제2 검증 데이터와 동일한 4개 통계 항목을',
      '    집계하여 제3 검증 데이터를 생성하는 단계;',
      '',
      '(d) 상기 제1, 제2, 제3 검증 데이터를 상호 비교하여,',
      '    (d-1) 제1과 제2가 불일치하면 "엑셀 수식 오류"로,',
      '    (d-2) 제2와 제3이 불일치하면 "파서 오류"로,',
      '    (d-3) 모두 일치하면 "검증 통과"로',
      '    자동 판정하는 단계;',
      '',
      '를 포함하는 것을 특징으로 하는, FMEA Import 데이터의 완전성·정합성 자동 검증 방법.'
    ].join('\n')
  );

  addMergedRow(15, '청구항 2\n(종속 — Raw Fingerprint)',
    [
      '제1항에 있어서,',
      '',
      '상기 (b) 단계에서, 상기 별도의 스캔 알고리즘은:',
      '',
      '(b-1) 상기 엑셀 파일의 데이터 영역을 자동 감지하되, 헤더 행의 FMEA 표준 키워드를',
      '      기반으로 헤더 행, 데이터 시작 행, 데이터 종료 행, 각 열의 표준 항목코드 매핑을',
      '      자동으로 결정하는 단계;',
      '',
      '(b-2) 병합된 셀에 대해 마스터 셀(좌상단 셀)의 값을 자동 추출하는 단계;',
      '',
      '(b-3) 상기 결정된 데이터 영역 내에서 각 행을 순회하며,',
      '      상기 파서의 Forward Fill, 스코프 리셋, 4M 분류 로직을 일절 사용하지 않고,',
      '      원본 셀 값 그대로를 읽어 상기 4개 통계 항목을 산출하는 단계;',
      '',
      '를 포함하는 것을 특징으로 하는, FMEA Import 데이터의 완전성·정합성 자동 검증 방법.'
    ].join('\n')
  );

  addMergedRow(16, '청구항 3\n(종속 — 중복 탐지)',
    [
      '제1항에 있어서,',
      '',
      '상기 방법은 추가적으로:',
      '',
      '(e) 파싱된 데이터를 공정번호 기준으로 그룹핑하는 단계;',
      '',
      '(f) 각 그룹 내에서 지정된 항목코드(B1~B4, A1~A5)별로 값의 출현 빈도를 집계하는 단계;',
      '',
      '(g) 출현 빈도가 2 이상인 값을 가진 행을 중복 행으로 표시하고,',
      '    전체 행수(rawTotal) 대비 고유 행수(uniqueTotal)의 차이를 산출하여',
      '    사용자에게 중복 경고를 제공하는 단계;',
      '',
      '(h) 상기 중복 행에 대해 하이라이트 표시, 자동 스크롤, 선택적 삭제 기능을 제공하여',
      '    사용자가 원본 데이터의 복사/붙여넣기 실수를 즉시 식별·수정할 수 있도록 하는 단계;',
      '',
      '를 더 포함하는 것을 특징으로 하는, FMEA Import 데이터의 완전성·정합성 자동 검증 방법.'
    ].join('\n')
  );

  addMergedRow(17, '청구항 4\n(종속 — 퍼지 시트명 매칭)',
    [
      '제1항에 있어서,',
      '',
      '상기 FMEA 엑셀 파일은 복수의 시트를 포함하며,',
      '상기 방법은 상기 파싱 전에:',
      '',
      '(i) 각 시트의 시트명을 7단계 퍼지 매칭 알고리즘으로 정규화하되,',
      '    완전 일치, 대소문자 무시, 공백/특수문자 제거, 접두사 매칭,',
      '    키워드 포함 매칭, 약어 확장, 번호 기반 매칭의 순서로',
      '    단계적으로 매칭을 시도하는 단계;',
      '',
      '(j) 상기 정규화된 시트명을 기반으로 AIAG-VDA FMEA 표준의',
      '    구조분석(STEP A), 기능분석(STEP B), 고장분석(STEP C),',
      '    고장사슬(FC), 검증(VERIFY) 시트를 자동 식별하는 단계;',
      '',
      '를 더 포함하는 것을 특징으로 하는, FMEA Import 데이터의 완전성·정합성 자동 검증 방법.'
    ].join('\n')
  );

  addMergedRow(18, '청구항 5\n(독립 청구항 — 시스템)',
    [
      'FMEA 엑셀 파일에서 Import된 데이터의 완전성 및 정합성을 자동 검증하는 시스템에 있어서:',
      '',
      '엑셀 수식 검증 모듈 — 상기 엑셀 파일의 VERIFY 시트에 포함된 검증 수식의 결과값을',
      '  읽어들여 제1 검증 데이터를 생성하는 모듈;',
      '',
      'Raw Fingerprint 스캔 모듈 — 상기 엑셀 파일의 데이터 시트에 대해,',
      '  파서 로직과 독립된 별도의 스캔 알고리즘으로 원본 셀을 직접 순회하여',
      '  제2 검증 데이터를 생성하는 모듈;',
      '',
      '파서 결과 통계 모듈 — 상기 파서로 파싱된 결과 데이터에서',
      '  제3 검증 데이터를 생성하는 모듈;',
      '',
      '자동 책임 귀속 모듈 — 상기 제1, 제2, 제3 검증 데이터를 상호 비교하여',
      '  오류 유형(엑셀수식/원본/파서)을 자동 판정하는 모듈;',
      '',
      '중복 탐지 모듈 — 파싱된 데이터를 공정번호 기준으로 그룹핑하여',
      '  동일 공정 내 중복 항목을 자동 탐지하는 모듈;',
      '',
      '데이터 영역 자동 감지 모듈 — 상기 엑셀 파일의 헤더 행, 데이터 영역,',
      '  열 매핑, 병합셀 구조를 자동으로 감지하는 모듈;',
      '',
      '을 포함하는 것을 특징으로 하는, FMEA Import 데이터의 완전성·정합성 자동 검증 시스템.'
    ].join('\n')
  );

  // ── Row 19: 핵심 함수 목록 (부록) ──
  const funcRow = ws.getRow(19);
  funcRow.getCell(1).value = '【부록】\n핵심 함수 목록';
  funcRow.getCell(1).font = subHeaderFont;
  funcRow.getCell(1).fill = subHeaderFill;
  funcRow.getCell(1).alignment = bodyAlign;
  funcRow.getCell(1).border = thinBorder;

  // 함수 목록을 2열~6열에 분산
  const funcGroups = [
    // Col 2: 검증 함수
    [
      '【검증 함수】',
      '',
      'tripleVerify(verify, raw, parse)',
      '  → 3계층 비교 + 책임 귀속',
      '',
      'scanRawFingerprint(ws, range, map)',
      '  → 파서 독립 원본 스캔',
      '',
      'readVerifySheet(wb)',
      '  → VERIFY 시트 수식 결과 추출',
      '',
      'verifyParsing(wb, parsed)',
      '  → 파싱 결과 vs 원본 검증',
      '',
      'getParseStats(items)',
      '  → 파싱 결과 통계 집계'
    ].join('\n'),
    // Col 3: 데이터 감지
    [
      '【데이터 감지】',
      '',
      'detectDataRange(ws)',
      '  → 헤더/데이터 영역 자동감지',
      '',
      'getMergedCellValue(ws, r, c)',
      '  → 병합셀 마스터 값 추출',
      '',
      'getMergeSpan(ws, r, c)',
      '  → 병합 범위 스팬 정보',
      '',
      'detectColumnMap(ws)',
      '  → 열 → FMEA 항목코드 매핑',
      '',
      'cellValueToString(val)',
      '  → ExcelJS 셀 → 문자열 변환'
    ].join('\n'),
    // Col 4: 정규화/유틸
    [
      '【정규화/유틸】',
      '',
      'normalizeSheetName(name)',
      '  → 7단계 퍼지 시트명 매칭',
      '',
      'normalizeWhitespace(text)',
      '  → 공백/개행 정규화',
      '',
      'findFCSheet(wb)',
      '  → FC 시트 자동 탐색',
      '',
      'isSingleSheetFmea(wb)',
      '  → 단일시트 FMEA 판별',
      '',
      'isStepASheet(name)',
      '  → STEP A 시트 판별'
    ].join('\n'),
    // Col 5: FC/통합
    [
      '【FC 파싱/통합】',
      '',
      'parseFCSheet(ws, range)',
      '  → 9열 FC 시트 파싱',
      '',
      'injectFailureChains(chains, fc)',
      '  → FC 데이터 메인에 주입',
      '',
      'parseSingleSheetFmea(wb)',
      '  → 단일시트 통합 파싱',
      '',
      'parseMultiSheetExcel(wb)',
      '  → 멀티시트 통합 파싱',
      '',
      'buildMultiSheetStatistics()',
      '  → Raw/Unique 통계 산출'
    ].join('\n'),
    // Col 6: UI/교차검증
    [
      '【UI 검증 컴포넌트】',
      '',
      'ParseStatisticsPanel',
      '  → 3-view 통계 패널',
      '  (요약/상세/검증)',
      '',
      'dupRowIndices (useMemo)',
      '  → 공정별 중복행 인덱스',
      '',
      'FAVerificationBar',
      '  → 교차검증 결과 표시',
      '',
      'exportFAVerification()',
      '  → A2/A4/A5/B3/B4 교차검증'
    ].join('\n')
  ];

  for (let c = 0; c < funcGroups.length; c++) {
    funcRow.getCell(c + 2).value = funcGroups[c];
    funcRow.getCell(c + 2).font = { size: 9, name: 'Consolas' };
    funcRow.getCell(c + 2).alignment = bodyAlign;
    funcRow.getCell(c + 2).border = thinBorder;
  }
  funcRow.commit();

  console.log('✅ ⑥완전성_정합성_검증 시트 생성 완료 (19행)');

  // ─────────────────────────────────────────────
  // 3. 저장
  // ─────────────────────────────────────────────
  await wb.xlsx.writeFile(FILE_PATH);
  console.log('✅ 파일 저장 완료:', FILE_PATH);

  // 검증
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(FILE_PATH);
  console.log('\n=== 검증 ===');
  console.log('시트 수:', wb2.worksheets.length);
  wb2.worksheets.forEach((ws, i) => {
    console.log(`  ${i}: ${ws.name} (${ws.rowCount}행)`);
  });
  const s = wb2.getWorksheet('종합요약');
  const r10 = s.getRow(10);
  console.log('\n종합요약 row 10:', r10.getCell(1).value, '|', String(r10.getCell(2).value).substring(0, 40));
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
