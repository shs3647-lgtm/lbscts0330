# 📋 모듈 ID 약어 규칙

> **목적**: 화면 표시 공간 최적화를 위한 모듈 ID 약어 통일 규칙
> **적용일**: 2026-02-04

---

## 모듈 약어 표

| 모듈 | 전체 명칭 | 약어 | 예시 ID |
|------|----------|------|---------|
| **APQP** | Advanced Product Quality Planning | **APQ** | apq26-001 |
| **PFMEA** | Process FMEA | **PFM** | pfm26-p001 |
| **DFMEA** | Design FMEA | **DFM** | dfm26-d001 |
| **CP** | Control Plan | **CP** | cp26-c001 |
| **PFD** | Process Flow Diagram | **PFD** | pfd26-f001 |
| **WS** | Work Standard | **WS** | ws26-001 |
| **PM** | Process Management | **PM** | pm26-001 |

---

## 화면 표시 규칙

### 1. 헤더 라벨
```
❌ 잘못된 예: "상위 APQP", "연동 PFD", "FMEA ID"
✅ 올바른 예: "APQP", "PFD", "ID"
```

### 2. 데이터 셀
```
❌ 잘못된 예: apqp26-001 (전체 ID)
✅ 올바른 예: 26-001 (접두사 제거하고 간략 표시)
```

### 3. TYPE 표시
```
❌ 잘못된 예: "Master", "Family", "Part" (전체)
✅ 올바른 예: M, F, P (1자리)
```

### 4. 단계 표시
```
❌ 잘못된 예: "1단계", "4단계" (배지)
✅ 올바른 예: 1, 4 (숫자만)
```

---

## 컬럼 헤더 표준

| 현재 라벨 | 변경 전 | 비고 |
|----------|--------|------|
| No | - | 그대로 유지 |
| 작성일 | - | 그대로 유지 |
| ID | FMEA ID | 간소화 |
| Rev | - | 그대로 유지 |
| TYPE | - | M/F/P 1자리 |
| 단계 | - | 숫자만 |
| 공장 | - | 그대로 유지 |
| FMEA명 | - | 그대로 유지 |
| 고객사 | - | 그대로 유지 |
| 공정책임 | - | 그대로 유지 |
| 담당자 | - | 그대로 유지 |
| APQP | 상위 APQP | "상위" 제거 |
| PFD | 연동 PFD | "연동" 제거 |
| CP | 연동 CP | "연동" 제거 |
| 현황 | - | 그대로 유지 |
| 시작일 | - | 그대로 유지 |
| 목표완료일 | - | 그대로 유지 |

---

## 적용 대상 파일

- `src/app/pfmea/list/page.tsx`
- `src/app/dfmea/list/page.tsx`
- `src/app/control-plan/list/page.tsx`
- `src/app/pfd/list/page.tsx`
- `src/app/apqp/list/page.tsx`

---

> **⚠️ 주의**: 이 규칙은 모든 리스트 페이지에 통일 적용되어야 합니다.
