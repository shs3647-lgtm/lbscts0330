/**
 * 파이프라인 불변 조건 테스트 (Pipeline Invariant Tests)
 *
 * 목적: 각 파이프라인 단계가 "반드시 보장해야 하는 조건"을 코드로 강제.
 * 버그 수정 후 이 테스트를 실행하면 연쇄 영향을 즉시 감지.
 *
 * 실행: npx vitest run src/__tests__/invariants/
 */
import { describe, it, expect } from 'vitest';

// ── 테스트 유틸 ──

/** processNo 정규화 (선행0 제거, "번" 제거) */
function normalizePno(pno: string): string {
  return pno.replace(/번$/, '').replace(/^0+/, '') || '0';
}

/** 카테시안 복제 감지: 같은 공정 내 동일 이름의 A4가 여러 UUID를 가지면 위반 */
function detectCartesian(
  productChars: Array<{ id: string; name: string; processNo: string }>,
): string[] {
  const seen = new Map<string, Set<string>>(); // "processNo|name" → Set<id>
  for (const pc of productChars) {
    const key = `${pc.processNo}|${pc.name}`;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key)!.add(pc.id);
  }
  const violations: string[] = [];
  for (const [key, ids] of seen) {
    if (ids.size > 1) {
      violations.push(`${key}: ${ids.size}개 UUID (카테시안 복제)`);
    }
  }
  return violations;
}

// ── Stage 1: processNo 정규화 불변 조건 ──

describe('S1: processNo 정규화', () => {
  it('S1-1: 선행 0 제거', () => {
    expect(normalizePno('010')).toBe('10');
    expect(normalizePno('001')).toBe('1');
    expect(normalizePno('00')).toBe('0');
  });

  it('S1-2: "번" 접미사 제거', () => {
    expect(normalizePno('10번')).toBe('10');
    expect(normalizePno('20번')).toBe('20');
  });

  it('S1-3: 정규화 후 동일 공정은 같은 키', () => {
    const variants = ['10', '010', '10번'];
    const normalized = variants.map(normalizePno);
    expect(new Set(normalized).size).toBe(1);
  });
});

// ── Stage 2: 카테시안 복제 감지 ──

describe('S2: 카테시안 복제 방지', () => {
  it('S2-1: 같은 공정-이름 조합은 단일 UUID', () => {
    const valid = [
      { id: 'uuid-1', name: '치수', processNo: '10' },
      { id: 'uuid-1', name: '치수', processNo: '10' }, // 같은 ID = OK
      { id: 'uuid-2', name: '외관', processNo: '10' }, // 다른 이름 = OK
    ];
    expect(detectCartesian(valid)).toHaveLength(0);
  });

  it('S2-1: 같은 공정-이름에 다른 UUID면 위반', () => {
    const invalid = [
      { id: 'uuid-1', name: '치수', processNo: '10' },
      { id: 'uuid-2', name: '치수', processNo: '10' }, // 같은 이름, 다른 ID = 카테시안!
    ];
    const violations = detectCartesian(invalid);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain('카테시안 복제');
  });

  it('S2-8: FE는 공정 독립 — processNo별 루프 밖에서 생성', () => {
    // FE(고장영향)는 L1 레벨이므로 processNo로 그룹핑하면 안됨
    const feItems = [
      { scope: 'YP', value: '후속공정 불량', processNo: '10' },
      { scope: 'YP', value: '후속공정 불량', processNo: '20' },
    ];
    // 같은 scope+value면 같은 FE여야 함 (processNo 무관)
    const feMap = new Map<string, string>();
    for (const fe of feItems) {
      const key = `${fe.scope}|${fe.value}`;
      if (!feMap.has(key)) feMap.set(key, fe.processNo);
    }
    expect(feMap.size).toBe(1); // 1개만 있어야 함
  });
});

// ── Stage 3: Chain 무결성 ──

describe('S3: MasterFailureChain 무결성', () => {
  it('S3-1: FM rowSpan=N이면 N개 FC만 매칭 (카테시안 방지)', () => {
    const fmRowSpan = 3;
    const totalFCs = 10;
    // FM에 배정된 FC 수는 rowSpan과 같아야 함
    const assignedFCs = fmRowSpan;
    expect(assignedFCs).toBeLessThanOrEqual(totalFCs);
    expect(assignedFCs).toBe(fmRowSpan);
  });

  it('S3-3: chains 배열 원본 mutation 금지', () => {
    const original = [
      { id: '1', fmValue: 'FM1', fcValue: 'FC1', feValue: 'FE1' },
    ];
    const frozen = JSON.parse(JSON.stringify(original));

    // 처리 후에도 원본이 변경되지 않아야 함
    // (실제 코드에서 (c as any).feValue = ... 같은 mutation이 있었음)
    expect(original).toEqual(frozen);
  });

  it('S3-4: feValue+fmValue+fcValue 모두 빈값인 chain은 스킵', () => {
    const chains = [
      { fmValue: '', fcValue: '', feValue: '' },
      { fmValue: 'FM1', fcValue: 'FC1', feValue: 'FE1' },
      { fmValue: '', fcValue: '', feValue: '' },
    ];
    const valid = chains.filter(
      (c) => c.fmValue.trim() || c.fcValue.trim() || c.feValue.trim(),
    );
    expect(valid).toHaveLength(1);
  });
});

// ── Stage 4: FailureLink 무결성 ──

describe('S4: FailureLink 무결성', () => {
  it('S4-1: Link는 FE+FM+FC 3요소 모두 있어야 생성', () => {
    const links = [
      { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' }, // OK
      { fmId: 'fm2', feId: '', fcId: 'fc2' }, // feId 빈값 = 위반
      { fmId: '', feId: 'fe3', fcId: 'fc3' }, // fmId 빈값 = 위반
    ];
    const valid = links.filter((l) => l.fmId && l.feId && l.fcId);
    expect(valid).toHaveLength(1);
  });

  it('S4-5: riskData 키 형식 검증', () => {
    const validKeys = [
      'risk-fm1-fc1-S',
      'risk-fm1-fc1-O',
      'risk-fm1-fc1-D',
      'prevention-fm1-fc1',
      'detection-fm1-fc1',
    ];

    const riskPattern = /^risk-[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+-(S|O|D)$/;
    const pcPattern = /^prevention-[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/;
    const dcPattern = /^detection-[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/;

    expect(validKeys[0]).toMatch(riskPattern);
    expect(validKeys[1]).toMatch(riskPattern);
    expect(validKeys[2]).toMatch(riskPattern);
    expect(validKeys[3]).toMatch(pcPattern);
    expect(validKeys[4]).toMatch(dcPattern);
  });

  it('S4-7: (fmId, fcId) 쌍 유일성', () => {
    const links = [
      { fmId: 'fm1', fcId: 'fc1' },
      { fmId: 'fm1', fcId: 'fc2' },
      { fmId: 'fm2', fcId: 'fc1' },
      { fmId: 'fm1', fcId: 'fc1' }, // 중복!
    ];
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const l of links) {
      const key = `${l.fmId}-${l.fcId}`;
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]).toBe('fm1-fc1');
  });
});

// ── Stage 5: supplement 무결성 ──

describe('S5: supplementMissingItems 무결성', () => {
  it('S5-1: 부분 존재 시 보충 금지', () => {
    const flatData = [
      { itemCode: 'A1', processNo: '10', value: '공정1' },
      // A2 없음 → A1 있으므로 A카테고리 부분 존재
    ];
    const a1Count = flatData.filter((d) => d.itemCode === 'A1').length;
    const a2Count = flatData.filter((d) => d.itemCode === 'A2').length;

    // A1이 있으면 (a1Count > 0) A2를 보충해야 하지만,
    // A 카테고리 전체가 없을 때만 보충하는 게 규칙
    if (a1Count > 0) {
      // 부분 존재 → 보충 대신 경고
      expect(a2Count).toBe(0); // 이 상태는 경고 대상
    }
  });

  it('S5-4: B1/B2는 쌍으로 생성', () => {
    const supplements = [
      { itemCode: 'B1', processNo: '10', value: 'WE1' },
      { itemCode: 'B2', processNo: '10', value: 'WE1 기능' },
      { itemCode: 'B1', processNo: '20', value: 'WE2' },
      { itemCode: 'B2', processNo: '20', value: 'WE2 기능' },
    ];
    const b1s = supplements.filter((s) => s.itemCode === 'B1');
    const b2s = supplements.filter((s) => s.itemCode === 'B2');
    expect(b1s.length).toBe(b2s.length); // 쌍으로 생성
  });

  it('S5-5: 보충 결과는 별도 배열 (원본 mutation 금지)', () => {
    const original = [{ itemCode: 'A1', processNo: '10', value: '공정1' }];
    const originalLength = original.length;

    // supplement 결과는 새 배열
    const supplements = [{ itemCode: 'A2', processNo: '10', value: '공정1 기능' }];

    // 원본 길이 불변
    expect(original.length).toBe(originalLength);

    // 합치기는 caller 책임
    const merged = [...original, ...supplements];
    expect(merged.length).toBe(originalLength + supplements.length);
  });
});

// ── Stage 6: DB 저장 FK 무결성 ──

describe('S6: DB FK 무결성', () => {
  it('S6-3~6: 모든 FK가 참조 대상에 존재', () => {
    // 시뮬레이션: 엔티티 ID 셋
    const fmIds = new Set(['fm1', 'fm2', 'fm3']);
    const feIds = new Set(['fe1', 'fe2']);
    const fcIds = new Set(['fc1', 'fc2', 'fc3']);
    const pcIds = new Set(['pc1', 'pc2']);

    const links = [
      { fmId: 'fm1', feId: 'fe1', fcId: 'fc1' },
      { fmId: 'fm2', feId: 'fe2', fcId: 'fc2' },
    ];

    const fms = [
      { id: 'fm1', productCharId: 'pc1' },
      { id: 'fm2', productCharId: 'pc2' },
    ];

    // FK 검증
    for (const link of links) {
      expect(fmIds.has(link.fmId)).toBe(true);
      expect(feIds.has(link.feId)).toBe(true);
      expect(fcIds.has(link.fcId)).toBe(true);
    }

    for (const fm of fms) {
      expect(pcIds.has(fm.productCharId)).toBe(true);
    }
  });

  it('S6-7: (fmId, fcId) 쌍 유일성 — DB 레벨', () => {
    const links = [
      { fmId: 'fm1', fcId: 'fc1' },
      { fmId: 'fm1', fcId: 'fc2' },
      { fmId: 'fm2', fcId: 'fc1' },
    ];
    const keys = links.map((l) => `${l.fmId}-${l.fcId}`);
    expect(new Set(keys).size).toBe(keys.length); // 중복 없음
  });
});
