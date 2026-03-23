# 파이프라인 불변 조건 (Pipeline Invariants)

> 작성일: 2026-03-15
> 용도: AI 코드 수정 요청 시 이 문서를 첨부하여 불변 조건 위반 여부를 사전 체크

---

## 사용법

버그 수정 또는 기능 추가를 AI에게 요청할 때:

```
이 수정이 아래 불변 조건을 위반하지 않는지 확인해줘:
[해당 단계의 불변 조건 복사]
```

---

## Stage 1: Excel 파싱 → ImportedFlatData[]

> 2026-03-24: 멀티시트 `buildMultiSheetDedupKey` — B3/B4/B5/A6에 **시트 출력 순번(i)** 를 키에 포함해 병합셀과 동일 `excelRow`에서도 행별 FC가 합쳐지지 않도록 완화. Import 병합 `getBusinessKey`(B3/B4)에 **excelRow + orderIndex** 포함.

| ID | 불변 조건 | 위반 시 증상 |
|----|----------|-------------|
| S1-1 | processNo는 정규화됨 (선행0 제거, "번" 제거) | Stage 2에서 FK 매칭 실패 |
| S1-2 | 동일 공정의 processNo 포맷이 통일됨 ("10"과 "010" 혼재 금지) | Map 조회 miss |
| S1-3 | itemCode가 있으면 value.trim().length > 0 | 빈 엔티티 생성 → 고아 노드 |
| S1-4 | excelRow가 있으면 > 0이고 공정 내 순차적 | rowSpan 계산 오류 |
| S1-5 | rowSpan ≥ 1 (설정된 경우) | FM-FC 배분 범위 오류 |

---

## Stage 2: buildWorksheetState() → WorksheetState

| ID | 불변 조건 | 위반 시 증상 |
|----|----------|-------------|
| S2-1 | **A4(제품특성)는 공정 단위 1회 생성, 모든 A3가 동일 ID를 FK 참조** | 카테시안 복제 (UUID 2배) |
| S2-2 | 각 ProductChar.id는 전역 유일 | FK 충돌 |
| S2-3 | B1이 있으면 WorkElement 수 = distinct(processNo, B1값, m4) | WE 누락/중복 |
| S2-4 | placeholder WE(name='')는 B1 미존재 공정에만 허용 | 수동모드 placeholder 삭제 금지 (Rule 10.5) |
| S2-5 | FM 수 = 해당 공정의 distinct A5 값 수 | FM 중복/누락 |
| S2-6 | 모든 FM에 productCharId 할당 (null 불가) | CP↔FMEA 동기화 실패 |
| S2-7 | FC는 L2(Process)와 L3(WorkElement) 양쪽에 저장 | 탭별 표시 불일치 |
| S2-8 | FE는 L1 레벨 (공정 독립) — 공정별 루프 안에서 생성 금지 | FE 0건 버그 |
| S2-9 | specialChar='C' 전파: A4→productChars 복사본 모두, B3→processChars 모두 | 특별특성 표시 누락 |

---

## Stage 3: buildFailureChainsFromFlat() → MasterFailureChain[]

> 2026-03-23: S3-1~2 갱신 — rowSpan 창 매칭 폐지, **FC-only 공정** 및 **flatId** 반영.

| ID | 불변 조건 | 위반 시 증상 |
|----|----------|-------------|
| S3-1 | **공정 순회 = `processFMs.keys() ∪ processFCs.keys()`** (A5 없이 B4만 있어도 체인 생성) | FC-only 공정 전량 누락 |
| S3-2 | 동일 공정 내 **B4 1행 = 체인 1건**; FM은 `fm.excelRow ≤ fc.excelRow` 중 최근 FM(carry); excelRow 없으면 라운드로빈 | FM-FC 행 불일치 |
| S3-3 | FM만·FC만 공정: FM-only는 `fcValue=''`; FC-only는 `fmValue=''` (텍스트 자동생성 금지) | 거짓 FM/FC 텍스트 |
| S3-4 | 가능한 체인에 **fmFlatId / fcFlatId / feFlatId**(C4 행 매칭 시) 설정 → `assignChainUUIDs` 0단계 | 텍스트 매칭 실패·중복 행 누락 |
| S3-5 | chains 배열 원본 불변 (mutation 금지) | 사이드이펙트로 데이터 왜곡 |
| S3-6 | feValue+fmValue+fcValue 모두 빈값인 chain은 생성하지 않음 | 빈 링크 생성 |

---

## Stage 3b: buildFailureLinksDBCentric() — `feId` 미할당 체인 보강

| ID | 불변 조건 | 위반 시 증상 |
|----|----------|-------------|
| S3b-1 | 공정에 이미 `feId`가 있는 체인이 있으면 **같은 processNo**의 나머지 체인은 그 `feId` carry (시드에 `fmId` 불필요) | FC-only 체인이 carry를 못 줘 후속이 잘못된 FE |
| S3b-2 | 공정에 시드가 없으면 **글로벌 폴백 = `failureScopes[0]` 단일** — `feIdx % N` round-robin 금지 | 공정마다 FE-01/02/… 인위 분산 → 사실 왜곡 |

---

## Stage 4: injectFailureChains() → FailureLink[] + riskData

| ID | 불변 조건 | 위반 시 증상 |
|----|----------|-------------|
| S4-1 | **Link 생성은 FE+FM+FC 3요소 모두 매칭 시에만** (부분 매칭 금지) | 빈 FK → DB 에러 |
| S4-2 | 유사도 임계값 ≥ 70% (50% 금지) | 오매칭 |
| S4-3 | first-match-wins (재평가 금지) | 비결정적 결과 |
| S4-4 | round-robin 자동배분 금지 | 사실 왜곡 |
| S4-5 | riskData 키 형식: `risk-{fmId}-{fcId}-{S\|O\|D}` | 키 불일치 → 값 소실 |
| S4-6 | prevention 키: `prevention-{fmId}-{fcId}` | PC 표시 안됨 |
| S4-7 | detection 키: `detection-{fmId}-{fcId}` | DC 표시 안됨 |
| S4-8 | skippedCount ≤ 2 (정상 범위) | 데이터 품질 경고 |
| S4-9 | chains 배열 원본 mutation 금지 (`(c as any).feValue =` 금지) | 불변성 위반 |

---

## Stage 5: supplementMissingItems() → ImportedFlatData[]

| ID | 불변 조건 | 위반 시 증상 |
|----|----------|-------------|
| S5-1 | 코드 카운트 = 0인 항목만 보충 (부분 존재 시 보충 금지) | 사용자 데이터 덮어쓰기 |
| S5-2 | normPno()로 매칭하되, 저장 시 원본 포맷 유지 | 포맷 불일치 연쇄 |
| S5-3 | A3 없으면 A4 보충 스킵 (A1→A3 선행 필수) | 고아 A4 |
| S5-4 | B1/B2는 쌍으로 생성 (B1만 단독 생성 금지) | B2 누락 |
| S5-5 | 보충 결과는 별도 배열로 반환 (입력 배열 mutation 금지) | 원본 오염 |

---

## Stage 6: API POST → Database

| ID | 불변 조건 | 위반 시 증상 |
|----|----------|-------------|
| S6-1 | **모든 DB 쓰기는 prisma.$transaction 래핑** | 고아 데이터 |
| S6-2 | LegacyData가 SSoT (Single Source of Truth) | 로드 시 데이터 불일치 |
| S6-3 | FM.productCharId → ProcessProductChar.id (FK 필수 존재) | FK 위반 에러 |
| S6-4 | link.fmId → ProcessFailureMode.id (FK 필수 존재) | FK 위반 에러 |
| S6-5 | link.feId → FailureScope.id (FK 필수 존재) | FK 위반 에러 |
| S6-6 | link.fcId → ProcessFailureCause.id (FK 필수 존재) | FK 위반 에러 |
| S6-7 | (fmId, fcId) 쌍 유일성 (중복 FailureLink 금지) | 중복 행 표시 |

---

## 엣지케이스 (실제 데이터에서 관찰됨)

| 케이스 | 조건 | 올바른 처리 |
|--------|------|------------|
| FM > FC (공정 120) | FM=13, FC=12 | 마지막 FM은 FC 없이 스킵 (round-robin 금지) |
| FE 컬럼 미존재 | FC시트에 feValue 없음 | carry-forward로 이전 FE 계승 |
| 공통공정 (00) | processNo='00' 또는 '공통' | 실제 데이터 있으면 포함 (빈 경우만 스킵) |
| A-only 공정 | A 카테고리만 있고 B 없음 | B1 보충 대상에 포함 |
| 머지셀 마지막 FM | rowSpan 계산 경계 | max(fc행) - thisRow + 1 |

---

## Chain-Driven 전환 후 폐기 예정 불변 조건

Chain-Driven으로 전환하면 아래 조건들은 **불필요해짐** (텍스트 매칭 자체가 제거되므로):

- S4-2 (유사도 임계값) — 텍스트 매칭 없음
- S4-3 (first-match-wins) — 매칭 자체가 없음
- S4-4 (round-robin 금지) — 배분 자체가 없음
- S4-8 (skippedCount) — 스킵 자체가 불가능
- S4-9 (chains mutation) — injector 파일 자체 deprecate
