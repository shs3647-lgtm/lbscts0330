# AP 등급 → L(Low) 달성 최단거리 개선 전략

## 핵심 개념

| 항목 | 설명 |
|------|------|
| **S(심각도)** | 고정값 — 공정 고유 특성으로 변경 불가 |
| **O(발생도)** | 개선 가능 (최소 O=2) |
| **D(검출도)** | 개선 가능 (최소 D=2) |
| **Cost** | `|ΔO| + |ΔD|` — 총 이동 점수 |

## AP 매트릭스 (AIAG-VDA 기반 — apCalculator.ts)

```
          D8-10   D6-7   D4-5   D1-3
S9-10:
  O8-10    H       H      H      H
  O6-7     H       H      H      H
  O4-5     H       H      L      L
  O2-3     H       M      L      L
  O1       H       L      L      L

S7-8:
  O8-10    H       H      H      H
  O6-7     H       H      M      H
  O4-5     H       M      L      L
  O2-3     M       L      L      L
  O1       L       L      L      L

S4-6:
  O8-10    H       H      M      L
  O6-7     H       M      L      L
  O4-5     H       M      L      L
  O2-3     M       L      L      L
  O1       L       L      L      L

S2-3:
  O8-10    M       L      L      L
  O6-7     L       L      L      L
  O4-5     L       L      L      L
  O2-3     L       L      L      L
  O1       L       L      L      L
```

## 최단거리 계산 알고리즘

각 건(S, O, D)에 대해 모든 가능한 (O', D') 조합을 탐색합니다:

- **제약 조건**: O' ≤ O, D' ≤ D, O' ≥ 2, D' ≥ 2
- **목표**: AP(S, O', D') = L (또는 M)
- **비용**: Cost = (O - O') + (D - D')
- **선택**: 최소 Cost 경로

### 3가지 경로 유형

| 경로 | 설명 | 예시 |
|------|------|------|
| **O_ONLY** | O만 낮춤 (D 고정) | O=8→2, D=8 유지 |
| **D_ONLY** | D만 낮춤 (O 고정) | O=8 유지, D=8→3 |
| **BOTH** | O와 D 모두 낮춤 | O=8→3, D=8→4 |

### 예시 계산

**Case: S=8, O=8, D=8 (현재 H)**

| 경로 | 목표 O | 목표 D | ΔO | ΔD | Cost | 결과 AP |
|------|--------|--------|----|----|------|---------|
| O만 | O→2 | D=8 | 6 | 0 | 6 | M (부족) |
| D만 | O=8 | D→3 | 0 | 5 | 5 | H (불가) |
| O+D | O→2 | D→5 | 6 | 3 | 9 | L ✓ |
| O+D | O→3 | D→4 | 5 | 4 | 9 | L ✓ |
| O+D | O→4 | D→4 | 4 | 4 | 8 | L ✓ |
| **O+D** | **O→5** | **D→4** | **3** | **4** | **7** | **L ✓ 최단** |

## 구현 파일

| 파일 | 역할 |
|------|------|
| `apMinCostMap.ts` | 알고리즘 핵심 — `findMinCostToL`, `findMinCostToM`, `applyAPImprovement` |
| `apCalculator.ts` | AP 등급 계산 함수 (`calculateAP`) |
| `RecommendModal.tsx` | UI — "H+M→L 전체개선" / "H→M 1단계개선" 버튼 |
| `AllTabEmpty.tsx` | AP 개선 핸들러 (`handleAPImprove`) |

## 사용 방법

1. PC/DC추천 버튼 클릭 → 모달 열기
2. **AP 최단거리 개선** 섹션에서:
   - **H+M → L 전체개선**: H건 + M건 모두 L로 최소 cost 이동
   - **H → M 1단계개선**: H건만 M으로 최소 cost 이동
3. 결과 alert에서 개선 건수/불가 건수 확인
4. 저장 버튼으로 DB 반영

## 함수 API

### `findMinCostToL(s, o, d): APImproveResult`

주어진 (S, O, D)에서 AP=L까지의 최소 cost 경로 반환.

### `findMinCostToM(s, o, d): APImproveResult`

주어진 (S, O, D)에서 AP=M 이하까지의 최소 cost 경로 반환 (H→M 전용).

### `applyAPImprovement(riskData, uniqueKeys, severity, targetLevel): { updatedData, stats }`

워크시트 전체에 최소 cost 개선 일괄 적용.
- `severity`: globalMaxSeverity (5AP 기준 전체 동일 S)
- `targetLevel`: 'L' 또는 'M'
- 반환값: 업데이트된 riskData + 통계 요약

## 주의사항

- O=1, D=1은 현실적으로 불가능 → 최소 O=2, D=2 제한
- S(심각도)는 절대 변경하지 않음 (공정 고유 특성)
- 일부 S=9-10 + O=8-10 조합은 O=2, D=2에서도 L 불가 → "개선불가" 처리
