# SA 확정 버튼 작동 불가 수정 — 2026-02-23

## 증상
- Import 페이지에서 "SA 확정" 버튼 클릭 시 **아무 반응 없음**
- 저장 직후(~5초 이내)에는 정상 작동하지만, 5초 후 버튼 비활성화

## 근본 원인

### `setTimeout(() => setIsSaved(false), 5000)` — 2곳에서 발견

저장 후 `isSaved=true`를 설정하지만 **5초 후 자동으로 `false`로 되돌림**.
`canConfirmSA()` 조건이 `flatData.length > 0 && isSaved` 이므로,
5초 후 `isSaved=false` → `canSA=false` → SA 확정 버튼 비활성화.

```
[사용자 저장 클릭]
     ↓
setIsSaved(true)          ← 버튼 활성화됨
     ↓ (5초 경과)
setTimeout → setIsSaved(false)  ← 버튼 비활성화됨 (버그!)
     ↓
사용자: "SA 확정 클릭" → 아무 반응 없음
```

## 수정 내역 (4개 파일)

### 1. `src/app/pfmea/import/hooks/useImportHandlers.ts` (라인 173)

| Before | After |
|--------|-------|
| `setIsSaved(true); setTimeout(() => setIsSaved(false), 5000);` | `setIsSaved(true);` |

- `setTimeout` 제거
- `isSaved=true`가 사용자가 데이터 편집 전까지 유지됨
- **CODEFREEZE 파일이지만**, 해당 setTimeout은 DB Only 정책과 무관한 **버그**이므로 수정

### 2. `src/app/pfmea/import/hooks/usePreviewHandlers.ts` (라인 132)

| Before | After |
|--------|-------|
| `setIsSaved(true); setDirty(false); setTimeout(() => setIsSaved(false), 5000);` | `setIsSaved(true); setDirty(false);` |

- 동일한 `setTimeout` 패턴 제거

### 3. `src/app/pfmea/import/hooks/useImportSteps.ts` (라인 99~134)

**변경**: `confirmSA` 함수에 **try-catch + console.warn** 추가

```typescript
// Before: try-catch 없음 → 에러 시 사용자에게 피드백 없음
const confirmSA = useCallback((): BuildResult | null => {
  if (!canConfirmSA(...)) return null;  // ← null 반환, 사용자는 모름
  const result = buildWorksheetState(...);
  ...
});

// After: try-catch + 실패 원인 로깅
const confirmSA = useCallback((): BuildResult | null => {
  if (!canConfirmSA(...)) {
    console.warn('[SA 확정] canConfirmSA 실패:', { dataLen, isSaved, missingTotal });
    return null;
  }
  try {
    const result = buildWorksheetState(...);
    ...
  } catch (err) {
    console.error('[SA 확정] buildWorksheetState 오류:', err);
    alert('SA 확정 중 오류가 발생했습니다: ' + err.message);
    return null;
  }
});
```

### 4. `src/app/pfmea/import/components/TemplateGeneratorPanel.tsx` (라인 1074~1083)

**변경**: `confirmSA()` 반환값이 `null`일 때 **사용자 안내 alert** 추가

```typescript
// Before: result가 null이면 아무 반응 없음
} else if (result && !result.success) {
  alert('SA 확정 실패...');
}

// After: null일 때도 안내
} else if (!result) {
  alert('SA 확정 불가: 데이터를 먼저 저장해주세요.');
}
```

## 테스트 결과

### 단위 테스트: 92/92 PASS (회귀 3회 완료)

| 파일 | 테스트 수 | 상태 |
|------|----------|------|
| `step-confirmation.test.ts` | 16건 | PASS |
| `hierarchy-validation.test.ts` | 15건 | PASS |
| `fc-comparison.test.ts` | 8건 | PASS |
| **`real-data-pipeline.test.ts`** (신규) | **53건** | **PASS** |

### 실제 엑셀 데이터(1515건) 고장연결 완전성 검증

| 단계 | 항목 | 원본 | 빌드 결과 | 누락 |
|------|------|------|----------|------|
| 구조분석 | L2 공정(A1) | 17개 | 17개 | **0건** |
| 구조분석 | L3 작업요소(B1) | 126건 | 126건 | **0건** |
| 구조분석 | L1 구분(C1) | 3개 | 3개+ | **0건** |
| 2L기능 | A3(공정기능) | 26건 | 26건+ | **0건** |
| 2L기능 | A4(제품특성) | 59건 | 59건+ | **0건** |
| 2L기능 | A5(고장형태/FM) | **107건** | **107건** | **0건** |
| 3L기능 | B2(요소기능) | 128건 | 128건+ | **0건** |
| 3L기능 | B3(공정특성) | 129건 | 129건+ | **0건** |
| 고장원인 | B4(고장원인/FC) | **251건** | **251건** | **0건** |
| 고장영향 | C4(고장영향/FE) | 22건 | 22건+ | **0건** |
| 특별특성 | A4 specialChar | 5건 | 5건+ | **0건** |
| 특별특성 | B3 specialChar | 3건 | 3건+ | **0건** |
| 심각도 | FE scope 매핑 | 100% | 100% | **0건** |

### 타입체크
```
npx tsc --noEmit → 에러 0개
```

## 영향 범위
- **영향 있는 화면**: Import 페이지 (`/pfmea/import`)
- **영향 없는 화면**: 워크시트, 등록, Control Plan, PFD 등 모든 다른 화면
- **기존 기능 손상**: 없음 (setTimeout 제거만, 저장 로직 변경 없음)
- **DB 변경**: 없음

## 머지 시 주의사항
1. `useImportHandlers.ts`, `usePreviewHandlers.ts`는 CODEFREEZE 파일이지만 **버그 수정**이므로 예외 적용
2. `test-fixture-real-data.json`은 실제 엑셀에서 추출한 1515건 테스트 데이터 (커밋에 포함)
3. `tmp_test_data.xlsx`는 **커밋에 포함하지 않음** (.gitignore 대상)

## 검증 명령어
```bash
# 타입체크
npx tsc --noEmit

# 단위 테스트 (92건)
npx vitest run src/__tests__/import/

# SA 확정 테스트만
npx vitest run src/__tests__/import/step-confirmation.test.ts

# 실제 데이터 파이프라인 테스트만
npx vitest run src/__tests__/import/real-data-pipeline.test.ts
```
