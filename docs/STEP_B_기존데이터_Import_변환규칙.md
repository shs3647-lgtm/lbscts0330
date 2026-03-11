# STEP AB 기존데이터 → Smart System Import 변환 규칙

> **용도**: Claude 프로젝트에서 기존 FMEA 엑셀(STEP B) 데이터를 Smart System Import 포맷으로 변환할 때 사용하는 규칙
> **버전**: 2.7.3 (2026-02-25)
> **첨부 양식**: `PFMEA_기초정보_데이터_2026-02-23.xlsx` — **반드시 이 엑셀 양식을 사용하여 데이터를 작성**
> **변경이력**:
> - v2.7.3 — **O추천/D추천 자동산출 + STEP A+B 파싱 분리**: ① FA 시트에 O추천(발생도)/D추천(검출도) 2개 컬럼 추가 (26열→28열), ② PC텍스트 키워드→관리유형 분석→AIAG-VDA 표P2 기준 O값 추천, ③ DC텍스트 키워드→검출기회×성숙도 분석→AIAG-VDA 표P3 기준 D값 추천, ④ STEP A+B 2시트 통합 Import 파싱 강화: `isStepASheet()` 감지 함수 추가 (구조/기능 키워드 3개만으로 감지 가능)
> - v2.7.2 — **공정번호 추출 규칙 신규 (2.2.1절)**: ① 엑셀 공정번호 컬럼에 긴 텍스트("20번 PCB A'SSY SW...")가 있을 때 "N번" 패턴만 추출, ② 정규식 `^(\d+번)` 적용, ③ A4 데이터 누락 버그 수정, ④ 누락 카운트에서 UI 플레이스홀더만 제외('미입력' 등 원본 데이터는 유지)
> - v2.7.1 — **C1 구분값 통일 규칙 + 첨부 양식 필수 지시**: ① C1~C4 시트의 구분값(processNo)을 반드시 **약어(YP/SP/USER)로 통일** (풀네임 혼용 금지), ② 첨부 엑셀 양식 필수 사용 명시, ③ FA 시트 26열 (DC추천/PC추천 포함), ④ B5 m4 필수 기입 규칙 강화, ⑤ 한국산업 DB 연동 + 자동추천 3단계 매칭 코드 반영 (24개 DC규칙 + 28개 PC규칙 + 11개 PC→DC 연계규칙)
> - v2.7.0 — **DC/PC 3단계 매칭 추천 + Import 엑셀 추천 컬럼**: ① FA 시트에 DC추천1/DC추천2/PC추천1/PC추천2 4개 컬럼 추가 (22열→26열), ② PC 3단계 매칭: 4M카테고리(15%)+FC키워드(25%)+FM키워드(20%)+유사도(40%), FC→PC 규칙 17개+FM→PC 규칙 11개, ③ DC 3단계 매칭: FM+FC결합 키워드규칙→유사도보정→PC→DC연계 부스팅, 산업특화 5개 규칙 추가(18→23개), ④ A6 111행→168행(+51%), B5 208행→493행(+137%) 확충 (R4→R5), ⑤ 한국산업 DB 테이블 신설 (KrIndustryDetection/KrIndustryPrevention)
> - v2.5.3 — **원본 대조 검증 (Raw Fingerprint)**: 파싱 로직과 완전 독립된 원본 스캔 → 파싱 결과 대조 검증 파이프라인 구축, 공정별 FM/FC/FE 건수 교차 검증 (4개 검증 항목: FM건수·FC/FM·FE/FM·사슬행수), PASS/FAIL 자동 판정, 불일치 상세 리포트
> - v2.5.2 — **파싱 변환결과 통계 검증**: 공정별 고장형태(A5) 고유 건수를 검증 핵심으로 정의, ParseStatistics 타입 추가 (R0→R1 리비전 검증 재사용 가능), SA 탭 상단에 변환결과 통계표 표시
> - v2.5.1 — **시트 순서 절대 규칙 강화**: L2(A)→L3(B)→L1(C) 순서를 섹션 1.3으로 독립 분리, ❌ L1(C)부터 시작 금지 경고 강화, 출력 섹션에도 시트 순서 경고 반복 명시
> - v2.5.0 — **단일시트 행별 고장사슬 자동 추출**: "fmea result" 단일시트에서 각 행(B4 존재)을 1개 MasterFailureChain으로 추출, 공정 스코프 Forward Fill (FM/FE/Severity), 별도 FC 시트 불필요
> - v2.4.1 — **특별특성 역매핑 검증 규칙** 신규 (7.5절): STEP B(FA) → STEP A(A4/B3) 역매핑 알고리즘 명시, Forward Fill 주의사항, 6개 검증 항목, 역매핑 파이프라인 코드 경로 문서화, `check-specialchar.js` 진단 스크립트 추가
> - v2.4.0 — **특별특성(specialChar) 파이프라인** 추가: ImportedFlatData에 `specialChar` 필드 신설, A4(제품특성)/B3(공정특성) 시트에 특별특성 컬럼 추가, FA 통합분석 시트에 특별특성(A4)/특별특성(B3) 2개 컬럼 추가, Excel 파싱→Import→워크시트 전달 완전 지원
> - v2.3.0 — **고장사슬 검증 규칙** 추가 (7개 핵심 검증 항목), Pool 타입 정의 명확화, 오류 엑셀 다운로드 사양
> - v2.2.0 — **고장사슬 조립 상세 규칙** 신규 섹션 추가 (Forward Fill→chain 변환 전 과정, FE≠FC 비대칭 시나리오, pseudo-code, 올바른/잘못된 출력 비교)
> - v2.1.1 — Forward Fill 전처리 규칙 추가 (엑셀 병합셀 → 빈칸 채우기)
> - v2.1.0 — B5/A6을 MasterFailureChain에서 완전 분리 → 별도 Pool 구조로 변경 (N:M 관계 반영)
> - v2.0.0 — B5 4M 상속 메커니즘 명시, 4M 검증 키워드 규칙 추가

---

## 1. 개요

### 1.1 목적
기존 FMEA SW(구 시스템)의 STEP B 결과물(엑셀)을 Smart System의 기초정보 Import 포맷(`ImportedFlatData[]` + `MasterFailureChain[]` + `PreventionPool[]` + `DetectionPool[]`)으로 변환하여, 워크시트에 자동 반영하는 규칙을 정의합니다.

### 1.1.1 첨부 양식 필수 사용 (★★★ v2.7.1 절대 규칙)

> **⚠️ CRITICAL**: 데이터 작성 시 반드시 **첨부된 엑셀 양식**(`PFMEA_기초정보_데이터_YYYY-MM-DD.xlsx`)을 사용하세요.
>
> **엑셀 양식 시트 구성 (17시트)**:
> | # | 시트명 | 열 구성 | 필수 |
> |---|--------|---------|------|
> | 1 | L2-1(A1) 공정번호 | 공정번호, 공정명, 공정유형코드(선택) | O |
> | 2 | L2-2(A2) 공정명 | 공정번호, 공정명 | O |
> | 3 | L2-3(A3) 공정기능 | 공정번호, 공정기능 | O |
> | 4 | L2-4(A4) 제품특성 | 공정번호, 제품특성, 특별특성 | O |
> | 5 | L2-5(A5) 고장형태 | 공정번호, 고장형태 | O |
> | 6 | L2-6(A6) 검출관리 | 공정번호, 검출관리 | O |
> | 7 | L3-1(B1) 작업요소 | 공정번호, 4M, 작업요소 | O |
> | 8 | L3-2(B2) 요소기능 | 공정번호, 4M, 요소기능 | O |
> | 9 | L3-3(B3) 공정특성 | 공정번호, 4M, 공정특성, 특별특성 | O |
> | 10 | L3-4(B4) 고장원인 | 공정번호, 4M, 고장원인 | O |
> | 11 | L3-5(B5) 예방관리 | 공정번호, **4M(필수)**, 예방관리 | O |
> | 12 | L1-1(C1) 구분 | 구분 | O |
> | 13 | L1-2(C2) 제품기능 | 구분, 제품기능 | O |
> | 14 | L1-3(C3) 요구사항 | 구분, 요구사항 | O |
> | 15 | L1-4(C4) 고장영향 | 구분, 고장영향 | O |
> | 16 | FC 고장사슬 | 공정번호+4M+B4+A5+C4+B5+A6+SOD+AP | 선택 |
> | 17 | FA 통합분석 | 26열 통합 (DC추천/PC추천 포함) | 선택 |
>
> **C1~C4 시트 구분값 통일 규칙 (★★★ 절대 규칙)**:
>
> | 규칙 | 설명 |
> |------|------|
> | **반드시 약어만 사용** | C1, C2, C3, C4 모든 시트에서 구분값 = **YP / SP / USER** |
> | **풀네임 사용 금지** | ~~Your Plant~~, ~~Ship to Plant~~, ~~User~~ → Import 시 중복 타입 생성 |
> | **시트 간 통일** | C1의 구분값 = C2의 구분값 = C3의 구분값 = C4의 구분값 (모두 동일한 약어) |
>
> ```
> ✅ 올바른 예:
>   C1: YP, SP, USER
>   C2: YP → "Y1_ CASE, PGU를 조립...", SP → "C1:HUD A'SSY...", USER → "U5-6:보조 기능..."
>   C3: YP → "외관", SP → "설비장착성", USER → "U11_제한속도..."
>   C4: YP → "Y1-6선별재작업...", SP → "C2-5:선별...", USER → "U5-6:보조 기능 상실..."
>
> ❌ 잘못된 예 (중복 타입 발생 → 누락 버그):
>   C1: YP, SP, USER, Your Plant, Ship to Plant, User  ← 6개 (3개만 있어야!)
>   C2: Your Plant → "Y1_...", Ship to Plant → "C1:..."  ← 풀네임 사용
>   C3: YP → "외관", SP → "설비장착성"                    ← 약어 사용
>   → C2는 "Your Plant"이고 C3는 "YP" → 서로 다른 processNo → 기능-요구사항 분리!
> ```
>
> **B5 예방관리 4M 필수 기입 규칙**:
> - B5 시트의 **4M 열은 반드시 기입** (MN/MC/IM/EN)
> - 4M이 비어있으면 자동추천 시 4M 기반 매칭 불가 → 추천 정확도 저하
> - 같은 공정번호의 B4(고장원인) 행과 동일한 4M 값을 사용

### 1.2 변환 흐름
```
기존 FMEA 엑셀 (STEP B)
    ↓ [parseSingleSheetFmea — 열 헤더 키워드 감지 + 행별 고장사슬 자동 추출]
ImportedFlatData[] (14개 아이템코드 평면 데이터)
    + MasterFailureChain[] (고장사슬: FC↔FM↔FE 트라이어드 — 행별 자동 추출)
    + PreventionPool[] (예방관리 풀: B5 데이터, 고장사슬 미참여)
    + DetectionPool[] (검출관리 풀: A6 데이터, 고장사슬 미참여)
    ↓ [Smart System Import]
워크시트 자동 완성 (구조분석 → 최적화)
```

> **★ v2.5.0 핵심 변경 — 단일시트 행별 고장사슬 추출**:
> 실제 고객사 STEP B 엑셀은 **"fmea result" 단일 시트**만 존재하고,
> 별도 FC 고장사슬 시트가 **없는** 경우가 대부분입니다.
> `parseSingleSheetFmea`가 데이터 행을 순회하면서:
> 1. **Forward Fill** (FM/FE/Severity를 공정 스코프로 전파)
> 2. **B4(고장원인)가 있는 행마다** 1개 `MasterFailureChain` 생성
> 3. 별도 FC 시트 파싱 불필요 — 단일시트에서 구조+기능+고장사슬 **모두** 추출

### 1.3 시트 순서 규칙 (★★★ 절대 규칙 — v2.5.0)

> **⚠️ CRITICAL**: 시트 순서는 L1→L2→L3가 **아닙니다!**
> FMEA의 기준은 **L2(공정)**이므로, L2 시트가 반드시 첫 번째입니다.

**올바른 시트 순서: L2(A) → L3(B) → L1(C)**

```
시트 1:  A1 공정번호     ← L2 (공정 레벨) — 반드시 첫 시트!
시트 2:  A2 공정명
시트 3:  A3 공정기능
시트 4:  A4 제품특성
시트 5:  A5 고장형태
시트 6:  A6 검출관리
시트 7:  B1 작업요소     ← L3 (작업요소 레벨)
시트 8:  B2 요소기능
시트 9:  B3 공정특성
시트 10: B4 고장원인
시트 11: B5 예방관리
시트 12: C1 구분          ← L1 (완제품 레벨) — 마지막!
시트 13: C2 제품기능
시트 14: C3 요구사항
시트 15: C4 고장영향
(시트 16: FC 고장사슬 — 멀티시트 형식에만 존재)
(시트 17: FA 통합분석 — 선택)
```

> **❌ 금지**: L1(C1)→L2(A1)→L3(B1) 순서 — "L숫자가 작은 게 먼저"로 오해하면 안 됨
> **✅ 올바른**: L2(A1)→L3(B1)→L1(C1) 순서 — FMEA 공정 기준
> **이유**: PFMEA는 공정(L2)이 분석의 출발점이고, 완제품(L1)은 공정의 상위 개념으로 참조용
> **코드 참조**: `SHEET_ORDER` 상수 (`excel-styles.ts`), `SHEET_DEFINITIONS` 배열 (`excel-template.ts`)

### 1.4 2단계(STEP) 구성
| STEP | 내용 | 데이터 범위 |
|------|------|-------------|
| **STEP A** | 시스템분석 (구조+기능) | A1~A4, B1~B3, C1~C3 |
| **STEP B** | 고장분석+리스크 (STEP A 포함) | A1~A6, B1~B5, C1~C4 + SOD/AP |

---

## 2. 기존 FMEA 엑셀 → ImportedFlatData 매핑

### 2.1 ImportedFlatData 구조
```typescript
interface ImportedFlatData {
  id: string;          // 고유 ID (자동 생성: "imp-{timestamp}-{index}")
  processNo: string;   // A/B: 공정번호, C: 구분값(YP/SP/USER)
  category: 'A'|'B'|'C';
  itemCode: string;    // A1~A6, B1~B5, C1~C4
  value: string;       // ★ 반드시 문자열!
  m4?: string;         // B 카테고리 전용: MN|MC|IM|EN
  specialChar?: string; // ★ v2.4.0: A4(제품특성)/B3(공정특성)의 특별특성 기호 (◇, ◆, △, ○ 등)
  inherited?: boolean;
  sourceId?: string;
  createdAt: Date;
}
```

> **★ v2.4.0 — specialChar 필드 규칙**:
> - **적용 대상**: `itemCode = 'A4'` (제품특성) 또는 `itemCode = 'B3'` (공정특성)인 항목만
> - **값**: 엑셀의 "특별특성" 열에 입력된 기호 문자열 (◇, ◆, △, ○, C, S 등)
> - **선택 항목**: specialChar가 없어도 A4/B3 항목은 정상 생성됨
> - **파이프라인**: 엑셀 파싱(excel-parser.ts) → ImportedFlatData → buildWorksheetState → 워크시트 L2/L3 productChars/processChars의 `specialChar` 속성으로 전달

### 2.2 시트 형식 (엑셀 시트 → 데이터)

#### 형식 A: 멀티시트 (16시트 분리 양식)
엑셀 양식이 **16시트**로 구성된 경우:
- **시트 1~14**: 14개 아이템코드 (A1~A6, B1~B5, C1~C4) = 구조+기능 평면 데이터
- **시트 15**: FC 고장사슬 — 1행=1개 FE↔FM↔FC 트라이어드 + SOD/AP
- **시트 16**: FA 통합분석 — 1행=ALL (구조+기능+고장+SOD 통합)

> **Claude 프로젝트에서 생성 시**: FA 시트(16번)만 채우면 나머지 14+FC 시트는 자동 도출 가능

#### 형식 B: 단일시트 ("fmea result" — 실무 대부분) ★ v2.5.0

> **⚠️ 실무 현실**: 고객사 STEP B 엑셀은 대부분 **"fmea result" 단일 시트**만 존재합니다.
> 별도 FC 고장사슬 시트(15번)가 **없습니다**.
> 예: T&F HUD PFMEA → 시트 3개만 존재 ("fmea result", "수정이력", "검증통계")

단일시트 형식에서는 `parseSingleSheetFmea`가 **하나의 시트**에서 모든 데이터를 추출합니다:
- **구조 데이터**: A1~A6, B1~B5, C1~C4 → `ImportedFlatData[]`
- **고장사슬**: 각 행(B4 존재)마다 → `MasterFailureChain[]` (행별 자동 추출)
- **Pool 데이터**: B5 → `PreventionPool[]`, A6 → `DetectionPool[]`

```
단일시트 "fmea result" 1행의 데이터 구성:
┌─────────────────────────────────────────────────────────────────────┐
│ 공정NO │ 4M │ 작업요소 │ 구분 │ FE │ S │ FM │ 4M │ WE │ FC │ PC │ O │ DC │ D │ AP │
│  A1   │    │   B1    │ C1  │ C4 │   │ A5 │    │    │ B4 │ B5 │   │ A6 │   │    │
│  구조  │구조│  구조   │ L1  │고장│SOD│고장│고장│고장│고장│참고│SOD│참고│SOD│참고│
└─────────────────────────────────────────────────────────────────────┘
         ↓ parseSingleSheetFmea
         ├── ImportedFlatData[] (14개 아이템코드 평면 데이터)
         ├── MasterFailureChain[] (B4 있는 행 → 1개 사슬)
         ├── PreventionPool[] (B5)
         └── DetectionPool[] (A6)
```

### 2.2.1 공정번호(processNo) 추출 규칙 (★ v2.7.2 신규)

> **★★★ 핵심 규칙**: 엑셀 원본에서 공정번호 컬럼에 긴 텍스트가 들어있을 수 있음.
> 예: "20번 PCB A'SSY SW 버전 일치성을 검사한다" → "20번" 추출
> 예: "20번-수입검사" → "20번" 추출

**공정번호 추출 정규식**:
```
^(\d+번)  — 문자열 시작부터 "숫자+번" 패턴 추출
```

**적용 시점**: A3~A6, B1~B5 시트에서 공정번호(1열) 읽을 때
- 공정번호 뒤에 추가 텍스트가 있으면 → 공정번호만 추출
- 추출된 공정번호로 processMap에서 lookup
- 추출 실패 시 → 원본 값 그대로 사용

**실패 케이스 (v2.7.2 이전)**:
```
엑셀 A4 시트 35행:
  1열(공정번호): "20번 PCB A'SSY SW 버전 일치성을 검사한다"
  2열(제품특성): "PCB SW 사양 검증 신뢰성"

문제: key="20번 PCB A'SSY..." → processMap.get(key)=undefined → 데이터 누락!
해결: key="20번"으로 추출 → processMap.get("20번")=정상 매핑 ✅
```

**구현 파일**: `excel-parser.ts` (line ~380)

### 2.3 14개 아이템코드 매핑 (엑셀 열 → itemCode)

#### L2 공정 레벨 (Category = 'A')

> **★ 데이터 성격 구분 (v2.0 핵심 변경)**
> - **A1~A5**: 구조/기능/고장 데이터 (fact) — 워크시트 구조 빌드에 직접 사용
> - **A6**: 리스크 대응 조치 (action) — 고장사슬에 미참여, **참고 데이터(reference)**로 보관

| itemCode | 시트명 | 엑셀 열(한글) | 설명 | processNo | 데이터 성격 |
|----------|--------|---------------|------|-----------|------------|
| **A1** | L2-1 | 공정번호 | 10, 20, 30... | 자기 값 = processNo | 구조 |
| **A2** | L2-2 | 공정명 | 원자재 투입, 전처리... | 공정번호 | 구조 |
| **A3** | L2-3 | 공정기능(설명) | 공정 목적/기능 서술 | 공정번호 | 기능 |
| **A4** | L2-4 | 제품특성 + **특별특성** | 치수, 외관, 강도... + ◇/◆/△/○ | 공정번호 | 기능 |
| **A5** | L2-5 | 고장형태(FM) | 고장 현상 | 공정번호 | 고장사슬 |
| **A6** | L2-6 | 검출관리(DC) | 검출 방법 | 공정번호 | **참고(reference)** |

#### L3 작업요소 레벨 (Category = 'B')

> **★ 데이터 성격 구분 (v2.0 핵심 변경)**
> - **B1~B4**: 고장사슬 구성 요소 (fact) — FC↔FM↔FE 트라이어드에 직접 참여
> - **B5**: 리스크 대응 조치 (action) — 고장사슬에 미참여, **참고 데이터(reference)**로 보관

| itemCode | 시트명 | 엑셀 열(한글) | 설명 | processNo | m4 | 데이터 성격 |
|----------|--------|---------------|------|-----------|-----|------------|
| **B1** | L3-1 | 작업요소(설비) | 작업/설비명 | 공정번호 | **필수**: MN/MC/IM/EN | 고장사슬 |
| **B2** | L3-2 | 요소기능 | 작업요소 기능 | 공정번호 | 상위 B1과 동일 | 고장사슬 |
| **B3** | L3-3 | 공정특성 + **특별특성** | 공정 파라미터 + ◇/◆/△/○ | 공정번호 | 상위 B1과 동일 | 고장사슬 |
| **B4** | L3-4 | 고장원인(FC) | 고장 원인 | 공정번호 | 상위 B1과 동일 | 고장사슬 |
| **B5** | L3-5 | 예방관리(PC) | 예방 방법 | 공정번호 | ★ 아래 참조 | **참고(reference)** |

> **B5 4M 규칙 (v2.1 — 선택(권장)으로 완화)**:
> - B5의 m4는 **선택 사항** (있으면 좋지만 필수 아님)
> - 원본 행에 4M 열이 있으면 → 직접 복사
> - 원본에 4M이 없으면 → **m4 필드 생략** (빈값 저장 불필요)
> - B5→B4→B1 역추적은 **금지** (4M 누락의 근본 원인이었음)
> - B5는 PreventionPool에 저장되며, **공정번호(processNo) 기준으로 그룹핑**
> - m4가 없어도 리스크 단계에서 공정번호로 해당 공정의 FC들에 후보 제안 가능

#### L1 완제품 레벨 (Category = 'C')
| itemCode | 시트명 | 엑셀 열(한글) | 설명 | processNo |
|----------|--------|---------------|------|-----------|
| **C1** | L1-1 | 구분 | YP/SP/USER | C1값 자체 = processNo |
| **C2** | L1-2 | 제품(반)기능 | 완제품 기능 서술 | C1값 |
| **C3** | L1-3 | 제품(반)요구사항 | 요구사항 스펙 | C1값 |
| **C4** | L1-4 | 고장영향(FE) | 고장 영향 서술 | C1값 |

> **⚠️ C1 구분값 — 반드시 약어만 사용 (★★★ v2.7.1 절대 규칙)**
>
> | 올바른 값 (약어) | 잘못된 값 (풀네임) | 의미 |
> |------------------|-------------------|------|
> | **YP** | ~~Your Plant~~ | 자사공장 |
> | **SP** | ~~Ship to Plant~~ | 고객사(납품처) |
> | **USER** | ~~User~~ | 최종사용자 |
>
> - C1 `value` 필드와 `processNo` 필드는 **반드시 약어(YP/SP/USER)만** 사용
> - 풀네임(Your Plant, Ship to Plant, User)은 **워크시트 UI의 카테고리 표시명**으로만 사용 (DB 내부)
> - **약어와 풀네임을 혼용하면 L1 타입이 6개로 중복 생성되어 기능-요구사항 분리 발생**
> - 워크시트 로드 시 타입명(`type.name`)은 **YP/SP/USER** 약어로 통일
> - 중복 사고 사례: C1에 "Your Plant"/"Ship to Plant"/"User"(풀네임) + "YP"/"SP"/"USER"(약어) 양쪽 모두 생성 → 함수명은 풀네임 타입에, 요구사항은 약어 타입에 분리 저장 → 누락 9건 발생

#### FC 고장사슬 시트 (15번째) — 멀티시트 형식에만 존재

> **⚠️ v2.5.0 주의**: 실무 STEP B 엑셀은 이 시트가 **없는 경우가 대부분**입니다.
> 단일시트("fmea result") 형식에서는 아래 표의 데이터가 **각 데이터 행에 인라인으로 포함**되어 있으며,
> `parseSingleSheetFmea`가 행별로 자동 추출합니다 (별도 FC 시트 파싱 불필요).

| 열 | 헤더 | 필수 | 설명 | 데이터 성격 |
|----|------|------|------|------------|
| 1 | L2-1.공정번호 | O | 10, 20, 30... 또는 00(공통) | 고장사슬 |
| 2 | 4M | O | MN/MC/IM/EN | 고장사슬 |
| 3 | B4.고장원인 | O | FC (Failure Cause) | 고장사슬 |
| 4 | A5.고장형태 | O | FM (Failure Mode) | 고장사슬 |
| 5 | C4.고장영향 | O | FE (Failure Effect) | 고장사슬 |
| 6 | B5.예방관리 | - | PC (Prevention Control) | **참고(reference)** |
| 7 | A6.검출관리 | - | DC (Detection Control) | **참고(reference)** |
| 8 | S | - | 심각도 (1-10) | **참고(reference)** |
| 9 | O | - | 발생도 (1-10) | **참고(reference)** |
| 10 | D | - | 검출도 (1-10) | **참고(reference)** |
| 11 | AP | - | H/M/L (자동산출 가능) | **참고(reference)** |

> **1행 = 1개 고장사슬**: 같은 공정+4M에서 여러 고장원인이면 여러 행
> **★ 열 6~11(B5/A6/SOD)은 고장사슬 구성에 미참여**:
> - B5 → **PreventionPool**로 별도 추출 (v2.1)
> - A6 → **DetectionPool**로 별도 추출 (v2.1)
> - SOD → MasterFailureChain에 참고값으로 보관
> - FC 시트의 같은 행에 B5/A6이 있어도 **chain에 포함하지 않고 Pool에만 저장**

#### FA 통합분석 시트 (16번째) — Claude 추천 양식
| 열 | 헤더 | 카테고리 | 설명 |
|----|------|----------|------|
| 1 | 구분(C1) | L1 | YP/SP/USER |
| 2 | 제품기능(C2) | L1 | 완제품 기능 |
| 3 | 요구사항(C3) | L1 | 요구사항 |
| 4 | 공정No(A1) | L2 | 공정번호 |
| 5 | 공정명(A2) | L2 | 공정명 |
| 6 | 공정기능(A3) | L2 | 공정 기능 설명 |
| 7 | 제품특성(A4) | L2 | 제품 특성 |
| **8** | **특별특성(A4)** | **L2** | **★ v2.4.0: 제품특성의 특별특성 기호 (◇/◆/△/○)** |
| 9 | 4M | L3 | MN/MC/IM/EN |
| 10 | 작업요소(B1) | L3 | 작업/설비명 |
| 11 | 요소기능(B2) | L3 | 요소 기능 |
| 12 | 공정특성(B3) | L3 | 공정 파라미터 |
| **13** | **특별특성(B3)** | **L3** | **★ v2.4.0: 공정특성의 특별특성 기호 (◇/◆/△/○)** |
| 14 | 고장영향(C4) | 고장 | FE |
| 15 | 고장형태(A5) | 고장 | FM |
| 16 | 고장원인(B4) | 고장 | FC |
| 17 | 예방관리(B5) | 관리 | PC |
| 18 | 검출관리(A6) | 관리 | DC |
| 19 | S | 리스크 | 심각도 (1-10) |
| 20 | O | 리스크 | 발생도 (1-10) |
| 21 | D | 리스크 | 검출도 (1-10) |
| 22 | AP | 리스크 | H/M/L |
| **23** | **DC추천1** | **추천** | **★ v2.7.0: FM키워드 기반 1순위 검출방법 추천** |
| **24** | **DC추천2** | **추천** | **★ v2.7.0: FM키워드 기반 2순위 검출방법 추천** |
| **25** | **PC추천1** | **추천** | **★ v2.7.0: FC+FM키워드 기반 1순위 예방관리 추천** |
| **26** | **PC추천2** | **추천** | **★ v2.7.0: FC+FM키워드 기반 2순위 예방관리 추천** |
| **27** | **O추천** | **추천** | **★ v2.7.3: PC텍스트→관리유형→AIAG-VDA 표P2 기준 발생도(O) 추천** |
| **28** | **D추천** | **추천** | **★ v2.7.3: DC텍스트→검출기회×성숙도→AIAG-VDA 표P3 기준 검출도(D) 추천** |

> **FA 시트는 ALL-IN-ONE**: 1행에 L1+L2+L3+고장+SOD가 모두 포함
> 같은 L2(공정)에 여러 L3(작업요소)가 있으면 L2 컬럼이 반복됨
> **★ v2.4.0**: 특별특성(A4)은 제품특성 바로 뒤, 특별특성(B3)은 공정특성 바로 뒤에 위치
> **★ v2.7.0**: DC추천1/2, PC추천1/2는 AP 뒤에 위치
> **★ v2.7.3**: O추천, D추천은 PC추천2 뒤에 위치 (총 28열). PC/DC 텍스트 기반 AIAG-VDA SOD 자동 추천

### 2.4 4M 분류 규칙 (B 카테고리 m4 필드)

| m4 코드 | 한글명 | 영문 | 예시 |
|---------|--------|------|------|
| **MN** | 사람 | Man | 작업자, 엔지니어, 검사원 |
| **MC** | 설비/금형/지그 | Machine | 프레스, CNC, 용접기, 금형, 지그 |
| **IM** | 부자재 | Indirect Material | 그리스, 윤활유, 세척액, 접착제 |
| **EN** | 환경 | Environment | 온도, 습도, 청정도, 이물 |

> **주의**: MD(금형) → MC, JG(지그) → MC로 변환. IM = 부자재(생산보조재료), 원자재(제품의 일부)는 IM이 아님

### 2.4 공통 작업요소 (processNo = '00')
모든 공정에 적용되는 공통 작업요소는 `processNo = '00'`으로 지정합니다.
```
예: 작업환경(EN), 작업자 기본교육(MN) 등 전 공정 공통 항목
```

---

## 3. MasterFailureChain 매핑 (고장사슬)

### 3.1 MasterFailureChain 구조 (v2.1 — 고장사슬 전용)

> **★ v2.1 핵심 변경**: pcValue/dcValue를 MasterFailureChain에서 **완전 제거**.
> B5(예방관리)와 A6(검출관리)는 고장사슬이 아닌 **별도 Pool**로 분리.

```typescript
interface MasterFailureChain {
  id: string;              // "fc-0", "fc-1", ...
  processNo: string;       // 공정번호
  m4?: string;             // 4M: MN|MC|IM|EN
  workElement?: string;    // B1 작업요소명

  // ──── 고장사슬 (fact) ──── FC↔FM↔FE 트라이어드 ────
  feValue: string;         // C4 고장영향 (필수)
  fmValue: string;         // A5 고장형태 (필수)
  fcValue: string;         // B4 고장원인 (필수)

  // ──── SOD 참고 (reference) ────
  severity?: number;       // S (1-10)
  occurrence?: number;     // O (1-10)
  detection?: number;      // D (1-10)
  ap?: string;             // H/M/L (자동 산출)

  // ──── 기능 매핑 (fact) ──── 역전개용 ────
  feScope?: string;        // YP/SP/USER
  l2Function?: string;     // A3 공정기능
  productChar?: string;    // A4 제품특성
  l3Function?: string;     // B2 요소기능
  processChar?: string;    // B3 공정특성
  specialChar?: string;    // 특별특성

  // ★ pcValue/dcValue → v2.1에서 삭제 (별도 Pool로 이동)
}
```

### 3.1.1 PreventionPool 구조 (v2.1 신규)

> **B5(예방관리)는 B4(고장원인)의 "종류"에 대한 대응** — 특정 고장사슬 인스턴스와 1:1이 아님 (N:M 관계)

```typescript
interface PreventionPool {
  id: string;              // "pp-0", "pp-1", ...
  processNo: string;       // 공정번호
  m4?: string;             // 4M (선택 — 있으면 좋지만 필수 아님)
  value: string;           // B5 예방관리 텍스트
}
```

- **같은 공정에 여러 B5 허용** (1개 공정 N개 예방관리)
- **4M은 선택(권장)** — 원본에 4M이 있으면 복사, 없으면 생략
- 고장사슬에 미참여 → 리스크 분석 단계에서 "후보 제안" 목록으로 활용
- processNo로 해당 공정의 FC(B4)들에 대한 예방관리 후보를 제안

### 3.1.2 DetectionPool 구조 (v2.1 신규)

> **A6(검출관리)는 A5(고장형태)의 "종류"에 대한 대응** — 특정 고장사슬 인스턴스와 1:1이 아님 (N:M 관계)

```typescript
interface DetectionPool {
  id: string;              // "dp-0", "dp-1", ...
  processNo: string;       // 공정번호
  value: string;           // A6 검출관리 텍스트
}
```

- **같은 공정에 여러 A6 허용** (1개 공정 N개 검출관리)
- 고장사슬에 미참여 → 리스크 분석 단계에서 "후보 제안" 목록으로 활용
- processNo로 해당 공정의 FM(A5)들에 대한 검출관리 후보를 제안

> **★ v2.1 아키텍처 원칙**
> - **MasterFailureChain** = 고장사슬 (fact): FC↔FM↔FE 트라이어드 + SOD 참고값
> - **PreventionPool** = 예방관리 (action): 공정별 B5 데이터 풀 (N:M)
> - **DetectionPool** = 검출관리 (action): 공정별 A6 데이터 풀 (N:M)
> - 고장사슬이 먼저 완성된 후, Pool 데이터가 리스크 단계에서 후보로 제안됨

### 3.2 고장사슬 + Pool 매칭 규칙 (v2.1)

**1행 = 1개 고장사슬 (FC↔FM↔FE 트라이어드)**

기존 FMEA 엑셀에서 하나의 행(row)이 다음을 포함해야 합니다:

```
고장사슬 (fact — 필수):
  공정번호 + 4M + B4(고장원인) + A5(고장형태) + C4(고장영향)
                  ↓                   ↓              ↓
                fcValue            fmValue         feValue
                  │                   │
                  │                   │
  ┌───────────────┘                   └───────────────┐
  ↓                                                    ↓
PreventionPool (B5)                          DetectionPool (A6)
 ★ 별도 풀 — N:M 관계                         ★ 별도 풀 — N:M 관계
 ★ 고장사슬에 미참여                            ★ 고장사슬에 미참여
```

**매칭 순서 (2단계 분리)**:

**Phase 1: 고장사슬 구성 (fact만 사용)**
1. `processNo`로 L2(공정) 매칭 → A3, A4, A5 획득
2. `processNo + m4`로 L3(작업요소) 매칭 → B1, B2, B3, B4 획득
3. `feScope`(C1)로 L1(완제품) 매칭 → C2, C3, C4 획득
4. **FC(B4) + FM(A5) + FE(C4)로 트라이어드 구성** ← 이것만으로 고장사슬 완성
5. SOD 값이 있으면 MasterFailureChain에 참고값으로 보관 + AP 자동 산출

**Phase 2: Pool 추출 (고장사슬 완성 후, 별도 데이터 구조)**
6. 같은 행의 B5(예방관리) → **PreventionPool**에 추가 (processNo + m4(선택) + value)
7. 같은 행의 A6(검출관리) → **DetectionPool**에 추가 (processNo + value)
8. Pool은 공정번호(processNo)로 그룹핑 — 리스크 단계에서 후보 제안 목록으로 활용

> **★ v2.1 핵심 변경**:
> - Phase 1에서 B5/A6은 완전히 배제 (v2.0과 동일)
> - Phase 2에서 B5/A6은 **MasterFailureChain에 저장하지 않고 별도 Pool에 저장** (v2.1 변경)
> - B5↔B4, A6↔A5 간 **1:1 매칭을 강제하지 않음** (N:M 관계 허용)
> - B5/A6이 없어도 고장사슬은 정상 구성됨

### 3.3 AP 자동 산출 규칙 (AIAG-VDA FMEA 1st Edition)

SOD 값이 모두 있을 때 AP(Action Priority)를 자동 산출합니다:

| 조건 | AP |
|------|-----|
| S≥9 + O≥6 | **H** (High) |
| S≥7 + O≥7 | **H** |
| S=10 + O=4 + D≥4 | **H** |
| S=1 (어떤 O,D든) | **L** (Low) |
| ... | (완전한 매트릭스는 `calculateAP()` 참조) |

---

## 4. 엑셀 행 → JSON 변환 예시

### 4.1 기존 FMEA 엑셀 데이터 (예: 자전거 프레임)

| 공정No | 공정명 | 공정기능 | 제품특성 | 특별특성(A4) | 4M | 작업요소 | 요소기능 | 공정특성 | 특별특성(B3) | 고장형태 | 고장원인 | 고장영향 | 예방관리 | 검출관리 | S | O | D |
|--------|--------|----------|----------|-------------|-----|----------|----------|----------|-------------|----------|----------|----------|----------|----------|---|---|---|
| 10 | 프레임 절단 | 알루미늄 파이프 절단 | 절단 길이 ±0.5mm | ◇ | MC | CNC 절단기 | 자동 절단 수행 | 절단 속도 | ◆ | 절단면 불량 | 절단날 마모 | 프레임 변형 | 날 교체 주기 관리 | 치수 검사 | 8 | 4 | 3 |
| 10 | 프레임 절단 | 알루미늄 파이프 절단 | 절단 길이 ±0.5mm | ◇ | MN | 작업자 | 장비 셋업 | 셋업 정확도 | | 절단면 불량 | 셋업 오류 | 프레임 변형 | 셋업 체크리스트 | 첫 번째 품 검사 | 8 | 3 | 4 |

### 4.2 변환 결과: ImportedFlatData[]

```json
[
  {"id":"imp-1","processNo":"10","category":"A","itemCode":"A1","value":"10"},
  {"id":"imp-2","processNo":"10","category":"A","itemCode":"A2","value":"프레임 절단"},
  {"id":"imp-3","processNo":"10","category":"A","itemCode":"A3","value":"알루미늄 파이프 절단"},
  {"id":"imp-4","processNo":"10","category":"A","itemCode":"A4","value":"절단 길이 ±0.5mm","specialChar":"◇"},
  {"id":"imp-5","processNo":"10","category":"A","itemCode":"A5","value":"절단면 불량"},
  {"id":"imp-6","processNo":"10","category":"A","itemCode":"A6","value":"치수 검사"},
  {"id":"imp-7","processNo":"10","category":"B","itemCode":"B1","value":"CNC 절단기","m4":"MC"},
  {"id":"imp-8","processNo":"10","category":"B","itemCode":"B2","value":"자동 절단 수행","m4":"MC"},
  {"id":"imp-9","processNo":"10","category":"B","itemCode":"B3","value":"절단 속도","m4":"MC","specialChar":"◆"},
  {"id":"imp-10","processNo":"10","category":"B","itemCode":"B4","value":"절단날 마모","m4":"MC"},
  {"id":"imp-11","processNo":"10","category":"B","itemCode":"B5","value":"날 교체 주기 관리","m4":"MC"},
  {"id":"imp-12","processNo":"10","category":"B","itemCode":"B1","value":"작업자","m4":"MN"},
  {"id":"imp-13","processNo":"10","category":"B","itemCode":"B2","value":"장비 셋업","m4":"MN"},
  {"id":"imp-14","processNo":"10","category":"B","itemCode":"B3","value":"셋업 정확도","m4":"MN"},
  {"id":"imp-15","processNo":"10","category":"B","itemCode":"B4","value":"셋업 오류","m4":"MN"},
  {"id":"imp-16","processNo":"10","category":"B","itemCode":"B5","value":"셋업 체크리스트","m4":"MN"},
  {"id":"imp-17","processNo":"YP","category":"C","itemCode":"C1","value":"YP"},
  {"id":"imp-18","processNo":"YP","category":"C","itemCode":"C2","value":"자전거 프레임 조립"},
  {"id":"imp-19","processNo":"YP","category":"C","itemCode":"C3","value":"프레임 강도 KS규격"},
  {"id":"imp-20","processNo":"YP","category":"C","itemCode":"C4","value":"프레임 변형"}
]
```

### 4.3 변환 결과: MasterFailureChain[] (v2.1 — pcValue/dcValue 제거됨)

```json
[
  {
    "id": "fc-0",
    "processNo": "10",
    "m4": "MC",
    "workElement": "CNC 절단기",
    "feValue": "프레임 변형",
    "feScope": "YP",
    "fmValue": "절단면 불량",
    "fcValue": "절단날 마모",
    "severity": 8,
    "occurrence": 4,
    "detection": 3,
    "ap": "M",
    "l2Function": "알루미늄 파이프 절단",
    "productChar": "절단 길이 ±0.5mm",
    "l3Function": "자동 절단 수행",
    "processChar": "절단 속도",
    "specialChar": "◇"
  },
  {
    "id": "fc-1",
    "processNo": "10",
    "m4": "MN",
    "workElement": "작업자",
    "feValue": "프레임 변형",
    "feScope": "YP",
    "fmValue": "절단면 불량",
    "fcValue": "셋업 오류",
    "severity": 8,
    "occurrence": 3,
    "detection": 4,
    "ap": "M",
    "l2Function": "알루미늄 파이프 절단",
    "productChar": "절단 길이 ±0.5mm",
    "l3Function": "장비 셋업",
    "processChar": "셋업 정확도",
    "specialChar": "◇"
  }
]
```

> **★ v2.1**: pcValue/dcValue가 MasterFailureChain에서 완전 제거됨. 아래 Pool 참조.

### 4.4 변환 결과: PreventionPool[] (v2.1 신규)

```json
[
  {
    "id": "pp-0",
    "processNo": "10",
    "m4": "MC",
    "value": "날 교체 주기 관리"
  },
  {
    "id": "pp-1",
    "processNo": "10",
    "m4": "MN",
    "value": "셋업 체크리스트"
  }
]
```

> B5(예방관리)는 공정번호 기준으로 풀에 저장. 4M이 있으면 포함하되 **필수 아님**.
> 같은 공정에 같은 예방관리 텍스트가 중복되면 1건만 유지.

### 4.5 변환 결과: DetectionPool[] (v2.1 신규)

```json
[
  {
    "id": "dp-0",
    "processNo": "10",
    "value": "치수 검사"
  },
  {
    "id": "dp-1",
    "processNo": "10",
    "value": "첫 번째 품 검사"
  }
]
```

> A6(검출관리)는 공정번호 기준으로 풀에 저장. m4 없음.
> 같은 공정에 같은 검출관리 텍스트가 중복되면 1건만 유지.

---

## 5. 변환 절차 (Claude 프로젝트용)

### 5.1 입력 데이터 확인

사용자가 제공하는 기존 FMEA 데이터에서 다음을 파악합니다:

1. **공정 목록**: 공정번호 + 공정명 (몇 개 공정인지)
2. **4M 구성**: 각 공정별 MN/MC/IM/EN 어떤 것이 있는지
3. **L1 구분**: YP(자사)/SP(고객사)/USER 어떤 구분이 있는지
4. **고장 데이터**: FM(A5), FC(B4), FE(C4) 데이터 유무
5. **SOD 데이터**: S, O, D 숫자 데이터 유무

### 5.2 Forward Fill 전처리 (★ v2.1.1 — 최우선 실행)

> **★ 이 단계를 건너뛰면 고장사슬이 전혀 생성되지 않음**

기존 FMEA 엑셀은 **병합셀(merged cell)** 또는 **반복 생략** 구조입니다.
FM(고장형태), FE(고장영향), 공정명 등은 그룹의 첫 번째 행에만 값이 있고,
같은 그룹의 나머지 행은 빈칸으로 "위와 같음"을 표현합니다.

**Forward Fill** = "빈칸을 만나면 바로 위의 값으로 채운다" (새 값이 나올 때까지 이전 값 유지)

```
적용 전 (엑셀 원본):                     적용 후 (Forward Fill):
┌──────────┬──────────┬──────────┐     ┌──────────┬──────────┬──────────┐
│ FM=10F01 │ FE=선별   │ FC=스캐너↓ │     │ FM=10F01 │ FE=선별   │ FC=스캐너↓ │
│ (빈칸)   │ (빈칸)   │ FC=인식불가│  →  │ FM=10F01 │ FE=선별   │ FC=인식불가│
│ (빈칸)   │ (빈칸)   │ FC=렌즈오염│  →  │ FM=10F01 │ FE=선별   │ FC=렌즈오염│
│ (빈칸)   │ (빈칸)   │ FC=설정오류│  →  │ FM=10F01 │ FE=선별   │ FC=설정오류│
│ (빈칸)   │ (빈칸)   │ FC=이종운반│  →  │ FM=10F01 │ FE=선별   │ FC=이종운반│
├──────────┼──────────┼──────────┤     ├──────────┼──────────┼──────────┤
│ FM=10F02 │ FE=라인내 │ FC=이종운반│     │ FM=10F02 │ FE=라인내 │ FC=이종운반│
│ (빈칸)   │ (빈칸)   │ FC=자재손상│  →  │ FM=10F02 │ FE=라인내 │ FC=자재손상│
└──────────┴──────────┴──────────┘     └──────────┴──────────┴──────────┘
```

**Forward Fill 대상 컬럼** (병합셀 구조인 컬럼만 적용):

| 대상 컬럼 | 아이템코드 | 이유 |
|-----------|-----------|------|
| **공정번호** | A1 | 한 공정에 여러 작업요소/고장 → 첫 행에만 값 |
| **공정명** | A2 | 공정번호와 동일 그룹 |
| **공정기능** | A3 | 공정번호와 동일 그룹 |
| **제품특성** | A4 | 공정번호와 동일 그룹 |
| **고장형태(FM)** | A5 | 1개 FM에 N개 FC → 첫 행에만 FM 값 |
| **고장영향(FE)** | C4 | 1개 FE에 N개 FM → 첫 행에만 FE 값 |
| **구분(C1)** | C1 | YP/SP/USER 그룹 → 첫 행에만 값 |
| **4M** | m4 | 같은 4M 그룹 → 첫 행에만 값 |
| **작업요소(B1)** | B1 | 같은 작업요소 그룹 → 첫 행에만 값 |

**Forward Fill 하지 않는 컬럼** (매 행마다 고유값):

| 비대상 컬럼 | 아이템코드 | 이유 |
|------------|-----------|------|
| **고장원인(FC)** | B4 | 매 행마다 다른 FC 값 (행 식별 기준) |
| **예방관리(PC)** | B5 | 각 FC에 대응하는 고유값 |
| **검출관리(DC)** | A6 | 각 FM에 대응하는 고유값 |
| **S, O, D** | SOD | 각 고장사슬의 고유 평가값 |

**Forward Fill 실행 규칙**:
```
1. 엑셀 데이터를 위에서 아래로 순회
2. 대상 컬럼에서 빈칸을 만나면 → 바로 위 행의 값으로 채움
3. 새 값이 나오면 → 그 값으로 교체하고 다시 아래로 전파
4. ★ FC(B4)가 있는 행만 유효한 데이터 행으로 인정
   (FC도 빈칸인 행 = 완전한 빈 행 → 스킵)
5. Forward Fill 완료 후 → 모든 FC 행에 FM/FE/공정번호 등이 채워짐
```

> **★ Forward Fill 이후**: FC가 있는 599행 전부에 대응하는 FM과 FE가 채워져서
> 완전한 고장사슬(FC↔FM↔FE 트라이어드)이 만들어집니다.
> **Forward Fill 없이는 고장사슬 조립이 불가능합니다.**

### 5.2.1 단일시트 파서 내장 Forward Fill (★ v2.5.0)

> **구현 파일**: `src/app/pfmea/import/excel-parser-single-sheet.ts`
> **커밋**: `8c78e7d0`

단일시트("fmea result") 형식에서는 `parseSingleSheetFmea` 함수 내부에서
**Forward Fill + 고장사슬 추출이 동시에** 수행됩니다:

```typescript
// ── 공정 스코프 Forward Fill 변수 ──
let chainProcNo = '';    // 공정 변경 감지
let chainA5 = '';        // FM(고장형태) Forward Fill
let chainC4 = '';        // FE(고장영향) Forward Fill
let chainSeverity = 0;   // Severity Forward Fill

// ── 메인 파싱 루프 (각 행마다) ──
for (각 데이터 행) {
    // 1. 공정번호 변경 시 Forward Fill 리셋
    if (normProcNo && normProcNo !== chainProcNo) {
        chainProcNo = normProcNo;
        chainA5 = '';  chainC4 = '';  chainSeverity = 0;
    }
    // 2. Forward Fill 갱신
    if (A5값 유효) chainA5 = A5값;
    if (C4값 유효) chainC4 = C4값;
    if (S값 > 0)  chainSeverity = S값;

    // 3. 현재 행의 유효값 결정
    const curFM = A5값 || chainA5;     // Forward Fill된 FM
    const curFE = C4값 || chainC4;     // Forward Fill된 FE
    const curSev = S값 || chainSeverity;

    // 4. ★ B4(FC)가 있으면 → 1개 MasterFailureChain 생성
    if (normProcNo && curFM && B4값) {
        chains.push({ processNo, m4, workElement, fmValue: curFM,
                       fcValue: B4값, feValue: curFE, severity: curSev,
                       occurrence, detection, ap, pcValue: B5값, dcValue: A6값,
                       l2Function: A3값, productChar: A4값,
                       l3Function: B2값, processChar: B3값 });
    }
}
// 반환: failureChains: chains  (이전: failureChains: [])
```

> **핵심**: 이전(`failureChains: []`) → 이후(`failureChains: chains`) 변경으로
> 단일시트에서도 고장사슬이 정상 추출됩니다.
> Forward Fill 스코프는 **공정 단위**로 리셋되어 교차 오염을 방지합니다.

### 5.3 고장사슬 조립 상세 규칙 (★★★ FMEA 최핵심 — 가장 중요한 섹션)

> **⚠️ CRITICAL**: 이 섹션은 FMEA 소프트웨어 품질의 생명선입니다.
> 고장사슬 조립에서 **단 하나의 오류**가 발생하면 → 전체 FMEA 데이터 신뢰성이 붕괴합니다.
> **100% 이해하고, 100% 정확하게 구현해야 합니다.**
> **이 섹션을 건너뛰거나 대충 읽으면 절대 안 됩니다.**

#### 5.3.1 고장사슬의 계층 구조

FMEA 고장사슬(Failure Chain)은 **3단계 계층**으로 구성됩니다:

```
Level 1 — FE (고장영향, Failure Effect, C4)
  │        : 최종 사용자/고객에게 미치는 영향
  │        : 엑셀에서 가장 상위 병합셀 (가장 넓은 범위)
  │
  └─ Level 2 — FM (고장형태, Failure Mode, A5)
       │        : 공정에서 발생하는 고장 현상
       │        : FE 아래에서 병합 (중간 범위)
       │
       └─ Level 3 — FC (고장원인, Failure Cause, B4)
                      : 고장을 유발하는 근본 원인
                      : 매 행마다 고유값 (병합 없음, 최소 단위)
```

**관계 규칙 (절대 불변)**:

| 관계 | 설명 | 예시 |
|------|------|------|
| FE : FM = **1 : N** | 1개 영향에 N개 고장형태 | "프레임 변형" → "절단 불량", "용접 불량" |
| FM : FC = **1 : N** | 1개 형태에 N개 원인 | "절단 불량" → "날 마모", "셋업 오류", "소재 불량" |
| FE : FC = **1 : N×M** | 결과적으로 1개 영향에 다수 원인 | 위 예시에서 FE 1개에 FC 5개 |

**★ FC(B4)가 고장사슬의 최소 단위**:
- FC 1개 = MasterFailureChain 1개
- FC가 없는 행은 고장사슬이 생성되지 않음 (스킵)
- FC가 5개면 → 반드시 MasterFailureChain 5개 생성

```
예시: FE 1개, FM 2개, FC 5개

FE₁ "프레임 변형"
├── FM₁ "절단면 불량"
│   ├── FC₁ "절단날 마모"     → MasterFailureChain fc-0
│   ├── FC₂ "셋업 오류"       → MasterFailureChain fc-1
│   └── FC₃ "소재 불량"       → MasterFailureChain fc-2
└── FM₂ "용접 불량"
    ├── FC₄ "전류 부족"       → MasterFailureChain fc-3
    └── FC₅ "클램프 이탈"     → MasterFailureChain fc-4

→ FE 1개 × FM 2개 × FC 총5개 → chain 5개 생성

  fc-0: { feValue:"프레임 변형", fmValue:"절단면 불량", fcValue:"절단날 마모" }
  fc-1: { feValue:"프레임 변형", fmValue:"절단면 불량", fcValue:"셋업 오류" }
  fc-2: { feValue:"프레임 변형", fmValue:"절단면 불량", fcValue:"소재 불량" }
  fc-3: { feValue:"프레임 변형", fmValue:"용접 불량",   fcValue:"전류 부족" }
  fc-4: { feValue:"프레임 변형", fmValue:"용접 불량",   fcValue:"클램프 이탈" }
```

#### 5.3.2 엑셀 병합 구조 → Forward Fill → 고장사슬 (변환 전 과정)

아래는 **원본 엑셀 → Forward Fill → MasterFailureChain** 전체 과정을 행 단위로 추적합니다.

**원본 엑셀** (병합셀/빈칸):
```
Row │ C4(FE)       │ A5(FM)       │ B4(FC)        │ 비고
────┼──────────────┼──────────────┼───────────────┼────────────────────
 1  │ 프레임 변형   │ 절단면 불량   │ 절단날 마모    │ FE₁ 시작, FM₁ 시작
 2  │ (빈칸)       │ (빈칸)       │ 셋업 오류      │
 3  │ (빈칸)       │ (빈칸)       │ 소재 불량      │
 4  │ (빈칸)       │ 용접 불량     │ 전류 부족      │ FM₂ 시작 (FE₁ 계속)
 5  │ (빈칸)       │ (빈칸)       │ 클램프 이탈    │
```

**Forward Fill 적용 후** (빈칸이 위 행 값으로 채워짐):
```
Row │ C4(FE)       │ A5(FM)       │ B4(FC)        │ chain
────┼──────────────┼──────────────┼───────────────┼────────
 1  │ 프레임 변형   │ 절단면 불량   │ 절단날 마모    │ fc-0
 2  │ 프레임 변형 ← │ 절단면 불량 ← │ 셋업 오류      │ fc-1
 3  │ 프레임 변형 ← │ 절단면 불량 ← │ 소재 불량      │ fc-2
 4  │ 프레임 변형 ← │ 용접 불량     │ 전류 부족      │ fc-3
 5  │ 프레임 변형 ← │ 용접 불량  ← │ 클램프 이탈    │ fc-4
```
> ← = Forward Fill에 의해 위 행 값이 복사됨

**변환 과정 (행 단위 추적)**:

| Row | FE(C4) 처리 | FM(A5) 처리 | FC(B4) 처리 | 결과 |
|-----|------------|------------|------------|------|
| 1 | "프레임 변형" (값 있음→**저장**) | "절단면 불량" (값 있음→**저장**) | "절단날 마모" (원본) | **chain fc-0** 생성 |
| 2 | 빈칸 → **"프레임 변형"** (FF) | 빈칸 → **"절단면 불량"** (FF) | "셋업 오류" (원본) | **chain fc-1** 생성 |
| 3 | 빈칸 → **"프레임 변형"** (FF) | 빈칸 → **"절단면 불량"** (FF) | "소재 불량" (원본) | **chain fc-2** 생성 |
| 4 | 빈칸 → **"프레임 변형"** (FF) | "용접 불량" (새 값→**교체**) | "전류 부족" (원본) | **chain fc-3** 생성 |
| 5 | 빈칸 → **"프레임 변형"** (FF) | 빈칸 → **"용접 불량"** (FF) | "클램프 이탈" (원본) | **chain fc-4** 생성 |

> **(FF)** = Forward Fill에 의해 자동 복사된 값

#### 5.3.3 FE≠FM≠FC 비대칭 시나리오 (★★ 가장 중요한 부분)

실제 FMEA 데이터에서 FE, FM, FC의 개수는 **거의 항상 다릅니다**.
Forward Fill이 이를 **자연스럽게 해결**합니다 — 별도 로직이 필요 없습니다.

---

**시나리오 A: FE 1개, FM 1개, FC 3개** (가장 단순)
```
원본:                                     Forward Fill 후:
│ FE=선별  │ FM=스캔불가 │ FC=스캐너↓  │    │ FE=선별  │ FM=스캔불가 │ FC=스캐너↓  │ → fc-0
│ (빈칸)   │ (빈칸)     │ FC=인식불가  │    │ FE=선별  │ FM=스캔불가 │ FC=인식불가  │ → fc-1
│ (빈칸)   │ (빈칸)     │ FC=렌즈오염  │    │ FE=선별  │ FM=스캔불가 │ FC=렌즈오염  │ → fc-2
→ chain 3개 (모두 같은 FE, 같은 FM)
```

---

**시나리오 B: FE 1개, FM 2개, FC 4개** (FM별 FC 개수 다름)
```
원본:                                     Forward Fill 후:
│ FE=선별  │ FM=스캔불가 │ FC=스캐너↓  │    │ FE=선별  │ FM=스캔불가 │ FC=스캐너↓  │ → fc-0
│ (빈칸)   │ (빈칸)     │ FC=인식불가  │    │ FE=선별  │ FM=스캔불가 │ FC=인식불가  │ → fc-1
│ (빈칸)   │ (빈칸)     │ FC=렌즈오염  │    │ FE=선별  │ FM=스캔불가 │ FC=렌즈오염  │ → fc-2
│ (빈칸)   │ FM=이종혼입 │ FC=이종운반  │    │ FE=선별  │ FM=이종혼입 │ FC=이종운반  │ → fc-3
                 ↑ FM₂ 시작
→ chain 4개 (FM₁에 FC 3개, FM₂에 FC 1개)
```

---

**시나리오 C: FE 2개, FM 3개, FC 5개** (★ 비대칭 핵심)
```
원본:                                       Forward Fill 후:
│ FE=선별   │ FM=스캔불가 │ FC=스캐너↓  │    │ FE=선별  │ FM=스캔불가 │ FC=스캐너↓  │ → fc-0
│ (빈칸)    │ (빈칸)     │ FC=인식불가  │    │ FE=선별  │ FM=스캔불가 │ FC=인식불가  │ → fc-1
│ (빈칸)    │ FM=이종혼입 │ FC=이종운반  │    │ FE=선별  │ FM=이종혼입 │ FC=이종운반  │ → fc-2
│ FE=라인내  │ FM=자재손상 │ FC=운반충격  │    │ FE=라인내 │ FM=자재손상 │ FC=운반충격  │ → fc-3
│ (빈칸)    │ (빈칸)     │ FC=적재불량  │    │ FE=라인내 │ FM=자재손상 │ FC=적재불량  │ → fc-4

→ chain 5개
  fc-0~fc-2: FE=선별 (FE₁에 FM 2개)
  fc-3~fc-4: FE=라인내 (FE₂에 FM 1개)
```

---

**시나리오 D: FE 2개, FM 2개, FC 7개** (대규모 비대칭)
```
원본:                                        Forward Fill 후:
│ FE=선별   │ FM=스캔불가 │ FC=스캐너↓   │    │ FE=선별  │ FM=스캔불가 │ FC=스캐너↓  │ → fc-0
│ (빈칸)    │ (빈칸)     │ FC=인식불가   │    │ FE=선별  │ FM=스캔불가 │ FC=인식불가  │ → fc-1
│ (빈칸)    │ (빈칸)     │ FC=렌즈오염   │    │ FE=선별  │ FM=스캔불가 │ FC=렌즈오염  │ → fc-2
│ (빈칸)    │ (빈칸)     │ FC=설정오류   │    │ FE=선별  │ FM=스캔불가 │ FC=설정오류  │ → fc-3
│ FE=라인내  │ FM=이종혼입 │ FC=이종운반   │    │ FE=라인내 │ FM=이종혼입 │ FC=이종운반  │ → fc-4
│ (빈칸)    │ (빈칸)     │ FC=자재손상   │    │ FE=라인내 │ FM=이종혼입 │ FC=자재손상  │ → fc-5
│ (빈칸)    │ (빈칸)     │ FC=표시누락   │    │ FE=라인내 │ FM=이종혼입 │ FC=표시누락  │ → fc-6

→ chain 7개 (FE₁에 FC 4개, FE₂에 FC 3개)
```

---

**시나리오 E: FE 3개, FM 4개, FC 8개** (복합 다단계)
```
원본:                                        Forward Fill 후:
│ FE=선별   │ FM=스캔불가 │ FC=스캐너↓   │    │ FE=선별   │ FM=스캔불가 │ FC=스캐너↓  │ → fc-0
│ (빈칸)    │ (빈칸)     │ FC=인식불가   │    │ FE=선별   │ FM=스캔불가 │ FC=인식불가  │ → fc-1
│ (빈칸)    │ FM=이종혼입 │ FC=이종운반   │    │ FE=선별   │ FM=이종혼입 │ FC=이종운반  │ → fc-2
│ FE=라인내  │ FM=자재손상 │ FC=운반충격   │    │ FE=라인내  │ FM=자재손상 │ FC=운반충격  │ → fc-3
│ (빈칸)    │ (빈칸)     │ FC=적재불량   │    │ FE=라인내  │ FM=자재손상 │ FC=적재불량  │ → fc-4
│ FE=클레임  │ FM=외관불량 │ FC=스크래치   │    │ FE=클레임  │ FM=외관불량 │ FC=스크래치  │ → fc-5
│ (빈칸)    │ (빈칸)     │ FC=이물부착   │    │ FE=클레임  │ FM=외관불량 │ FC=이물부착  │ → fc-6
│ (빈칸)    │ (빈칸)     │ FC=도장벗겨짐  │    │ FE=클레임  │ FM=외관불량 │ FC=도장벗겨짐 │ → fc-7

→ chain 8개 (FE₁=2개, FE₂=2개, FE₃=3개)
  FE"선별"  → FM"스캔불가"(2개FC) + FM"이종혼입"(1개FC)
  FE"라인내" → FM"자재손상"(2개FC)
  FE"클레임" → FM"외관불량"(3개FC)
```

---

**★ 핵심 원리 요약**:
Forward Fill은 단순히 **위→아래** 방향으로 빈칸을 채울 뿐입니다.
각 컬럼(FE, FM, FC)은 **독립적으로** Forward Fill됩니다.
FE/FM/FC의 개수가 아무리 다르더라도, 새 값이 나올 때까지 이전 값이 유지되므로
**자동으로** 올바른 FE↔FM↔FC 계층 구조가 만들어집니다.

> **원리**: FE는 가장 느리게 바뀌고(넓은 병합), FM은 중간, FC는 매 행(병합 없음).
> Forward Fill을 적용하면 이 "바뀜 속도 차이"가 자연스럽게 올바른 계층을 만듭니다.

#### 5.3.4 공정 경계에서의 Forward Fill 동작

**★ 중요**: 공정번호(A1)가 바뀌면 FE/FM도 **반드시 새 값이 시작**됩니다.
공정이 바뀌는데 FE/FM이 빈칸이면 → **이전 공정의 FE/FM이 잘못 전파됨** = 심각한 오류!

```
정상 케이스:
Row │ A1   │ FE          │ FM         │ FC         │ 결과
────┼──────┼─────────────┼────────────┼────────────┼─────
 1  │ 10   │ 프레임변형   │ 절단불량    │ 날마모      │ fc-0 (공정10)
 2  │ 20   │ 도장불량     │ 색상이상    │ 도료부족    │ fc-1 (공정20) ✅ 정상

위험 케이스 (원본 오류):
Row │ A1   │ FE          │ FM         │ FC         │ 결과
────┼──────┼─────────────┼────────────┼────────────┼─────
 1  │ 10   │ 프레임변형   │ 절단불량    │ 날마모      │ fc-0 (공정10)
 2  │ 20   │ (빈칸)      │ (빈칸)     │ 도료부족    │ ❌ FF 시 FE=프레임변형(공정10 것!)
```

**대응 규칙**:
```
공정번호(A1)가 이전 행과 다른데 FE(C4) 또는 FM(A5)이 빈칸이면:
→ WARNING: "공정 {A1}의 첫 행에 FE/FM 값이 없습니다. 원본 데이터를 확인하세요."
→ Forward Fill을 적용하되 WARNING을 반드시 출력
→ 사용자에게 원본 확인을 요청
```

#### 5.3.5 FC(B4) 빈행 처리 (★ 절대 규칙)

**FC(B4)가 없는 행은 고장사슬을 생성하지 않습니다.** 이것은 예외 없는 절대 규칙입니다.

```
│ FE=선별  │ FM=스캔불가 │ FC=스캐너↓  │ → ✅ chain 생성 (fc-0)
│ (빈칸)   │ (빈칸)     │ (빈칸)      │ → ⏭ 스킵 (FC 없음 = 빈 행)
│ (빈칸)   │ (빈칸)     │ FC=인식불가  │ → ✅ chain 생성 (fc-1)
```

이유: FC는 고장사슬의 **최소 단위이자 행 식별자**입니다.
FC 없이는 "무엇의 원인인가?"를 정의할 수 없으므로 chain 생성 불가.

> **주의**: FC가 빈칸인 행이라도 FE/FM Forward Fill의 **마지막값은 유지**됩니다.
> 다음에 FC가 나오는 행에서 유지된 FE/FM 값이 사용됩니다.

#### 5.3.6 Forward Fill이 자동으로 해결하는 것 vs 해결 못하는 것

**✅ 자동 해결되는 것**:

| 상황 | Forward Fill 동작 | 결과 |
|------|-------------------|------|
| FE 1개, FM 3개 | FE가 모든 FM 행에 복사됨 | ✅ 정상 |
| FM 1개, FC 5개 | FM이 모든 FC 행에 복사됨 | ✅ 정상 |
| FE 2개, FC 7개 | 각 FE가 해당 그룹의 FC 행에 복사됨 | ✅ 정상 |
| FE/FM 그룹 경계가 다름 | 각 컬럼 독립적으로 FF 적용 | ✅ 정상 |
| 중간에 FC 빈행 존재 | FC 빈행 스킵, FE/FM 값은 유지 | ✅ 정상 |

**❌ 자동 해결 안 되는 것 (에러 상황)**:

| 상황 | 문제 | 대응 |
|------|------|------|
| **첫 행**에 FE 빈칸 | Forward Fill 시작값 없음 | ❌ 에러 — 원본 확인 필요 |
| **공정 전환** 시 FE 빈칸 | 이전 공정 FE가 전파됨 | ⚠️ WARNING — 5.3.4 참조 |
| FC 없는 행 | 행 자체가 유효하지 않음 | ⏭ 스킵 (chain 미생성) |
| FM/FE 텍스트 오타 | flatData A5/C4와 불일치 | ❌ 매칭 실패 — 5.6절 참조 |

#### 5.3.7 Forward Fill + 고장사슬 조립 통합 알고리즘 (pseudo-code)

```
// ═══════════════════════════════════════════════════════════════
// 입력: 엑셀에서 읽은 원본 행 배열
// 출력: MasterFailureChain[], PreventionPool[], DetectionPool[]
// ═══════════════════════════════════════════════════════════════

input: rows[]
  // 각 행: { A1, A2, A3, A4, A5, B1, B2, B3, B4, B5, A6,
  //          C1, C4, m4, S, O, D }

// ─── Step 1: Forward Fill 대상 컬럼 정의 ───
FF_COLUMNS = [A1, A2, A3, A4, A5, C4, C1, m4, B1]
// ★ Forward Fill 비대상: B4(FC), B5(PC), A6(DC), B2, B3, S, O, D

// ─── Step 2: Forward Fill 실행 ───
lastValues = {}     // 각 컬럼의 마지막 유효값 저장
lastProcessNo = ""  // 공정 경계 감지용

for each row in rows:
    // 공정 경계 체크 (5.3.4절)
    if row[A1] is not empty AND row[A1] != lastProcessNo:
        if row[A5] is empty:
            WARNING("공정 {row[A1]} 첫 행에 FM(A5) 없음")
        if row[C4] is empty:
            WARNING("공정 {row[A1]} 첫 행에 FE(C4) 없음")
        lastProcessNo = row[A1]

    // Forward Fill 적용
    for each col in FF_COLUMNS:
        if row[col] is empty or blank:
            row[col] = lastValues[col]  // ★ 위 행 값으로 채움
        else:
            lastValues[col] = row[col]  // ★ 새 값을 저장

    // B4, B5, A6, B2, B3, S, O, D는 원본 그대로 유지

// ─── Step 3: 고장사슬 조립 (Forward Fill 완료 후) ───
chains = []
chainIndex = 0

for each row in rows:
    // ★ FC 없는 행 = 스킵 (절대 규칙)
    if row[B4] is empty:
        continue

    // ★ 필수값 검증 (Forward Fill 후에도 빈값이면 원본 오류)
    if row[A5] is empty:
        ERROR("Row {n}: FM(A5) 없음 — Forward Fill 실패, 원본 확인 필요")
        continue
    if row[C4] is empty:
        ERROR("Row {n}: FE(C4) 없음 — Forward Fill 실패, 원본 확인 필요")
        continue

    chain = new MasterFailureChain({
        id: "fc-{chainIndex}",
        processNo:   row[A1],      // Forward Fill됨
        m4:          row[m4],      // Forward Fill됨
        workElement: row[B1],      // Forward Fill됨
        feValue:     row[C4],      // ★ Forward Fill된 값
        fmValue:     row[A5],      // ★ Forward Fill된 값
        fcValue:     row[B4],      // ★ 원본 값 (매 행 고유)
        severity:    parseInt(row[S])  || null,
        occurrence:  parseInt(row[O])  || null,
        detection:   parseInt(row[D])  || null,
        ap:          calculateAP(S, O, D),
        feScope:     row[C1],      // Forward Fill됨
        l2Function:  row[A3],      // Forward Fill됨
        productChar: row[A4],      // Forward Fill됨
        l3Function:  row[B2],      // 원본 (FF 비대상)
        processChar: row[B3],      // 원본 (FF 비대상)
        specialChar: row[A4_SC],   // ★ v2.4.0: 제품특성 특별특성 (선택)
    })
    chains.push(chain)
    chainIndex++

// ─── Step 4: Pool 추출 (별도 데이터 구조) ───
preventionPool = []
detectionPool = []
ppSeen = new Set()   // 중복 제거용
dpSeen = new Set()
ppIndex = 0
dpIndex = 0

for each row in rows:
    // B5 예방관리 → PreventionPool
    if row[B5] is not empty:
        key = row[A1] + "|" + row[B5]
        if not ppSeen.has(key):
            preventionPool.push({
                id: "pp-{ppIndex}",
                processNo: row[A1],
                m4: row[m4] || null,   // 선택 (있으면 포함)
                value: row[B5]
            })
            ppSeen.add(key)
            ppIndex++

    // A6 검출관리 → DetectionPool
    if row[A6] is not empty:
        key = row[A1] + "|" + row[A6]
        if not dpSeen.has(key):
            detectionPool.push({
                id: "dp-{dpIndex}",
                processNo: row[A1],
                value: row[A6]
            })
            dpSeen.add(key)
            dpIndex++

// ─── Step 5: 출력 ───
return {
    chains: chains,                // MasterFailureChain[]
    preventionPool: preventionPool, // PreventionPool[]
    detectionPool: detectionPool    // DetectionPool[]
}
```

#### 5.3.8 검증: 올바른 출력 vs 잘못된 출력

> **★ 이 검증을 반드시 실행하세요. 고장사슬 오류는 FMEA 전체를 무효화합니다.**

**테스트 입력 (엑셀 병합 구조)**:
```
Row │ A1  │ C4(FE)  │ A5(FM)   │ B4(FC)    │ S │ O │ D
────┼─────┼─────────┼──────────┼───────────┼───┼───┼───
 1  │ 10  │ 선별     │ 스캔불가  │ 스캐너↓   │ 8 │ 4 │ 3
 2  │     │         │          │ 인식불가   │ 8 │ 3 │ 4
 3  │     │         │ 이종혼입  │ 이종운반   │ 7 │ 3 │ 3
 4  │     │ 라인내   │ 자재손상  │ 운반충격   │ 6 │ 4 │ 5
 5  │     │         │          │ 적재불량   │ 6 │ 3 │ 4
```

**✅ 올바른 출력** (chain 5개):
```json
[
  { "id":"fc-0", "processNo":"10", "feValue":"선별",   "fmValue":"스캔불가", "fcValue":"스캐너↓",  "severity":8, "occurrence":4, "detection":3 },
  { "id":"fc-1", "processNo":"10", "feValue":"선별",   "fmValue":"스캔불가", "fcValue":"인식불가", "severity":8, "occurrence":3, "detection":4 },
  { "id":"fc-2", "processNo":"10", "feValue":"선별",   "fmValue":"이종혼입", "fcValue":"이종운반", "severity":7, "occurrence":3, "detection":3 },
  { "id":"fc-3", "processNo":"10", "feValue":"라인내", "fmValue":"자재손상", "fcValue":"운반충격", "severity":6, "occurrence":4, "detection":5 },
  { "id":"fc-4", "processNo":"10", "feValue":"라인내", "fmValue":"자재손상", "fcValue":"적재불량", "severity":6, "occurrence":3, "detection":4 }
]
```

> 검증 포인트:
> - chain 개수 = FC 유효 행 수 = **5개** ✅
> - fc-0, fc-1: feValue="선별", fmValue="스캔불가" (같은 FE+FM 그룹) ✅
> - fc-2: fmValue가 "이종혼입"으로 바뀜 (새 FM 시작), feValue="선별" 유지 ✅
> - fc-3: feValue가 "라인내"로 바뀜 (새 FE 시작), fmValue="자재손상" ✅
> - fc-4: feValue="라인내", fmValue="자재손상" 유지 (Forward Fill) ✅

**❌ 잘못된 출력 사례 1 — Forward Fill 미적용**:
```json
[
  { "id":"fc-0", "feValue":"선별",  "fmValue":"스캔불가", "fcValue":"스캐너↓" },
  { "id":"fc-1", "feValue":"",     "fmValue":"",        "fcValue":"인식불가" },
  { "id":"fc-2", "feValue":"",     "fmValue":"이종혼입", "fcValue":"이종운반" },
  { "id":"fc-3", "feValue":"라인내","fmValue":"자재손상", "fcValue":"운반충격" },
  { "id":"fc-4", "feValue":"",     "fmValue":"",        "fcValue":"적재불량" }
]
```
> **문제**: fc-1의 feValue/fmValue가 빈값, fc-2의 feValue가 빈값, fc-4 동일
> **결과**: Smart System에서 빈 텍스트로 매칭 시도 → "미연결" 대량 발생 → FMEA 분석 불가

**❌ 잘못된 출력 사례 2 — FE₂의 FM을 FE₁에 잘못 매칭**:
```json
[
  { "id":"fc-3", "feValue":"선별", "fmValue":"자재손상", "fcValue":"운반충격" }
]
```
> **문제**: Row 4에서 FE가 "라인내"로 바뀌었는데 Forward Fill이 "선별"을 유지
> **원인**: FM은 새 값("자재손상")으로 교체했지만 FE 교체를 놓침
> **결과**: 고장사슬의 FE↔FM 매핑이 잘못됨 → 고장 영향 분석 전체 오류

**❌ 잘못된 출력 사례 3 — FC 없는 행에 chain 생성**:
```json
[
  { "id":"fc-X", "feValue":"선별", "fmValue":"스캔불가", "fcValue":"" }
]
```
> **문제**: FC 빈값으로 chain 생성
> **결과**: 원인 없는 고장사슬 = FMEA 논리 붕괴 → "무엇 때문에 고장이 발생했나?"에 답 없음

**❌ 잘못된 출력 사례 4 — chain 개수 불일치**:
```
입력 FC 유효 행: 5개
출력 chain: 3개  ← ❌ 2개 누락!
```
> **원인**: FC가 있는 행을 일부 스킵하는 버그
> **결과**: 고장원인 2개가 분석에서 빠짐 → 리스크 미평가 → 품질 사고

#### 5.3.9 고장사슬 조립 요약 규칙 (최종 체크리스트)

| # | 규칙 | 위반 시 결과 |
|---|------|-------------|
| 1 | **FC(B4)가 있는 행에만** chain 생성 | 빈 chain → 데이터 오염 |
| 2 | **FE/FM은 Forward Fill 필수** 적용 | FE/FM 빈값 → 매칭 실패 |
| 3 | **FC는 Forward Fill 금지** (원본 유지) | FC 오염 → 고장원인 중복/오류 |
| 4 | chain.**feValue** = flatData C4와 **동일 텍스트** | 텍스트 불일치 → 미연결 |
| 5 | chain.**fmValue** = flatData A5와 **동일 텍스트** | 텍스트 불일치 → 미연결 |
| 6 | chain.**fcValue** = flatData B4와 **동일 텍스트** | 텍스트 불일치 → 미연결 |
| 7 | **공정 경계**에서 FE/FM **새 값 시작** 확인 | 이전 공정 FE가 전파 → 오매칭 |
| 8 | chain **총 개수 = FC 유효 행 수** | chain 누락 또는 초과 생성 |
| 9 | B5/A6은 chain에 **포함 금지** → Pool로 분리 | fact/action 혼합 → 구조 오류 |
| 10 | SOD는 chain에 **참고값**으로만 보관 | SOD 누락은 허용 (빈값 가능) |

> **★ 최종 검증**: `chain.length === FC유효행수` 이면 정상. 다르면 반드시 원인 파악.

---

### 5.4 변환 단계 (2단계 분리 Import — v2.1, v2.5 단일시트 통합)

> **★ v2.1 핵심 변경**: 고장사슬(fact)과 리스크 대응(Pool)을 **완전 분리된 데이터 구조**로 출력
> **★ v2.5.0 핵심 변경**: 단일시트("fmea result") 형식에서는 Phase 0 + Phase 1의 Step 4가
> **`parseSingleSheetFmea` 내부에서 통합 수행**됩니다 (5.2.1절 참조).
> 별도 FC 시트가 없어도 고장사슬이 자동 추출됩니다.
> **★ 전제 조건**: 5.2 Forward Fill 전처리가 완료된 상태에서 실행

```
═══════ Phase 0: Forward Fill 전처리 (5.2절 참조) ═══════
  - 엑셀 병합셀 → 빈칸 채우기 완료
  - FC(B4)가 있는 모든 행에 FM/FE/공정번호 등이 채워진 상태
  - ★ v2.5.0: 단일시트에서는 parseSingleSheetFmea 내부에서 자동 수행

═══════ Phase 1: 고장사슬 구성 (fact) ═══════

Step 1: L2 공정 데이터 추출 (A1~A5)
  - 공정번호별 1행씩
  - A1=공정번호, A2=공정명, A3=공정기능, A4=제품특성(+특별특성), A5=고장형태
  - ★ v2.4.0: A4의 specialChar 필드도 함께 추출
  ※ A6(검출관리)는 Phase 2에서 DetectionPool로 별도 추출

Step 2: L3 작업요소 데이터 추출 (B1~B4)
  - 공정번호+4M별
  - B1=작업요소(m4 필수), B2=요소기능, B3=공정특성(+특별특성), B4=고장원인(N개 허용)
  - ★ v2.4.0: B3의 specialChar 필드도 함께 추출
  ※ B5(예방관리)는 Phase 2에서 PreventionPool로 별도 추출

Step 3: L1 완제품 데이터 추출 (C1~C4)
  - 구분(YP/SP/USER)별 1행씩
  - C1=구분, C2=제품기능, C3=요구사항, C4=고장영향
  - ★★★ v2.7.1: C1~C4 모든 시트에서 구분값은 반드시 약어(YP/SP/USER)만 사용
  - ❌ 풀네임(Your Plant/Ship to Plant/User) 사용 금지 → 중복 타입 생성 → 누락 발생
  - C2/C3/C4의 첫 열(구분)도 반드시 C1과 동일한 약어 사용

Step 4: 고장사슬(MasterFailureChain) 조립 (★ 5.3절 상세 규칙 반드시 참조)
  - B4(FC) + A5(FM) + C4(FE) 트라이어드만으로 사슬 구성
  - Forward Fill 완료 후 FC가 있는 모든 행에서 chain 생성 (5.3.7절 알고리즘)
  - SOD 값이 있으면 참고값으로 chain에 보관 + AP 자동 산출
  - ★ B5/A6은 이 단계에서 사용하지 않음 (chain에 포함하지 않음)
  - ★ chain 개수 = FC 유효 행 수 (반드시 일치해야 함)
  - ★ v2.5.0: 단일시트 형식 → parseSingleSheetFmea 내부에서 행별 자동 추출 (5.2.1절)
    별도 FC 시트 없이도 각 데이터 행(B4 존재)에서 1개 chain 생성

═══════ Phase 2: Pool 추출 (별도 데이터 구조) ═══════

Step 5: PreventionPool 추출 (B5)
  - 원본 행에서 B5(예방관리) 텍스트 추출
  - processNo + m4(선택) + value로 PreventionPool[] 생성
  - ★ 같은 processNo+value 중복 제거 (공정 단위 유니크)
  - ★ B4(고장원인)와 1:1 매칭 강제하지 않음 (N:M 관계)

Step 6: DetectionPool 추출 (A6)
  - 원본 행에서 A6(검출관리) 텍스트 추출
  - processNo + value로 DetectionPool[] 생성
  - ★ 같은 processNo+value 중복 제거 (공정 단위 유니크)
  - ★ A5(고장형태)와 1:1 매칭 강제하지 않음 (N:M 관계)

═══════ 출력 ═══════

Step 7: JSON 출력 (4개 데이터 구조)
  - flatData: ImportedFlatData[] (전체 14개 시트, B5/A6 포함)
  - failureChains: MasterFailureChain[] (FC↔FM↔FE 트라이어드 + SOD 참고)
  - preventionPool: PreventionPool[] (B5 예방관리 풀)
  - detectionPool: DetectionPool[] (A6 검출관리 풀)
  ★ failureChains에 pcValue/dcValue 없음 (v2.1에서 삭제됨)

  ★★★ 시트 순서 (1.3절 절대 규칙) ★★★
  flatData를 엑셀 시트로 출력할 때 반드시 아래 순서:
    시트 1~6:  A1→A2→A3→A4→A5→A6  (L2 공정 — 첫 번째!)
    시트 7~11: B1→B2→B3→B4→B5      (L3 작업요소)
    시트 12~15: C1→C2→C3→C4         (L1 완제품 — 마지막!)
  ❌ L1(C)→L2(A)→L3(B) 순서 금지!
```

### 5.5 중복 처리 규칙

#### 고장사슬 데이터 (fact)
| 항목 | 중복 기준 | 처리 |
|------|-----------|------|
| A1~A4 | processNo + itemCode | 같은 공정의 같은 코드는 1개만 |
| **A5 (고장형태)** | processNo + itemCode + value | **같은 공정에 여러 FM 허용** (1공정 N개 FM) |
| B1~B3 | processNo + m4 + itemCode | 같은 공정+4M의 같은 코드는 1개만 |
| **B4 (고장원인)** | processNo + m4 + itemCode + value | **같은 4M에 여러 FC 허용** (1요소 N개 FC) |
| C1~C3 | processNo(=C1값) + itemCode | 같은 구분의 같은 코드는 1개만 |
| **C4 (고장영향)** | processNo + itemCode + value | **같은 구분에 여러 FE 허용** (1구분 N개 FE) |
| failureChain | processNo + m4 + fcValue | 같은 공정+4M+원인은 1개만 |

#### Pool 데이터 (v2.1 — 별도 데이터 구조)
| 항목 | 중복 기준 | 처리 |
|------|-----------|------|
| **PreventionPool (B5)** | processNo + value | **같은 공정에 같은 텍스트 1건만** (공정 단위 중복 제거) |
| **DetectionPool (A6)** | processNo + value | **같은 공정에 같은 텍스트 1건만** (공정 단위 중복 제거) |

> **★ v2.1 변경**: B5/A6을 MasterFailureChain에서 완전 분리 → 별도 Pool 구조.
> - B5와 B4는 **N:M 관계** — B5는 고장원인의 "종류"에 대한 예방관리이지, 특정 고장사슬 인스턴스와 1:1이 아님
> - A6와 A5는 **N:M 관계** — A6는 고장형태의 "종류"에 대한 검출관리이지, 특정 고장사슬 인스턴스와 1:1이 아님
> - **1:1 매칭 검증 불필요** — Pool은 공정 단위로 "후보 목록"을 제공할 뿐

### 5.6 고장연결 정합성 규칙 (★ 핵심 — 반드시 준수)

> **원칙**: failureChain의 fmValue/fcValue/feValue는 반드시 flatData의 A5/B4/C4 value와 **동일한 문자열**이어야 한다.

**왜?**: Smart System은 **텍스트 기반 매칭**으로 고장연결을 생성합니다. 텍스트가 다르면 매칭 실패 → "미연결" 발생

```
❌ 잘못된 예:
  flatData A5.value = "절단면 불량"
  chain fmValue    = "절단면이 불량함"     ← 다른 텍스트 → 매칭 실패!

✅ 올바른 예:
  flatData A5.value = "절단면 불량"
  chain fmValue    = "절단면 불량"         ← 동일 텍스트 → 매칭 성공!
```

**정합성 체크리스트**:
1. **모든 chain.fmValue** → 반드시 같은 processNo의 A5 flatData에 동일한 value가 존재
2. **모든 chain.fcValue** → 반드시 같은 processNo+m4의 B4 flatData에 동일한 value가 존재
3. **모든 chain.feValue** → 반드시 같은 category(YP/SP/USER)의 C4 flatData에 동일한 value가 존재
4. **모든 chain.workElement** → 반드시 같은 processNo+m4의 B1 flatData에 동일한 value가 존재

**다수 FM/FC/FE 처리**:
```
예: 공정10에 고장형태가 3개일 때

flatData A5 항목 (3개):
  { processNo:"10", itemCode:"A5", value:"절단면 불량" }
  { processNo:"10", itemCode:"A5", value:"치수 초과" }
  { processNo:"10", itemCode:"A5", value:"표면 스크래치" }

failureChain (3개 이상):
  { processNo:"10", fmValue:"절단면 불량", fcValue:"절단날 마모", feValue:"프레임 변형" }
  { processNo:"10", fmValue:"치수 초과", fcValue:"셋업 오류", feValue:"조립 불량" }
  { processNo:"10", fmValue:"표면 스크래치", fcValue:"이물질 유입", feValue:"외관 불량" }
```

### 5.7 특수 케이스

1. **1개 공정에 다수 DC**: A6(검출관리)가 여러 개일 때 → 각각 별도 DetectionPool 항목으로 저장 (v2.1: 쉼표 연결 불필요)
2. **공통 작업요소**: 전 공정 적용 항목은 processNo='00'
3. **A5 없는 공정**: 아직 고장분석 미완 → failureChain 생성 안 함
4. **SOD 부분 입력**: S, O, D 중 하나라도 없으면 AP 미산출 (빈값)
5. **B5 없는 공정**: 예방관리 미작성 → PreventionPool에 해당 공정 항목 없음, 고장사슬은 정상 구성
6. **A6 없는 공정**: 검출관리 미작성 → DetectionPool에 해당 공정 항목 없음, 고장사슬은 정상 구성
7. **B5 m4 누락**: 원본 행에 4M이 없으면 → m4 필드 생략 (선택 사항), 리스크 단계에서 FC의 4M을 참고

### 5.8 4M 검증 키워드 규칙 (★ v2.0 신규)

> **배경**: 207건 중 87건(42%) 4M 누락 + MN↔MC 오분류 발견 (원본 FMEA 오류 전파)

**4M 자동 판별 키워드 (크로스 체크용)**:

| m4 | 판별 키워드 (value 텍스트에 포함 시) |
|----|--------------------------------------|
| **MN** (사람) | 작업자, 교육, 숙련도, 훈련, 인력, 포장방법, 작업방법, 검사원, 엔지니어 |
| **MC** (설비) | 기, 기계, 프레스, CNC, 용접, 금형, 지그, 드라이버, 스캐너, 프린터, 도포기, 검사기, 장비, 설비, 로봇, 컨베이어 |
| **IM** (부자재) | 그리스, 윤활유, 세척액, 작동유, 접착제, 테이프, 충격방지, 보조재 |
| **EN** (환경) | 온도, 습도, 항온항습, 정전기, 청정도, 이물, 분진, 환경 |

**크로스 체크 규칙**:
```
1. B1(작업요소) 텍스트에 MC 키워드 포함 → m4가 MC인지 확인
2. B1 텍스트에 MN 키워드 포함 → m4가 MN인지 확인
3. 불일치 발견 시 → WARNING 출력 (자동 수정하지 않음, 원본 존중)

⚠️ 주의: "작업자 교육 실시" = MN (사람 항목), MC가 아님!
   "작업자 사양관련 교육" = MN, "숙련도 평가 실시" = MN
   → 원본 FMEA에서 MC로 잘못 분류된 경우가 다수 존재
```

**검증 출력 예시**:
```
[4M 크로스 체크] 207건 검증 완료
  ✅ 일치: 189건
  ⚠️ 불일치: 18건
    - processNo:10 B1:"작업자 교육 실시" m4:MC → MN 추천 (키워드: 작업자, 교육)
    - processNo:20 B1:"항온항습 관리" m4:MC → EN 추천 (키워드: 항온항습)
```

---

## 6. API 호출 방법

### 6.1 Master API로 저장 (v2.1)
```
POST /api/pfmea/master
Content-Type: application/json

{
  "fmeaId": "pfm26-xxxx",       // FMEA ID (소문자)
  "fmeaType": "P",               // P = PFMEA
  "name": "MASTER",
  "replace": true,                // 기존 데이터 교체
  "flatData": [...ImportedFlatData[]],
  "failureChains": [...MasterFailureChain[]],
  "preventionPool": [...PreventionPool[]],
  "detectionPool": [...DetectionPool[]]
}
```

> **★ v2.1**: failureChains에 pcValue/dcValue 없음.
> preventionPool과 detectionPool이 별도 최상위 필드로 전달됨.

### 6.2 워크시트 자동 반영 (v2.1 — Pool 기반)
```
Import 페이지에서 "분석 반영" 버튼 클릭

  ═══ Phase 1: 고장사슬 구성 ═══
  → saveWorksheetFromImport() 호출
  → buildWorksheetState(flatData) → 구조 빌드 (A1~A5, B1~B4, C1~C4)
  → injectFailureChains(state, failureChains) → 고장사슬 주입 (fact만)
     ★ failureChains에 pcValue/dcValue 없음 (v2.1)
     ★ FC↔FM↔FE 트라이어드만으로 failureLinks 생성
     ★ SOD 참고값은 chain에 보관 → riskData에 저장

  ═══ Phase 2: Pool 데이터 반영 ═══
  → PreventionPool을 공정번호 기준으로 riskData에 저장
     ★ riskData[`pc-pool-{processNo}`] = 해당 공정의 예방관리 후보 목록
  → DetectionPool을 공정번호 기준으로 riskData에 저장
     ★ riskData[`dc-pool-{processNo}`] = 해당 공정의 검출관리 후보 목록
  → 리스크 분석 화면에서 "Pool 후보 제안" 표시 (사용자가 선택)

  ═══ 공통 ═══
  → migrateToAtomicDB() → DB 포맷 변환
  → saveWorksheetDB() → 워크시트 저장
```

> **★ v2.1 Pool 핵심**:
> - B5/A6은 공정 단위 "후보 목록"으로 저장 (특정 FC/FM에 1:1 연결하지 않음)
> - 리스크 분석 화면에서 사용자가 Pool 후보 중 적절한 것을 선택/배정
> - B5의 4M 역추적 불필요 — Pool은 공정 단위이므로 FC의 4M과 무관

### 6.3 DC/PC 자동추천 규칙 (v2.7.0 — 3단계 키워드 매칭 통합)

> **★ v2.7.0 전면 개편**: DC(검출관리) + PC(예방관리) 모두 3단계 키워드 매칭으로 자동 추천.
> Import 엑셀(FA 시트)에 DC추천1/DC추천2/PC추천1/PC추천2 컬럼이 추가되어,
> Import 시점에 A6/B5 Pool이 자동으로 확충됩니다.

#### 6.3.1 DC(검출관리) 3단계 매칭 (24개 규칙)

**3단계 매칭 전략**:

| 단계 | 매칭 기준 | 가중치 |
|------|-----------|--------|
| **1단계** | FM+FC 결합 키워드 규칙 (detectionKeywordMap) | 60% |
| **2단계** | 텍스트 유사도 보정 (hybridRank) | 40% |
| **3단계** | PC→DC 연계 부스팅 (preventionToDetectionMap) | 추가 보정 |

**FM 키워드 → 검출방법 카테고리 매핑 (23개 규칙)**:

| # | FM 키워드 | 우선 검출방법 | 보조 검출방법 |
|---|-----------|-------------|-------------|
| 1 | 사양/품명/규격/이종 | 바코드 스캐너, PDA 스캔검사 | 육안검사 |
| 2 | 휘도/점등/영상/암전류 | EOL 검사기, 휘도측정기 | 육안검사 |
| 3 | 치수/형상/PV값/변형 | 치수측정기, 3차원 측정기(CMM) | 핀게이지 |
| 4 | 핀휨/단자/커넥터 핀 | 핀휨 검사기, 비전검사 | 육안검사 |
| 5 | 미작동/동작/이음/소음 | 기능검사기, EOL 검사기 | 육안검사 |
| 6 | 도포/그리스/접착/실란트 | 중량측정(발란스), 도포검사기 | 육안검사 |
| 7 | 조립/체결/누락/토크 | 토크검사, 체결검사기 | 바코드 스캐너 |
| 8 | 외관/파손/이물/스크래치 | 육안검사, 비전검사(카메라) | 확대경검사 |
| 9 | 균일도/얼룩/색상/변색 | 비전검사(카메라), EOL 검사기 | 육안검사 |
| 10 | 포장/수량/출하/선입선출 | 바코드 스캐너, 중량검사 | 육안검사 |
| 11 | 산화/습도/오염/부식 | 환경측정기(온습도계), 육안검사 | 시스템 검증 |
| 12 | 마스터/미검출/불량판정/MSA | MSA 검증, Gage R&R | 검교정 |
| 13 | 용접/너겟/스패터/인장 | 인장시험기, 비파괴검사 | 육안검사 |
| 14 | 누설/기밀/리크/누출 | 기밀시험기, 리크테스트 | 육안검사 |
| 15 | 전압/전류/합선/단선/절연 | 절연저항계, 통전검사, EOL | 육안검사 |
| 16 | 압력/유압/공압/진공 | 압력게이지, 기밀시험기 | 체크리스트 |
| 17 | 설비이상/파라미터/조건이탈 | 파라미터 모니터링(PLC) | 설비점검 |
| 18 | 경도/강도/물성/피로 | 경도시험기, 인장시험기 | 육안검사 |
| **19** | **HUD/헤드업/미러/렌즈** | **EOL 검사기(영상), 비전검사** | **한도견본 비교** |
| **20** | **PCB/SMT/솔더/납땜** | **AOI(자동광학검사), X-ray 검사** | **ICT(인서킷테스트)** |
| **21** | **사출/프레스/성형/싱크마크** | **초중종물 치수검사, 중량 측정** | **외관 검사(한도견본)** |
| **22** | **도장/코팅/도막/박리** | **도막두께 측정기, 부착력 테스트** | **광택도 측정** |
| **23** | **열처리/담금질/침탄/질화** | **경도시험기, 금속조직 검사** | **잔류응력 측정** |
| **24** | **암전류/대기전류/소비전력** | **암전류 측정기, EOL 검사기** | **전류계 측정** |

> **★ 규칙 19~24은 v2.7.0에서 추가된 한국 제조업 산업 특화 규칙**
> **★ 한국산업 DB 연동 (v2.7.1)**: 시스템에 저장된 `KrIndustryDetection` 테이블(60건, 23카테고리)의
> 검출방법이 자동추천 시 **전체 A6 풀에 병합**되어 공정별 마스터가 부족할 때 fallback으로 활용됨

**PC→DC 연계 부스팅 (11개 규칙)**:
| PC(예방관리) | 연관 DC(검출관리) |
|-------------|-----------------|
| 지그/클램프 점검 | 치수측정기, 3차원 측정기 |
| 금형 PM 주기 관리 | 초중종물 치수검사, 중량측정 |
| 토크 설정값 확인 | 토크검사, 체결검사기 |
| 도포량 정량 관리 | 중량측정(발란스), 도포검사기 |
| 압력게이지 교정 | 압력게이지, 기밀시험기 |
| 센서/카메라 교정 | EOL 검사기, 비전검사 |
| 용접팁 교체 주기 | 인장시험기, 비파괴검사 |
| 온도 프로파일 확인 | 경도시험기, 금속조직 검사 |
| 작업자 교육/숙련도 | 육안검사, 체크리스트 |
| 세척/청소 주기 관리 | 육안검사, 비전검사 |
| 보관 조건 관리 | 환경측정기, 육안검사 |

**Fallback 규칙**:
- 공정별 A6가 없으면 → **전체 A6 풀 + 한국산업 DB 검출방법**에서 FM+FC 키워드 매칭으로 추천
- FM 키워드 매칭 규칙이 없으면 → "육안검사" 기본 추천
- 한국산업 DB 데이터는 마스터 A6와 중복 제거 후 전체 풀에만 추가 (공정별 그룹에는 미포함)

#### 6.3.2 PC(예방관리) 3단계 매칭 (28개 규칙)

**3단계 매칭 전략**:

| 요소 | 매칭 기준 | 가중치 |
|------|-----------|--------|
| **유사도** | 텍스트 유사도 (rankBySimlarity) | 40% |
| **4M 카테고리** | FC의 4M → PC 기본 관리방법 | 15% |
| **FC 키워드** | 고장원인 키워드 → 예방관리 규칙 (17개) | 25% |
| **FM 키워드** | 고장형태 키워드 → 예방관리 규칙 (11개) | 20% |

**4M 카테고리 기본 관리방법**:

| 4M | 기본 예방관리 |
|----|-------------|
| MN (사람) | 작업표준서(WI) 교육, 숙련도 평가, 작업자 인증 |
| MC (설비) | 예방보전(PM) 주기 관리, 설비 일일점검, 교정(Calibration) |
| IM (부자재) | 수입검사 LOT 관리, 유효기간 관리, 보관조건 관리 |
| EN (환경) | 온습도 관리, 환경측정 기록, 5S 활동 |

**FC(고장원인) 키워드 → PC(예방관리) 규칙 (17개)**:

| # | FC 키워드 | 추천 예방관리 |
|---|-----------|-------------|
| 1 | 지그/치구/고정구/클램프 | 지그 정기점검(마모/변형), 지그 수명관리 및 교체주기 |
| 2 | 금형/다이/몰드/캐비티 | 금형 PM 주기 관리, 금형 타수 관리 |
| 3 | 전동드라이버/토크렌치/너트러너 | 공구 교정(Calibration) 주기 관리, 토크 설정값 일일 확인 |
| 4 | 도포기/디스펜서/노즐/그리스 | 도포량 정량 관리(중량 체크), 노즐 교체주기 관리 |
| 5 | 압력/에어압/AIR/공압/유압 | 압력게이지 교정 주기 관리, 에어 필터/레귤레이터 점검 |
| 6 | 센서/카메라/비전/검사기/EOL | 센서 교정(Calibration) 주기 관리, 마스터 샘플 정기 검증 |
| 7 | 모터/서보/베어링/기어/벨트 | 구동부 윤활 주기 관리, 베어링 진동/소음 측정 |
| 8 | 용접/스팟/아크/전극/팁 | 용접팁 드레싱/교체 주기, 용접 전류/전압 파라미터 관리 |
| 9 | 온도/가열/건조/경화/오븐 | 온도 프로파일 정기 확인, 온도센서 교정 주기 관리 |
| 10 | 컨베이어/이송/로봇/피더 | 이송 설비 일상점검, 로봇 원점/위치 확인 |
| 11 | 숙련도/미숙/작업자/오조작/실수 | 작업자 교육/숙련도 평가, 작업표준서(WI) 교육 |
| 12 | 오염/이물/세척/청소/먼지 | 세척/청소 주기 기준 관리, 에어블로우/집진 설비 점검 |
| 13 | 보관/습도/산화/부식/결로 | 보관 조건(온습도) 관리, 방습/방청 포장 관리 |
| 14 | 선입선출/FIFO/LOT/이종/혼입 | 선입선출(FIFO) 시스템 운영, LOT 추적(바코드/QR) |
| 15 | 마모/수명/열화/노후/피로 | 소모품 교체주기 관리, 마모량 정기 측정 |
| 16 | 파라미터/설정값/조건/레시피/PLC | 공정 파라미터 관리표 운영, 설정값 변경 이력 관리 |
| 17 | 스크류/볼트/너트/체결/풀림/토크 | 토크 관리 기준 설정, 체결 순서/패턴 표준화 |

**FM(고장형태) 키워드 → PC(예방관리) 규칙 (11개)**:

| # | FM 키워드 | 추천 예방관리 |
|---|-----------|-------------|
| 1 | 사양/품명/규격/이종 | 바코드/QR 스캔 확인, 부품 식별표시 관리 강화 |
| 2 | 외관/파손/스크래치/이물 | 취급 주의 교육(운반/적재), 보호 포장/간지 적용 |
| 3 | 조립/체결/누락/미삽입/역삽입 | 조립 순서 표준화(WI), 실수방지(Poka-Yoke) 적용 |
| 4 | 치수/형상/PV값/변형/공차 | 공정능력(Cpk) 관리, SPC 관리도 운영 |
| 5 | 도포/도포량/접착/그리스 | 도포량 정량 관리(중량 체크), 도포기 파라미터 관리 |
| 6 | 휘도/점등/영상/균일도/얼룩 | 부품 수입검사 강화, 조립 환경 관리(정전기) |
| 7 | 포장/수량/출하/납품 | 포장 작업표준서 준수, 수량 카운트 시스템 |
| 8 | 산화/습도/오염/부식/결로 | 보관 환경(온습도) 관리, 방습/방청 포장 적용 |
| 9 | 미작동/오작동/이음/소음/진동 | 부품 기능검사 강화(수입검사), 조립 후 기능 확인 절차 |
| 10 | 선입선출/FIFO/이종/혼입 | 선입선출(FIFO) 시스템 운영, LOT 추적 바코드/QR |
| 11 | 마스터/미검출/오판/검출률 | 마스터 샘플 정기 검증, MSA(측정시스템분석) 실시 |

**후보 매칭 우선순위**: ① 같은 공정+같은 4M → ② 같은 공정(전체 4M) → ③ 다른 공정+같은 4M (cross-process fallback + 한국산업 DB)

> **★ 한국산업 DB 연동 (v2.7.1)**: 시스템에 저장된 `KrIndustryPrevention` 테이블(34건, 17카테고리)의
> 예방관리 방법이 자동추천 시 **m4 기반 cross-process fallback 풀에 병합**됨.
> `m4Category` (MN/MC/IM/EN) 기준으로 해당 4M의 cross-process 풀에 추가되어 ③단계 매칭에 활용

#### 6.3.3 Import 엑셀 추천 컬럼 → Pool 확충 (v2.7.0)

> **★ 핵심 변경**: FA 시트의 DC추천1/DC추천2 → A6 시트에 자동 추가, PC추천1/PC추천2 → B5 시트에 자동 추가

**R4→R5 데이터 확충 결과**:
| Pool | R4 (기존) | R5 (추천 추가) | 증가율 |
|------|----------|---------------|--------|
| A6 (검출관리) | 111행 | 168행 (+57) | +51% |
| B5 (예방관리) | 208행 | 493행 (+285) | +137% |

**추천값 A6 Pool 추가 규칙**:
- FA 시트의 `DC추천1`, `DC추천2` 값을 공정번호(A1)와 함께 A6 시트에 행 추가
- **중복 제거**: 같은 `processNo::value` 조합은 1건만 유지
- 기존 A6 데이터 보존 (추가만, 삭제/수정 없음)

**추천값 B5 Pool 추가 규칙**:
- FA 시트의 `PC추천1`, `PC추천2` 값을 공정번호(A1)+4M과 함께 B5 시트에 행 추가
- **중복 제거**: 같은 `processNo::m4::value` 조합은 1건만 유지
- 기존 B5 데이터 보존 (추가만, 삭제/수정 없음)

**구현 파일**:
- `detectionKeywordMap.ts` — FM→DC 키워드 매핑 규칙 테이블 (**24개**, priority 1~24)
- `preventionKeywordMap.ts` — FC→PC 17개 + FM→PC 11개 + 4M→PC 4카테고리 (**28개 규칙**)
- `preventionToDetectionMap.ts` — PC→DC 연계 규칙 (11개) + `boostByPCLinkage()` 함수
- `similarityScore.ts` — 6-component 유사도 스코어 (장비명25%+고장→예방25%+토큰15%+바이그램10%+서브스트링5%+동의어20%)
- `useAutoRecommendDC.ts` — DC 자동추천 훅 (3단계: 키워드60%+유사도40% + PC→DC 연계 부스팅)
- `useAutoRecommendPC.ts` — PC 자동추천 훅 (4-component: 유사도40%+4M 15%+FC규칙25%+FM규칙20%)
- `/api/kr-industry/route.ts` — 한국산업 DB GET API (DC 60건 + PC 34건, 1시간 캐시)
- `scripts/generate-r5-excel.js` — R4→R5 엑셀 변환 스크립트 (추천 컬럼 추가 + Pool 확충)

---

## 7. 검증 체크리스트

변환 결과를 검증할 때 아래 항목을 확인합니다:

### 7.1 Forward Fill 전처리 검증 (★ v2.1.1 신규)
- [ ] **Forward Fill이 모든 대상 컬럼에 적용되었는가?** (5.2절 참조)
- [ ] FM(A5) 빈칸이 위 행 값으로 채워졌는가?
- [ ] FE(C4) 빈칸이 위 행 값으로 채워졌는가?
- [ ] 공정번호(A1), 공정명(A2) 빈칸이 위 행 값으로 채워졌는가?
- [ ] 4M, 작업요소(B1) 빈칸이 위 행 값으로 채워졌는가?
- [ ] FC(B4)가 있는 모든 행에 대응하는 FM과 FE가 존재하는가?
- [ ] Forward Fill 비대상 컬럼(FC/B5/A6/SOD)은 원본 그대로인가?

### 7.2 기본 구조 검증
- [ ] 모든 공정번호가 A1에 있는가?
- [ ] 각 공정에 A2(공정명)가 있는가?
- [ ] B1(작업요소)마다 m4(MN/MC/IM/EN)가 있는가?
- [ ] C1 구분값(YP/SP/USER)이 processNo로 올바르게 사용되었는가?
- [ ] ★ v2.7.1: C1~C4 모든 시트에서 구분값이 약어(YP/SP/USER)로 통일되었는가? (풀네임 혼용 금지)
- [ ] ★ v2.7.1: B5 예방관리 시트의 4M(MN/MC/IM/EN)이 모두 기입되었는가? (빈 값 = 추천 정확도 저하)
- [ ] value 필드가 모두 문자열인가? (객체 아님)
- [ ] 중복 데이터가 없는가? (5.5절 중복 기준 참조)
- [ ] 4M 변환: MD→MC, JG→MC 처리되었는가?

### 7.3 고장사슬(fact) 검증 (★★★ 5.3절 상세 규칙 반드시 참조)

**기본 검증**:
- [ ] B4(고장원인)가 있는 행에만 failureChain이 생성되었는가?
- [ ] **chain 총 개수 = FC(B4) 유효 행 수** (반드시 일치!)
- [ ] 모든 chain.fmValue가 같은 processNo의 A5에 동일 value로 존재하는가?
- [ ] 모든 chain.fcValue가 같은 processNo+m4의 B4에 동일 value로 존재하는가?
- [ ] 모든 chain.feValue가 같은 category의 C4에 동일 value로 존재하는가?
- [ ] 고장사슬 구성에 B5/A6이 사용되지 않았는가? (fact만 사용)

**Forward Fill 결과 검증 (5.3.3절 비대칭 시나리오)**:
- [ ] 모든 chain의 feValue가 빈값("")이 아닌가? (Forward Fill 미적용 의심)
- [ ] 모든 chain의 fmValue가 빈값("")이 아닌가? (Forward Fill 미적용 의심)
- [ ] FE 1개에 FM N개가 있을 때, 모든 FM chain의 feValue가 동일한가?
- [ ] FM 1개에 FC N개가 있을 때, 모든 FC chain의 fmValue가 동일한가?
- [ ] **공정 경계**에서 FE/FM이 이전 공정 값으로 잘못 전파되지 않았는가? (5.3.4절)

**오류 패턴 검증 (5.3.8절 사례 비교)**:
- [ ] fcValue가 빈값인 chain이 없는가? (FC 없는 행에 chain 생성 = 오류)
- [ ] 동일한 fcValue를 가진 chain이 같은 processNo+m4에 2개 이상 없는가? (중복)
- [ ] SOD가 없는 chain이 있어도 chain 자체는 정상 생성되었는가? (SOD 선택)

**단일시트 파서 검증 (★ v2.5.0)**:
- [ ] `parseSingleSheetFmea` 반환값의 `failureChains.length > 0` 인가? (이전: `[]` 반환 → 0건 매칭 사고)
- [ ] 공정 스코프 Forward Fill 리셋: 공정 변경 시 FM/FE/Severity가 이전 공정 값을 이어받지 않는가?
- [ ] sheetSummary에 `사슬N건` 표시가 있는가? (파싱 결과 요약에 chain 건수 포함)
- [ ] 별도 FC 시트가 없는 STEP B 엑셀에서도 chain이 정상 추출되는가?

**변환결과 통계 검증 (★★★ v2.5.2 — 검증의 핵심)**:

> **원칙**: 고장사슬의 중심은 **고장형태(A5)**이고, 고장형태는 **공정별로 중복이 없어야** 한다.
> 나머지 항목(A3, B1, B2 등)은 Forward Fill로 채우므로 큰 문제가 되지 않는다.
> **공정별 A5 고유 건수 = 파싱 정합성 검증의 키(Key)**

- [ ] `ParseResult.statistics` 객체가 반환되는가? (undefined면 구버전 파서)
- [ ] **A5 고장형태**: `uniqueCount`가 원본 엑셀에서 중복제거한 건수와 일치하는가?
- [ ] **공정별 A5 건수**: `processStats[공정번호].items['A5'].unique`가 각 공정의 실제 고장형태 수와 일치하는가?
- [ ] **B4 고장원인**: `uniqueCount`가 고장사슬 건수(`chainCount`)와 유사한가? (FC 1건 = chain 1건)
- [ ] **C4 고장영향**: `uniqueCount` 대비 `dupSkipped`가 높은가? (FE는 병합셀로 반복되므로 중복이 많은 것이 정상)
- [ ] SA 탭 상단에 변환결과 통계표가 표시되는가? (요약/공정별 토글)
- [ ] 통계표의 "합계" 행이 정확한가?

**향후 R0→R1 리비전 복사 검증 시에도 동일한 `ParseStatistics` 구조 사용 예정:**
```
R0 statistics ←→ R1 statistics 비교
→ 모든 itemCode의 uniqueCount 일치 = 복사 정상
→ 1건이라도 불일치 = 복사 오류 → Diff Report 생성
```

### 7.4 Pool 데이터 검증 (v2.1)
- [ ] PreventionPool의 각 항목에 processNo가 있는가?
- [ ] DetectionPool의 각 항목에 processNo가 있는가?
- [ ] PreventionPool에 같은 processNo+value 중복이 없는가?
- [ ] DetectionPool에 같은 processNo+value 중복이 없는가?
- [ ] B5의 m4가 있으면 유효한 값(MN/MC/IM/EN)인가? (없어도 허용)
- [ ] Pool이 비어 있어도 고장사슬이 정상 생성되는가? (Pool 누락 허용)
- [ ] **B4↔B5 1:1 매칭을 강제하지 않는가?** (N:M 관계 — 검증 불필요)
- [ ] **A5↔A6 1:1 매칭을 강제하지 않는가?** (N:M 관계 — 검증 불필요)
- [ ] SOD 값이 1~10 범위인가? (MasterFailureChain에 보관)
- [ ] AP 값이 H/M/L 중 하나인가?

### 7.5 특별특성(specialChar) 역매핑 검증 (★★★ v2.4.1 신규)

> **핵심 원칙**: STEP B(FA/고장사슬)에 특별특성이 있으면, 반드시 STEP A(A4 제품특성, B3 공정특성)의 해당 항목에 역매핑(reverse-map)되어야 한다.
> 특별특성이 누락되면 워크시트에서 SpecialCharBadge가 "-"로 표시되어 FMEA 분석 품질이 저하된다.

#### 7.5.1 역매핑(Reverse Mapping) 규칙

| # | STEP B (FA 시트) 소스 | STEP A 대상 | 매핑 키 | 설명 |
|---|----------------------|-------------|---------|------|
| 1 | `chain.specialChar` + `chain.productChar` | A4 flatItem (`specialChar` 필드) | `processNo` + `value === chain.productChar` | FA의 제품특성과 동일한 이름의 A4 항목에 특별특성 기호 설정 |
| 2 | `chain.specialChar` + `chain.processChar` | B3 flatItem (`specialChar` 필드) | `processNo` + `value === chain.processChar` | FA의 공정특성과 동일한 이름의 B3 항목에 특별특성 기호 설정 |

**역매핑 알고리즘:**
```
FOR EACH chain IN failureChains:
  IF chain.specialChar IS NOT EMPTY:
    1. A4 역매핑:
       FIND a4Item WHERE a4Item.processNo === chain.processNo
                     AND a4Item.value === chain.productChar
       IF FOUND: a4Item.specialChar = chain.specialChar

    2. B3 역매핑:
       FIND b3Item WHERE b3Item.processNo === chain.processNo
                     AND b3Item.value === chain.processChar
                     AND b3Item.m4 === chain.m4  (선택적, 동일 공정특성명이 여러 m4에 존재 시)
       IF FOUND: b3Item.specialChar = chain.specialChar
```

#### 7.5.2 Forward Fill 주의사항

> **FA 시트의 Forward Fill이 특별특성 역매핑을 방해할 수 있음**:
> - FA 시트에서 공정기능(A3), 제품특성(A4)이 Forward Fill로 채워지면, 특별특성도 같이 반복됨
> - **한 공정에 여러 제품특성**이 있으면 첫 번째 값만 Forward Fill되어 잘못된 역매핑 발생
> - **해결**: Forward Fill 전 원본 행의 제품특성(A4)과 특별특성(A4 SC)을 함께 추출

#### 7.5.3 검증 체크리스트

- [ ] **FA 시트에 특별특성(A4) 열(8번째)이 있는가?** (없으면 역매핑 불가)
- [ ] **FA 시트에 특별특성(B3) 열(13번째)이 있는가?** (없으면 역매핑 불가)
- [ ] **역매핑 결과**: A4 flatItems 중 specialChar가 있는 건수 > 0인가?
- [ ] **역매핑 결과**: B3 flatItems 중 specialChar가 있는 건수 > 0인가?
- [ ] **매칭 실패 0건**: chain.specialChar가 있지만 대응 A4/B3를 못 찾은 건이 없는가?
- [ ] **Forward Fill 검증**: 같은 공정에서 모든 A4가 동일한 specialChar를 갖지 않는가? (브로드캐스트 오류)
- [ ] **워크시트 반영 확인**: `productChars[].specialChar`와 `processChars[].specialChar`에 값이 있는가?

#### 7.5.4 진단 명령 (DB 확인)

```bash
# Master DB의 A4/B3 specialChar 확인
node scripts/check-specialchar.js

# 기대 결과:
#   1단계: A4 specialChar 있음 > 0건
#   2단계: legacyData productChars specialChar 있음 > 0건
#   3단계: L2Function specialChar 실제값 > 0건
```

#### 7.5.5 역매핑 파이프라인 (코드 경로)

```
STEP B: excel-parser-fc.ts    → chain.specialChar 파싱
        ↓
MasterFailureChain             → { specialChar, productChar, processChar }
        ↓
failureChainInjector.ts        → state.l2[].functions[].productChars[].specialChar 주입
saveWorksheetFromImport.ts     → chain.productChar/processChar 이름 매칭으로 정밀 주입
        ↓
STEP A: buildWorksheetState.ts → a4Items.specialChar 활용 (flatData 경로)
        ↓
워크시트                        → SpecialCharBadge 렌더링
```

> **★ v2.4.1 주의**: 현재 `failureChainInjector.ts`의 역매핑은 **공정 단위 브로드캐스트** 방식으로,
> 같은 공정의 모든 A4/B3에 동일 specialChar를 적용합니다.
> 정밀 역매핑은 `saveWorksheetFromImport.ts`가 담당하지만,
> `chain.productChar`/`chain.processChar`가 비어 있으면 작동하지 않습니다.
> **따라서 FA 시트에 제품특성(A4), 공정특성(B3) 열이 반드시 포함되어야 합니다.**

### 7.6 원본 대조 검증 — Raw Fingerprint (★★★ v2.5.3 신규)

> **핵심 원칙**: 파싱 로직과 **완전히 독립된** 원본 스캔으로 교차 검증
> 파서에 버그가 있어도 원본 스캔은 영향을 받지 않으므로, 불일치 시 파서 오류를 확실히 감지

**3단계 검증 파이프라인:**
```
┌─────────────────────┐
│ 1단계: 원본 스캔     │  ← 파서 독립, 셀 값만 읽어서 카운트
│ (scanRawFingerprint) │     isScanValid(): 파서의 isValid()와 별도 구현
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 2단계: 파싱 실행     │  ← 기존 parseSingleSheetFmea
│ (ParseCounter 통계)  │     addIfNew + 고장사슬 추출
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ 3단계: 대조 검증     │  ← verifyParsing(raw, chains)
│ (VerificationResult) │     PASS/FAIL 자동 판정
└─────────────────────┘
```

**4개 검증 항목:**

| # | 항목 | 비교 대상 | 불일치 의미 |
|---|------|----------|------------|
| 1 | 공정별 FM(A5) 고유 건수 | rawFingerprint.fmCount vs parsed chains FM | FM 누락/추가 |
| 2 | FM별 FC(B4) 고유 건수 | rawFingerprint.fcByFm[fm] vs parsed chains FC | FC 연결 오류 |
| 3 | FM별 FE(C4) 고유 건수 | rawFingerprint.feByFm[fm] vs parsed chains FE | FE 연결 오류 |
| 4 | 공정별 사슬 행수 | rawFingerprint.chainRows vs parsed chain count | 행 누락 |

**검증 결과 UI (ParseStatisticsPanel "검증" 탭):**
- 공정별 원본 vs 파싱 대조표 (FM/FC/FE/사슬 각각)
- OK/NG 판정 표시
- 불일치 상세 리스트 (공정, 항목, FM텍스트, 원본건수, 파싱건수)

**적용 범위:**
- ✅ 단일시트(STEP B "fmea result") — 원본 스캔 + 대조 검증 실행
- ❌ 멀티시트(A1~C4 분리) — 시트별 분리이므로 원본 대조 불필요 (rawFingerprint=undefined)

**체크리스트:**
- [ ] PASS 판정: 모든 검증 항목 일치
- [ ] FAIL 시: 불일치 항목 공정번호, FM 텍스트, 원본/파싱 건수 확인
- [ ] FM 건수 불일치 → Forward Fill 오류 또는 중복 판정 차이 의심
- [ ] FC/FE 건수 불일치 → 고장사슬 매칭 로직 점검
- [ ] R0→R1 복사 검증에도 동일 구조 재사용 가능

### 7.6 4M 정합성 검증 (v2.1 업데이트)
- [ ] **B2~B4**의 m4가 같은 그룹의 B1 m4와 일치하는가? (고장사슬 구성 요소)
- [ ] **B5(PreventionPool)**의 m4는 선택 사항 — 있으면 유효값 확인, 없어도 허용
- [ ] 4M 키워드 크로스 체크 실행했는가? (5.8절 참조)
- [ ] MN↔MC 오분류 WARNING 항목을 확인했는가?
- [ ] "작업자/교육/숙련도" 텍스트가 MC로 분류된 건이 없는가?
- [ ] "온도/습도/항온항습/정전기" 텍스트가 MC로 분류된 건이 없는가?

---

## 8. 산업별 예시 데이터 참조

Smart System에 내장된 산업별 예시:
- `sample-001`: 자전거 프레임 (일반 제조)
- `sample-002`: Micro Bump Cu/SnAg (반도체)
- `sample-003`: Flip Chip FCBGA (반도체)
- `sample-004`: 휠베어링 (자동차)

이 예시들의 구조를 참고하여 변환 규칙을 적용합니다.

---

## 9. 고장사슬 검증 규칙 (v2.3.0 신규)

> **목적**: 변환 완료 후 고장사슬 데이터의 정합성을 검증하여 오류를 사전에 발견
> **실행 시점**: 사용자가 워크시트에서 "고장사슬 검증" 버튼 클릭 시 (자동 실행 아님)
> **결과 표시**: 오류 건수 + 오류 엑셀 다운로드 (노란배경+빨간글자)

### 9.1 검증 항목 총괄표

| # | 규칙 | 대상 데이터 | 심각도 | 설명 |
|---|------|------------|--------|------|
| V1 | FM-FE 미연결 | failureLinks | **error** | FM에 FE가 하나도 연결되지 않음 |
| V2 | FM-FC 미연결 | failureLinks | **error** | FM에 FC가 하나도 연결되지 않음 |
| V3 | FC 다중 FM 연결 | failureLinks | warning | 동일 FC가 2개 이상 FM에 연결 (의도적일 수 있음) |
| V4 | S(심각도) 누락 | failureEffects | **error** | FE에 severity 값 없음 (1~10 필수) |
| V5 | O/D 누락 | riskAnalyses | warning | 발생도 또는 검출도 값 없음 |
| V6 | PC(예방관리) 누락 | riskAnalyses | warning | 예방관리 텍스트 없음 |
| V7 | DC(검출관리) 누락 | riskAnalyses | warning | 검출관리 텍스트 없음 |

### 9.2 오류 심각도 기준

| 심각도 | 의미 | 표시 |
|--------|------|------|
| **error** | FMEA 정합성 필수 항목 — 미해결 시 AP 산출 불가 | 빨간색 배지 |
| **warning** | 권장 항목 — 미입력이어도 FMEA 진행 가능 | 주황색 배지 |

### 9.3 Pool 타입 정의 (v2.3.0 명확화)

변환 시 B5/A6 데이터는 고장사슬(MasterFailureChain)에서 **분리**하여 Pool로 관리합니다:

```typescript
/** B5 예방관리 풀 — 고장사슬 독립, processNo별 N:M */
interface PreventionPool {
  id: string;          // 고유 ID (UUID)
  processNo: string;   // 소속 공정번호
  m4?: string;         // 4M 분류 (선택)
  value: string;       // B5 예방관리 텍스트
}

/** A6 검출관리 풀 — 고장사슬 독립, processNo별 N:M */
interface DetectionPool {
  id: string;          // 고유 ID (UUID)
  processNo: string;   // 소속 공정번호
  value: string;       // A6 검출관리 텍스트
}
```

**Pool ↔ FailureChain 관계**:
- 하나의 FC는 여러 PC에 매핑 가능 (N:M)
- 하나의 FM은 여러 DC에 매핑 가능 (N:M)
- Pool은 `PfmeaMasterDataset.relationData` JSON에 저장

### 9.4 오류 엑셀 다운로드 사양

사용자가 "오류 엑셀 다운로드" 클릭 시 생성되는 엑셀 파일:

| 영역 | 내용 |
|------|------|
| Row 1~5 | 오류 분석 요약 (총 오류 건수, 유형별 통계) |
| Row 6~ | 워크시트 데이터 전체 |
| 오류 셀 | **노란색 배경** (`#FFFF00`) + **빨간색 글자** (`#FF0000`) + bold |
| 셀 메모 | 오류 사유 (예: "[V1] FM에 FE 미연결") |

**스타일 정의**:
```
오류 셀 = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
  font: { color: { argb: 'FFFF0000' }, bold: true }
  note: '오류 사유 텍스트'
}
```

### 9.5 검증 결과 타입

```typescript
/** 고장사슬 검증 오류 (확장 타입) */
interface ChainValidationError {
  level: 'error' | 'warning';
  field: string;
  message: string;
  itemId?: string;
  processNo?: string;    // 해당 공정번호
  chainId?: string;      // failureLink ID
  fmText?: string;       // FM 텍스트 (표시용)
  fcText?: string;       // FC 텍스트 (표시용)
  feText?: string;       // FE 텍스트 (표시용)
  errorType: string;     // V1~V7 코드
}

/** 검증 결과 */
interface ChainValidationResult {
  isValid: boolean;
  errors: ChainValidationError[];       // error 레벨만
  warnings: ChainValidationError[];     // warning 레벨만
  missingCount: number;
  totalCount: number;
  chainErrors: ChainValidationError[];  // 전체 (error + warning)
  summary: Record<string, number>;      // errorType별 건수 { V1: 3, V2: 1, ... }
}
```

### 9.6 실제 오류 사례 (티앤에프 STEP B 분석 결과)

티앤에프 JG1 HUD STEP B (599행, 17개 공정) 분석에서 발견된 오류:

| 검증 항목 | 건수 | 주요 사례 |
|-----------|------|----------|
| S 누락 | 385건 (65.4%) | FC 있는데 S 값 없음 — Forward Fill 미적용 |
| FC 빈행 | 10건 | chain 미생성 (스킵) |
| 동일 FC 중복 | 127건 | 같은 공정 내 동일 FC 텍스트 |
| 같은 FC→다중 FM | 127건 | 공정20번 "오판정" FC가 15개 FM에 등장 |
| 구조4M ≠ 고장4M | 118건 | MN↔MC, MC↔EN 교차 |
| 구조WE ≠ 고장WE | **300건** | 가장 많은 오류! |
| FC 공정번호 불일치 | 9건 | 130번 공정에 120번 FC 삽입 (복붙 실수) |

> **핵심 교훈**: 사람이 수백 개 고장사슬을 연결하면 실수가 필연적으로 발생함.
> 자동 검증으로 사전에 발견 → 수정하는 것이 FMEA SW 품질의 핵심.

### 9.7 골든 테스트 파일

검증 규칙의 정확성을 확인하기 위한 "정답" 엑셀:

- **파일**: `docs/PFMEA_STEP_B_GOLDEN_TEST.xls`
- **내용**: 5개 공정, 44행, 오류 0건인 완벽한 데이터
- **시나리오**:
  - 공정10: 단순 (1 FE : 1 FM : 3 FC) — MN
  - 공정20: 3열 FE(Y/C/U) + 다중 FM — 7개 chain, 10 FC
  - 공정30: 비대칭 (1 FE : 2 FM : 5 FC) — MC+MN 혼합
  - 공정40: 대규모 (2 FE : 3 FM : 24 FC) — Pool 공유
  - 공정50: 경계 (MC+IM+EN : 1 FM : 5 FC) — 특별특성 C
- **검증**: `node scripts/read-stepb.js` + `node scripts/read-stepb-chain-errors.js` → 오류 0건 필수
