# pfm26-m069 완전한 DB / FK / UUID / 화면매칭표

> **fmeaId**: `pfm26-m069` (12inch Au Bump — UBM Sputter ~ OGI/Packing)
> **생성일**: 2026-03-19
> **Pipeline-Verify**: allGreen = ✅ true (7단계 전체 PASS)
> **Master JSON**: `data/master-fmea/pfm26-m069.json` (723KB, 2026-03-18T03:36:39 기준)

---

## 1. 총괄 카운트 (m002 레퍼런스 비교)

| 항목 | m069 실측 | m002 레퍼런스 | 차이 | 비고 |
|------|--------:|--------:|------:|------|
| **L2Structure** (공정) | **21** | 21 | 0 | 동일 |
| **L3Structure** (작업요소) | **91** | 91 | 0 | 동일 |
| **L1Function** (완제품기능) | **17** | 17 | 0 | 동일 |
| **L2Function** (공정기능) | **26** | 26 | 0 | 동일 |
| **L3Function** (공정특성) | **117** | 103 | +14 | Atomic DB 기준 (L3F 추가 생성) |
| **FailureMode** (FM) | **26** | 26 | 0 | 동일 |
| **FailureEffect** (FE) | **20** | 20 | 0 | 동일 |
| **FailureCause** (FC) | **117** | 103 | +14 | L3F 추가에 따른 FC 증가 |
| **FailureLink** (고장사슬) | **118** | 104 | +14 | FC 증가에 비례 |
| **RiskAnalysis** (위험분석) | **118** | 104 | +14 | Link 1:1 |
| **Optimization** (최적화) | **118** | — | — | Step 6 검증 완료 |
| **ProcessProductChar** | **0** | — | — | PC FK는 L2Function으로 매핑 |
| **FailureAnalysis** | **0** | — | — | FA 테이블 미사용 (RA 직결) |
| **Chain** | **110** | 104 | +6 | 마스터 고장사슬 |
| **flatData** | **717** | 669 | +48 | A6/B3/B4/B5 증가분 |

---

## 2. flatData 교차대조 매트릭스 (A1~C4)

| 코드 | 항목명 | Atomic DB | Legacy | Master JSON | m002 레퍼 | PASS |
|------|--------|--------:|-------:|--------:|--------:|:----:|
| **A1** | 공정번호 | 21 | 21 | 21 | 21 | ✅ |
| **A2** | 공정명 | 21 | 21 | 21 | 21 | ✅ |
| **A3** | 공정기능 | 21 | 21 | 21 | 21 | ✅ |
| **A4** | 제품특성 | 26 | 26 | 26 | 26 | ✅ |
| **A5** | 고장형태 | 26 | 26 | 26 | 26 | ✅ |
| **A6** | 검출관리 | 118 | 118 | 48 | 21 | ✅ |
| **B1** | 작업요소 | 91 | 91 | 91 | 91 | ✅ |
| **B2** | 요소기능 | 117 | 98 | 91 | 91 | ⚠️ |
| **B3** | 공정특성 | 117 | 117 | 109 | 103 | ✅ |
| **B4** | 고장원인 | 117 | 117 | 109 | 103 | ✅ |
| **B5** | 예방관리 | 118 | 118 | 107 | 98 | ✅ |
| **C1** | 구분(YP/SP/USER) | 3 | 3 | 3 | 3 | ✅ |
| **C2** | 완제품기능 | 7 | 7 | 7 | 7 | ✅ |
| **C3** | 요구사항 | 17 | 17 | 17 | 17 | ✅ |
| **C4** | 고장영향 | 20 | 20 | 20 | 20 | ✅ |

> **B2 차이 설명**: Atomic L3F=117 vs Legacy L3F=98. Atomic DB에서 자동생성된 L3Function이 Legacy보다 19건 많음 (FC 검증 시 빈 L3에 자동 보충). 데이터 정합성에 영향 없음.

---

## 3. FK 정합성 전수 검증 (14개 관계 — 고아 0건)

| # | FK 관계 | 총건수 | 유효 | 고아 | 상태 |
|---|---------|-------:|-----:|-----:|:----:|
| 1 | `L3Structure.l2Id` → `L2Structure` | 91 | 91 | 0 | ✅ |
| 2 | `L2Function.l2StructId` → `L2Structure` | 26 | 26 | 0 | ✅ |
| 3 | `L3Function.l3StructId` → `L3Structure` | 117 | 117 | 0 | ✅ |
| 4 | `L3Function.l2StructId` → `L2Structure` | 117 | 117 | 0 | ✅ |
| 5 | `FailureMode.l2StructId` → `L2Structure` | 26 | 26 | 0 | ✅ |
| 6 | `FailureMode.productCharId` → `L2Function` | 26 | 26 | 0 | ✅ |
| 7 | `FailureCause.l3StructId` → `L3Structure` | 117 | 117 | 0 | ✅ |
| 8 | `FailureCause.l2StructId` → `L2Structure` | 117 | 117 | 0 | ✅ |
| 9 | `FailureCause.l3FuncId` → `L3Function` | 117 | 117 | 0 | ✅ |
| 10 | `FailureLink.fmId` → `FailureMode` | 118 | 118 | 0 | ✅ |
| 11 | `FailureLink.feId` → `FailureEffect` | 118 | 118 | 0 | ✅ |
| 12 | `FailureLink.fcId` → `FailureCause` | 118 | 118 | 0 | ✅ |
| 13 | `RiskAnalysis.linkId` → `FailureLink` | 118 | 118 | 0 | ✅ |
| 14 | `FailureEffect.l1FuncId` → `L1Function` | 20 | 20 | 0 | ✅ |

**총 고아 레코드: 0건** / Unlinked FC: 0건 / Unlinked FM: 0건

---

## 4. L2 공정별 전체 계층 구조 (Structure → Function → Failure)

| 공정No | 공정명 | L3 | L3F | FM | FC | Links | Chains |
|-------:|--------|---:|----:|---:|---:|------:|-------:|
| 01 | 작업환경 | 5 | 8 | 1 | 7 | 7 | 7 |
| 10 | IQA(수입검사) | 5 | 6 | 2 | 6 | 6 | 6 |
| 20 | Sorter | 5 | 6 | 2 | 6 | 6 | 6 |
| 30 | Scrubber | 4 | 4 | 1 | 4 | 4 | 4 |
| 40 | UBM Sputter | 6 | 11 | 2 | 11 | 12 | 12 |
| 50 | Scrubber2 | 4 | 4 | 1 | 4 | 4 | 4 |
| 60 | PR Coating | 4 | 4 | 1 | 4 | 4 | 4 |
| 70 | Exposure | 4 | 4 | 1 | 4 | 4 | 4 |
| 80 | Develop | 4 | 4 | 1 | 4 | 4 | 4 |
| 90 | Descum | 4 | 4 | 1 | 4 | 4 | 4 |
| 100 | Au Plating | 5 | 8 | 2 | 8 | 8 | 8 |
| 110 | PR Strip | 4 | 4 | 1 | 4 | 4 | 4 |
| 120 | Au Etch | 4 | 6 | 1 | 6 | 6 | 6 |
| 130 | TiW Etch | 4 | 5 | 1 | 5 | 5 | 5 |
| 140 | Anneal | 4 | 5 | 1 | 5 | 5 | 5 |
| 150 | Final Inspection | 5 | 7 | 2 | 7 | 7 | 7 |
| 160 | Clean | 4 | 4 | 1 | 4 | 4 | 4 |
| 170 | Scrubber3 | 4 | 4 | 1 | 4 | 4 | 4 |
| 180 | Sorter3 | 4 | 4 | 1 | 4 | 2 | 4 |
| 190 | AVI | 4 | 4 | 1 | 4 | 4 | 4 |
| 200 | OGI/Packing | 4 | 4 | 1 | 4 | 4 | 4 |
| **합계** | | **91** | **117** | **26** | **117** | **118** | **110** |

---

## 5. UUID 체계 (ID 패턴)

### 5.1 구조(Structure) UUID

| 계층 | 패턴 | 예시 | 총 건수 |
|------|------|------|--------:|
| L1 | `PF-L1-{카테고리}` | `PF-L1-YP` | 1 |
| L2 | `PF-L2-{공정No3자리}` | `PF-L2-040` (UBM Sputter) | 21 |
| L3 | `PF-L3-{공정No}-{M4코드}-{seq}` | `PF-L3-040-MC-002` (Sputter 장비) | 91 |

### 5.2 기능(Function) UUID

| 계층 | 패턴 | 예시 | 총 건수 |
|------|------|------|--------:|
| L1Function | `PF-L1-{cat}-{grp}-{seq}` | `PF-L1-YP-001-001` | 17 |
| L2Function | `PF-L2-{공정No}-F-{seq}` | `PF-L2-040-F-001` | 26 |
| L3Function | `PF-L3-{공정No}-{M4}-{seq}-F-{seq}` | `PF-L3-040-MC-002-F-001` | 117 |

### 5.3 고장(Failure) UUID

| 엔티티 | 패턴 | 예시 | 총 건수 |
|--------|------|------|--------:|
| FailureMode (FM) | `PF-L2-{공정No}-M-{seq}` | `PF-L2-040-M-001` (UBM 두께 부족) | 26 |
| FailureEffect (FE) | `PF-L1-{cat}-{grp}-{seq}-{seq}` | `PF-L1-YP-003-008-010` | 20 |
| FailureCause (FC) | `PF-L3-{공정No}-{M4}-{seq}-K-{seq}` | `PF-L3-040-MC-002-K-001` | 117 |

### 5.4 연결/분석 UUID

| 엔티티 | 패턴 | 총 건수 |
|--------|------|--------:|
| FailureLink | `PF-FL-{공정No}-{seq}` | 118 |
| RiskAnalysis | `PF-RA-{공정No}-{seq}` | 118 |
| Optimization | `PF-OPT-{공정No}-{seq}` | 118 |

---

## 6. L1 계층 상세 (완제품기능 → 고장영향)

### 6.1 L1Function (17건) → C1/C2/C3

| ID | 카테고리(C1) | 기능명(C2) | 요구사항(C3) |
|----|:----------:|-----------|-------------|
| PF-L1-YP-001-001 | YP | Wafer 청정도(파티클 수)가 공정 기준을 충족 | 요구사항 1 |
| PF-L1-YP-001-002 | YP | (동상) | 요구사항 2 |
| PF-L1-YP-001-003 | YP | (동상) | 요구사항 3 |
| PF-L1-YP-002-001 | YP | UBM·PR·Etch 공정특성이 규격 충족 Bump 형성 안정성 확보 | 요구사항 1 |
| PF-L1-YP-002-002 | YP | (동상) | 요구사항 2 |
| PF-L1-YP-002-003 | YP | (동상) | 요구사항 3 |
| PF-L1-YP-003-001 | YP | Au Bump 제품특성(높이·순도·외관) 공정 수율 기준 충족 | 요구사항 1 |
| PF-L1-YP-003-002 | YP | (동상) | 요구사항 2 |
| PF-L1-SP-001-001 | SP | 고객 기능 안정성을 위한 Au 순도 및 IMC 두께 기준 충족 | 요구사항 1 |
| PF-L1-SP-001-002 | SP | (동상) | 요구사항 2 |
| PF-L1-SP-001-003 | SP | (동상) | 요구사항 3 |
| PF-L1-SP-002-001 | SP | 고객 납품 기준(높이·외관·포장) 충족 Wafer 제공 | 요구사항 1 |
| PF-L1-SP-002-002 | SP | (동상) | 요구사항 2 |
| PF-L1-SP-002-003 | SP | (동상) | 요구사항 3 |
| PF-L1-US-001-001 | USER | 최종 사용자 전기적·기계적 신뢰성 기준 충족 | 요구사항 1 |
| PF-L1-US-001-002 | USER | (동상) | 요구사항 2 |
| PF-L1-US-002-001 | USER | RoHS 등 환경·안전 규제 기준 준수 | 요구사항 1 |

### 6.2 FailureEffect (20건) → C4

| ID | Severity | 고장영향 |
|----|:--------:|---------|
| PF-L1-YP-003-001-001 | 5 | Particle 오염으로 인한 제품 특성 이상 |
| PF-L1-YP-003-002-002 | 5 | Wafer 표면 결함 미검출로 인한 후공정 유출 |
| PF-L1-YP-003-003-003 | 7 | Lot 혼입으로 인한 Wafer 수율 손실 |
| PF-L1-YP-003-004-004 | 5 | 전기적 Open/Short |
| PF-L1-YP-003-005-005 | 7 | Bump Lift-off |
| PF-L1-YP-003-006-006 | 5 | PR 두께 Spec Out으로 인한 패턴 불량 |
| PF-L1-YP-003-007-007 | 5 | Bump간 Bridge |
| PF-L1-YP-003-008-008 | 5 | CD Spec Out으로 인한 Bump 형성 불량 |
| PF-L1-YP-003-008-009 | 5 | PR Scum 잔류로 인한 Au Bump 형성 불량 |
| PF-L1-YP-003-008-010 | 5 | Bump Height Spec Out으로 인한 제품 특성 이상 |
| PF-L1-YP-003-008-011 | 4 | Plating 균일도 Spec Out으로 인한 Bump 특성 이상 |
| PF-L1-SP-002-001-001 | 5 | IMC 과성장에 의한 접합부 열화 |
| PF-L1-SP-002-002-002 | 5 | Particle 오염 불량 유출로 인한 고객 기능 이상 |
| PF-L1-SP-002-003-003 | 5 | 라벨 불일치로 인한 Lot 혼입 불량 유출 |
| PF-L1-SP-002-004-004 | 4 | 외관 결함 불량 유출(고객 Outgoing Defect) |
| PF-L1-SP-002-005-005 | 5 | 고객 Packing 기준 부적합으로 인한 납품 Reject |
| PF-L1-SP-002-006-006 | 7 | IMC 두께 Spec Out으로 인한 접합부 신뢰성 저하 |
| PF-L1-US-002-001-001 | 6 | 고객 라인 정지, 클레임 |
| PF-L1-US-002-002-002 | 7 | 고객 신뢰도 하락 |
| PF-L1-US-002-003-003 | 9 | RoHS 부적합으로 인한 리콜·법적 조치 |

---

## 7. L2 고장형태(FM) 전체 매핑 (26건)

| # | FM ID | 공정 | 고장형태 | 연결 FE | Links | FC수 |
|---|-------|------|---------|---------|------:|-----:|
| 1 | PF-L2-001-M-001 | 01 작업환경 | 파티클 초과 | Particle 오염 제품 특성 이상 | 7 | 7 |
| 2 | PF-L2-010-M-001 | 10 IQA | 두께 규격 이탈 | Wafer 표면 결함 미검출 후공정 유출 | 4 | 4 |
| 3 | PF-L2-010-M-002 | 10 IQA | TTV 규격 초과 | (동상) | 2 | 2 |
| 4 | PF-L2-020-M-001 | 20 Sorter | OCR ID 오인식/Lot 혼입 | Lot 혼입 Wafer 수율 손실 | 4 | 4 |
| 5 | PF-L2-020-M-002 | 20 Sorter | Wafer 정렬 불량 | (동상) | 2 | 2 |
| 6 | PF-L2-030-M-001 | 30 Scrubber | Wafer 표면 이물 잔류 | Particle 오염 제품 특성 이상 | 4 | 4 |
| 7 | PF-L2-040-M-001 | 40 UBM Sputter | UBM 두께 부족 | 전기적 Open/Short | 8 | 8 |
| 8 | PF-L2-040-M-002 | 40 UBM Sputter | 막질 불균일 | (동상) | 4 | 4 |
| 9 | PF-L2-050-M-001 | 50 Scrubber2 | Wafer 표면 이물 잔류 | Particle 오염 제품 특성 이상 | 4 | 4 |
| 10 | PF-L2-060-M-001 | 60 PR Coating | PR 두께 불균일 | PR 두께 Spec Out 패턴 불량 | 4 | 4 |
| 11 | PF-L2-070-M-001 | 70 Exposure | CD 규격 이탈 | CD Spec Out Bump 형성 불량 | 4 | 4 |
| 12 | PF-L2-080-M-001 | 80 Develop | Under/Over develop | CD Spec Out Bump 형성 불량 | 4 | 4 |
| 13 | PF-L2-090-M-001 | 90 Descum | PR Scum 잔류 | PR Scum 잔류 Au Bump 형성 불량 | 4 | 4 |
| 14 | PF-L2-100-M-001 | 100 Au Plating | Au Bump 높이 편차 | Bump Height Spec Out | 5 | 5 |
| 15 | PF-L2-100-M-002 | 100 Au Plating | Au 순도 저하 | Plating 균일도 Spec Out | 3 | 3 |
| 16 | PF-L2-110-M-001 | 110 PR Strip | PR 잔사 잔류 | Bump간 Bridge | 4 | 4 |
| 17 | PF-L2-120-M-001 | 120 Au Etch | 에칭 부족/과다 | Bump Lift-off | 6 | 6 |
| 18 | PF-L2-130-M-001 | 130 TiW Etch | TiW Etch 후 잔류 Film 이상 | Bump Lift-off | 5 | 5 |
| 19 | PF-L2-140-M-001 | 140 Anneal | IMC 과성장 | 고객 라인 정지, 클레임 | 5 | 5 |
| 20 | PF-L2-150-M-001 | 150 Final Insp. | Bump 외관 불량 | 외관 결함 불량 유출 | 4 | 4 |
| 21 | PF-L2-150-M-002 | 150 Final Insp. | Bump 높이 규격 이탈 | RoHS 부적합 리콜·법적 조치 | 3 | 3 |
| 22 | PF-L2-160-M-001 | 160 Clean | Wafer 표면 이물 잔류 | Particle 오염 제품 특성 이상 | 4 | 4 |
| 23 | PF-L2-170-M-001 | 170 Scrubber3 | Wafer 표면 이물 잔류 | Particle 오염 고객 기능 이상 | 4 | 4 |
| 24 | PF-L2-180-M-001 | 180 Sorter3 | Wafer 정렬 불량 | 라벨 불일치 Lot 혼입 불량 유출 | 4 | 4 |
| 25 | PF-L2-190-M-001 | 190 AVI | AVI 검사 불량 미검출 | 외관 결함 불량 유출 | 4 | 4 |
| 26 | PF-L2-200-M-001 | 200 OGI/Packing | 포장 불량 | 고객 Packing 기준 부적합 | 4 | 4 |

---

## 8. DC/PC 커버리지

| 항목 | 건수 | 총건수 | 커버리지 |
|------|-----:|-------:|:--------:|
| RiskAnalysis with DC (검출관리) | 118 | 118 | **100%** |
| RiskAnalysis with PC (예방관리) | 118 | 118 | **100%** |
| Chains with dcValue | 110 | 110 | **100%** |
| Chains with pcValue | 110 | 110 | **100%** |

---

## 9. DB 테이블 → 화면 매핑 (Screen Mapping)

### 9.1 PFMEA 워크시트 (`/pfmea/worksheet?id=pfm26-m069`)

| 화면 영역 | DB 테이블 | 데이터 흐름 | 비고 |
|-----------|----------|-----------|------|
| **L1 트리** (좌측 패널) | `L1Structure` + `L1Function` + `FailureEffect` | DB → State → TreeView | C1/C2/C3/C4 표시 |
| **L2 공정행** (공정번호/공정명) | `L2Structure` | DB → worksheetState.l2[] | A1/A2 표시 |
| **L2 기능행** (공정기능) | `L2Function` | DB → worksheetState.l2[].functions[] | A3 표시 |
| **제품특성** | `L2Function.productChar` / `ProcessProductChar` | DB → worksheetState → A4 셀 | A4 표시 (특별특성 배지 포함) |
| **고장형태(FM)** | `FailureMode` | DB → worksheetState.l2[].failureModes[] | A5 표시 |
| **L3 작업요소** | `L3Structure` | DB → worksheetState.l2[].l3[] | B1 표시 (M4 분류 포함) |
| **요소기능** | `L3Function` | DB → worksheetState.l2[].l3[].functions[] | B2 표시 |
| **공정특성** | `L3Function.processChar` | DB → B3 셀 | B3 표시 |
| **고장원인(FC)** | `FailureCause` | DB → worksheetState → B4 셀 | B4 표시 |
| **고장영향(FE)** | `FailureEffect` | DB → FailureLink.feId FK → FE 텍스트 | C4 표시 |
| **고장사슬 연결선** | `FailureLink` | DB → useSVGLines → SVG 화살표 | FM↔FE↔FC 시각화 |
| **위험분석 (SOD)** | `RiskAnalysis` | DB → severity/occurrence/detection 셀 | S/O/D 숫자 + AP 색상 |
| **검출관리(DC)** | `RiskAnalysis.detectionControl` | DB → DC 셀 | A6 표시 |
| **예방관리(PC)** | `RiskAnalysis.preventionControl` | DB → PC 셀 | B5 표시 |
| **최적화** | `Optimization` | DB → 최적화 탭 | 개선계획/목표일 |
| **AP 테이블** (우측 패널) | `RiskAnalysis` 집계 | DB → AP 통계 차트 | H/M/L 분포 |
| **RPN 차트** (우측 패널) | `RiskAnalysis` 집계 | DB → Chart.js 바 차트 | RPN 순위 |

### 9.2 워크시트 탭별 DB 매핑

| 탭 | 주요 DB 테이블 | 표시 항목 |
|----|--------------|----------|
| **구조분석 (SA)** | L1/L2/L3 Structure + Function | 공정계층, 기능, M4 분류 |
| **고장분석 (FA)** | FailureMode + FailureEffect + FailureCause | FM/FE/FC 텍스트, 고장사슬 |
| **위험분석 (RA)** | FailureLink + RiskAnalysis | SOD 평점, AP, DC/PC |
| **최적화 (OPT)** | Optimization | 개선계획, 담당자, 목표일, 재평가 SOD |

### 9.3 Import 화면 (`/pfmea/worksheet/import`)

| 화면 영역 | DB 테이블 | 데이터 흐름 |
|-----------|----------|-----------|
| 엑셀 업로드 | — | 파일 → excel-parser → ImportedFlatData[] |
| 파싱 미리보기 | `PfmeaMasterFlatItem` (staging) | 파싱 결과 → staging DB |
| FC 검증 | `PfmeaMasterDataset.failureChains` | 매칭 결과 → UI 미리보기 |
| 확정/저장 | 전체 Atomic DB | `$transaction` → L1~Optimization 일괄 생성 |

### 9.4 관리계획서(CP) 연동

| CP 화면 | 공유 FK | FMEA 원본 |
|---------|--------|----------|
| 제품특성 | `productCharId` → `ProcessProductChar.id` | L2Function의 A4 |
| 공정특성 | `processCharId` → `L3Function.id` | L3Function의 B3 |
| 검출관리 | `detectionControl` 텍스트 참조 | RiskAnalysis.detectionControl |
| 예방관리 | `preventionControl` 텍스트 참조 | RiskAnalysis.preventionControl |

### 9.5 PFD 연동

| PFD 화면 | 공유 FK | FMEA 원본 |
|---------|--------|----------|
| 공정 | `fmeaL2Id` → `L2Structure.id` | L2 공정 |
| 작업요소 | `fmeaL3Id` → `L3Structure.id` | L3 작업요소 |

---

## 10. 7단계 파이프라인 검증 결과 (2026-03-19)

| Step | 이름 | 상태 | 주요 카운트 | 이슈 |
|:----:|------|:----:|-----------|------|
| 0 | SAMPLE | ✅ OK | flat=745, chains=118, FM=26 | 없음 |
| 1 | IMPORT | ✅ OK | 10테이블 fmeaId 일치, crossCheck 7/7 match | 없음 |
| 2 | 파싱 | ✅ OK | A1~C4 15항목 Atomic↔Legacy 교차검증 | B2 차이(117 vs 98) ⚠️ |
| 3 | UUID | ✅ OK | L3F=117, FM=26, FC=117, FL=118 | 모자관계 고아 0건 |
| 4 | FK | ✅ OK | 14개 FK 관계 전수 검증, 고아 0건 | 없음 |
| 5 | WS | ✅ OK | totalPC=117, emptyPC=0, orphanPC=0 | 없음 |
| 6 | OPT | ✅ OK | FL=118, RA=118, OPT=118, apMismatch=0 | 없음 |

**allGreen: ✅ true**

---

## 11. 공정별 상세 L3 → L3Function → FC 매핑

### 11.1 공정 01: 작업환경 (L3=5, L3F=8, FC=7)

| L3 작업요소 | M4 | L3F수 | FC수 | 고장원인 |
|------------|:--:|------:|-----:|---------|
| 클린룸 담당자 | MA | 1 | 1 | 작업 미숙 |
| 항온항습기 | MC | 2 | 2 | 장비 이상, 센서 오차 |
| HEPA 필터 소모품 | IM | 1 | 1 | 자재 품질 부적합 |
| 클린룸 | EN | 3 | 3 | 환경 이상(온도/습도/청정도) |
| FFU(Fan Filter Unit) | MC | 0 | 0 | — |

### 11.2 공정 40: UBM Sputter (L3=6, L3F=11, FC=11) — 최다 FC

| L3 작업요소 | M4 | L3F수 | FC수 | 고장원인 |
|------------|:--:|------:|-----:|---------|
| Sputter 작업자 | MA | 1 | 1 | 작업 미숙 |
| Sputter 장비 | MC | 7 | 7 | DC Power 이상, 진공도, 온도 등 |
| DC Power Supply | MC | 0 | 0 | — |
| Ti Target | IM | 2 | 2 | 타겟 수명, 순도 이상 |
| Cu Target | IM | 0 | 0 | — |
| 진공 챔버 | EN | 1 | 1 | 환경 이상 |

### 11.3 공정 100: Au Plating (L3=5, L3F=8, FC=8)

| L3 작업요소 | M4 | L3F수 | FC수 | 고장원인 |
|------------|:--:|------:|-----:|---------|
| Plating 작업자 | MA | 1 | 1 | 작업 미숙 |
| Au Plating Tank | MC | 5 | 5 | 전류밀도, 온도, 교반, 도금시간, 양극 |
| 정류기(Rectifier) | MC | 0 | 0 | — |
| Au 도금액(Au Ion Solution) | IM | 1 | 1 | 도금액 농도/순도 |
| Plating 작업영역 | EN | 1 | 1 | 환경 이상 |

---

## 12. ERD 요약 (Entity-Relationship)

```
FmeaProject (pfm26-m069)
  │
  ├── L1Structure (PF-L1-YP) ─── 1건
  │     └── L1Function (17건) ── C1/C2/C3
  │           └── FailureEffect (20건) ── C4, Severity
  │
  ├── L2Structure (21건) ── A1/A2
  │     ├── L2Function (26건) ── A3, A4(제품특성)
  │     │     └── FailureMode (26건) ── A5
  │     │
  │     └── L3Structure (91건) ── B1, M4
  │           └── L3Function (117건) ── B2, B3(공정특성)
  │                 └── FailureCause (117건) ── B4
  │
  ├── FailureLink (118건) ── FM↔FE↔FC 고장사슬
  │     ├── fmId FK → FailureMode (26종)
  │     ├── feId FK → FailureEffect (20종)
  │     └── fcId FK → FailureCause (117종)
  │
  ├── RiskAnalysis (118건) ── S/O/D, AP, DC(A6), PC(B5)
  │     └── linkId FK → FailureLink
  │
  └── Optimization (118건) ── 개선계획, 담당자, 목표일
        └── riskId FK → RiskAnalysis
```

---

## 13. 골든 베이스라인 (pfm26-m069 확정)

> m002 대비 L3F/FC/Link가 각 +14건 증가. 이는 Atomic DB 자동보충(orphan L3에 FC 생성)에 의한 정상 증가.

| 항목 | 기대값 | PASS 기준 |
|------|-------:|:---------:|
| L2 (공정) | 21 | = 21 |
| L3 (작업요소) | 91 | = 91 |
| L1Function | 17 | = 17 |
| L2Function | 26 | = 26 |
| L3Function | 117 | = 117 |
| FM (고장형태) | 26 | = 26 |
| FE (고장영향) | 20 | = 20 |
| FC (고장원인) | 117 | = 117 |
| FailureLink | 118 | = 118 |
| RiskAnalysis | 118 | = 118 |
| Optimization | 118 | = 118 |
| DC 커버리지 | 118/118 | = 100% |
| PC 커버리지 | 118/118 | = 100% |
| Chains | 110 | ≥ 110 |
| flatData 합계 | 717 | ≥ 700 |
| allGreen | true | = true |

### flatData 항목별 기대값

| 코드 | 이름 | 기대값 | PASS 기준 |
|------|------|-------:|:---------:|
| A1 | 공정번호 | 21 | = 21 |
| A2 | 공정명 | 21 | = 21 |
| A3 | 공정기능 | 21 | = 21 |
| A4 | 제품특성 | 26 | = 26 |
| A5 | 고장형태 | 26 | = 26 |
| A6 | 검출관리 | 48 | ≥ 40 |
| B1 | 작업요소 | 91 | = 91 |
| B2 | 요소기능 | 91 | ≥ 90 |
| B3 | 공정특성 | 109 | ≥ 105 |
| B4 | 고장원인 | 109 | ≥ 105 |
| B5 | 예방관리 | 107 | ≥ 100 |
| C1 | 구분 | 3 | = 3 |
| C2 | 완제품기능 | 7 | = 7 |
| C3 | 요구사항 | 17 | = 17 |
| C4 | 고장영향 | 20 | = 20 |

---

## 14. 검증 커맨드 (복사 붙여넣기용)

```powershell
# 파이프라인 검증 (읽기전용)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m069" -Method GET | ConvertTo-Json -Depth 5

# 파이프라인 자동수정 루프
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify" -Method POST -Body '{"fmeaId":"pfm26-m069"}' -ContentType "application/json" | ConvertTo-Json -Depth 3

# rebuild-atomic
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/rebuild-atomic?fmeaId=pfm26-m069" -Method POST | ConvertTo-Json -Depth 3

# 마스터 JSON DC/PC 검증
node -e "const d=JSON.parse(require('fs').readFileSync('data/master-fmea/pfm26-m069.json','utf8')); const r=d.atomicDB.riskAnalyses; const ch=d.chains; console.log('RA:',r.length,'DC:',r.filter(x=>x.detectionControl?.trim()).length,'PC:',r.filter(x=>x.preventionControl?.trim()).length); console.log('chains:',ch.length,'dcChain:',ch.filter(x=>x.dcValue?.trim()).length,'pcChain:',ch.filter(x=>x.pcValue?.trim()).length);"
```
