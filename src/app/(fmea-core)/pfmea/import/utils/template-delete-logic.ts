/**
 * @file template-delete-logic.ts
 * @description 템플릿 삭제 순수 로직 (테스트 가능)
 * buildCrossTab + collectDeleteIds를 React 외부로 추출
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


import type { ImportedFlatData } from '../types';

// ─── CrossTab 타입 ───

export interface CrossTabIds { [itemCode: string]: string }

export interface ARow {
  processNo: string;
  A1: string; A2: string; A3: string; A4: string; A5: string; A6: string;
  A4SC?: string;  // A4 특별특성
  _ids: CrossTabIds;
}

export interface BRow {
  processNo: string; m4: string;
  B1: string; B2: string; B3: string; B4: string; B5: string;
  B3SC?: string;  // B3 특별특성
  _ids: CrossTabIds;
}

export interface CRow {
  category: string;
  C1: string; C2: string; C3: string; C4: string;
  _ids: CrossTabIds;
}

export interface CrossTab { aRows: ARow[]; bRows: BRow[]; cRows: CRow[]; total: number }

// ─── buildCrossTab ───

export function buildCrossTab(data: ImportedFlatData[]): CrossTab {
  const aItems = data.filter(d => d.category === 'A');
  // ★ 공통 공정은 A-series(L2)에서 제외 — 작업요소(B-series)에서만 표시
  // DB 데이터: processNo='공통', 템플릿 생성: processNo='00' 두 케이스 모두 필터
  const processNos = [...new Set(aItems.map(d => d.processNo))].filter(pNo => pNo !== '00' && pNo !== '공통');
  const aRows: ARow[] = processNos.map(pNo => {
    const ids: CrossTabIds = {};
    const row: ARow = { processNo: pNo, A1: '', A2: '', A3: '', A4: '', A5: '', A6: '', _ids: ids };
    (['A1','A2','A3','A4','A5','A6'] as const).forEach(code => {
      const item = aItems.find(d => d.processNo === pNo && d.itemCode === code);
      row[code] = item?.value || '';
      if (item?.id) ids[code] = item.id;
      // ★★★ 2026-02-22: A4 특별특성 저장 ★★★
      if (code === 'A4' && item?.specialChar) row.A4SC = item.specialChar;
    });
    return row;
  });

  const bItems = data.filter(d => d.category === 'B');

  // O(n) 인덱스: processNo+itemCode+m4 → 후보 배열
  const bIdx = new Map<string, ImportedFlatData[]>();
  const bIdxNoM4 = new Map<string, ImportedFlatData[]>();
  for (const d of bItems) {
    if (d.itemCode === 'B1') continue;
    const key = `${d.processNo}|${d.itemCode}|${d.m4 || ''}`;
    if (!bIdx.has(key)) bIdx.set(key, []);
    bIdx.get(key)!.push(d);
    if (!d.m4 || d.m4 === '') {
      const k2 = `${d.processNo}|${d.itemCode}`;
      if (!bIdxNoM4.has(k2)) bIdxNoM4.set(k2, []);
      bIdxNoM4.get(k2)!.push(d);
    }
  }

  // 코드별 사용된 ID 누적 Set (O(n²) → O(n))
  const usedByCode: Record<string, Set<string>> = { B2: new Set(), B3: new Set(), B4: new Set(), B5: new Set() };

  const bGroups: { pNo: string; m4: string; items: Map<string, ImportedFlatData> }[] = [];
  const b1List = bItems.filter(d => d.itemCode === 'B1');
  b1List.forEach(b1 => {
    const group = { pNo: b1.processNo, m4: b1.m4 || '', items: new Map<string, ImportedFlatData>() };
    group.items.set('B1', b1);
    for (const code of ['B2','B3','B4','B5'] as const) {
      const used = usedByCode[code];
      const candidates = bIdx.get(`${b1.processNo}|${code}|${b1.m4 || ''}`) || [];
      let match = candidates.find(d => !used.has(d.id!));
      if (!match) {
        const fallbacks = bIdxNoM4.get(`${b1.processNo}|${code}`) || [];
        match = fallbacks.find(d => !used.has(d.id!));
      }
      if (match) {
        group.items.set(code, match);
        if (match.id) used.add(match.id);
      }
    }
    bGroups.push(group);
  });

  const bRows: BRow[] = bGroups.map(g => ({
    processNo: g.pNo, m4: g.m4,
    B1: g.items.get('B1')?.value || '',
    B2: g.items.get('B2')?.value || '',
    B3: g.items.get('B3')?.value || '',
    B4: g.items.get('B4')?.value || '',
    B5: g.items.get('B5')?.value || '',
    B3SC: g.items.get('B3')?.specialChar || '',  // ★ B3 특별특성
    _ids: {
      B1: g.items.get('B1')?.id || '',
      B2: g.items.get('B2')?.id || '',
      B3: g.items.get('B3')?.id || '',
      B4: g.items.get('B4')?.id || '',
      B5: g.items.get('B5')?.id || '',
    },
  }));

  // ★ scope 정규화: YOUR PLANT→YP, SHIP TO PLANT→SP, End User→USER
  function normalizeC1Cat(cat: string): string {
    const u = cat.toUpperCase().trim();
    if (u === 'YP' || u.includes('YOUR')) return 'YP';
    if (u === 'SP' || u.includes('SHIP')) return 'SP';
    if (u === 'USER' || u === 'US' || u.includes('END')) return 'USER';
    return cat;
  }
  // scope 정규화 후 processNo 변환 + 빈 placeholder 행 제거
  const cItems = data.filter(d => d.category === 'C').map(d => ({
    ...d,
    processNo: normalizeC1Cat(d.processNo),
    value: d.itemCode === 'C1' ? normalizeC1Cat(d.value) : d.value,
  }));
  // C2가 없거나 '-'뿐인 category는 제외 (YOUR PLANT placeholder 제거)
  const cCatsAll = [...new Set(cItems.map(d => d.processNo))];
  const cCats = cCatsAll.filter(cat => {
    const c2Items = cItems.filter(d => d.processNo === cat && d.itemCode === 'C2');
    return c2Items.some(d => d.value?.trim() && !/^[-–—~.]+$/.test(d.value.trim()));
  });
  const cRows: CRow[] = cCats.map(cat => {
    const ids: CrossTabIds = {};
    const row: CRow = { category: cat, C1: '', C2: '', C3: '', C4: '', _ids: ids };
    (['C1','C2','C3','C4'] as const).forEach(code => {
      const item = cItems.find(d => d.processNo === cat && d.itemCode === code);
      row[code] = item?.value || '';
      if (item?.id) ids[code] = item.id;
    });
    return row;
  });

  return { aRows, bRows, cRows, total: data.length };
}

// ─── 삭제 ID 수집 (순수 함수) ───

export interface DeleteResult {
  idsToDelete: string[];
  blocked: boolean;       // true면 삭제 차단 (placeholder 보호)
  blockReason?: string;
}

export function collectDeleteIds(
  previewLevel: 'L1' | 'L2' | 'L3',
  crossTab: CrossTab,
  selectedRows: Set<number>,
  flatData: ImportedFlatData[],
): DeleteResult {
  const rows = previewLevel === 'L1' ? crossTab.cRows : previewLevel === 'L2' ? crossTab.aRows : crossTab.bRows;
  const category = previewLevel === 'L1' ? 'C' : previewLevel === 'L2' ? 'A' : 'B';
  const flatIdSet = new Set(flatData.map(d => d.id));
  const idsToDelete = new Set<string>();
  const selectedProcessNos = new Set<string>();

  selectedRows.forEach(idx => {
    const row = rows[idx];
    if (!row) return;
    // 방법1: crossTab _ids
    if (row._ids) {
      Object.values(row._ids).forEach(id => {
        if (id && flatIdSet.has(id)) idsToDelete.add(id);
      });
    }
    // 방법2: processNo 기반 flatData 매칭
    if (previewLevel === 'L3') {
      const bRow = row as BRow;
      flatData
        .filter(d => d.category === 'B' && d.processNo === bRow.processNo && d.m4 === bRow.m4)
        .forEach(d => { if (d.id) idsToDelete.add(d.id); });
    } else {
      const key = 'processNo' in row ? (row as ARow).processNo : (row as CRow).category;
      if (key) {
        flatData
          .filter(d => d.category === category && d.processNo === key)
          .forEach(d => { if (d.id) idsToDelete.add(d.id); });
        if (previewLevel === 'L2') selectedProcessNos.add(key);
      }
    }
  });

  // L2 삭제 시 → L3(B) 연동 삭제
  if (previewLevel === 'L2' && selectedProcessNos.size > 0) {
    flatData
      .filter(d => d.category === 'B' && selectedProcessNos.has(d.processNo))
      .forEach(d => { if (d.id) idsToDelete.add(d.id); });
  }

  // 전체 삭제 허용 (기존 데이터 탭에서 전체 선택 삭제 가능)
  return { idsToDelete: [...idsToDelete], blocked: false };
}
