# FMEA Raw Dataset Import 설계서

> 작성일: 2026-03-22
> 목적: 엑셀 Import를 "FMEA 작성용 기초자료 입력"으로 정의하고, Import 원본을 파싱/전처리하여 `FmeaRawDataset`을 생성하는 표준 파이프라인을 설계한다.

---

## 1. 문서 배경

현재 PFMEA Import는 사용자가 작성한 엑셀을 그대로 Atomic DB에 넣어 완성형 FMEA를 만들 수 있다는 가정이 암묵적으로 섞여 있었다.

하지만 실제 운영 관점에서 엑셀 Import는 다음 특성을 가진다.

1. 엑셀은 완성형 FMEA가 아니라 "기초자료"다.
2. 사용자는 FM/FE/FC/PC/DC를 모두 완전한 triad 형태로 작성하지 못하는 경우가 많다.
3. 시각적으로는 충분해 보이는 자료도 시스템 관점에서는 FK 연결에 필요한 정보가 빠져 있을 수 있다.
4. 병합셀, 생략기입, 상하문맥 의존은 사람은 이해하지만 기계는 확정적으로 해석할 수 없다.

따라서 Import 시스템의 목표는 아래로 재정의되어야 한다.

- 엑셀을 완성 데이터로 간주하지 않는다.
- 엑셀을 파싱하여 `FmeaRawDataset`이라는 중간 원자성 데이터셋으로 변환한다.
- 이후 FMEA 로직은 `FmeaRawDataset`을 기준으로 단계별 전개, 검증, 보정, 사용자 확인을 수행한다.

---

## 2. 핵심 결론

### 2.1 Import의 역할

엑셀 Import는 FMEA 완성본을 넣는 기능이 아니다.

엑셀 Import는 아래 역할만 담당한다.

- FMEA 작성에 필요한 기초자료 수집
- 공정/L1/L2/L3 구조의 1차 추출
- FM/FE/FC/PC/DC 후보군의 원본 보존
- triad 형성에 필요한 연결 후보 생성

즉, Import는 "초안 입력"이고 실제 FMEA 구동 데이터는 `FmeaRawDataset`이어야 한다.

### 2.2 지금 시급한 과제

현재 시스템에서 가장 시급한 과제는 아래 3가지다.

1. Import data completeness 확보
2. Parsing completeness 확보
3. `FmeaRawDataset` 생성 및 이를 기준으로 후속 FMEA 단계 구동

---

## 3. 현재 문제 정의

### 3.1 Import data completeness 문제

실제 엑셀은 아래 문제가 자주 발생한다.

1. `FE`는 L1 시트에 있으나 chain row에는 실제 `feValue`가 없고 `YP/SP/USER`만 존재한다.
2. `B4(FC)`는 L3 문맥에 있지만 별도 chain row에는 빠질 수 있다.
3. `B5(PC)`는 일부 공정/일부 FC에서만 제공된다.
4. `A6(DC)`는 공정 단위만 있고 chain 단위까지는 제공되지 않을 수 있다.
5. `m4`, `WE`, `B3`가 누락되면 FC를 어떤 L3 문맥에 꽂아야 하는지 확정할 수 없다.
6. 병합셀로 인해 "위 행과 동일" 의미가 남아 있지만 기계는 이를 확정적으로 알 수 없다.

### 3.2 Parsing completeness 문제

기존 파이프라인에서는 아래와 같은 문제가 확인되었다.

1. 레거시 Import 경로에서 `flatData`가 비어 끝나는 경우가 있었다.
2. `failureChains`가 비어 있으면 `FL/RA` 생성이 전부 막혔다.
3. `resave-import`가 `m4`, `belongsTo`, `specialChar`를 잃어버려 재저장 시 B4 복원이 어려웠다.
4. source가 일부 비어 있으면 코드가 donor나 fallback으로만 부분 복구해야 했다.
5. source chain 자체가 FE/FM/FC triad를 완전하게 담지 못하면 `failureLinkCoverage`가 남는다.

### 3.3 구조적 해석 문제

FMEA chain은 사람에게는 아래처럼 보인다.

- FM 중심
- 좌측 FE 다수
- 우측 FC 다수

하지만 시스템은 아래가 필요하다.

- 1행 = 1 triad (`FE-FM-FC`)
- `processNo`
- `m4`
- `WE`
- 가능하면 `B3`

이 정보 없이 그림 또는 병합 구조만 존재하면 시스템은 추론을 해야 하고, 이는 UUID/FK 원칙에 위배된다.

---

## 4. 목표 상태

### 4.1 목표 아키텍처

```text
Excel Import
  -> Parser
  -> Import Validation
  -> Preprocessing / Enrichment
  -> FmeaRawDataset 생성
  -> FMEA 단계별 로직 실행
     - 구조 전개
     - FM/FE/FC 정규화
     - Chain triad 형성
     - Atomic DB 저장
     - Worksheet 렌더링
```

### 4.2 목표 데이터 계층

```text
Level 0: Excel 원본
  - 사람 작성 문서
  - 병합/생략/시각화 허용

Level 1: ParsedFlatData / ParsedChainData
  - 원본 보존
  - 셀 기반 구조화
  - 누락/이상 표시

Level 2: FmeaRawDataset
  - FMEA 엔진이 소비하는 표준 중간 데이터셋
  - FK 전환 전의 확정 가능한 사실 집합
  - 구조/L1/L2/L3/triad 후보/관리항목 후보 포함

Level 3: Atomic DB
  - 최종 확정 UUID/FK 데이터
  - Worksheet/CP/PFD 연동의 SSoT
```

---

## 5. FmeaRawDataset 정의

`FmeaRawDataset`은 Import 원본을 FMEA 시스템이 처리 가능한 형식으로 정규화한 중간 데이터셋이다.

### 5.1 포함해야 할 데이터

#### 구조 데이터

- `l1Items`
- `l2Items`
- `l3Items`

#### 기능/특성 데이터

- `c2/c3/c4`
- `a3/a4/a5/a6`
- `b2/b3/b4/b5`

#### Chain 후보 데이터

- `rawChains`
- 각 chain 후보의 `processNo`, `fmValue`, `fcValue`, `feValue`
- 가능하면 `m4`, `we`, `b3Value`
- source row / source sheet 정보

#### 품질 메타데이터

- `sourceCompleteness`
- `missingFields`
- `warnings`
- `confidence`
- `requiresUserConfirmation`

### 5.2 RawDataset의 역할

`FmeaRawDataset`은 아래 작업의 기준점이 된다.

1. 누락 항목이 source 부족인지 parser 부족인지 구분
2. triad 형성이 가능한 row와 불가능한 row 분리
3. donor 또는 reference DB 보강 필요 여부 판단
4. 사용자 확인이 필요한 연결만 별도 표시
5. Atomic DB 저장 전 사전 검증

---

## 6. Import 엑셀의 현실적 입력 원칙

엑셀은 완전한 triad 문서가 아닐 수 있다. 이를 인정하고 최소 요구사항을 분리한다.

### 6.1 최소 요구사항

아래가 있으면 RawDataset 생성은 가능해야 한다.

- L1 시트에 `FE`
- L2 시트에 `processNo`, `FM`, `A6`
- L3 시트에 `processNo`, `m4`, `WE`, `B3`, `B4`, `B5`
- chain source 또는 이와 동등한 연결 정보

### 6.2 완전 triad를 위한 권장 요구사항

아래가 있으면 거의 자동으로 Atomic DB까지 갈 수 있다.

- `FE구분`
- 실제 `FE 텍스트`
- `processNo`
- `FM`
- `4M`
- `WE`
- `B3`
- `FC`
- `B5`
- `A6`
- chain row 단위 `FE-FM-FC`

### 6.3 금지 또는 비권장

1. 병합셀 기반 의미 전달
2. "위 행과 동일"을 빈칸으로 표현
3. `feValue` 대신 `YP/SP/USER`만 넣기
4. `FC`를 L3와 chain 어디에도 완전하게 두지 않기
5. `m4` 없이 FC만 제공하기

---

## 7. 권장 Import 시트 구조

### 7.1 L1 시트

| 구분(C1) | 제품기능(C2) | 요구사항(C3) | FE No | FE(C4) |
|---------|--------------|--------------|-------|--------|

### 7.2 L2 시트

| 공정번호 | 공정명 | 공정기능(A3) | 제품특성(A4) | FM No | FM(A5) | A6(검출관리) |
|---------|--------|--------------|--------------|------|--------|---------------|

### 7.3 L3 시트

| 공정번호 | 4M | 작업요소(B1) | 요소기능(B2) | 공정특성(B3) | 특별특성 | FC No | B4(고장원인) | B5(예방관리) |
|---------|----|--------------|--------------|--------------|----------|------|--------------|---------------|

### 7.4 Chain 시트

가장 권장하는 형태는 아래다.

| FE구분 | FE No | FE | 공정번호 | 공정명 | FM No | FM | 4M | WE | B3 | FC No | FC | B5 | A6 |
|-------|------|----|---------|--------|------|----|----|----|----|------|----|----|----|

원칙:

1. 1행 = 1 triad
2. 병합 금지
3. 같은 값 반복 허용
4. FM 중심 그림을 import용 long-format으로 펼쳐 적는다

---

## 8. Parsing 전략

### 8.1 Parser의 책임

Parser는 아래만 수행한다.

1. 시트별 row 추출
2. 병합셀 해제 후 반복 row 복원
3. 셀 값을 문자열/정규값으로 변환
4. `ParsedFlatData`와 `ParsedChainData` 생성
5. 누락/이상치를 메타데이터로 표시

Parser는 아래를 하면 안 된다.

1. 사실이 없는 FM/FE/FC 자동 생성
2. 임의 텍스트 보정으로 triad 확정
3. FK를 추론 기반으로 확정

### 8.2 전처리기의 책임

전처리기는 Parser 이후 `FmeaRawDataset`을 만들 때 아래를 수행한다.

1. `processNo`, `m4`, `WE`, `B3`, `FC` 연결 정렬
2. L1/L2/L3 문맥을 chain row에 주입
3. `A6/B5`를 공정/문맥 기준으로 연결
4. source 부족 row를 `requiresUserConfirmation`으로 분리
5. donor/reference DB 보강 가능 구간과 불가능 구간을 분리

---

## 9. FmeaRawDataset 생성 규칙

### 9.1 생성 원칙

1. 원본 Excel은 절대 버리지 않는다.
2. parser 출력과 전처리 출력은 분리한다.
3. `FmeaRawDataset`은 "확정 가능한 사실"만 담는다.
4. 추론 결과는 `suggested` 또는 `derived` 플래그로 별도 표시한다.
5. Atomic DB 저장 전 반드시 triad completeness 검증을 통과해야 한다.

### 9.2 triad completeness 기준

한 row가 Atomic 전환 가능하려면 최소 아래를 충족해야 한다.

- `processNo`
- `fmValue`
- `fcValue`
- 실제 `feValue`

가능하면 아래도 같이 필요하다.

- `m4`
- `WE`
- `B3`
- `PC`
- `DC`

### 9.3 RawDataset 상태 분류

- `raw-complete`: Atomic 전환 가능
- `raw-partial`: 구조는 있으나 triad 일부 누락
- `raw-ambiguous`: 연결 후보 다수, 사용자 확인 필요
- `raw-invalid`: source 누락 심각, 재입력 필요

---

## 10. 사용자 측면 보강 포인트

완전한 시스템을 위해 사용자가 더 보강해야 하는 항목은 아래다.

### 필수

1. chain row에 실제 `FE` 텍스트 제공
2. `B4(FC)`를 L3 문맥에서 완전하게 제공
3. `m4` 제공
4. `WE` 제공

### 강력 권장

1. `B3(공정특성)` 제공
2. `FM No / FE No / FC No` 제공
3. `공정명` 제공
4. `A6/B5`를 row 단위 반복 기입

### 선택

1. `Chain No`
2. source row 번호
3. 작성자/검토자 메타데이터

---

## 11. 코드 측면 해야 할 일

### 11.1 단기

1. `FmeaRawDataset` 타입 정의
2. Parser 출력과 RawDataset 생성 분리
3. `save-from-import`는 Atomic 직접 생성 전에 반드시 RawDataset 생성 단계를 통과
4. `resave-import`도 RawDataset 재생성 경로 통일
5. chain completeness 리포트 API 추가

### 11.2 중기

1. RawDataset viewer UI
2. 누락/모호 row 확인 UI
3. donor/reference DB 보강 승인 UI
4. triad coverage heatmap

### 11.3 장기

1. Import 엑셀 템플릿 표준화
2. chain 시트 long-format 강제
3. family/master 간 donor 보강 프로세스 공식화

---

## 12. 시스템 목표 상태 선언

최종적으로 이 시스템은 아래와 같이 동작해야 한다.

1. 사용자는 엑셀에 FMEA 완성본을 입력하지 않는다.
2. 사용자는 FMEA 작성용 기초자료를 입력한다.
3. 시스템은 이를 파싱하여 `FmeaRawDataset`을 생성한다.
4. FMEA 로직은 `FmeaRawDataset`을 기준으로 구조/연결/검증/보강을 수행한다.
5. 최종 확정된 데이터만 Atomic DB로 저장된다.

즉,

**Excel Import = 기초자료 입력**
**FmeaRawDataset = 시스템 해석 완료 중간 데이터**
**Atomic DB = 최종 확정 진실 데이터**

---

## 13. 최종 요약

현재 Import 문제의 본질은 "엑셀이 완전한 FMEA가 아닌데 시스템이 완성형 데이터처럼 처리하려 했다"는 점이다.

해결 방향은 명확하다.

1. Import 완전성을 강제하려 하지 않는다.
2. Parsing 완전성을 확보한다.
3. `FmeaRawDataset`을 명시적으로 만든다.
4. 이후 단계는 RawDataset 기준으로 동작하게 만든다.

이 문서의 결론은 다음 한 줄로 요약된다.

**지금 시급한 것은 Import 원본을 바로 Atomic DB로 보내는 것이 아니라, Import 원본을 완전한 `FmeaRawDataset`으로 승격시키는 파이프라인을 구축하는 것이다.**
