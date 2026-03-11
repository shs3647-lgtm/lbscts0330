/**
 * @file v3-ui-no-a6b5.test.ts
 * @description v3.0 Import UI에서 A6(검출관리)/B5(예방관리) 관련 코드가 제거되었는지 검증
 *
 * A6/B5는 리스크 탭에서 입력하므로 Import UI에서는 표시/처리하지 않음
 */

import fs from 'fs';
import path from 'path';

const IMPORT_DIR = path.resolve(__dirname, '../../app/(fmea-core)/pfmea/import');

// 파일 읽기 헬퍼
function readFile(relativePath: string): string {
  const full = path.join(IMPORT_DIR, relativePath);
  return fs.readFileSync(full, 'utf-8');
}

describe('TODO-11: ImportPreviewPanel — A6/B5 제거', () => {
  const src = readFile('components/ImportPreviewPanel.tsx');

  test('B5가 getBK 함수의 itemCode 배열에 포함되지 않아야 함', () => {
    // getBK 함수 내 B5 포함된 배열 패턴 찾기
    const getBKMatch = src.match(/getBK[\s\S]*?includes\(d\.itemCode\)/);
    if (getBKMatch) {
      expect(getBKMatch[0]).not.toContain("'B5'");
    }
  });

  test('B5가 showM4Column 배열에 포함되지 않아야 함', () => {
    const showM4Match = src.match(/showM4Column[\s\S]*?includes\(previewColumn\)/);
    if (showM4Match) {
      expect(showM4Match[0]).not.toContain("'B5'");
    }
  });
});

describe('TODO-12: FailureChainPopup — pcValue/dcValue 제거', () => {
  const src = readFile('FailureChainPopup.tsx');

  test('pcItems (B5 필터링) 변수가 없어야 함', () => {
    // B5를 필터링하는 pcItems useMemo가 없어야 함
    expect(src).not.toMatch(/pcItems\s*=\s*useMemo/);
  });

  test('dcItems (A6 필터링) 변수가 없어야 함', () => {
    // A6를 필터링하는 dcItems useMemo가 없어야 함
    expect(src).not.toMatch(/dcItems\s*=\s*useMemo/);
  });

  test('selectedPC 상태가 없어야 함', () => {
    expect(src).not.toMatch(/selectedPC/);
  });

  test('selectedDC 상태가 없어야 함', () => {
    expect(src).not.toMatch(/selectedDC/);
  });

  test('예방관리(PC) 선택 섹션 UI가 없어야 함', () => {
    expect(src).not.toContain('예방관리 (PC)');
    expect(src).not.toContain('예방관리 (B5)');
  });

  test('검출관리(DC) 선택 섹션 UI가 없어야 함', () => {
    expect(src).not.toContain('검출관리 (DC)');
    expect(src).not.toContain('검출관리 (A6)');
  });

  test('체인 테이블에서 예방(PC)/검출(DC) 컬럼이 없어야 함', () => {
    expect(src).not.toContain('예방(PC)');
    expect(src).not.toContain('검출(DC)');
  });

  test('preventionCtrlId/detectionCtrlId가 체인 생성에 없어야 함', () => {
    expect(src).not.toMatch(/preventionCtrlId/);
    expect(src).not.toMatch(/detectionCtrlId/);
  });
});

describe('TODO-13: useRelationData — A6/B5 데이터 처리 제거', () => {
  const src = readFile('hooks/useRelationData.ts');

  test('RelationDataRow 인터페이스에 A6 필드 선언이 없어야 함', () => {
    const interfaceMatch = src.match(/interface\s+RelationDataRow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      // 필드 선언(A6?: string 등)이 없어야 함 — 주석 내 언급은 허용
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).not.toMatch(/A6\s*[?:]?\s*:\s*string/);
    }
  });

  test('RelationDataRow 인터페이스에 B5 필드 선언이 없어야 함', () => {
    const interfaceMatch = src.match(/interface\s+RelationDataRow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).not.toMatch(/B5\s*[?:]?\s*:\s*string/);
    }
  });

  test('A 탭 데이터에서 A6 매핑이 없어야 함', () => {
    // getRelationData에서 A6를 조회하는 부분
    expect(src).not.toMatch(/itemCode\s*===\s*'A6'/);
  });

  test('B 탭 데이터에서 B5 매핑이 없어야 함', () => {
    expect(src).not.toMatch(/itemCode\s*===\s*'B5'/);
  });
});

describe('FullAnalysisPreview — v3.1.1 pcValue/dcValue 복원', () => {
  const src = readFile('components/FullAnalysisPreview.tsx');

  test('AllRow 인터페이스에 pcValue 필드 선언이 있어야 함', () => {
    const interfaceMatch = src.match(/interface\s+AllRow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).toMatch(/pcValue\s*[?:]?\s*:\s*string/);
    }
  });

  test('AllRow 인터페이스에 dcValue 필드 선언이 있어야 함', () => {
    const interfaceMatch = src.match(/interface\s+AllRow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).toMatch(/dcValue\s*[?:]?\s*:\s*string/);
    }
  });

  test('processMap에서 A6를 수집하지 않아야 함 (별도 수집 불필요)', () => {
    // 실행 코드에서 A6: a.A6 패턴이 없어야 함 (PC/DC는 chain에서 직접 제공)
    const codeLines = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(codeLines).not.toMatch(/A6:\s*a\.A6/);
  });

  test('관리방법 컬럼 헤더가 있어야 함 (실행 코드)', () => {
    const codeLines = src.split('\n').filter(l => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('{/*');
    }).join('\n');
    // v3.1.1: 헤더 형식 예방관리(PC)/검출관리(DC)
    expect(codeLines).toMatch(/예방관리\(PC\)/);
    expect(codeLines).toMatch(/검출관리\(DC\)/);
  });

  test('pcValue/dcValue를 렌더링하는 td가 있어야 함 (실행 코드)', () => {
    const codeLines = src.split('\n').filter(l => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('{/*');
    }).join('\n');
    expect(codeLines).toMatch(/r\.pcValue/);
    expect(codeLines).toMatch(/r\.dcValue/);
  });
});

describe('TemplatePreviewContent — A6/B5 컬럼 제거', () => {
  const src = readFile('components/TemplatePreviewContent.tsx');
  // 주석이 아닌 실행 코드 라인만 추출 (//... 또는 {/*...*/} 제외)
  const codeLines = src.split('\n').filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('{/*');
  }).join('\n');

  test('L2 테이블에 A6 검출관리 헤더(th)가 없어야 함', () => {
    // <th> 태그에서 A6 검출관리 텍스트가 없어야 함
    expect(codeLines).not.toMatch(/<th[^>]*>A6 검출관리<\/th>/);
  });

  test('L3 테이블에 B5 예방관리 헤더(th)가 없어야 함', () => {
    expect(codeLines).not.toMatch(/<th[^>]*>B5 예방관리<\/th>/);
  });

  test('A6 EditCell이 없어야 함 (실행 코드)', () => {
    // value={r.A6} 또는 itemId={r._ids.A6} 패턴이 실행 코드에 없어야 함
    expect(codeLines).not.toMatch(/value=\{r\.A6\}/);
    expect(codeLines).not.toMatch(/r\._ids\.A6/);
  });

  test('B5 EditCell이 없어야 함 (실행 코드)', () => {
    expect(codeLines).not.toMatch(/value=\{r\.B5\}/);
    expect(codeLines).not.toMatch(/r\._ids\.B5/);
  });
});

describe('template-delete-logic — A6/B5 타입 및 빌드 제거', () => {
  const src = readFile('utils/template-delete-logic.ts');

  test('ARow 인터페이스에 A6 필드 선언이 없어야 함', () => {
    const interfaceMatch = src.match(/interface\s+ARow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      // 타입 선언(A6: string 등)이 없어야 함 — 주석 내 A6 언급은 허용
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).not.toMatch(/A6\s*[?:]?\s*:\s*string/);
    }
  });

  test('BRow 인터페이스에 B5 필드 선언이 없어야 함', () => {
    const interfaceMatch = src.match(/interface\s+BRow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).not.toMatch(/B5\s*[?:]?\s*:\s*string/);
    }
  });

  test('buildCrossTab에서 A6를 수집하지 않아야 함', () => {
    // 'A6' 문자열이 buildCrossTab 내부에서 사용되면 안 됨
    const fnMatch = src.match(/function\s+buildCrossTab[\s\S]*?(?=\nexport|\n\/\/\s*───|\Z)/);
    if (fnMatch) {
      expect(fnMatch[0]).not.toContain("'A6'");
    }
  });

  test('buildCrossTab에서 B5를 수집하지 않아야 함', () => {
    const fnMatch = src.match(/function\s+buildCrossTab[\s\S]*?(?=\nexport|\n\/\/\s*───|\Z)/);
    if (fnMatch) {
      expect(fnMatch[0]).not.toContain("'B5'");
    }
  });
});
