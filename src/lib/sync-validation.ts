/**
 * @file sync-validation.ts
 * @description CP ↔ PFD 연동 데이터 검증 유틸리티
 * @created 2026-01-31
 */

export interface SyncDifference {
    field: string;
    cpValue: string;
    pfdValue: string;
    rowIndex: number;
}

export interface SyncValidationResult {
    isValid: boolean;
    rowCountDiff: boolean;
    cpRowCount: number;
    pfdRowCount: number;
    fieldDiffs: SyncDifference[];
    mergeDiffs: string[];
    summary: string;
}

/**
 * CP와 PFD 데이터 비교
 */
export function validateSyncData(
    cpItems: any[],
    pfdItems: any[]
): SyncValidationResult {
    const fieldDiffs: SyncDifference[] = [];
    const mergeDiffs: string[] = [];

    // 1. 행 개수 비교
    const rowCountDiff = cpItems.length !== pfdItems.length;

    // 2. 필드별 비교 (공통 길이만큼)
    const minLength = Math.min(cpItems.length, pfdItems.length);
    const compareFields = [
        { key: 'processNo', label: '공정번호' },
        { key: 'processName', label: '공정명' },
        { key: 'processLevel', label: '레벨' },
        { key: 'processDesc', label: '공정설명' },
        { key: 'partName', label: '부품명' },
        { key: 'equipment', label: '설비' },
        { key: 'productChar', label: '제품특성' },
        { key: 'processChar', label: '공정특성' },
    ];

    for (let i = 0; i < minLength; i++) {
        const cpItem = cpItems[i];
        const pfdItem = pfdItems[i];

        for (const field of compareFields) {
            const cpValue = (cpItem[field.key] || '').toString().trim();
            const pfdValue = (pfdItem[field.key] || '').toString().trim();

            if (cpValue !== pfdValue) {
                fieldDiffs.push({
                    field: field.label,
                    cpValue: cpValue || '(빈값)',
                    pfdValue: pfdValue || '(빈값)',
                    rowIndex: i + 1,
                });
            }
        }
    }

    // 3. 병합 패턴 비교 (부품명, 설비)
    const cpPartNameMerges = calculateMergePattern(cpItems, 'partName');
    const pfdPartNameMerges = calculateMergePattern(pfdItems, 'partName');

    if (JSON.stringify(cpPartNameMerges) !== JSON.stringify(pfdPartNameMerges)) {
        mergeDiffs.push(`부품명 병합 패턴 불일치`);
    }

    const cpEquipMerges = calculateMergePattern(cpItems, 'equipment');
    const pfdEquipMerges = calculateMergePattern(pfdItems, 'equipment');

    if (JSON.stringify(cpEquipMerges) !== JSON.stringify(pfdEquipMerges)) {
        mergeDiffs.push(`설비 병합 패턴 불일치`);
    }

    // 4. 요약 생성
    const isValid = !rowCountDiff && fieldDiffs.length === 0 && mergeDiffs.length === 0;

    let summary = '';
    if (isValid) {
        summary = '✅ CP와 PFD 데이터가 일치합니다.';
    } else {
        const parts = [];
        if (rowCountDiff) {
            parts.push(`행 개수 다름 (CP: ${cpItems.length}건, PFD: ${pfdItems.length}건)`);
        }
        if (fieldDiffs.length > 0) {
            parts.push(`필드 값 ${fieldDiffs.length}건 다름`);
        }
        if (mergeDiffs.length > 0) {
            parts.push(mergeDiffs.join(', '));
        }
        summary = parts.join('\n');
    }

    return {
        isValid,
        rowCountDiff,
        cpRowCount: cpItems.length,
        pfdRowCount: pfdItems.length,
        fieldDiffs,
        mergeDiffs,
        summary,
    };
}

/**
 * 병합 패턴 계산 (연속된 같은 값의 시작 인덱스와 길이)
 */
function calculateMergePattern(items: any[], field: string): { start: number; span: number; value: string }[] {
    const pattern: { start: number; span: number; value: string }[] = [];
    let i = 0;

    while (i < items.length) {
        const currentValue = (items[i][field] || '').toString().trim();
        let span = 1;

        if (currentValue !== '') {
            while (i + span < items.length) {
                const nextValue = (items[i + span][field] || '').toString().trim();
                if (nextValue === currentValue) {
                    span++;
                } else {
                    break;
                }
            }

            if (span > 1) {
                pattern.push({ start: i, span, value: currentValue });
            }
        }

        i += span;
    }

    return pattern;
}

/**
 * 검증 결과 메시지 생성
 */
export function formatValidationMessage(result: SyncValidationResult): string {
    if (result.isValid) {
        return result.summary;
    }

    let message = '⚠️ CP ↔ PFD 데이터 불일치 감지\n\n';

    if (result.rowCountDiff) {
        message += `📊 행 개수:\n  • CP: ${result.cpRowCount}건\n  • PFD: ${result.pfdRowCount}건\n\n`;
    }

    if (result.fieldDiffs.length > 0) {
        message += `📝 필드 차이 (${Math.min(5, result.fieldDiffs.length)}건 표시):\n`;
        result.fieldDiffs.slice(0, 5).forEach(diff => {
            message += `  • Row${diff.rowIndex} ${diff.field}: "${diff.cpValue}" ≠ "${diff.pfdValue}"\n`;
        });
        if (result.fieldDiffs.length > 5) {
            message += `  ... 외 ${result.fieldDiffs.length - 5}건\n`;
        }
        message += '\n';
    }

    if (result.mergeDiffs.length > 0) {
        message += `🔗 병합 차이:\n`;
        result.mergeDiffs.forEach(diff => {
            message += `  • ${diff}\n`;
        });
    }

    return message;
}
