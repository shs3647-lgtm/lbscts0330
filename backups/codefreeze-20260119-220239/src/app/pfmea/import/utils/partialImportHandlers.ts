/**
 * @file partialImportHandlers.ts
 * @description 개별 항목 입포트 핸들러 유틸리티
 * @updated 2026-01-18 - 템플릿 시트명 매핑 적용, 파일명 기반 자동 인식
 */

import { ImportedFlatData } from '../types';
import { PREVIEW_OPTIONS } from '../sampleData';

interface PartialImportState {
  partialItemCode: string;
  setPartialItemCode?: React.Dispatch<React.SetStateAction<string>>;  // 파일명 기반 자동 선택용
  setPartialFileName: React.Dispatch<React.SetStateAction<string>>;
  setIsPartialParsing: React.Dispatch<React.SetStateAction<boolean>>;
  setPartialPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  flatData: ImportedFlatData[];  // A1 공정번호 매핑용
}

/**
 * 파일명에서 항목 코드 자동 인식
 * 예: "입포트_L2-2 공정명_2026-01-17 (2).xlsx" → "A2"
 *     "L3-4 고장원인_sample.xlsx" → "B4"
 */
function detectItemCodeFromFileName(fileName: string): string | null {
  // 파일명을 소문자로 변환하고 공백 정규화
  const normalizedName = fileName.toLowerCase().replace(/\s+/g, ' ');

  // L1, L2, L3 패턴 매칭 (예: l2-2, l3-4, l1-1)
  const patterns = [
    // L2-1 ~ L2-6 (A1 ~ A6)
    { regex: /l2[_\-\s]*1/i, code: 'A1', keywords: ['공정번호'] },
    { regex: /l2[_\-\s]*2/i, code: 'A2', keywords: ['공정명'] },
    { regex: /l2[_\-\s]*3/i, code: 'A3', keywords: ['공정기능'] },
    { regex: /l2[_\-\s]*4/i, code: 'A4', keywords: ['제품특성'] },
    { regex: /l2[_\-\s]*5/i, code: 'A5', keywords: ['고장형태'] },
    { regex: /l2[_\-\s]*6/i, code: 'A6', keywords: ['검출관리'] },
    // L3-1 ~ L3-5 (B1 ~ B5)
    { regex: /l3[_\-\s]*1/i, code: 'B1', keywords: ['작업요소'] },
    { regex: /l3[_\-\s]*2/i, code: 'B2', keywords: ['요소기능'] },
    { regex: /l3[_\-\s]*3/i, code: 'B3', keywords: ['공정특성'] },
    { regex: /l3[_\-\s]*4/i, code: 'B4', keywords: ['고장원인'] },
    { regex: /l3[_\-\s]*5/i, code: 'B5', keywords: ['예방관리'] },
    // L1-1 ~ L1-4 (C1 ~ C4)
    { regex: /l1[_\-\s]*1/i, code: 'C1', keywords: ['구분'] },
    { regex: /l1[_\-\s]*2/i, code: 'C2', keywords: ['제품기능'] },
    { regex: /l1[_\-\s]*3/i, code: 'C3', keywords: ['요구사항'] },
    { regex: /l1[_\-\s]*4/i, code: 'C4', keywords: ['고장영향'] },
  ];

  // 1. 정규식 패턴으로 먼저 검색 (L2-2, L3-4 등)
  for (const pattern of patterns) {
    if (pattern.regex.test(fileName)) {
      console.log(`📁 파일명 "${fileName}"에서 패턴 ${pattern.code} 감지`);
      return pattern.code;
    }
  }

  // 2. 키워드로 검색 (공정명, 고장원인 등)
  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (normalizedName.includes(keyword.toLowerCase())) {
        console.log(`📁 파일명 "${fileName}"에서 키워드 "${keyword}" 감지 → ${pattern.code}`);
        return pattern.code;
      }
    }
  }

  return null;
}

/**
 * itemCode에 해당하는 시트명과 열 인덱스 조회
 */
function getSheetInfo(itemCode: string): { sheetName: string; colIndex: number } | null {
  const option = PREVIEW_OPTIONS.find(opt => opt.value === itemCode);
  if (!option) return null;
  return {
    sheetName: option.sheetName,
    colIndex: option.colIndex,
  };
}

/**
 * 시트 찾기 - 핵심 키워드로 시트 검색 (예: 공정명, 공정번호)
 * @param workbook Excel 워크북
 * @param keyword 찾으려는 핵심 키워드 (예: "공정명")
 */
function findSheet(workbook: any, keyword: string): any | null {
  let sheet = null;
  const keywordLower = keyword.toLowerCase();

  // 1. 정확한 이름으로 시트 찾기
  sheet = workbook.getWorksheet(keyword);
  if (sheet) return sheet;

  // 2. 키워드가 포함된 시트 찾기 (예: "공정명" → "L2-2 공정명" 시트 매칭)
  workbook.eachSheet((ws: any) => {
    if (ws.name.toLowerCase().includes(keywordLower)) {
      sheet = ws;
    }
  });

  return sheet;
}

/**
 * 개별 입포트 파일 선택 및 파싱
 */
export async function handlePartialFileSelect(
  file: File,
  state: PartialImportState
): Promise<void> {
  const {
    partialItemCode: initialItemCode,
    setPartialItemCode,
    setPartialFileName,
    setIsPartialParsing,
    setPartialPendingData,
    flatData
  } = state;

  // ✅ A1 value(공정번호) → 내부 processNo 매핑 생성
  const a1ValueToProcessNo = new Map<string, string>();
  flatData.filter((d) => d.itemCode === 'A1').forEach((d) => {
    if (d.value) {
      a1ValueToProcessNo.set(d.value, d.processNo);
    }
  });

  setPartialFileName(file.name);
  setIsPartialParsing(true);

  try {
    // 파일명에서 항목 코드 자동 인식
    const detectedCode = detectItemCodeFromFileName(file.name);
    const partialItemCode = detectedCode || initialItemCode;

    // 자동 인식된 경우 드롭다운도 업데이트
    if (detectedCode && setPartialItemCode && detectedCode !== initialItemCode) {
      setPartialItemCode(detectedCode);
      const option = PREVIEW_OPTIONS.find(opt => opt.value === detectedCode);
      console.log(`🔄 파일명 기반 자동 선택: ${option?.label || detectedCode}`);
    }

    // ✅ 파일명 검증 - 항목명만 확인 (예: 공정명, 공정번호)
    const currentOption = PREVIEW_OPTIONS.find(opt => opt.value === partialItemCode);
    const expectedLabel = currentOption?.label || partialItemCode;
    const fileName = file.name.toLowerCase();
    const itemName = (expectedLabel.split(' ')[1] || expectedLabel).toLowerCase();  // 공정명

    if (!fileName.includes(itemName) && !detectedCode) {
      const proceed = confirm(
        `⚠️ 파일명에 "${itemName}"가 포함되어 있지 않습니다.\n\n` +
        `현재 선택된 항목: ${expectedLabel}\n` +
        `업로드 파일: ${file.name}\n\n` +
        `계속 진행하시겠습니까?`
      );
      if (!proceed) {
        setIsPartialParsing(false);
        return;
      }
    }

    // Excel 파일 읽기
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    // 시트 정보 조회 (sheetName, colIndex)
    const sheetInfo = getSheetInfo(partialItemCode);
    if (!sheetInfo) {
      alert(`항목 코드 "${partialItemCode}"에 대한 시트 정보를 찾을 수 없습니다.`);
      setIsPartialParsing(false);
      return;
    }

    // 시트 목록 로깅 (디버깅용)
    const sheetNames: string[] = [];
    workbook.eachSheet((ws: any) => {
      sheetNames.push(ws.name);
    });
    console.log(`📋 Excel 시트 목록: ${sheetNames.join(', ')}`);

    // 개별입포트 다운로드 파일의 시트명은 항목명만 사용 (예: "공정명")
    // downloadPreview.ts에서 simpleName으로 생성됨 (L코드 제외)
    const option = PREVIEW_OPTIONS.find(opt => opt.value === partialItemCode);
    const fullLabel = option?.label || partialItemCode;
    const simpleName = fullLabel.split(' ')[1] || fullLabel;  // "L2-2 공정명" → "공정명"

    console.log(`🔍 찾는 시트 (개별입포트): "${simpleName}", 템플릿 시트: "${sheetInfo.sheetName}"`);

    // 핵심 키워드(공정명)로 시트 찾기
    let targetSheet = findSheet(workbook, simpleName);
    // 단일 시트만 있는 경우 첫 번째 시트 사용
    if (!targetSheet && sheetNames.length === 1) {
      console.log(`📌 단일 시트 파일 - 첫 번째 시트 사용: "${sheetNames[0]}"`);
      targetSheet = workbook.getWorksheet(1);
    }
    if (!targetSheet) {
      alert(
        `시트 "${sheetInfo.sheetName}"를 찾을 수 없습니다.\n\n` +
        `사용 가능한 시트: ${sheetNames.join(', ')}\n\n` +
        `템플릿 다운로드 후 해당 시트에 데이터를 입력해주세요.`
      );
      setIsPartialParsing(false);
      return;
    }

    console.log(`✅ 시트 발견: "${targetSheet.name}"`);

    // 헤더 행 분석하여 열 구조 파악
    const headerRow = targetSheet.getRow(1);
    const headers: string[] = [];
    for (let c = 1; c <= 10; c++) {
      const cellValue = headerRow.getCell(c).value;
      // ExcelJS RichText 객체 처리
      let val = '';
      if (cellValue && typeof cellValue === 'object' && 'richText' in cellValue) {
        val = (cellValue as any).richText.map((rt: any) => rt.text).join('').trim();
      } else {
        val = String(cellValue || '').trim();
      }
      headers.push(val);
    }
    console.log(`📊 헤더 구조 (raw): [${headers.map((h, i) => `${i + 1}:${h || '(empty)'}`).join(', ')}]`);

    // 헤더에서 열 위치 동적 감지 (0-based index)
    // downloadPreview.ts에서 생성하는 파일 구조: [NO, 공정번호, {항목명}]
    const noIdx = headers.findIndex(h =>
      h.toUpperCase() === 'NO' || h === 'No' || h === 'no'
    );
    const processNoIdx = headers.findIndex(h =>
      h === '공정번호' || h.includes('공정번호')
    );

    // 개별입포트 파일 형식 검증: 1열 = NO, 2열 = 공정번호
    // downloadPreview.ts의 헤더: ['NO', '공정번호', '{항목명}']
    if (noIdx !== 0 || processNoIdx !== 1) {
      const expectedHeader = `NO | 공정번호 | ${option?.label?.split(' ')[1] || '데이터'}`;
      const actualHeader = `${headers[0] || '(없음)'} | ${headers[1] || '(없음)'} | ${headers[2] || '(없음)'}`;
      alert(
        `개별 입포트 파일 형식이 아닙니다.\n\n` +
        `예상 헤더: ${expectedHeader}\n` +
        `실제 헤더: ${actualHeader}\n\n` +
        `개별 입포트 다운로드 버튼으로 받은 파일을 사용해주세요.`
      );
      console.error(`❌ 헤더 형식 불일치: noIdx=${noIdx}, processNoIdx=${processNoIdx}`);
      setIsPartialParsing(false);
      return;
    }

    // 개별입포트 형식 확인됨: NO=1열, 공정번호=2열, 데이터=3열
    let startRow = 2; // 기본값: 2행부터 데이터 (1행 헤더)
    console.log(`✅ 개별입포트 파일 형식 확인: 1열=NO(순번), 2열=공정번호, 3열=데이터`);

    // 2행이 안내행인지 확인 (필수/선택 표시)
    const row2 = targetSheet.getRow(2);
    const row2Val = String(row2.getCell(1).value || '').trim();
    if (row2Val.includes('필수') || row2Val.includes('선택')) {
      startRow = 3; // 3행부터 데이터
      console.log(`📌 안내행 감지: 데이터는 ${startRow}행부터 시작`);
    }

    // 시트가 원래 예상 시트가 아닌 경우 추가 로깅
    const isAlternativeSheet = targetSheet.name !== sheetInfo.sheetName;
    if (isAlternativeSheet) {
      console.log(`⚠️ 대체 시트 사용: "${targetSheet.name}" (원래: "${sheetInfo.sheetName}")`);
    }

    console.log(`📋 최종 파싱 설정: 시작행=${startRow}, 공정번호=2열, 데이터=3열`)

    // 데이터 파싱
    const newData: ImportedFlatData[] = [];
    const category = partialItemCode.charAt(0) as 'A' | 'B' | 'C';

    // 처음 몇 행 디버깅 출력
    console.log(`📊 처음 5행 데이터 샘플:`);
    for (let i = 1; i <= Math.min(5, targetSheet.rowCount); i++) {
      const row = targetSheet.getRow(i);
      const col1 = String(row.getCell(1).value || '').trim();
      const col2 = String(row.getCell(2).value || '').trim();
      const col3 = String(row.getCell(3).value || '').trim();
      console.log(`  행${i}: [1열(NO): "${col1}", 2열(공정번호): "${col2}", 3열(데이터): "${col3}"]`);
    }

    // startRow부터 읽기 (헤더와 안내행 제외)
    // ⚠️ 개별입포트 파일 구조: [NO(순번), 공정번호, 데이터]
    // - 1열: NO (순번) - 사용 안 함
    // - 2열: 공정번호 (10, 20, 30 등) - processNo로 사용
    // - 3열: 데이터값 (공정명 등) - value로 사용
    for (let i = startRow; i <= targetSheet.rowCount; i++) {
      const row = targetSheet.getRow(i);

      // 명시적으로 2열(공정번호)과 3열(데이터) 읽기
      const col1Value = String(row.getCell(1).value || '').trim(); // NO (순번)
      const col2Value = String(row.getCell(2).value || '').trim(); // 공정번호
      const col3Value = String(row.getCell(3).value || '').trim(); // 데이터

      // 공정번호는 2열에서 읽음
      const processNoValue = col2Value;
      // 데이터는 3열에서 읽음
      const dataValue = col3Value;

      // 유효성 검증: 빈 공정번호 스킵
      if (!processNoValue) {
        continue;
      }
      // 헤더 값 스킵: 'NO', '공정번호', 'L2-1' 등
      const upperValue = processNoValue.toUpperCase();
      if (upperValue === 'NO' || upperValue === '공정번호' || /^L\d+-\d+/.test(processNoValue)) {
        console.log(`  ⚠️ 행${i} 스킵: 헤더 값 ("${processNoValue}")`);
        continue;
      }

      // A1(공정번호)와 C1(구분)은 공정번호 열 값 자체가 데이터
      if (partialItemCode === 'A1' || partialItemCode === 'C1') {
        if (processNoValue) {
          newData.push({
            id: `${processNoValue}-${partialItemCode}-${i}-${Date.now()}`,
            processNo: partialItemCode === 'C1' ? 'ALL' : processNoValue,
            category,
            itemCode: partialItemCode,
            value: processNoValue,
            createdAt: new Date(),
          });
        }
      } else {
        // 다른 항목들: 공정번호(2열)와 데이터(3열) 사용
        if (processNoValue && dataValue) {
          // ✅ 엑셀 공정번호(A1 value) → 내부 processNo 변환
          const internalProcessNo = a1ValueToProcessNo.get(processNoValue) || processNoValue;
          newData.push({
            id: `${internalProcessNo}-${partialItemCode}-${i}-${Date.now()}`,
            processNo: category === 'C' ? 'ALL' : internalProcessNo,
            category,
            itemCode: partialItemCode,
            value: dataValue,
            createdAt: new Date(),
          });
          console.log(`  ✅ 행${i} 파싱: 공정번호="${processNoValue}" → processNo="${internalProcessNo}", value="${dataValue}"`);
        }
      }
    }

    console.log(`📊 파싱 결과: ${newData.length}건`);
    if (newData.length > 0) {
      console.log(`  첫번째 데이터: processNo="${newData[0].processNo}", value="${newData[0].value}"`);
    }

    if (newData.length === 0) {
      alert(
        `파싱된 데이터가 없습니다.\n\n` +
        `시트 "${targetSheet.name}"에서 데이터를 찾을 수 없습니다.\n\n` +
        `개별 입포트 파일 형식:\n` +
        `- 1행: 헤더 (NO, 공정번호, ${option?.label?.split(' ')[1] || '데이터'})\n` +
        `- 2행부터: 데이터\n` +
        `- 공정번호: 2열, 데이터: 3열`
      );
      setIsPartialParsing(false);
      return;
    }

    setPartialPendingData(newData);
    console.log(`✅ 개별 입포트 파싱 완료: ${newData.length}건 (${option?.label || partialItemCode})`);
  } catch (error) {
    console.error('개별 입포트 파싱 오류:', error);
    alert('파일 파싱 중 오류가 발생했습니다.\n\n' + (error as Error).message);
  } finally {
    setIsPartialParsing(false);
  }
}

/**
 * 개별 입포트 실행
 */
export function handlePartialImport(
  partialItemCode: string,
  partialPendingData: ImportedFlatData[],
  flatData: ImportedFlatData[],
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>,
  setPartialPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>,
  setPreviewColumn: React.Dispatch<React.SetStateAction<string>>,
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>
): void {
  if (partialPendingData.length === 0) {
    alert('Import할 데이터가 없습니다. 먼저 Excel 파일을 선택해주세요.');
    return;
  }

  // 기존 데이터에서 해당 항목 코드의 데이터 제거 후 새 데이터 추가 (중복 방지)
  const otherData = flatData.filter((d) => d.itemCode !== partialItemCode);
  const mergedData = [...otherData, ...partialPendingData];

  setFlatData(mergedData);
  setPartialPendingData([]);
  setPreviewColumn(partialItemCode); // 미리보기를 해당 항목으로 변경
  setIsSaved(false); // Import 후에는 저장 안 된 상태

  const option = PREVIEW_OPTIONS.find(opt => opt.value === partialItemCode);
  const label = option?.label || partialItemCode;
  alert(`✅ ${label} 항목 ${partialPendingData.length}건 Import 완료!`);
}
