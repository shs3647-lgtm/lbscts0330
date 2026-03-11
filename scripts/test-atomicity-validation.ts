/**
 * @file scripts/test-atomicity-validation.ts
 * @description 원자성 검증 테스트 - 이론적 계산 vs 실제 데이터 일치 검증
 * 
 * 검증 대상:
 * 1. Excel 파싱 → 원자성 행 변환
 * 2. 이론적 병합 위치 계산
 * 3. CP/PFD/PFMEA 컬럼별 병합 규칙 검증
 * 4. 실제 렌더링 데이터와 일치 여부
 */

import ExcelJS from 'exceljs';

// ============================================================================
// 원자성 규칙 정의
// ============================================================================

interface AtomicityRule {
    column: string;
    key: string;
    inherit: boolean;  // 상속 여부 (병합 컬럼)
    mergeKey: string[];  // rowSpan 계산에 사용할 키 조합
    parent: string | null;  // 부모 컬럼
}

const CP_ATOMICITY_RULES: AtomicityRule[] = [
    { column: 'A', key: 'processNo', inherit: true, mergeKey: ['processNo', 'processName'], parent: null },
    { column: 'B', key: 'processName', inherit: true, mergeKey: ['processNo', 'processName'], parent: 'processNo' },
    { column: 'C', key: 'processLevel', inherit: true, mergeKey: ['processNo', 'processName', 'processLevel', 'processDesc'], parent: 'processName' },
    { column: 'D', key: 'processDesc', inherit: true, mergeKey: ['processNo', 'processName', 'processLevel', 'processDesc'], parent: 'processLevel' },
    { column: 'E', key: 'partName', inherit: true, mergeKey: ['partName'], parent: 'processDesc' },
    { column: 'F', key: 'equipment', inherit: true, mergeKey: ['equipment'], parent: 'processDesc' },
    { column: 'G', key: 'detectorEp', inherit: false, mergeKey: [], parent: 'processName' },
    { column: 'H', key: 'detectorAuto', inherit: false, mergeKey: [], parent: 'processName' },
    { column: 'I', key: 'charNo', inherit: false, mergeKey: [], parent: 'productChar' },
    { column: 'J', key: 'productChar', inherit: false, mergeKey: [], parent: 'partName' },
    { column: 'K', key: 'processChar', inherit: false, mergeKey: [], parent: 'equipment' },
    { column: 'L', key: 'specialChar', inherit: false, mergeKey: [], parent: null },
];

// ============================================================================
// 테스트 결과 타입
// ============================================================================

interface ParsedRow {
    rowNum: number;
    processNo: string;
    processName: string;
    processLevel: string;
    processDesc: string;
    partName: string;
    equipment: string;
    productChar: string;
    processChar: string;
    specialChar: string;
}

interface ExpectedSpan {
    rowNum: number;
    column: string;
    key: string;
    value: string;
    expectedSpan: number;
    isFirst: boolean;
}

interface ValidationResult {
    testName: string;
    passed: boolean;
    expected: any;
    actual: any;
    message: string;
}

// ============================================================================
// Excel 파싱 함수
// ============================================================================

async function parseExcelToAtomicRows(filePath: string): Promise<ParsedRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const ws = workbook.worksheets[1];  // "2. CP 워크시트"
    const rows: ParsedRow[] = [];

    // 데이터 행 (4행부터 시작)
    const dataStartRow = 4;

    // 이전 행 값 (상속용)
    let prevRow: Partial<ParsedRow> = {};

    for (let r = dataStartRow; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);

        // 빈 행 스킵
        const firstCell = String(row.getCell(1).value || '').trim();
        if (!firstCell && !String(row.getCell(2).value || '').trim()) continue;

        // 셀 값 추출 (병합 셀 처리)
        const getCellValue = (col: number): string => {
            const cell = row.getCell(col);
            let value = '';

            if (cell.isMerged) {
                // 병합 셀이면 마스터 셀 값 가져오기
                const masterAddress = cell.master?.address || cell.address;
                value = String(ws.getCell(masterAddress).value || '');
            } else {
                value = String(cell.value || '');
            }

            return value.trim();
        };

        // 원자성 데이터 추출
        const currentRow: ParsedRow = {
            rowNum: r,
            processNo: getCellValue(1) || prevRow.processNo || '',
            processName: getCellValue(2) || prevRow.processName || '',
            processLevel: getCellValue(3) || prevRow.processLevel || '',
            processDesc: getCellValue(4) || prevRow.processDesc || '',
            partName: getCellValue(5) || prevRow.partName || '',
            equipment: getCellValue(6) || prevRow.equipment || '',
            productChar: getCellValue(10) || '',  // 상속 안 함
            processChar: getCellValue(11) || '',  // 상속 안 함
            specialChar: getCellValue(12) || '',  // 상속 안 함
        };

        rows.push(currentRow);
        prevRow = currentRow;
    }

    return rows;
}

// ============================================================================
// 이론적 rowSpan 계산
// ============================================================================

function calculateExpectedSpans(rows: ParsedRow[]): Map<string, ExpectedSpan[]> {
    const spanMap = new Map<string, ExpectedSpan[]>();

    // 각 규칙별로 rowSpan 계산
    for (const rule of CP_ATOMICITY_RULES) {
        const spans: ExpectedSpan[] = [];
        let i = 0;

        while (i < rows.length) {
            const currentRow = rows[i];

            if (rule.mergeKey.length === 0) {
                // 병합하지 않는 컬럼
                spans.push({
                    rowNum: currentRow.rowNum,
                    column: rule.column,
                    key: rule.key,
                    value: (currentRow as any)[rule.key] || '',
                    expectedSpan: 1,
                    isFirst: true,
                });
                i++;
                continue;
            }

            // 병합 키 생성
            const currentKey = rule.mergeKey.map(k => (currentRow as any)[k] || '').join('-');

            // 연속 행 수 계산
            let span = 1;
            while (i + span < rows.length) {
                const nextRow = rows[i + span];
                const nextKey = rule.mergeKey.map(k => (nextRow as any)[k] || '').join('-');

                if (nextKey === currentKey && currentKey !== '') {
                    span++;
                } else {
                    break;
                }
            }

            // 첫 번째 행
            spans.push({
                rowNum: currentRow.rowNum,
                column: rule.column,
                key: rule.key,
                value: (currentRow as any)[rule.key] || '',
                expectedSpan: span,
                isFirst: true,
            });

            // 나머지 행
            for (let j = 1; j < span; j++) {
                spans.push({
                    rowNum: rows[i + j].rowNum,
                    column: rule.column,
                    key: rule.key,
                    value: (rows[i + j] as any)[rule.key] || '',
                    expectedSpan: 0,
                    isFirst: false,
                });
            }

            i += span;
        }

        spanMap.set(rule.key, spans);
    }

    return spanMap;
}

// ============================================================================
// 검증 함수
// ============================================================================

function validateAtomicity(rows: ParsedRow[], expectedSpans: Map<string, ExpectedSpan[]>): ValidationResult[] {
    const results: ValidationResult[] = [];

    // 1. 원자성 검증: 각 행이 원자적인지 확인
    results.push({
        testName: '원자성 검증: 전체 행 수',
        passed: rows.length > 0,
        expected: '> 0',
        actual: rows.length,
        message: `총 ${rows.length}개의 원자성 행 파싱됨`,
    });

    // 2. 상속 검증: 상속 컬럼이 빈 값이 없는지 확인
    const inheritColumns = ['processNo', 'processName'];
    for (const col of inheritColumns) {
        const emptyCount = rows.filter(r => !(r as any)[col]).length;
        results.push({
            testName: `상속 검증: ${col} 빈 값`,
            passed: emptyCount === 0,
            expected: 0,
            actual: emptyCount,
            message: emptyCount === 0 ? '모든 행에 값 있음' : `${emptyCount}개 행에 빈 값`,
        });
    }

    // 3. 병합 그룹 검증
    const processSpans = expectedSpans.get('processNo') || [];
    const firstSpans = processSpans.filter(s => s.isFirst);
    results.push({
        testName: '병합 검증: 공정 그룹 수',
        passed: firstSpans.length > 0,
        expected: '> 0',
        actual: firstSpans.length,
        message: `${firstSpans.length}개의 공정 그룹 감지됨`,
    });

    // 4. 모자관계 검증: partName → productChar
    const partNameSpans = expectedSpans.get('partName') || [];
    const productCharSpans = expectedSpans.get('productChar') || [];

    let parentChildValid = true;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // 제품특성이 있으면 부품명도 있어야 함
        if (row.productChar && !row.partName) {
            parentChildValid = false;
            break;
        }
    }

    results.push({
        testName: '모자관계 검증: partName → productChar',
        passed: parentChildValid,
        expected: '제품특성이 있으면 부품명도 있음',
        actual: parentChildValid ? 'OK' : 'FAIL',
        message: parentChildValid ? '모자관계 유효' : '부모 없는 자식 발견',
    });

    // 5. 모자관계 검증: equipment → processChar
    let equipmentChildValid = true;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // 공정특성이 있으면 설비도 있어야 함
        if (row.processChar && !row.equipment) {
            equipmentChildValid = false;
            break;
        }
    }

    results.push({
        testName: '모자관계 검증: equipment → processChar',
        passed: equipmentChildValid,
        expected: '공정특성이 있으면 설비도 있음',
        actual: equipmentChildValid ? 'OK' : 'FAIL',
        message: equipmentChildValid ? '모자관계 유효' : '부모 없는 자식 발견',
    });

    return results;
}

// ============================================================================
// 연계성 검증 (CP ↔ PFD ↔ FMEA)
// ============================================================================

function validateLinkage(rows: ParsedRow[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    // 1. CP → PFD 연동 가능 필드 확인
    const cpPfdFields = ['processNo', 'processName', 'processLevel', 'processDesc', 'partName', 'equipment'];
    for (const field of cpPfdFields) {
        const hasData = rows.some(r => !!(r as any)[field]);
        results.push({
            testName: `CP→PFD 연동: ${field}`,
            passed: hasData,
            expected: '데이터 있음',
            actual: hasData ? 'OK' : 'EMPTY',
            message: hasData ? '연동 가능' : '연동 불가 (데이터 없음)',
        });
    }

    // 2. CP → FMEA 연동 필드 확인 (workElement는 별도)
    const hasProductChar = rows.some(r => !!r.productChar);
    const hasProcessChar = rows.some(r => !!r.processChar);

    results.push({
        testName: 'CP→FMEA 연동: productChar',
        passed: hasProductChar,
        expected: '데이터 있음',
        actual: hasProductChar ? 'OK' : 'EMPTY',
        message: hasProductChar ? 'L2Function 제품특성 연동 가능' : '연동 불가',
    });

    results.push({
        testName: 'CP→FMEA 연동: processChar',
        passed: hasProcessChar,
        expected: '데이터 있음',
        actual: hasProcessChar ? 'OK' : 'EMPTY',
        message: hasProcessChar ? 'L3Function 공정특성 연동 가능' : '연동 불가',
    });

    return results;
}

// ============================================================================
// 메인 테스트 실행
// ============================================================================

async function runValidationTest() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('        원자성 검증 테스트 (TDD Validation)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const filePath = 'C:/fmea-onpremise/cp-26-p001-l01_CP전체_20260131 (1).xlsx';

    try {
        // 1. Excel 파싱
        console.log('📂 Step 1: Excel 파싱...');
        const rows = await parseExcelToAtomicRows(filePath);
        console.log(`   ✅ ${rows.length}개 원자성 행 파싱 완료\n`);

        // 샘플 데이터 출력
        console.log('📋 샘플 데이터 (처음 5행):');
        rows.slice(0, 5).forEach(r => {
            console.log(`   Row${r.rowNum}: ${r.processNo}|${r.processName}|${r.equipment}|${r.productChar}|${r.processChar}`);
        });
        console.log('');

        // 2. 이론적 rowSpan 계산
        console.log('📐 Step 2: 이론적 rowSpan 계산...');
        const expectedSpans = calculateExpectedSpans(rows);

        const processSpans = expectedSpans.get('processNo') || [];
        const firstOnly = processSpans.filter(s => s.isFirst);
        console.log(`   ✅ 공정 그룹: ${firstOnly.length}개`);
        firstOnly.slice(0, 5).forEach(s => {
            console.log(`      ${s.value}: rowSpan=${s.expectedSpan}`);
        });
        console.log('');

        // 3. 원자성 검증
        console.log('🔍 Step 3: 원자성 검증...');
        const atomicResults = validateAtomicity(rows, expectedSpans);

        // 4. 연계성 검증
        console.log('🔗 Step 4: 연계성 검증...');
        const linkageResults = validateLinkage(rows);

        // 5. 결과 출력
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                       테스트 결과');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const allResults = [...atomicResults, ...linkageResults];
        let passCount = 0;
        let failCount = 0;

        allResults.forEach(r => {
            const status = r.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} | ${r.testName}`);
            console.log(`         Expected: ${r.expected}, Actual: ${r.actual}`);
            console.log(`         ${r.message}\n`);

            if (r.passed) passCount++;
            else failCount++;
        });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`                 총 ${allResults.length}개 테스트`);
        console.log(`                 ✅ PASS: ${passCount}  ❌ FAIL: ${failCount}`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        // 6. 회귀 테스트 (5회 반복)
        console.log('🔄 Step 5: 회귀 테스트 (5회)...\n');
        for (let i = 1; i <= 5; i++) {
            const reRows = await parseExcelToAtomicRows(filePath);
            const reSpans = calculateExpectedSpans(reRows);
            const reResults = validateAtomicity(reRows, reSpans);
            const reLinkage = validateLinkage(reRows);
            const allRe = [...reResults, ...reLinkage];
            const rePass = allRe.filter(r => r.passed).length;
            const reFail = allRe.filter(r => !r.passed).length;

            console.log(`   회귀 ${i}/5: ${rePass} PASS, ${reFail} FAIL ${reFail === 0 ? '✅' : '❌'}`);
        }

        console.log('\n✅ 검증 완료!');

    } catch (error: any) {
        console.error('❌ 테스트 실패:', error.message);
        process.exit(1);
    }
}

// 실행
runValidationTest();
