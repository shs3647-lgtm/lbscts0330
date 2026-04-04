/**
 * @file cp-excel-roundtrip.guard.test.ts
 * @description CP 엑셀 내보내기→가져오기 라운드트립 100% 보장 Guard Test
 *
 * 검증 대상:
 * 1. Export switch — 모든 CP_COLUMNS key에 대응하는 case 존재
 * 2. Import charNo — 파싱된 charNo 값 보존
 * 3. Import COLUMN_MAP — 헤더 기반 동적 매핑 (partName 유무 대응)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Test 1: Export switch가 모든 CP_COLUMNS key를 처리하는지 검증
// ============================================================
describe('CP Export — 모든 컬럼 key에 switch case 존재', () => {
  it('excel-export.ts에 equipment case가 있어야 함 (workElement 아님)', () => {
    const exportPath = path.join(
      process.cwd(),
      'src/app/(fmea-core)/control-plan/worksheet/excel-export.ts'
    );
    const source = fs.readFileSync(exportPath, 'utf-8');

    // equipment case 존재해야 함
    expect(source).toContain("case 'equipment':");

    // workElement case가 있으면 안 됨 (equipment로 교체되어야 함)
    // workElement는 CP_COLUMNS에 없는 key
    expect(source).not.toContain("case 'workElement':");
  });

  it('CP_COLUMNS의 모든 key에 대응하는 switch case가 있어야 함', () => {
    const exportPath = path.join(
      process.cwd(),
      'src/app/(fmea-core)/control-plan/worksheet/excel-export.ts'
    );
    const source = fs.readFileSync(exportPath, 'utf-8');

    // cpConstants.ts에서 정의된 모든 data column keys (rowNo 제외)
    const requiredKeys = [
      'processNo', 'processName', 'processLevel', 'processDesc',
      'partName', 'equipment',
      'detectorEp', 'detectorAuto', 'charNo',
      'productChar', 'processChar', 'specialChar', 'specTolerance',
      'evalMethod', 'sampleSize', 'sampleFreq', 'controlMethod',
      'owner1', 'owner2', 'reactionPlan',
    ];

    for (const key of requiredKeys) {
      expect(source, `switch에 case '${key}' 누락`).toContain(`case '${key}':`);
    }
  });
});

// ============================================================
// Test 2: Import 시 charNo 값이 보존되는지 검증
// ============================================================
describe('CP Import — charNo 보존', () => {
  it('useCPActions.ts에서 charNo를 row.charNo로 설정해야 함 (하드코딩 금지)', () => {
    const actionsPath = path.join(
      process.cwd(),
      'src/app/(fmea-core)/control-plan/worksheet/hooks/useCPActions.ts'
    );
    const source = fs.readFileSync(actionsPath, 'utf-8');

    // charNo: '' 하드코딩이 있으면 안 됨
    expect(source).not.toMatch(/charNo:\s*''/);

    // charNo: row.charNo 패턴이 있어야 함
    expect(source).toMatch(/charNo:\s*row\.charNo/);
  });
});

// ============================================================
// Test 3: Import parser가 동적 컬럼 매핑을 지원하는지 검증
// ============================================================
describe('CP Import Parser — 동적 컬럼 매핑', () => {
  it('worksheet-excel-parser.ts에 헤더 기반 동적 매핑 로직이 있어야 함', () => {
    const parserPath = path.join(
      process.cwd(),
      'src/app/(fmea-core)/control-plan/import/worksheet-excel-parser.ts'
    );
    const source = fs.readFileSync(parserPath, 'utf-8');

    // 헤더 기반 매핑 함수/로직이 존재해야 함
    expect(source).toMatch(/buildColumnMap|HEADER_TO_KEY|headerToKey|detectColumns/i);
  });

  it('헤더→필드 매핑에 설비/금형 키워드가 포함되어야 함', () => {
    const parserPath = path.join(
      process.cwd(),
      'src/app/(fmea-core)/control-plan/import/worksheet-excel-parser.ts'
    );
    const source = fs.readFileSync(parserPath, 'utf-8');

    // 설비 키워드로 equipment 매핑
    expect(source).toContain('설비');
    expect(source).toContain('equipment');
  });
});
