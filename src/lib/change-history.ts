/**
 * @file change-history.ts
 * @description 데이터 변경 이력 관리
 * @created 2026-01-31
 */

export interface ChangeRecord {
    changeNo: number;
    timestamp: string;
    source: 'cp' | 'pfd' | 'fmea' | 'manual';
    targetDoc: 'cp' | 'pfd' | 'fmea';
    userId?: string;
    description: string;
    changes: FieldChange[];
}

export interface FieldChange {
    rowIndex: number;
    itemId: string;
    field: string;
    fieldLabel: string;
    oldValue: string;
    newValue: string;
    changeNo: number;
}

export interface ChangeMarker {
    [itemId: string]: {
        [field: string]: {
            changeNo: number;
            oldValue: string;
            changedAt: string;
        };
    };
}

const STORAGE_KEY_PREFIX = 'change-history-';

/**
 * 변경 이력 저장
 */
export function saveChangeHistory(docType: 'cp' | 'pfd' | 'fmea', docNo: string, record: ChangeRecord): void {
    const key = `${STORAGE_KEY_PREFIX}${docType}-${docNo}`;
    const existing = getChangeHistory(docType, docNo);
    existing.push(record);

    // 최대 100개까지만 유지
    if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
    }

    localStorage.setItem(key, JSON.stringify(existing));
}

/**
 * 변경 이력 조회
 */
export function getChangeHistory(docType: 'cp' | 'pfd' | 'fmea', docNo: string): ChangeRecord[] {
    const key = `${STORAGE_KEY_PREFIX}${docType}-${docNo}`;
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * 다음 변경 번호 가져오기
 */
export function getNextChangeNo(docType: 'cp' | 'pfd' | 'fmea', docNo: string): number {
    const history = getChangeHistory(docType, docNo);
    if (history.length === 0) return 1;
    return Math.max(...history.map(h => h.changeNo)) + 1;
}

/**
 * 변경 마커 저장 (아이템별 변경 표시용)
 */
export function saveChangeMarkers(docType: 'cp' | 'pfd' | 'fmea', docNo: string, markers: ChangeMarker): void {
    const key = `${STORAGE_KEY_PREFIX}${docType}-${docNo}-markers`;
    localStorage.setItem(key, JSON.stringify(markers));
}

/**
 * 변경 마커 조회
 */
export function getChangeMarkers(docType: 'cp' | 'pfd' | 'fmea', docNo: string): ChangeMarker {
    const key = `${STORAGE_KEY_PREFIX}${docType}-${docNo}-markers`;
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

/**
 * 연동 시 변경 이력 생성
 */
export function createSyncChangeRecord(
    source: 'cp' | 'pfd' | 'fmea',
    targetDoc: 'cp' | 'pfd' | 'fmea',
    docNo: string,
    oldItems: any[],
    newItems: any[],
    compareFields: { key: string; label: string }[]
): { record: ChangeRecord; markers: ChangeMarker } {
    const changeNo = getNextChangeNo(targetDoc, docNo);
    const changes: FieldChange[] = [];
    const markers: ChangeMarker = getChangeMarkers(targetDoc, docNo);

    const minLength = Math.min(oldItems.length, newItems.length);

    for (let i = 0; i < minLength; i++) {
        const oldItem = oldItems[i];
        const newItem = newItems[i];
        const itemId = newItem.id || `row-${i}`;

        for (const field of compareFields) {
            const oldValue = (oldItem[field.key] || '').toString().trim();
            const newValue = (newItem[field.key] || '').toString().trim();

            if (oldValue !== newValue) {
                changes.push({
                    rowIndex: i + 1,
                    itemId,
                    field: field.key,
                    fieldLabel: field.label,
                    oldValue: oldValue || '(빈값)',
                    newValue: newValue || '(빈값)',
                    changeNo,
                });

                // 마커 업데이트
                if (!markers[itemId]) {
                    markers[itemId] = {};
                }
                markers[itemId][field.key] = {
                    changeNo,
                    oldValue: oldValue || '(빈값)',
                    changedAt: new Date().toISOString(),
                };
            }
        }
    }

    // 새로 추가된 행
    for (let i = minLength; i < newItems.length; i++) {
        const newItem = newItems[i];
        const itemId = newItem.id || `row-${i}`;

        changes.push({
            rowIndex: i + 1,
            itemId,
            field: '*',
            fieldLabel: '새 행 추가',
            oldValue: '',
            newValue: `Row ${i + 1}`,
            changeNo,
        });

        if (!markers[itemId]) {
            markers[itemId] = {};
        }
        markers[itemId]['*'] = {
            changeNo,
            oldValue: '',
            changedAt: new Date().toISOString(),
        };
    }

    const record: ChangeRecord = {
        changeNo,
        timestamp: new Date().toISOString(),
        source,
        targetDoc,
        description: `${source.toUpperCase()}에서 ${targetDoc.toUpperCase()}로 연동 (${changes.length}건 변경)`,
        changes,
    };

    return { record, markers };
}

/**
 * 변경 이력 포맷팅 (표시용)
 */
export function formatChangeHistory(history: ChangeRecord[]): string {
    if (history.length === 0) return '변경 이력이 없습니다.';

    return history
        .slice(-10) // 최근 10개만
        .reverse()
        .map(record => {
            const date = new Date(record.timestamp).toLocaleString('ko-KR');
            return `[C${record.changeNo}] ${date}\n  ${record.description}`;
        })
        .join('\n\n');
}
