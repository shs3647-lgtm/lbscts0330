# 엑셀 Import 샘플 작성 명세서

> **목적**: m002 DB와 100% 동일한 FMEA를 재현할 수 있는 Import 엑셀 샘플 생성
> **기준**: pfm26-m002 (12inch Au Bump) — 2026-03-21 확정
> **생성 스크립트**: `scripts/gen-import-sample.mjs`
> **출력 파일**: `data/m002_완벽_Import_Sample.xlsx`

---

## 1. 시트 구성 (5시트)

| # | 시트명 | 헤더 | 행수 | 용도 |
|---|--------|------|------|------|
| 1 | L1 통합(C1-C4) | 구분(C1), 제품기능(C2), 요구사항(C3), 고장영향(C4) | 133 (L1F × FE 고유 조합) | 완제품 기능+요구사항+고장영향 |
| 2 | L2 통합(A1-A6) | A1.공정번호, A2.공정명, A3.공정기능, A4.제품특성, 특별특성, A5.고장형태, A6.검출관리 | 26 | 공정+공정기능+FM+DC |
| 3 | L3 통합(B1-B5) | 공정번호, 4M, 작업요소(B1), 요소기능(B2), 공정특성(B3), 특별특성, 고장원인(B4), 예방관리(B5) | 104 (FC dedup 기준, 91 WE 전부 FC 보유) | 작업요소+요소기능+FC+PC |
| 4 | FC 고장사슬 | FE구분, FE(고장영향), L2-1.공정번호, FM(고장형태), 4M, 작업요소(WE), FC(고장원인), B5.예방관리, A6.검출관리, O, D, AP | 111 (fill-down) | 고장사슬 FK 확정 |
| 5 | FA 통합분석 | 26컬럼 (참고용) | 선택 | 전체 연계 참고 |

## 2. 핵심 규칙

- **모든 셀 fill-down**: 빈셀 없이 매 행에 완전한 데이터
- **dedup key에 공정번호 필수**: 동일 텍스트라도 다른 공정이면 별도 엔티티
- **FL key = fmId+fcId+feId**: 3요소 완전 일치만 중복 (Rule 1.7)
- **FC key = l2StructId+l3StructId+cause**: 공정+WE+원인 (공정번호 포함)
- **FK 기반만 사용**: 자동생성/폴백/이름매칭 금지 (Rule 1.5)

---

## 3. 기대 결과 (Import 후)

| 엔티티 | 기대값 | 비고 |
|--------|--------|------|
| L2Structure | 21 | 공정 수 |
| L3Structure | 91 | 작업요소 수 |
| L1Function | 17 | 요구사항 수 (YP:8, SP:6, USER:3) |
| L2Function | 26 | 공정기능 수 |
| L3Function | 101 | 요소기능 수 |
| FE (고장영향) | 20 | C4 고유값 (YP:11, SP:6, USER:3) |
| FM (고장형태) | 26 | A5 고유값 |
| FC (고장원인) | 104 | B4 고유값 (공정별 별도 UUID) |
| FailureLink | 111 | 고장사슬 (1FC→NxFM, FM↔FC↔FE 3요소) |
| RiskAnalysis | 111 | SOD + DC/PC (NULL 0건) |
| DC (검출관리) | 111 | NULL 0건 |
| PC (예방관리) | 111 | NULL 0건 |

---

## 4. 공정 목록 (21 공정)

| 공정번호 | 공정명 | FM수 | FC수 | FL수 | 제품특성(A4) | 특별특성 |
|---------|--------|------|------|------|------------|---------|
| 01 | 작업환경 | 1 | 6 | 6 | 파티클 수 | - |
| 10 | IQA(수입검사) | 2 | 5 | 8 | Wafer TTV, Wafer 두께 | ◇ |
| 20 | Sorter | 2 | 5 | 9 | OCR ID 인식 정확도, Wafer 정렬 정확도 | - |
| 30 | Scrubber | 1 | 4 | 4 | 파티클 잔류수 | - |
| 40 | UBM Sputter | 2 | 10 | 12 | 막질 균일도, UBM 두께 | ★ |
| 50 | Scrubber2 | 1 | 4 | 4 | 파티클 잔류수 | - |
| 60 | PR Coating | 1 | 4 | 4 | PR 두께 | ★ |
| 70 | Exposure | 1 | 4 | 4 | CD(Critical Dimension) | ★ |
| 80 | Develop | 1 | 4 | 4 | Opening 정확도 | - |
| 90 | Descum | 1 | 4 | 4 | PR 잔사 수 | - |
| 100 | Au Plating | 2 | 7 | 7 | Au 순도, Au Bump 높이 | ★ |
| 110 | PR Strip | 1 | 4 | 4 | PR 잔사 | - |
| 120 | Au Etch | 1 | 5 | 5 | 에칭 잔류물 | - |
| 130 | TiW Etch | 1 | 5 | 5 | Seed 잔류물 | - |
| 140 | Anneal | 1 | 5 | 5 | IMC 두께 | ★ |
| 150 | Final Inspection | 2 | 6 | 6 | Bump 외관 결함, Bump 높이 | ◇ |
| 160 | Clean | 1 | 4 | 4 | 파티클 잔류수 | - |
| 170 | Scrubber3 | 1 | 4 | 4 | 파티클 잔류수 | - |
| 180 | Sorter3 | 1 | 4 | 4 | Wafer 정렬 정확도 | - |
| 190 | AVI | 1 | 4 | 4 | Defect 수 | - |
| 200 | OGI/Packing | 1 | 4 | 4 | 포장 상태 | ◇ |

**합계**: FM 26, FC 104, FL 111

---

## 5. 시트별 상세 컬럼 매핑

### 5.1 L1 통합(C1-C4) 시트

| 컬럼 | 소스 필드 | 설명 | 예시 |
|------|----------|------|------|
| 구분(C1) | `l1Function.category` | YP/SP/USER (3종) | `YP` |
| 제품기능(C2) | `l1Function.functionName` | 완제품 기능 설명 | `Wafer 청정도(파티클 수)가 공정 기준을...` |
| 요구사항(C3) | `l1Function.requirement` | 요구사항/규격명 | `PR 두께 규격(PR Thickness Spec, μm)` |
| 고장영향(C4) | `failureEffect.effect` | 고장 영향 텍스트 | `전기적 Open/Short` |

**데이터 규칙**:
- C1 구분별 행수: YP 8개, SP 6개, USER 3개 = **17개 L1Function**
- C4 고장영향: **20개** 고유값
- L1 시트는 C1→C2→C3과 C4의 조합 (L1Function × FE 매트릭스)
- 정렬: C1 순서 — YP → SP → USER

**C1 구분별 L1Function**:

| C1 | L1Function 수 | 대표 기능 |
|----|--------------|----------|
| YP (자사공정) | 8 | Wafer 청정도, UBM·PR·Etch 공정특성, Au Bump 제품특성 |
| SP (고객납품) | 6 | Au 순도/IMC 두께, 고객 납품 기준 |
| USER (최종사용자) | 3 | 전기적·기계적 신뢰성, RoHS 규제 |

**FE(C4) 전체 목록 (20)**:

| # | 구분 | 고장영향(C4) | S값 |
|---|------|------------|-----|
| 1 | YP | Particle 오염으로 인한 제품 특성 이상 | 5 |
| 2 | YP | Wafer 표면 결함 미검출로 인한 후공정 유출 | 5 |
| 3 | YP | Lot 혼입으로 인한 Wafer 수율 손실 | 7 |
| 4 | YP | 전기적 Open/Short | 8 |
| 5 | YP | Bump Lift-off | 8 |
| 6 | YP | PR 두께 Spec Out으로 인한 패턴 불량 | 6 |
| 7 | YP | Bump간 Bridge | 8 |
| 8 | YP | CD Spec Out으로 인한 Bump 형성 불량 | 7 |
| 9 | YP | PR Scum 잔류로 인한 Au Bump 형성 불량 | 6 |
| 10 | YP | Bump Height Spec Out으로 인한 제품 특성 이상 | 7 |
| 11 | YP | Plating 균일도 Spec Out으로 인한 Bump 특성 이상 | 6 |
| 12 | SP | IMC 과성장에 의한 접합부 열화 | 7 |
| 13 | SP | Particle 오염 불량 유출로 인한 고객 기능 이상 | 7 |
| 14 | SP | 라벨 불일치로 인한 Lot 혼입 불량 유출 | 6 |
| 15 | SP | 외관 결함 불량 유출(고객 Outgoing Defect) | 6 |
| 16 | SP | 고객 Packing 기준 부적합으로 인한 납품 Reject | 5 |
| 17 | SP | IMC 두께 Spec Out으로 인한 접합부 신뢰성 저하 | 7 |
| 18 | USER | 고객 라인 정지, 클레임 | 9 |
| 19 | USER | 고객 신뢰도 하락 | 8 |
| 20 | USER | RoHS 부적합으로 인한 리콜·법적 조치 | 9 |

### 5.2 L2 통합(A1-A6) 시트

| 컬럼 | 소스 필드 | 설명 | 예시 |
|------|----------|------|------|
| A1.공정번호 | `l2Structure.no` | 2~3자리 숫자 (정렬 기준) | `40` |
| A2.공정명 | `l2Structure.name` | 공정 이름 | `UBM Sputter` |
| A3.공정기능 | `l2Function.functionName` | 공정 기능 설명 | `Ti/Cu 박막을 Sputter...` |
| A4.제품특성 | `productChar.name` (chain) | 제품/공정 특성 | `막질 균일도(Film Uniformity, %)` |
| 특별특성 | `specialChar` (chain) | ◇ / ★ / 빈칸 | `★` |
| A5.고장형태 | `failureMode.mode` | FM 텍스트 | `TiW Etch 후 잔류 Film 이상` |
| A6.검출관리 | `dcValue` (chain) | DC 텍스트 | `H₂O₂ 농도 실시간 모니터링` |

**데이터 규칙**:
- **26행** (L2Function 수 = FM별 1행)
- A1 정렬: 공정번호 오름차순 (01→200)
- A4 제품특성: 22종 고유값, 일부 공정은 2개 (40, 100, 150 등)
- A6 검출관리: chains에서 `processNo|fmValue` 키로 중복제거
- 특별특성: ★ 12건, ◇ 6건, 빈칸 93건

### 5.3 L3 통합(B1-B5) 시트

| 컬럼 | 소스 필드 | 설명 | 예시 |
|------|----------|------|------|
| 공정번호 | `chain.processNo` | L2의 공정번호 | `130` |
| 4M | `chain.m4` | IM/EN/MC/MN | `IM` |
| 작업요소(B1) | `chain.workElement` | L3Structure 이름 | `TiW Etchant` |
| 요소기능(B2) | `chain.l3Function` | L3Function 이름 | `TiW Etchant가 Seed Layer를...` |
| 공정특성(B3) | `chain.processChar` | 공정특성 이름 | `H₂O₂ 농도(Concentration, %)` |
| 특별특성 | `chain.specialChar` | ◇ / ★ / 빈칸 | `★` |
| 고장원인(B4) | `chain.fcValue` | FC 텍스트 | `H₂O₂ 농도 편차에 의한 Etch Rate 이탈` |
| 예방관리(B5) | `chain.pcValue` | PC 텍스트 | `Etchant 농도 정기 분석 및 자동 보충` |

**데이터 규칙**:
- **104행** = FC dedup 기준 (91 WE 전부 FC 보유, 보충행 없음)
- dedup key: `processNo|4M|workElement|fcValue` (4요소)
- 4M 분포: IM 27건, EN 24건, MC 38건, MN 22건
- 정렬: 공정번호 오름차순

### 5.4 FC 고장사슬 시트

| 컬럼 | 소스 필드 | 설명 | 예시 |
|------|----------|------|------|
| FE구분 | `chain.feScope` | YP/SP/USER | `YP` |
| FE(고장영향) | `chain.feValue` | 고장영향 텍스트 | `전기적 Open/Short` |
| L2-1.공정번호 | `chain.processNo` | 공정번호 | `40` |
| FM(고장형태) | `chain.fmValue` | FM 텍스트 | `UBM 두께 이상(과후/과박)` |
| 4M | `chain.m4` | IM/EN/MC/MN | `MC` |
| 작업요소(WE) | `chain.workElement` | L3 이름 | `Sputter 챔버` |
| FC(고장원인) | `chain.fcValue` | FC 텍스트 | `타겟 소모에 의한 증착률 변화` |
| B5.예방관리 | `chain.pcValue` | PC 텍스트 | `타겟 수명 관리 및 교체 주기 설정` |
| A6.검출관리 | `chain.dcValue` | DC 텍스트 | `UBM 두께 SPC 모니터링` |
| O | `chain.occurrence` | 발생도 (2~5) | `3` |
| D | `chain.detection` | 검출도 (1~8) | `4` |
| AP | 계산값 | S×O×D → H/M/L | `M` |

**데이터 규칙**:
- **111행** (FailureLink 수 = RiskAnalysis 수)
- **모든 셀 fill-down**: PC/DC NULL 0건
- S: 4~9, O: 2~5, D: 1~8
- AP 계산: S×O×D ≥ 100 → H, ≥ 40 → M, < 40 → L
- 정렬: 공정번호 오름차순
- FC 시트가 **Import의 핵심** — FL(FailureLink) FK 확정 근거

---

## 6. 시트간 데이터 관계 (FK 매핑)

```
L1 시트: C1(구분) → C2(제품기능) → C3(요구사항) → C4(고장영향)
  ↕ FK: FE.category = C1, FE.effect = C4
  ↕ FK: L1Function.category = C1, L1Function.functionName = C2, L1Function.requirement = C3

L2 시트: A1(공정번호) → A2(공정명) → A3(공정기능) → A4(제품특성) → A5(FM) → A6(DC)
  ↕ FK: L2Structure.no = A1, L2Structure.name = A2
  ↕ FK: L2Function.functionName = A3
  ↕ FK: FailureMode.mode = A5 (dedup key: A1|A5)
  ↕ FK: RiskAnalysis.detectionControl = A6

L3 시트: 공정번호 → 4M → B1(WE) → B2(기능) → B3(특성) → B4(FC) → B5(PC)
  ↕ FK: L3Structure.name = B1 (dedup key: 공정번호|4M|B1)
  ↕ FK: L3Function.functionName = B2
  ↕ FK: FailureCause.cause = B4 (dedup key: 공정번호|4M|B1|FM|B4)
  ↕ FK: RiskAnalysis.preventionControl = B5

FC 시트: FE구분 → FE → 공정번호 → FM → 4M → WE → FC → PC → DC → O → D → AP
  ↕ FK: FailureLink = FM(fmId) ↔ FC(fcId) ↔ FE(feId) 3요소 조합
  ↕ FK: RiskAnalysis = FailureLink + SOD + DC + PC
```

**교차 검증 관계**:

| L2 시트 | L3 시트 | FC 시트 | 관계 |
|---------|---------|---------|------|
| A1 공정번호 | 공정번호 | L2-1.공정번호 | 동일 값 |
| A5 FM | - | FM(고장형태) | 동일 값 |
| A6 DC | - | A6.검출관리 | 동일 값 |
| - | B4 FC | FC(고장원인) | 동일 값 |
| - | B5 PC | B5.예방관리 | 동일 값 |
| - | 4M | 4M | 동일 값 |
| - | B1 WE | 작업요소(WE) | 동일 값 |

---

## 7. 4M 코드 매핑

| 코드 | 의미 | 건수 | 비율 | 대표 WE |
|------|------|------|------|---------|
| IM | 입력자재 (Input Material) | 27 | 24% | Etchant, PR 용액, DI Water |
| EN | 환경 (Environment) | 24 | 22% | Clean Room 환경, 온습도 |
| MC | 설비 (Machine) | 38 | 34% | Sputter 챔버, Exposure 장비 |
| MN | 작업자 (Man) | 22 | 20% | 작업 절차, 레시피 설정 |

---

## 8. 특별특성 매핑

| 기호 | 의미 | 건수 | 대상 공정 |
|------|------|------|----------|
| ★ | 중요 특성 (Critical) | 12 | 40(UBM Sputter), 60(PR Coating), 70(Exposure), 100(Au Plating), 140(Anneal) |
| ◇ | 관리 특성 (Significant) | 6 | 10(IQA), 150(Final Inspection), 200(OGI/Packing) |
| (빈칸) | 일반 특성 | 93 | 나머지 |

---

## 9. 스크립트 실행 방법

```bash
# 사전 조건: m002 마스터 JSON 최신화
node -e "const d=JSON.parse(require('fs').readFileSync('data/master-fmea/pfm26-m002.json','utf8')); console.log('chains:', d.chains.length, 'FL:', d.atomicDB.failureLinks.length);"
# → chains: 111 FL: 111 확인

# 샘플 엑셀 생성
node scripts/gen-import-sample.mjs
# → data/m002_완벽_Import_Sample.xlsx 생성

# 결과 확인
# L1: 133, L2: 26, L3: 104, FC: 111
```

---

## 10. 3싸이클 검증

### Cycle 1: Import + 구조

```
1. m002_완벽_Import_Sample.xlsx → Import
2. pipeline-verify GET → allGreen 확인
3. 구조분석(1ST): L2=21, L3=91
4. 기능분석(2ST): L1F=17, L2F=26, L3F=101
5. 고장분석(3ST): FM=26, FE=20, FC=104
```

| 검증 항목 | 기대값 | PASS 기준 |
|-----------|--------|-----------|
| L2Structure | 21 | = 21 |
| L3Structure | 91 | = 91 |
| L1Function | 17 | = 17 |
| L2Function | 26 | = 26 |
| L3Function | 101 | = 101 |

### Cycle 2: 고장사슬 + 리스크

```
1. rebuild-atomic → FL=111, RA=111
2. ALL-FAILURE 화면: FM×FC×FE 연결 확인
3. ALL-RISK 화면: SOD + DC/PC NULL 0건
4. DC 111건, PC 111건 확인
```

| 검증 항목 | 기대값 | PASS 기준 |
|-----------|--------|-----------|
| FailureLink | 111 | = 111 |
| RiskAnalysis | 111 | = 111 |
| DC NULL | 0 | = 0 |
| PC NULL | 0 | = 0 |
| Broken FK | 0 | = 0 |

### Cycle 3: 최적화 + Living DB

```
1. ALL-OPT 화면 확인
2. export-master → 마스터 JSON 갱신
3. Living DB sync: MasterFmeaReference 업데이트
4. 재Import → 동일 결과 확인 (멱등성)
```

| 검증 항목 | 기대값 | PASS 기준 |
|-----------|--------|-----------|
| Master chains | 111 | = 111 |
| Master DC | 111 | = 111 |
| Master PC | 111 | = 111 |
| 재Import 멱등성 | 동일 결과 | PASS |

---

## 11. 스크립트 보완 사항

### 11.1 현재 스크립트 (`gen-import-sample.mjs`) 상태

| 시트 | 구현 | 이슈 |
|------|------|------|
| L1 통합 | ✅ | L1F×FE 조합 생성, C1 순서 정렬 |
| L2 통합 | ✅ | FM 기준 26행. productChars는 chains에서 조회 (l2Function.productChars 비어있음) |
| L3 통합 | ✅ | chains 기준 104행. 4M은 chains.m4에서 (l3Structure.m4Code/l2StructId 불완전) |
| FC 고장사슬 | ✅ | 111행 fill-down, AP 자동 계산 |
| FA 통합분석 | ❌ | 미구현 (선택) |

### 11.2 데이터 소스 우선순위

| 데이터 | 1차 소스 | 2차 소스 | 비고 |
|--------|---------|---------|------|
| L2 processNo | `l2Structure.no` | - | DB 확정 |
| L2 name | `l2Structure.name` | - | DB 확정 |
| L2Function | `l2Function.functionName` | chains.l2Function | DB 확정 |
| ProductChar (A4) | chains.productChar | l2Function.productChars | chains 우선 |
| SpecialChar | chains.specialChar | - | chains에서만 |
| FM (A5) | `failureMode.mode` | chains.fmValue | DB 확정 |
| DC (A6) | chains.dcValue | riskAnalysis.detectionControl | chains 우선 |
| 4M | chains.m4 | l3Structure.m4Code | chains 우선 |
| WE (B1) | chains.workElement | l3Structure.name | chains 우선 |
| L3Function (B2) | chains.l3Function | l3Function.functionName | chains 우선 |
| ProcessChar (B3) | chains.processChar | - | chains에서만 |
| FC (B4) | chains.fcValue | failureCause.cause | chains 우선 |
| PC (B5) | chains.pcValue | riskAnalysis.preventionControl | chains 우선 |

---

## 12. 엑셀 셀 서식 규칙

| 항목 | 규칙 | 예시 |
|------|------|------|
| 공정번호 | 숫자 서식, 좌측 0 없음 | `10`, `100`, `200` |
| 4M 코드 | 대문자 2자리 | `IM`, `EN`, `MC`, `MN` |
| 특별특성 | 기호 1자 또는 빈칸 | `★`, `◇`, `` |
| SOD 값 | 정수 (1~10) | `5`, `3`, `4` |
| AP 값 | H/M/L | `H` (≥100), `M` (≥40), `L` (<40) |
| 텍스트 | 트림, 중복 공백 제거 | 앞뒤 공백 없음 |

---

*작성일: 2026-03-21*
*마지막 갱신: 2026-03-21*
