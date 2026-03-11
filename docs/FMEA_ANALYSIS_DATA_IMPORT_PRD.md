# FMEA Analysis Data Import — 상하관계 검증 PRD

> **작성일**: 2026-02-17
> **상태**: 승인됨
> **목적**: Import 시 L1/L2/L3 계층 간 데이터 정합성을 검증하여 구조 깨짐 방지

---

## 1. 배경

### 1.1 문제
현재 PFMEA Import 파이프라인은 엑셀 데이터를 파싱 후 flatData로 변환하여 DB에 저장한다.
그러나 **상하 레벨 간 데이터 정합성 검증이 없어** 다음 문제가 반복 발생:

- **60번 공정 사고**: B1(작업요소)에 MC+IM 2개, B2(요소기능)에 MC만 1개 → IM 자동매핑 실패 → 구조 붕괴
- **검증 없이 Import → 워크시트 자동매핑 시 구조 깨짐** → 수습 불가
- "뒤에서 검증해봐야 소용없다" — **Import 전에 차단해야** 함

### 1.2 핵심 원칙
1. **상하관계 검증**: L1/L2/L3 계층 간 부모-자식 관계 필수
2. **상하 데이터 갯수 검증**: 최소 1:1 비율 — 상위 데이터마다 하위 데이터 1개 이상
3. **불일치 시 Import 불가**: 검증 실패 = Import 버튼 비활성화
4. **processNo=00(공통공정)도 동일 규칙 적용** — 예외 없음

---

## 2. 데이터 계층 구조 (PFMEA)

```
L1 완제품 (C-level)
│  C1: 구분 (YP/SP/USER)           ← 그룹 키
│  C2: 완제품기능         ← C1 당 ≥1
│  C3: 요구사항           ← C1 당 ≥1
│  C4: 고장영향           ← C1 당 ≥1
│
L2 공정 (A-level)
│  A1: 공정번호                     ← 그룹 키
│  A2: 공정명             ← A1 당 =1
│  A3: 공정기능           ← A1 당 ≥1
│  A4: 제품특성           ← A1 당 ≥1
│  A5: 고장형태           ← A1 당 ≥1 (필수)
│
└─ L3 작업요소 (B-level)
   B1: 작업요소 [+4M]              ← 그룹 키 (processNo + m4)
   B2: 요소기능 [+4M]    ← B1 m4 당 ≥1
   B3: 공정특성 [+4M]    ← B1 m4 당 ≥1
   B4: 고장원인 [+4M]    ← B1 m4 당 ≥1 (조건부)

A6(검출관리)/B5(예방관리) = 리스크분석 단계 → 검증 제외
```

---

## 3. 검증 규칙 (Validation Rules)

### 3.1 상하관계 검증 (Hierarchy Validation)

| # | 규칙 | 상위 | 하위 | 매칭 키 | 심각도 |
|---|------|------|------|---------|--------|
| H1 | L2→L3 존재 | A1(공정번호) | B1(작업요소) | processNo | ERROR |
| H2 | L3 내부 B1→B2 | B1 m4 | B2 m4 | processNo+m4 | ERROR |
| H3 | L3 내부 B1→B3 | B1 m4 | B3 m4 | processNo+m4 | ERROR |
| H4 | L3 내부 B1→B4 | B1 m4 | B4 m4 | processNo+m4 | 조건부 ERROR* |
| H5 | L1 C1→C2 존재 | C1(구분) | C2(기능) | C1값 | ERROR |
| H6 | L2 A1→A5 존재 | A1(공정번호) | A5(고장형태) | processNo | ERROR (필수) |

*B4 조건부: B4 데이터가 1건이라도 있으면 전 공정 1:1 필수, 0건이면 허용

### 3.2 갯수 검증 (Count Validation) — 최소 1:1

| # | 규칙 | 상위 항목 | 하위 항목 | 기준 | 심각도 |
|---|------|----------|----------|------|--------|
| C1 | A1 당 A2 | 공정번호 | 공정명 | =1 (정확히 1) | ERROR |
| C2 | A1 당 A3 | 공정번호 | 공정기능 | ≥1 | ERROR |
| C3 | B1 m4 당 B2 | 작업요소 m4 | 요소기능 m4 | ≥1 | ERROR |
| C4 | B1 m4 당 B3 | 작업요소 m4 | 공정특성 m4 | ≥1 | ERROR |
| C5 | B1 m4 당 B4 | 작업요소 m4 | 고장원인 m4 | ≥1 | 조건부 ERROR* |
| C6 | C1 당 C2 | 구분 | 완제품기능 | ≥1 | ERROR |
| C7 | A1 당 A5 | 공정번호 | 고장형태 | ≥1 | ERROR (필수) |

### 3.3 역방향 검증 (Orphan Detection)

| # | 규칙 | 설명 | 심각도 |
|---|------|------|--------|
| O1 | B2 orphan | B2에 m4가 있는데 B1에 해당 m4가 없음 | WARNING |
| O2 | B-level orphan | B데이터의 processNo가 A1에 없음 | WARNING |

### 3.4 기본 검증 (Basic Validation)

| # | 규칙 | 설명 | 심각도 |
|---|------|------|--------|
| V1 | 빈 processNo | processNo가 비어있는 데이터 | ERROR |
| V2 | 빈 value | value가 비어있는 데이터 | WARNING |
| V3 | A1 최소 1개 | 공정이 최소 1개 이상 | ERROR |

---

## 4. 검증 결과 처리

```
파싱 완료 후 즉시 검증 실행

├─ ERROR 0개 → ✅ Import 가능 (Import 버튼 활성화)
│   └─ WARNING 있으면 경고 표시 (진행 가능)
│
└─ ERROR ≥1개 → ❌ Import 불가 (Import 버튼 비활성화)
    └─ 오류 상세 목록 표시 + "엑셀 수정 후 다시 업로드" 안내
```

### 4.1 오류 표시 UI 예시

```
❌ 상하관계 검증 실패 (Import 불가)

[ERROR] 공정 "60" IM: 작업요소(B1) 1개 → 요소기능(B2) 0개 (최소 1개 필요)
[ERROR] 공정 "60" IM: 작업요소(B1) 1개 → 공정특성(B3) 0개 (최소 1개 필요)

⚠️ 엑셀 파일에서 누락된 데이터를 추가한 후 다시 업로드해주세요.
```

---

## 5. 구현 파일

| 파일 | 역할 | 신규/수정 |
|------|------|----------|
| `src/app/pfmea/import/utils/hierarchy-validation.ts` | 상하관계+갯수 검증 로직 | 신규 |
| `src/__tests__/import/hierarchy-validation.test.ts` | TDD 테스트 (14 케이스) | 신규 |
| `src/app/pfmea/import/hooks/useImportFileHandlers.ts` | 검증 통합 | 수정 |
| `src/app/pfmea/import/excel-parser.ts` | 기존 B1-B2 검증 이관 | 수정 |
