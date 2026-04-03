## 작업: FMEA Import 네이밍 전수조사 (AUDIT ONLY — 코드 수정 절대 금지)

### 배경
Smart FMEA에는 두 가지 Import 경로가 있다:
1. **수동 Import** — 15개 개별시트 (L2-1(A1)~L1-4(C4))
2. **복합시트 Import (ReverseImport)** — 6개 통합시트 (L1통합, L2통합, L3통합, FC, FA, VERIFY)

두 경로가 동일한 FMEA ID 체계(A1~A6, B1~B5, C1~C4)를 사용하지만,
헤더 문자열 형식이 다르고 코드 내 참조 방식도 다를 수 있다.
이 조사에서 현재 상태를 정확히 파악한다.

### FMEA ID 체계 (기준)
```
L2 레벨: A1(공정번호) A2(공정명) A3(공정기능) A4(제품특성) A5(고장형태) A6(검출관리)
L3 레벨: B1(작업요소) B2(요소기능) B3(공정특성) B4(고장원인) B5(예방관리)
L1 레벨: C1(구분) C2(제품기능) C3(요구사항) C4(고장영향)
```

### 조사 항목 (5개)

#### 조사 1: Import Excel 템플릿 헤더 변형 수집
아래 경로에서 Import 관련 Excel 템플릿/샘플 파일을 찾아 시트별 헤더를 수집:
- 프로젝트 내 `.xlsx` 파일 (public/, assets/, templates/, fixtures/, test/ 등)
- 각 헤더에서 FMEA ID(A1~C4) 추출
- 동일 ID의 모든 헤더 변형(variant) 나열

이미 파악된 변형 예시 (이것 외에 추가 변형이 있는지 확인):
```
A1 공정번호: "L2-1.공정번호" / "A1.공정번호" / "공정No(A1)" / "공정번호"
B1 작업요소: "L3-1.작업요소(설비)" / "작업요소(B1)" / "WE(작업요소)"
C2 제품기능: "L1-2.제품(반)기능" / "제품기능(C2)"
```

#### 조사 2: 파서 코드에서 FMEA ID 참조 방식
src/ 하위 전체에서 다음 패턴을 검색하여 각 파일이 어떤 방식으로 컬럼을 식별하는지 파악:

```bash
# 검색할 패턴들
grep -rn "L[123]-[0-9]\." src/                    # 수동 convention (L2-1.공정번호)
grep -rn "[ABC][1-6]\." src/                       # 복합 convention (A1.공정번호)
grep -rn "(A[1-6])" src/                           # 복합 convention (공정번호(A1))
grep -rn "(B[1-5])" src/                           # 복합 convention (작업요소(B1))
grep -rn "(C[1-4])" src/                           # 복합 convention (구분(C1))
grep -rn "공정번호\|공정명\|공정기능\|제품특성\|고장형태\|검출관리" src/
grep -rn "작업요소\|요소기능\|공정특성\|고장원인\|예방관리" src/
grep -rn "processNo\|processName\|functionName\|failureMode\|failureCause" src/
grep -rn "failureEffect\|productChar\|processChar\|elementName" src/
grep -rn "dedupKey\|dedup\|duplicate\|중복" src/
```

각 파일에 대해 기록할 것:
- 파일 경로
- 사용하는 네이밍 convention (수동 style / 복합 style / 영문 camelCase / 혼용)
- 컬럼 식별 방식 (인덱스 기반 / 헤더 문자열 매칭 / 상수 참조)
- 하드코딩 여부 (문자열 직접 사용 vs 상수/enum)

#### 조사 3: Prisma 스키마 필드명 ↔ FMEA ID 매핑
prisma/ 폴더의 모든 `.prisma` 파일에서:
- Import 관련 모델 (Structure, Function, Failure, ProcessItem 등) 찾기
- 각 모델의 필드명이 A1~C4 중 어느 것에 대응하는지 매핑
- parentId / FK 관련 필드 명칭 확인
- `@relation` 설정 현황 (있음/없음, onDelete 정책)

#### 조사 4: 프론트엔드 렌더링에서 데이터 키 참조
src/app/ 및 src/components/ 하위에서:
- 워크시트/탭 렌더러가 데이터를 어떤 키(key/property)로 접근하는지
- 중복제거(dedup) 로직이 있다면: 어떤 필드를 기준으로 하는지, 어느 시점에서 하는지
- A1~C4 ID 또는 한글 필드명이 프론트엔드에 하드코딩되어 있는지

#### 조사 5: 엔티티 명칭 충돌 확인
코드에서 "A1", "A3", "A5", "B1", "B3", "B5"를 변수명/타입명/주석에 사용하는 부분을 찾아:
- Import 컬럼 ID로 사용하는 경우 (정상)
- 엔티티/구조트리 노드를 가리키는 경우 (충돌 위험)
- 두 의미가 혼재하는 경우 (버그 원인)

### 산출물: NAMING_AUDIT_REPORT.md

프로젝트 루트에 아래 구조로 작성:

```markdown
# FMEA Import 네이밍 전수조사 보고서
> 작성일: YYYY-MM-DD
> 조사 범위: src/ 전체 + prisma/ + Excel 템플릿

## 1. FMEA ID별 헤더 변형 매핑표
| FMEA ID | 의미 | 변형1 (수동) | 변형2 (복합L2) | 변형3 (복합L1/L3) | 변형4 (FC시트) | 변형5 (FA시트) | 기타 |
(A1~C4 전체 15개 ID × 모든 발견된 변형)

## 2. 파서별 네이밍 현황
| 파일 경로 | 역할 | convention | 컬럼 식별 방식 | 하드코딩 여부 | 참조하는 FMEA ID |
(Import 관련 파서 파일 전체)

## 3. Prisma 모델 ↔ FMEA ID 매핑
| 모델명 | 필드명 | 대응 FMEA ID | @relation 유무 | onDelete | FK 대상 |
(Import 관련 모델 전체)

## 4. 프론트엔드 키 매핑 및 dedup 현황
| 파일 경로 | 컴포넌트/함수 | 사용 키 | 대응 FMEA ID | dedup 로직 | dedup 기준 필드 |
(렌더러/탭 컴포넌트 전체)

## 5. 엔티티 명칭 충돌 목록
| 파일 경로 | 라인 | 코드 | "A3" 등의 의미 | 충돌 여부 | 비고 |

## 6. 불일치 및 위험 항목 (Critical)
| # | 위치 | 문제 설명 | 영향도(H/M/L) | 비고 |
(위 조사에서 발견된 모든 불일치/위험 사항)

## 7. 통계 요약
- 총 조사 파일 수: N개
- FMEA ID 참조 파일 수: N개
- 하드코딩된 헤더 문자열 수: N개
- 발견된 불일치 수: N건 (H: N, M: N, L: N)
```

### 절대 금지 사항
1. 어떤 코드 파일도 수정하지 않는다
2. 추측으로 기록하지 않는다 — 실제 코드에서 확인한 것만 기록
3. "아마 이럴 것이다" 같은 추정 금지 — 파일 경로와 라인 번호 명시
4. 산출물 외의 파일을 생성하지 않는다
5. NAMING_AUDIT_REPORT.md 작성에만 집중한다