# Implementation Plan: ALL탭 CRITICAL 성능 최적화 3건

> **생성일**: 2026-03-04
> **상태**: 사용자 승인 대기
> **영향 파일**: 3개 (CODEFREEZE L4 — 사용자 승인 필수)

---

## 목표

ALL탭의 CRITICAL 성능 병목 3건을 수정하여 대규모 데이터(500+ 행) 환경에서 **렌더링 시간 40-60% 감소**를 달성한다.

---

## Phase 1: AllTabRenderer.tsx — useMemo 래핑 (가장 큰 효과)

### 문제
- L152-450: **8개 Map 생성 + enrichment 로직이 매 렌더마다 실행**
- `reqToFuncMap`, `feToReqMap`, `fcToL3Map`, `fmToL2Map`, `feToTextMap` 등
- 50 L1 × 10 Func × 20 Req = **15,000+ 반복**이 state 변경 시마다 발생
- `rawFailureLinks.map()` enrichment도 매번 재실행

### 해결
- 전체 Map 생성 + enrichment를 **2개 useMemo 블록**으로 분리

#### useMemo #1: 역전개 맵 (L152-307)
```typescript
const { reqToFuncMap, feToReqMap, fcToL3Map, fcToTextMap, fcTextToIdMap,
        fmToL2Map, fmToTextMap, fmTextToIdMap, feToTextMap, feTextToIdMap } = useMemo(() => {
  // ... 기존 Map 생성 로직 그대로 이동
  return { reqToFuncMap, feToReqMap, ... };
}, [state.l1, state.l2]);  // ★ l1/l2가 바뀔 때만 재계산
```

#### useMemo #2: failureLinks enrichment (L311-450)
```typescript
const failureLinks = useMemo(() => {
  const rawFailureLinks = (state.failureLinks as RawLink[]) || [];
  // linkFeById, linkFcById 교차참조 맵 생성
  // rawFailureLinks.map() enrichment
  return enrichedLinks;
}, [state.failureLinks, state.l1, state.l2, reqToFuncMap, feToReqMap, ...]);
```

### 의존성
- `useMemo #1`: `[state.l1?.types, state.l1?.failureScopes, state.l2]`
- `useMemo #2`: `[state.failureLinks, l1ProductName, ...maps from #1]`

### 예상 효과
- riskData만 변경 시 **Map 재생성 완전 스킵** (150-300ms → 0ms)
- state.l1/l2 변경 시에만 재계산 (드문 이벤트)

### 수정 범위
- `AllTabRenderer.tsx` L152-450: 기존 로직을 useMemo로 감싸기 (로직 변경 없음)
- import에 `useMemo` 추가

### 위험도: LOW
- 순수 메모이제이션 래핑 — 로직 변경 없음
- 의존성 배열만 정확하면 동작 동일

---

## Phase 2: RiskOptCellRenderer.tsx — useEffect 분할

### 문제
- L125-211: **useEffect 의존성 17개** — riskData 1건 변경 시 500+ 셀 전체 effect 실행
- `_needsSync=false`인 95% 셀도 effect가 실행됨 (early return하지만 비용 발생)
- 연쇄 setState로 추가 리렌더 유발

### 현재 구조
```
useEffect (17 deps) {
  if (!_needsSync) return;        // 95% 셀 → 여기서 return (낭비)

  // 1. 심각도(S) 동기화    → _cat === 'S'
  // 2. O/D 자동동기화      → _isOptSOD && (_hasTarget || _preventOpt || _detectOpt)
  // 3. 목표완료일자 자동채우기 → _isTargetDate
}
```

### 해결: 3개 독립 effect로 분할

#### Effect A: 심각도(S) 동기화
```typescript
useEffect(() => {
  if (!setState || !_isOptSOD || _cat !== 'S' || _isApL) return;
  const optKey = getOptSODKey(uniqueKey, 'S', optIdx);
  const riskS = _riskVal;
  if (riskS > 0 && _optVal !== riskS) {
    setState((prev) => {
      if (prev.riskData?.[optKey] === riskS) return prev;
      return { ...prev, riskData: { ...(prev.riskData || {}), [optKey]: riskS } };
    });
  }
}, [setState, _isOptSOD, _cat, _riskVal, _optVal, uniqueKey, _isApL, optIdx]);
```

#### Effect B: O/D 자동동기화
```typescript
useEffect(() => {
  if (!setState || !_isOptSOD || _cat === 'S' || _isApL) return;
  if (!_hasTarget && !_preventOpt && !_detectOpt) return;
  // ... 기존 O/D 동기화 로직
}, [setState, _isOptSOD, _cat, _optVal, _riskVal, _hasTarget,
    _preventOpt, _detectOpt, _preventOptText, _detectOptText, uniqueKey, _isApL, optIdx]);
```

#### Effect C: 목표완료일자 자동채우기
```typescript
useEffect(() => {
  if (!setState || !_isTargetDate || _targetDateVal) return;
  if (!_preventOpt && !_detectOpt) return;
  const masterDate = fmeaRevisionDate || '';
  if (!masterDate) return;
  // ... 기존 날짜 채우기 로직
}, [setState, _isTargetDate, _targetDateVal, _preventOpt, _detectOpt,
    fmeaRevisionDate, uniqueKey, optIdx]);
```

### 예상 효과
- **Effect A**: `_cat !== 'S'`인 66% 셀 → 즉시 return (deps 4개만 비교)
- **Effect B**: `!_isOptSOD`인 95% 셀 → 즉시 return
- **Effect C**: `!_isTargetDate`인 97% 셀 → 즉시 return
- 각 effect의 deps가 좁아서 **불필요한 실행 대폭 감소**

### 수정 범위
- `RiskOptCellRenderer.tsx` L125-211: 1개 useEffect → 3개 분할 (로직 동일)

### 위험도: LOW-MEDIUM
- 로직은 동일하나, effect 실행 순서가 React 보장에 따라 달라질 수 있음
- 각 effect가 독립적이므로 순서 무관 (이미 `prev =>` 패턴 사용)

---

## Phase 3: useControlModalSave.ts — 단일패스 변환

### 문제
- L91-188: **4개 별도 forEach 루프**가 `processedFMGroups` 동일 구조를 반복 순회
  - 자동연결 카운트 (FC 텍스트) — L91-100
  - FM 검출 자동연결 카운트 — L104-121
  - 발생도 자동연결 카운트 — L136-153
  - 검출도 자동연결 카운트 — L170-187
- L247-369: **setState 내부에서 또 4개 forEach** 루프
- 총 **8회 순회** — 100 그룹 × 50 행 = 400,000 반복

### 해결: Lookup Map + 단일패스 카운팅

#### Step 1: Lookup Map 사전 구축
```typescript
// handleSave 진입 직후
const rowsByFcText = new Map<string, Array<{gFmId: string; rFcId: string; gProcessNo: string; gFmText: string}>>();
const rowsByFmText = new Map<string, Array<{gFmId: string; rFcId: string; rFcText: string; gProcessNo: string}>>();

processedFMGroups.forEach(group => {
  group.rows.forEach(r => {
    // fcText → rows
    const arr1 = rowsByFcText.get(r.fcText) || [];
    arr1.push({ gFmId: group.fmId, rFcId: r.fcId, gProcessNo: group.fmProcessNo, gFmText: group.fmText });
    rowsByFcText.set(r.fcText, arr1);
    // fmText → rows
    const arr2 = rowsByFmText.get(group.fmText) || [];
    arr2.push({ gFmId: group.fmId, rFcId: r.fcId, rFcText: r.fcText, gProcessNo: group.fmProcessNo });
    rowsByFmText.set(group.fmText, arr2);
  });
});
```

#### Step 2: O(1) lookup으로 카운팅
```typescript
// 자동연결 1: 같은 공정 + 동일 FC텍스트 → O(matches) (기존 O(n))
if (isAutoLinkType && currentFcText) {
  const matches = rowsByFcText.get(currentFcText) || [];
  autoLinkedCount = matches.filter(m =>
    m.gProcessNo === currentProcessNo && m.rFcId !== currentFcId
  ).length;
}
```

#### Step 3: setState 내부도 동일 Map 활용
```typescript
setState(prev => {
  const newRiskData = { ...(prev.riskData || {}) };
  newRiskData[key] = selectedValue;

  // 자동연결 1: O(matches) lookup
  if (isAutoLinkType && autoLinkedCount > 0) {
    const matches = rowsByFcText.get(currentFcText) || [];
    for (const m of matches) {
      if (m.gProcessNo !== currentProcessNo || m.rFcId === currentFcId) continue;
      newRiskData[`${saveType}-${m.gFmId}-${m.rFcId}`] = selectedValue;
      // O/D 복사 ...
    }
  }
  // 자동연결 2-4도 동일 패턴
  return { ...prev, riskData: newRiskData };
});
```

### 예상 효과
- **8회 순회 → 1회 Map 구축 + O(matches) lookup**
- 100 그룹 × 50 행: 400,000 → ~5,000 연산 (**80배 개선**)
- 모달 저장 시 200-500ms → 5-20ms

### 수정 범위
- `useControlModalSave.ts` L91-369: 카운팅+적용 로직을 Map 기반으로 교체
- 비즈니스 로직(자동연결 규칙)은 완전히 동일하게 유지

### 위험도: MEDIUM
- 자동연결 규칙이 복잡 (4가지 전략) — 테스트로 검증 필수
- Map 키가 정확해야 기존 동작 보존

---

## 검증 기준

### 필수 검증 (매 Phase 완료 후)
```bash
npx tsc --noEmit           # 타입 에러 0개
npx vitest run src/__tests__/  # 기존 테스트 전체 통과 (1062개)
```

### 성능 검증 (Phase 3 완료 후)
- React DevTools Profiler로 ALL 탭 렌더 시간 측정
- 500+ 행 데이터에서 SOD 변경 시 렌더 시간 비교
- 기대: 기존 대비 40-60% 감소

---

## 실행 순서

```
Phase 1 (AllTabRenderer useMemo)     ← 가장 큰 효과, 가장 낮은 위험
  ↓ tsc --noEmit + vitest
Phase 2 (RiskOptCellRenderer split)  ← 중간 효과, 낮은 위험
  ↓ tsc --noEmit + vitest
Phase 3 (useControlModalSave map)    ← 복잡도 높지만 모달 저장 성능 개선
  ↓ tsc --noEmit + vitest + build
```

---

## 리스크 & 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| useMemo 의존성 누락 → stale data | 낮음 | state.l1/l2/failureLinks 참조 정확히 지정 |
| useEffect 분할 시 실행 순서 문제 | 낮음 | 각 effect 독립적 + `prev =>` 패턴으로 순서 무관 |
| 자동연결 Map 키 불일치 | 중간 | 기존 테스트 + 수동 검증으로 검증 |
| CODEFREEZE 위반 | 없음 | **사용자 명시적 승인 후에만 수정** |

---

## CODEFREEZE 승인 필요

3개 파일 모두 **CODEFREEZE v4.5.0 L4** 보호 대상입니다:
- `AllTabRenderer.tsx` — L4 (Gold)
- `RiskOptCellRenderer.tsx` — L4 Phase2
- `useControlModalSave.ts` — L4 Phase2

**사용자 명시적 승인 없이 수정을 시작하지 않습니다.**
