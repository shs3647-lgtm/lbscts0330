# 레거시 제거 PRD — DB ↔ 화면 다이렉트 연동

> **작성일**: 2026-03-27  
> **목표**: `atomicToLegacy()` 중간 레이어 완전 제거, DB FK → 워크시트 다이렉트 렌더링

---

## 1. 현황 (AS-IS) — 문제

```
DB (Atomic DB)
  ↓ loadAtomicDB() — 정상
  ↓ atomicToLegacy() — ❌ 526행 변환 코드
  ↓ WorksheetState (중첩 트리 + riskData 딕셔너리) — ❌ 레거시 타입
  ↓ 80+ 탭/훅/유틸이 WorksheetState 소비
  → 화면 렌더링
```

**레거시 잔존물**:
| 구분 | 파일 | 행수 | 역할 |
|------|------|------|------|
| 변환 어댑터 | `atomicToLegacyAdapter.ts` | 526 | Atomic→Legacy 변환 |
| 레거시 타입 | `constants.ts` (WorksheetState) | 650 | 중첩 트리 + riskData 딕셔너리 |
| 마이그레이션 | `migration.ts` | 1076 | riskData 키 매핑 |
| 레거시 파서 | `legacyParseResultToFlatData.ts` | — | 레거시 Import 결과 변환 |

## 2. 목표 (TO-BE) — DB 다이렉트

```
DB (Atomic DB: FMEAWorksheetDB)
  ↓ loadAtomicDB() — 그대로
  ↓ 직접 state에 저장 (변환 없음)
  → 탭 컴포넌트가 FMEAWorksheetDB 직접 사용
  → Map.get(id) 조회로 FK 기반 렌더링
```

## 3. 핵심 타입 변경

### AS-IS: WorksheetState (중첩 트리)
```typescript
// 중첩 트리 — l2[].l3[].functions[].processChars[]
interface WorksheetState {
  l1: L1Data;              // 중첩 트리
  l2: Process[];            // 중첩 트리 (l3, functions, failureModes 내포)
  riskData?: Record<string, number | string>;  // 문자열 키 딕셔너리
  failureLinks?: WorksheetFailureLink[];       // 비정규화 텍스트 복사
}
```

### TO-BE: WorksheetState (Atomic DB 직접)
```typescript
// 플랫 배열 — DB 테이블 그대로
interface WorksheetState {
  fmeaId: string;
  // DB 테이블 직접 참조 (FMEAWorksheetDB 필드)
  l1Structure: L1Structure | null;
  l2Structures: L2Structure[];
  l3Structures: L3Structure[];
  l1Functions: L1Function[];
  l2Functions: L2Function[];
  l3Functions: L3Function[];
  processProductChars: ProcessProductChar[];
  failureEffects: FailureEffect[];
  failureModes: FailureMode[];
  failureCauses: FailureCause[];
  failureLinks: FailureLink[];
  failureAnalyses: FailureAnalysis[];
  riskAnalyses: RiskAnalysis[];
  optimizations: Optimization[];
  confirmed: ConfirmedState;
  // UI 상태
  selected: { type: 'L1' | 'L2' | 'L3'; id: string | null };
  tab: string;
  levelView: string;
  search: string;
  visibleSteps: number[];
}
```

## 4. 데이터 접근 패턴 변경

| AS-IS (레거시) | TO-BE (다이렉트) |
|---------------|-----------------|
| `state.l2[0].functions[0].name` | `state.l2Functions.filter(f => f.l2StructId === l2Id)` |
| `state.l2[0].l3[0].name` | `state.l3Structures.filter(s => s.l2Id === l2Id)` |
| `state.l2[0].failureModes[0]` | `state.failureModes.filter(m => m.l2StructId === l2Id)` |
| `state.l2[0].failureCauses[0]` | `state.failureCauses.filter(c => c.l2StructId === l2Id)` |
| `state.riskData['risk-${key}-S']` | `riskMap.get(linkId)?.severity` |
| `state.riskData['prevention-${key}']` | `riskMap.get(linkId)?.preventionControl` |
| `state.riskData['opt-${key}-S']` | `optMap.get(riskId)?.[0]?.newSeverity` |
| `state.failureLinks[0].fmText` | `fmMap.get(link.fmId)?.mode` |

## 5. 헬퍼 유틸리티 (새로 생성)

```typescript
// useAtomicLookup.ts — FK 기반 O(1) 조회 헬퍼
export function useAtomicLookup(state: WorksheetState) {
  const l2Map = useMemo(() => indexById(state.l2Structures), [state.l2Structures]);
  const l3Map = useMemo(() => indexById(state.l3Structures), [state.l3Structures]);
  const fmMap = useMemo(() => indexById(state.failureModes), [state.failureModes]);
  const feMap = useMemo(() => indexById(state.failureEffects), [state.failureEffects]);
  const fcMap = useMemo(() => indexById(state.failureCauses), [state.failureCauses]);
  const riskMap = useMemo(() => indexByField(state.riskAnalyses, 'linkId'), [state.riskAnalyses]);
  const optMap = useMemo(() => groupByField(state.optimizations, 'riskId'), [state.optimizations]);
  
  const getL3sForL2 = (l2Id: string) => state.l3Structures.filter(s => s.l2Id === l2Id);
  const getFMsForL2 = (l2Id: string) => state.failureModes.filter(m => m.l2StructId === l2Id);
  const getFCsForL2 = (l2Id: string) => state.failureCauses.filter(c => c.l2StructId === l2Id);
  const getRisk = (linkId: string) => riskMap.get(linkId);
  
  return { l2Map, l3Map, fmMap, feMap, fcMap, riskMap, optMap, getL3sForL2, getFMsForL2, getFCsForL2, getRisk };
}
```

## 6. 실행 단계

### Phase 1: 코어 인프라 (5개 파일) ✅ 완료 (2026-03-27)
- [x] `constants.ts` — WorksheetState에 `atomicDB?: FMEAWorksheetDB` 필드 추가
- [x] `useWorksheetDataLoader.ts` — atomicDB 직접 저장 (atomicToLegacy 하위호환 유지)
- [x] `useAtomicLookup.ts` — FK 기반 O(1) 조회 헬퍼 훅 생성
- [x] `schema/utils/fcProcessCharPicker.ts` — pickLegacyFcProcessCharId 분리 이동
- [x] `atomicToLegacyAdapter.ts` — DEPRECATED 표시 (탭 마이그레이션 완료 후 삭제)

### Phase 2: 핵심 탭 마이그레이션 ✅ 완료 (2026-03-27)
- [x] RiskTabConfirmable → atomicDB.riskAnalyses 직접 사용 (riskData 딕셔너리 제거)
- [x] OptTabConfirmable → atomicDB.optimizations 직접 사용 (riskData 딕셔너리 제거)

### Phase 3: 나머지 탭 마이그레이션 ⏳ 진행 예정
- [ ] StructureTab (~1587행, CODEFREEZE) → l2Structures/l3Structures 직접
- [ ] FunctionL1/L2/L3Tab → l1Functions/l2Functions/l3Functions 직접
- [ ] FailureL1/L2/L3Tab → failureEffects/failureModes/failureCauses 직접
- [ ] FailureLinkTab (~1339행) → failureLinks 직접
- [ ] AllTab + 20개 hooks → riskMap 전환

### Phase 4: 패널/유틸 마이그레이션 ⏳ 진행 예정
- [ ] APTable5/6 (CODEFREEZE) → riskMap 전환
- [ ] RPNChart, ParetoChart → riskMap 전환
- [ ] Excel export (~1080+873행) → riskAnalyses 직접 참조

### Phase 5: 정리 ⏳ 최종
- [ ] atomicToLegacyAdapter.ts 삭제
- [ ] migration.ts — riskData 변환 제거
- [ ] legacyParseResultToFlatData.ts — 제거
- [ ] 레거시 타입 (Process, WorkElement 등) — 제거
- [ ] 테스트 업데이트

## 7. 제거 대상 파일

| 파일 | 조치 |
|------|------|
| `atomicToLegacyAdapter.ts` (526행) | **삭제** |
| `legacyParseResultToFlatData.ts` | **삭제** |
| `migration.ts` riskData 관련 부분 | **제거** |
| `worksheet-snapshot.ts` 레거시 필드 | **제거** |

## 8. 리스크

- CODEFREEZE 파일 다수 변경 필요 → 사용자 승인 완료 ("모두 제거해")
- 80+ 파일 동시 변경 → Phase별 검증 필수
- riskData 딕셔너리 제거 시 All-tab 전면 재작성 → 가장 큰 공수
