/**
 * @file v3-ui-no-a6b5.test.ts
 * @description Import UI에서 A6(검출관리)/B5(예방관리) 아키텍처 검증
 *
 * ★ 2026-03-14 아키텍처 변경:
 *   - v3.0 계획(A6/B5 UI 제거) 철회
 *   - A6/B5는 Import 프리뷰에서 표시 및 자동 추론 지원
 *   - template-delete-logic에 A6/B5 포함
 *   - FullAnalysisPreview에서 pcValue/dcValue 렌더링
 *
 * @created 2026-02-28
 * @updated 2026-03-14 — 아키텍처 변경 반영
 */

import fs from 'fs';
import path from 'path';

const IMPORT_DIR = path.resolve(__dirname, '../../app/(fmea-core)/pfmea/import');

function readFile(relativePath: string): string {
  const full = path.join(IMPORT_DIR, relativePath);
  return fs.readFileSync(full, 'utf-8');
}

describe('ImportPreviewPanel — B5 showM4Column (L3-5 예방관리)', () => {
  const src = readFile('components/ImportPreviewPanel.tsx');

  test('B5가 showM4Column·getBK와 동일하게 포함되어야 함 (Item Import·다운로드와 정합)', () => {
    const showM4Match = src.match(/showM4Column[\s\S]*?includes\(previewColumn\)/);
    expect(showM4Match?.[0]).toContain("'B5'");
    const getBKMatch = src.match(/getBK\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\};/);
    expect(getBKMatch?.[0]).toContain("'B5'");
  });
});

describe('FailureChainPopup — pcValue/dcValue 직접 선택 UI 제거', () => {
  const src = readFile('FailureChainPopup.tsx');

  test('pcItems (B5 필터링) 변수가 없어야 함', () => {
    expect(src).not.toMatch(/pcItems\s*=\s*useMemo/);
  });

  test('dcItems (A6 필터링) 변수가 없어야 함', () => {
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

describe('useRelationData — A6/B5 직접 매핑 제거 유지', () => {
  const src = readFile('hooks/useRelationData.ts');

  test('RelationDataRow 인터페이스에 A6 필드 선언이 없어야 함', () => {
    const interfaceMatch = src.match(/interface\s+RelationDataRow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
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
});

describe('FullAnalysisPreview — pcValue/dcValue 복원', () => {
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

  test('관리방법 컬럼 헤더가 있어야 함', () => {
    const codeLines = src.split('\n').filter(l => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('{/*');
    }).join('\n');
    expect(codeLines).toMatch(/예방관리\(PC\)/);
    expect(codeLines).toMatch(/검출관리\(DC\)/);
  });
});

describe('TemplatePreviewContent — 예방/검출은 리스크(FA) 탭, 교차표 L2/L3에는 비표시', () => {
  const src = readFile('components/TemplatePreviewContent.tsx');

  test('리스크 탭에 FullAnalysisPreview·data-testid 연결', () => {
    expect(src).toContain('FullAnalysisPreview');
    expect(src).toContain('import-preview-risk-fa');
    expect(src).toMatch(/setActiveStep\('FA'\)/);
  });

  test('L2/L3 교차표 thead에 A6 검출관리·B5 예방관리 단일 헤더 문구 없음', () => {
    expect(src).not.toContain('A6 검출관리');
    expect(src).not.toContain('B5 예방관리');
  });
});

describe('template-delete-logic — A6/B5 포함', () => {
  const src = readFile('utils/template-delete-logic.ts');

  test('ARow 인터페이스에 A6 필드 선언이 있어야 함', () => {
    const interfaceMatch = src.match(/interface\s+ARow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).toMatch(/A6/);
    }
  });

  test('BRow 인터페이스에 B5 필드 선언이 있어야 함', () => {
    const interfaceMatch = src.match(/interface\s+BRow\s*\{[\s\S]*?\}/);
    expect(interfaceMatch).toBeTruthy();
    if (interfaceMatch) {
      const codeOnly = interfaceMatch[0].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).toMatch(/B5/);
    }
  });

  test('buildCrossTab에서 A6를 수집해야 함', () => {
    const fnMatch = src.match(/function\s+buildCrossTab[\s\S]*?(?=\nexport|\n\/\/\s*───|\Z)/);
    expect(fnMatch).toBeTruthy();
    if (fnMatch) {
      expect(fnMatch[0]).toContain("'A6'");
    }
  });

  test('buildCrossTab에서 B5를 수집해야 함', () => {
    const fnMatch = src.match(/function\s+buildCrossTab[\s\S]*?(?=\nexport|\n\/\/\s*───|\Z)/);
    expect(fnMatch).toBeTruthy();
    if (fnMatch) {
      expect(fnMatch[0]).toContain("'B5'");
    }
  });
});
