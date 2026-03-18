# FMEA 파이프라인 완전성 검증 체크리스트 v2.0

> **작성일**: 2026-03-19 (v2.0 보강: Import 전처리 + Master 샘플 데이터 생성 섹션 추가)  
> **근거**: 2026-03-16~19 커밋 112건 전수 분석, 30건 버그 패턴, 7개 데이터 손실 경로 식별  
> **대상**: 모든 FMEA 프로젝트 (골든 베이스라인: pfm26-m066)  
> **코드프리즈 모드**: 이 체크리스트의 모든 항목이 PASS 되기 전까지 신규 기능 추가 금지

---

## 목차

1. [골든 베이스라인 정의](#1-골든-베이스라인-정의)
2. [STAGE 0: Import 전처리 + FC사슬 + Master 샘플 검증](#2-stage-0-import-전처리--fc사슬--master-샘플-검증)
3. [STAGE 1: IMPORT 검증](#3-stage-1-import-검증)
4. [STAGE 2: 파싱 검증](#4-stage-2-파싱-검증)
5. [STAGE 3: UUID 검증](#5-stage-3-uuid-검증)
6. [STAGE 4: DB 저장 검증](#6-stage-4-db-저장-검증)
7. [STAGE 5: FK 고장사슬 검증](#7-stage-5-fk-고장사슬-검증)
8. [STAGE 6: WS 워크시트 매핑 검증](#8-stage-6-ws-워크시트-매핑-검증)
9. [STAGE 7: 재Import 회귀 검증](#9-stage-7-재import-회귀-검증)
10. [교차 단계 데이터 손실 검증](#10-교차-단계-데이터-손실-검증)
11. [인프라/스키마 검증](#11-인프라스키마-검증)
12. [Import→DB 완전 매핑 전환표](#12-importdb-완전-매핑-전환표)
13. [5회 순차 회귀 검증 프로토콜](#13-5회-순차-회귀-검증-프로토콜)
14. [범용 프로젝트 적용 가이드](#14-범용-프로젝트-적용-가이드)

---

## 1. 골든 베이스라인 정의

| 항목 | 코드 | 기대값 | PASS 기준 |
|------|------|--------|-----------|
| 공정(L2) | A1 | 21 | = 21 |
| 공정명 | A2 | 21 | = 21 |
| 공정기능 | A3 | 21 | ≥ 20 |
| 제품특성 | A4 | 26 | ≥ 25 |
| 고장형태(FM) | A5 | 26 | = 26 |
| 검출관리 | A6 | 21 | ≥ 20 |
| 작업요소(L3) | B1 | 91 | = 91 |
| 요소기능 | B2 | 91 | ≥ 90 |
| 공정특성 | B3 | 103 | ≥ 100 |
| 고장원인(FC) | B4 | 104 | = 104 |
| 예방관리 | B5 | 98 | ≥ 90 |
| L1 범주 | C1 | 3 | ≥ 3 |
| L1 기능 | C2 | 7 | ≥ 7 |
| L1 요구사항 | C3 | 17 | ≥ 17 |
| 고장영향(FE) | C4 | 20 | = 20 |
| FailureLink | - | 104 | = 104 |
| RiskAnalysis | - | 104 | = 104 |
| Optimization | - | 104 | ≥ 64 (LLD) |
| DC in RA | - | 104 | = 104 (NULL 0건) |
| PC in RA | - | 104 | = 104 (NULL 0건) |

---

## 2. STAGE 0: Import 전처리 + FC사슬 + Master 샘플 검증

> **핵심**: FMEA의 핵심은 FC사슬(FE-FM-FC 고장연결)이다. Import 단계에서 FC사슬 100%를 구축하기 위한 기초정보(구조→기능→3L원인)가 완전해야 한다.

### 2.1 Import 엑셀 파일 완전성

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S0-01 | 마스터 JSON 존재 | `data/master-fmea/{fmeaId}.json` | 파일 존재 | m071: 없음 |
| S0-02 | chains[] 존재 | `raw.chains.length` | > 0 | GAP 1: 빈 chains |
| S0-03 | MasterDataset 존재 | `pfmea_master_datasets WHERE fmeaId` | 레코드 존재 | - |
| S0-04 | FlatItem 수 | `pfmea_master_flat_items COUNT` | ≥ 100건 | - |
| S0-05 | FlatItem A5(FM) | `itemCode='A5' COUNT` | > 0 | 고장형태 필수 |
| S0-06 | FlatItem B4(FC) | `itemCode='B4' COUNT` | > 0 | 고장원인 필수 |
| S0-07 | FlatItem C4(FE) | `itemCode='C4' COUNT` | > 0 | 고장영향 필수 |
| S0-08 | FlatItem A6(DC) | `itemCode='A6' COUNT` | > 0 | m071: **0건** |
| S0-09 | FlatItem B5(PC) | `itemCode='B5' COUNT` | > 0 | m071: **0건** |
| S0-10 | 빈 value 항목 | `value IS NULL OR TRIM(value)=''` | = 0 | - |
| S0-11 | FmeaProject 존재 | `fmea_projects WHERE fmeaId` | 레코드 존재 | - |

### 2.2 FC사슬 완전성 (FMEA 핵심)

> FC사슬 = FE(고장영향) → FM(고장형태) → FC(고장원인) 의 3자 연결. 이것이 Import의 최종 산출물이다.

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| FC-01 | FC 시트 존재 | Excel에 'FC 고장사슬' 시트 존재 | 시트 있음 | GAP 2 |
| FC-02 | FC 시트 행 수 | FC 시트 데이터 행 | ≥ FC 수 (m066=104) | FC 누락 |
| FC-03 | FC→FM 매핑 | 모든 FC에 FM이 매핑 | 미매핑 0건 | GAP 5 |
| FC-04 | FC→FE 매핑 | 모든 FC에 FE가 매핑 | 미매핑 0건 | GAP 5 |
| FC-05 | FC SOD 완전 | S/O/D 값 존재 | 빈값 0건 | - |
| FC-06 | FC PC(예방관리) | B5 값 존재 | 빈값 ≤ 10% | m071: 0건 |
| FC-07 | FC DC(검출관리) | A6 값 존재 | 빈값 ≤ 10% | m071: 0건 |
| FC-08 | chains→failureChains 전달 | save-from-import body에 failureChains 포함 | failureChains.length > 0 | GAP 4 |
| FC-09 | Phase 3 실행 | buildWorksheetState config.chains > 0 | Phase 3 진입 | GAP 4 |
| FC-10 | FailureLink 생성 | Phase 3 → failureLinks[] | failureLinks.length > 0 | GAP 6 |

### 2.3 Master 샘플 데이터 생성 검증

| # | 검증 항목 | 검증 방법 | PASS 기준 |
|---|----------|----------|-----------|
| MS-01 | 마스터 JSON chains | `data/master-fmea/{fmeaId}.json` chains[] | > 0건 |
| MS-02 | 샘플 생성 실행 | `node scripts/generate-master-sample.mjs {fmeaId}` | 에러 없이 완료 |
| MS-03 | L1 시트 행 수 | C1/C2/C3/C4 | ≥ 17행 |
| MS-04 | L2 시트 행 수 | A1~A6 | ≥ 21행 |
| MS-05 | L3 시트 행 수 | B1~B5 (chain-driven) | ≥ 91행 |
| MS-06 | FC 시트 행 수 | FE/FM/FC/SOD/PC/DC | = chains 수 |
| MS-07 | FC 시트 FC 빈칸 | FC열 빈값 | = 0 |
| MS-08 | FC 시트 PC 빈칸 | B5열 빈값 | = 0 |
| MS-09 | FC 시트 DC 빈칸 | A6열 빈값 | = 0 |
| MS-10 | FA 시트 행 수 | 통합분석 | = chains 수 |
| MS-11 | VERIFY 시트 ALL PASS | 내부 검증 | 모든 항목 PASS |

### 2.4 Import → DB 완전 매핑표

> **이 매핑표가 Import 파이프라인의 핵심 설계 기준이다.**

| Excel 시트 | 컬럼 | itemCode | DB 테이블 | DB 컬럼 | UUID 패턴 |
|-----------|------|----------|-----------|---------|----------|
| L1 통합 | 구분(C1) | C1 | L1Function | category | PF-L1-{seq} |
| L1 통합 | 제품기능(C2) | C2 | L1Function | functionName | PF-L1-{seq} |
| L1 통합 | 요구사항(C3) | C3 | L1Function | (요구사항) | PF-L1-{seq}-R-{seq} |
| L1 통합 | 고장영향(C4) | C4 | FailureEffect | effect | PF-FE-{seq} |
| L2 통합 | 공정번호(A1) | A1 | L2Structure | no | PF-L2-{pno} |
| L2 통합 | 공정명(A2) | A2 | L2Structure | name | PF-L2-{pno} |
| L2 통합 | 공정기능(A3) | A3 | L2Function | functionName | PF-L2-{pno}-F-{seq} |
| L2 통합 | 제품특성(A4) | A4 | ProcessProductChar / L2Function | productChar | PF-L2-{pno}-P-{seq} |
| L2 통합 | 고장형태(A5) | A5 | FailureMode | mode | PF-L2-{pno}-M-{seq} |
| L2 통합 | 검출관리(A6) | A6 | RiskAnalysis | detectionControl | (FK: RA.linkId) |
| L3 통합 | 공정번호 | - | L3Structure | (parent) | PF-L3-{pno}-{4M}-{seq} |
| L3 통합 | 4M | - | L3Structure | category | PF-L3-{pno}-{4M}-{seq} |
| L3 통합 | 작업요소(B1) | B1 | L3Structure | name | PF-L3-{pno}-{4M}-{seq} |
| L3 통합 | 요소기능(B2) | B2 | L3Function | functionName | PF-L3-{pno}-{4M}-{seq}-G-001 |
| L3 통합 | 공정특성(B3) | B3 | L3Function | processChar | PF-L3-{pno}-{4M}-{seq}-C-{seq} |
| L3 통합 | 고장원인(B4) | B4 | FailureCause | cause | PF-FC-{pno}-M{fm}-{4M}{we}-K-{seq} |
| L3 통합 | 예방관리(B5) | B5 | RiskAnalysis | preventionControl | (FK: RA.linkId) |
| **FC 시트** | FE(고장영향) | - | FailureEffect | effect | PF-FE-{seq} |
| **FC 시트** | FM(고장형태) | - | FailureMode | mode | PF-L2-{pno}-M-{seq} |
| **FC 시트** | FC(고장원인) | - | FailureCause | cause | PF-FC-{pno}-... |
| **FC 시트** | S/O/D | - | RiskAnalysis | severity/occurrence/detection | (FK: RA.linkId) |
| **FC 시트** | FE+FM+FC | - | **FailureLink** | **fmId+feId+fcId** | PF-FL-{pno}-... |

### 2.5 Import → FK 생성 흐름 (FC사슬 빌드 순서)

```
Step 1: 기초정보 빌드 (L1/L2/L3 구조)
 ├── L1 시트 → L1Function (category, functionName)
 ├── L2 시트 → L2Structure (no, name) + L2Function (A3) + ProcessProductChar (A4)
 └── L3 시트 → L3Structure (B1) + L3Function (B2, B3)

Step 2: 고장 빌드 (FM/FC/FE)
 ├── A5 → FailureMode (L2 하위)
 ├── B4 → FailureCause (L3 하위, parentItemId FK로 L3Function 연결)
 └── C4 → FailureEffect (L1 하위)

Step 3: FC사슬 빌드 (FailureLink) ← 핵심
 ├── FC 시트 파싱 → MasterFailureChain[]
 ├── assignEntityUUIDsToChains → fmId, fcId, feId UUID 할당
 ├── buildFailureLinksDBCentric → FailureLink[] 생성
 └── riskData (SOD/PC/DC) 키 생성

Step 4: 위험분석 빌드
 ├── FailureLink × 1 = RiskAnalysis × 1
 ├── SOD → severity/occurrence/detection
 └── PC/DC → preventionControl/detectionControl

Step 5: 최적화 빌드
 ├── RiskAnalysis × 1 = Optimization × 1
 └── lesson-opt/detection-opt/prevention-opt → lldOptReference/detectionAction/recommendedAction

Step 6: WS 매핑
 ├── Atomic DB → atomicToLegacyAdapter → WorksheetState
 ├── riskData 키 패턴: risk-{fmId}-{fcId}-S/O/D, prevention-{fmId}-{fcId}, detection-{fmId}-{fcId}
 └── 6ST opt 키: lesson-opt-{fmId}-{fcId}, detection-opt-{fmId}-{fcId}
```

### 2.6 FC사슬 데이터 손실 6대 GAP

| # | 위치 | 조건 | 결과 | 방지 |
|---|------|------|------|------|
| GAP 1 | generate-master-sample.mjs | `raw.chains` 빈 배열 | FC 시트 0행 | export-master 선행 필수 |
| GAP 2 | excel-parser.ts findFCSheet | 시트명 불일치 | failureChains = [] | FC_SHEET_PATTERNS 매칭 확인 |
| GAP 3 | useImportFileHandlers | result.failureChains = [] | masterChains 미설정 | failureChains 빈배열 경고 |
| GAP 4 | save-from-import | body에 failureChains 없음 | Phase 3 스킵 | failureChains 필수 전달 |
| GAP 5 | assignEntityUUIDs | 텍스트 매칭 실패 | fmId/fcId/feId 미할당 | UUID 기반 매칭 필수 |
| GAP 6 | failureChainInjector | `!fmId || !fcId || !feId` | 링크 미생성 | 3-way ID 필수 검증 |

---

## 3. STAGE 1: IMPORT 검증

### 3.1 엑셀 파싱 정합성

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S1-01 | 통합시트 우선 파싱 | `unifiedFilledCodes` 로그 확인 | A6>0, B5>0 | 2026-03-17 A6/B5 누락 |
| S1-02 | 개별시트 중복 방지 | 통합시트+개별시트 동시 존재 시 중복 없음 | `unifiedFilledCodes`에 있는 코드는 개별시트 스킵 | 2026-03-17 |
| S1-03 | processNo 정규화 | 선행 0 제거 | `010` → `10` | S1-1 |
| S1-04 | B4 FC 파싱 완전성 | B4 카운트 ≥ 100 | B4 = 104 | 2026-03-15 B4 complex |
| S1-05 | C1/C2/C3 L1 매핑 | L1 시트에서 3종 추출 | C1≥3, C2≥7, C3≥17 | 2026-03-16 itemMeta |
| S1-06 | 4M+WE B5/A6 컬럼 위치 | `b5a6ValueCol = detected4MCol + 2` | B5, A6 값 비어있지 않음 | 2026-03-16 |
| S1-07 | rowSpan 정합성 | `rowSpan ≥ 1` | 모든 flatData의 rowSpan ≥ 1 | S1-5 |
| S1-08 | 빈 value 필터 | `value.trim().length > 0` | 빈 value 항목 0건 | S1-3 |

### 2.2 Legacy 데이터 존재

| # | 검증 항목 | 검증 방법 | PASS 기준 |
|---|----------|----------|-----------|
| S1-09 | Legacy 데이터 존재 | `fmea_legacy_data WHERE fmeaId` | `data IS NOT NULL` |
| S1-10 | L2 공정 수 | `legacy.l2.length` | ≥ 20 |
| S1-11 | L1 완제품명 | `legacy.l1.name` | 비어있지 않음 |

---

## 3. STAGE 2: 파싱 검증

### 3.1 구조 빌드 정합성

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S2-01 | A4 카테시안 복제 금지 | 공정별 A4 ID 유일성 | 동일 A4 ID가 2개 이상 공정에 없음 | Rule 0.5 |
| S2-02 | A4 공유 참조 | 동일 공정 내 모든 A3가 같은 A4 ID 참조 | `pc.id` 공정 내 동일 | 2026-03-15 |
| S2-03 | FM-PC 연결 | 모든 FM에 `productCharId` 존재 | `productCharId` NULL 0건 | S2-6 |
| S2-04 | FC L2+L3 이중 저장 | FC가 `l2[].failureCauses[]`와 `l2[].l3[].failureCauses[]` 모두 존재 | 양쪽 합계 일치 | S2-7 |
| S2-05 | FE L1 전용 | FE는 `l1.failureScopes[]`에만 존재 | L2/L3에 FE 없음 | S2-8 |
| S2-06 | Placeholder WE 조건 | B1 없을 때만 placeholder WE 생성 | B1 있는 공정에 placeholder 없음 | Rule 10.5 |
| S2-07 | distribute 제거 확인 | 코드에 `distribute(` / `nameMatchDistribute(` 없음 | grep 결과 0건 | 2026-03-17 |
| S2-08 | parentItemId FK 기반 매칭 | B4→PC 매칭이 parentItemId 기반 | text 매칭 없음 | 2026-03-16 |

### 3.2 flatData 교차 검증

| # | 검증 항목 | Atomic DB 값 | Legacy 값 | PASS 기준 |
|---|----------|-------------|----------|-----------|
| S2-09 | L2Structure | DB COUNT | legacy l2.length | 일치 |
| S2-10 | L3Structure | DB COUNT | legacy Σl2[].l3.length | 일치 |
| S2-11 | L1Function | DB COUNT | legacy Σl1.types[].functions.length | 일치 |
| S2-12 | L2Function | DB COUNT | legacy Σl2[].functions.length | 일치 |
| S2-13 | L3Function (PC) | DB COUNT | legacy Σl2[].l3[].functions.length | 일치 |
| S2-14 | FailureMode | DB COUNT | legacy Σl2[].failureModes.length | 일치 |
| S2-15 | FailureCause | DB COUNT | legacy Σl2[].failureCauses.length | 일치 |
| S2-16 | FailureEffect | DB COUNT | legacy l1.failureScopes.length | 일치 |

---

## 4. STAGE 3: UUID 검증

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S3-01 | L2 UUID 결정론적 | `genA1('PF', processNo)` 패턴 | `PF-L2-XXX` 형식 | uuid-generator |
| S3-02 | L3 UUID 결정론적 | `genB1` 패턴 | `PF-L3-XXX-YY-ZZZ` 형식 | uuid-generator |
| S3-03 | FM UUID 결정론적 | `genA5` 패턴 | `PF-L2-XXX-M-ZZZ` 형식 | uuid-generator |
| S3-04 | FC UUID 결정론적 | `genFC`/`genB4` 패턴 | `PF-FC-` 형식 | uuid-generator |
| S3-05 | FE UUID 결정론적 | `genC4` 패턴 | `PF-FE-` 형식 | uuid-generator |
| S3-06 | 고아 L3Function | L3Function 없는 L3Structure | = 0 | 2026-03-18 fallback |
| S3-07 | 고아 FC (PC 없는 FC) | FC.processCharId NULL | = 0 | 2026-03-17 |
| S3-08 | processCharId 다단계 매칭 | PC 매칭 실패 시 4단계 폴백 | 미매칭 0건 | 2026-03-15 |
| S3-09 | fcIdx 이중 증가 | migration.ts fcIdx 체크 | fcIdx++ 1회만 | 2026-03-17 |
| S3-10 | func.id/fs.reqId 보존 | 기존 ID 재사용 확인 | uid() 불필요 호출 없음 | 2026-03-17 |

---

## 5. STAGE 4: DB 저장 검증

### 5.1 트랜잭션 원자성

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S4-01 | $transaction 래핑 | route.ts POST 전체 저장 | 모든 DB 쓰기가 $transaction 내부 | Rule 0.6 |
| S4-02 | search_path 설정 | TX 시작 시 SET search_path | `${schema}, public` | INF1 |
| S4-03 | 삭제 순서 (FK 역순) | Opt→RA→FL→FA→FC→FM→FE→L3F→L2F→L1F→L3S→L2S→L1S | FK 에러 0건 | S6-1 |
| S4-04 | 생성 순서 (FK 정순) | L1S→L2S→L3S→L1F→L2F→L3F→PC→FE→FM→FC→FL→FA→RA→Opt | FK 에러 0건 | S6-1 |
| S4-05 | PC deleteMany 비활성 | ProcessProductChar는 삭제하지 않음 | deleteMany 호출 없음 | 2026-03-16 |
| S4-06 | skipDuplicates | createMany에 skipDuplicates: true | 중복 에러 0건 | - |
| S4-07 | empty catch 금지 | catch(e) {} 없음 | console.error 또는 throw | Rule 1 |

### 5.2 FK 정합성

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S4-08 | FM.productCharId FK | FM의 productCharId가 실존하는 L2Function/PC ID | 고아 FM 0건 | 2026-03-16 |
| S4-09 | FL.fmId FK | FailureLink.fmId가 실존 FM | 고아 link 0건 | S6-3 |
| S4-10 | FL.feId FK | FailureLink.feId가 실존 FE | 고아 link 0건 | S6-4 |
| S4-11 | FL.fcId FK | FailureLink.fcId가 실존 FC | 고아 link 0건 | S6-5 |
| S4-12 | RA.linkId FK | RiskAnalysis.linkId가 실존 FL | 고아 RA 0건 | S6-6 |
| S4-13 | Opt.riskId FK | Optimization.riskId가 실존 RA | 고아 Opt 0건 | 2026-03-18 |
| S4-14 | (fmId,fcId) 유일성 | FailureLink 복합키 유일 | 중복 0건 | S6-7 |
| S4-15 | FL fkDropped | 저장 시 FK 드롭 건수 | = 0 | route.ts L1135 |
| S4-16 | RA riskDropped | 저장 시 linkId 미매칭 건수 | = 0 | route.ts L1286 |
| S4-17 | Opt optDropped | 저장 시 riskId 미매칭 건수 | = 0 | route.ts L1335 |

### 5.3 Legacy ↔ Atomic 동기화

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S4-18 | Legacy riskData lesson-opt-* | project schema fmea_legacy_data | ≥ 64건 | T-44 |
| S4-19 | Legacy riskData detection-opt-* | project schema fmea_legacy_data | ≥ 104건 | T-44 |
| S4-20 | Step 13.5 역매핑 | API POST 저장 후 legacy에 opt 키 존재 | lesson-opt + detection-opt ≥ 168건 | 2026-03-19 |
| S4-21 | Legacy updatedAt 갱신 | 저장 후 updatedAt 변경 | 최근 저장 시각과 일치 | T-44 |
| S4-22 | Public ↔ Project 스키마 일치 | 양쪽 riskData 키 수 비교 | 차이 ≤ 10% | INF2 |

---

## 6. STAGE 5: FK 고장사슬 검증

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S5-01 | FailureLink 수 | COUNT(failure_links) | = 104 | 베이스라인 |
| S5-02 | 끊어진 FM | FL.fmId가 존재하지 않는 FM | = 0 | S6-3 |
| S5-03 | 끊어진 FE | FL.feId가 존재하지 않는 FE | = 0 | S6-4 |
| S5-04 | 끊어진 FC | FL.fcId가 존재하지 않는 FC | = 0 | S6-5 |
| S5-05 | 미연결 FC | FC가 어떤 FL에도 없음 | = 0 | R5 |
| S5-06 | feId 빈 링크 | FL.feId = '' | = 0 | 2026-03-17 feId |
| S5-07 | RA 수 = FL 수 | RiskAnalysis COUNT = FailureLink COUNT | 일치 | R1 |
| S5-08 | DC NULL 건수 | RA.detectionControl IS NULL | = 0 | 2026-03-17 |
| S5-09 | PC NULL 건수 | RA.preventionControl IS NULL | = 0 | 2026-03-17 |
| S5-10 | FE severity 전파 | FL의 FE severity = RA.severity | 불일치 0건 | 5.3 |
| S5-11 | riskData S/O/D 키 | `risk-${fmId}-${fcId}-S/O/D` 존재 | 104세트 | S4-5 |
| S5-12 | riskData prevention 키 | `prevention-${fmId}-${fcId}` 존재 | ≥ 90건 | S4-6 |
| S5-13 | riskData detection 키 | `detection-${fmId}-${fcId}` 존재 | ≥ 90건 | S4-7 |

---

## 7. STAGE 6: WS 워크시트 매핑 검증

### 7.1 로드 경로 검증

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S6-01 | ATOMIC DIRECT 경로 진입 | loadAtomicDB 반환 ≠ null | l2Structures.length > 0 | - |
| S6-02 | atomicToLegacy 변환 완전성 | riskData 키 수 ≥ 300 | lesson-opt + detection-opt + risk 키 총합 | 6.1 |
| S6-03 | OPT_PREFIXES 병합 | lesson-opt-* legacy → state | state에 lesson-opt ≥ 64 | 6.1 |
| S6-04 | stale localStorage 클리어 | 캐시 버전 체크 | 구버전 캐시 자동 삭제 | C1 |
| S6-05 | Rule 10.5 불변 | l2: 할당 라인에 필터/변환 없음 | 빈 이름 L3 삭제 금지 | Rule 10.5 |

### 7.2 저장 경로 검증

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S6-06 | syncRiskAnalysesFromState | riskData S/O/D → atomicDB.riskAnalyses | severity > 0 비율 ≥ 50% | C3 |
| S6-07 | syncOptimizationsFromState | riskData opt 키 → atomicDB.optimizations | lldOptReference NULL < 50건 | C4 |
| S6-08 | syncFailureLinksFromState 3단계 매칭 | fmId+feId+fcId → fmId+fcId → FM+FC | 링크 손실 0건 | 4.3 |
| S6-09 | legacyState 동시 전송 | saveAtomicDBDirect에 legacyState 포함 | legacyState ≠ undefined | 2026-03-17 |
| S6-10 | forceOverwrite 전달 | force=true 시 forceOverwrite=true | 확정 저장 시 덮어쓰기 보장 | - |

---

## 8. STAGE 7: 재Import 회귀 검증

> **가장 중요**: 이미 DB에 데이터가 있는 상태에서 동일 엑셀로 재Import 시 데이터 불일치 여부

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| S7-01 | 재Import 후 L2 수 | 재Import → pipeline-verify | = 베이스라인 | - |
| S7-02 | 재Import 후 FM 수 | DB COUNT(failure_modes) | = 26 | FM inflation |
| S7-03 | 재Import 후 FC 수 | DB COUNT(failure_causes) | = 104 | FC inflation |
| S7-04 | 재Import 후 FL 수 | DB COUNT(failure_links) | = 104 | - |
| S7-05 | 재Import 후 RA 수 | DB COUNT(risk_analyses) | = 104 | RA=0 재발 |
| S7-06 | 재Import 후 DC/PC NULL | RA.detectionControl/preventionControl | NULL 0건 | R1 |
| S7-07 | 재Import 후 Opt 수 | DB COUNT(optimizations) | ≥ 64 | - |
| S7-08 | 재Import 후 LLD 보존 | lesson-opt-* 키 수 | ≥ 64 | T-44 |
| S7-09 | 재Import 후 SOD 보존 | risk-*-S/O/D 값이 0이 아닌 건수 | ≥ 80 | 6.3 |
| S7-10 | UUID 안정성 | 재Import 전/후 동일 FM의 UUID 비교 | 변경 0건 | S3-01~05 |
| S7-11 | preventedOverwrite 미발동 | 완전성 점수 비교 | incoming ≥ existing | S4-18 |

---

## 9. 교차 단계 데이터 손실 검증

### 9.1 7대 데이터 라이프사이클 추적

| # | 데이터 항목 | 생성 → 저장 → 로드 → 표시 | PASS 기준 | 위험도 |
|---|-----------|-------------------------|-----------|--------|
| D-01 | LLD추천 (lesson-opt) | UI → syncOpt → Opt.lldOptRef → atomicToLegacy → state | 저장/로드 후 값 일치 | **HIGH** |
| D-02 | 검출개선 (detection-opt) | UI → syncOpt → Opt.detAction → atomicToLegacy → state | 저장/로드 후 값 일치 | **HIGH** |
| D-03 | 예방개선 (prevention-opt) | UI → syncOpt → Opt.recAction → atomicToLegacy → state | 저장/로드 후 값 일치 | **MEDIUM** |
| D-04 | SOD 값 | UI → syncRA → RA.S/O/D → riskData → state | 저장/로드 후 값 일치 | **LOW** |
| D-05 | AP 값 | 계산 → RA.ap / Opt.newAP → state | 재계산 후 동일 | **LOW** |
| D-06 | 제품특성 (PC) | Import → PC 테이블 → L2Function → state | A4 셀 비어있지 않음 | **MEDIUM** |
| D-07 | 고장사슬 (FL) | confirmLink → FL 테이블 → state | 링크 수 불변 | **HIGH** |

### 9.2 Step 13.5 다중행 손실 검증

| # | 검증 항목 | 검증 방법 | PASS 기준 |
|---|----------|----------|-----------|
| D-08 | 다중행 Opt lesson-opt-*#N | opt-rows > 1인 uniqueKey에서 #1, #2 키 존재 | 다중행 키 보존 |
| D-09 | Step 13.5 suffix 누락 | route.ts L1443-1457 역매핑에 #N suffix 없음 | 다중행 데이터 마지막 행만 남음 여부 확인 |

### 9.3 deleteMany 연쇄 삭제 안전성

| # | 검증 항목 | 검증 방법 | PASS 기준 |
|---|----------|----------|-----------|
| D-10 | Opt → RA 연쇄 | Opt 삭제 → RA 삭제 → FL 삭제 순서 확인 | 자식 먼저 삭제 |
| D-11 | FL soft delete | FL은 deletedAt 표시, 즉시 삭제 아님 | deletedAt 설정 확인 |
| D-12 | 기능 데이터 보존 | l2Functions 빈 배열 전송 시 기존 DB 보존 | preservedCount > 0 |

---

## 11. 인프라/스키마 검증

| # | 검증 항목 | 검증 방법 | PASS 기준 | 관련 버그 |
|---|----------|----------|-----------|----------|
| I-01 | 프로젝트 스키마 컬럼 동기화 | syncMissingColumns 실행 | public ↔ project 컬럼 일치 | INF2 |
| I-02 | raw SQL snake_case | grep PascalCase 테이블명 | 0건 | Rule 16 |
| I-03 | P2021 처리 | 테이블 미존재 시 silent catch | 트랜잭션 롤백 없음 | C5 |
| I-04 | schema 검증 | `[a-z][a-z0-9_]*` 패턴 | 잘못된 스키마명 차단 | INF1 |
| I-05 | lldReference 컬럼 존재 | risk_analyses 테이블 | lldReference 컬럼 있음 | - |
| I-06 | lldOptReference 컬럼 존재 | optimizations 테이블 | lldOptReference 컬럼 있음 | - |
| I-07 | detectionAction 컬럼 존재 | optimizations 테이블 | detectionAction 컬럼 있음 | - |

---

## 12. Import→DB 완전 매핑 전환표 (WS 포함)

> STAGE 0 §2.4 매핑표 + 아래 WS(워크시트) 화면 매핑을 결합하여 Import→DB→WS 전체 파이프라인 매핑을 정의한다.

### 12.1 DB 테이블 → 워크시트 화면 매핑

| DB 테이블 | 워크시트 탭 | 화면 위치 | 렌더링 소스 |
|-----------|-----------|----------|------------|
| L1Function | 구조분석 1L | 1열 상단 | state.l1.functions[] |
| L2Structure | 구조분석 2L | 2열 공정번호/공정명 | state.l2[].no, name |
| L2Function | 기능분석 2L | 2열 공정기능 | state.l2[].functions[] |
| ProcessProductChar | 기능분석 2L | 2열 제품특성(A4) | state.l2[].functions[].productChars[] |
| L3Structure | 구조분석 3L | 3열 작업요소(B1) | state.l2[].l3[].name |
| L3Function | 기능분석 3L | 3열 요소기능/공정특성 | state.l2[].l3[].functions[] |
| FailureEffect | 고장분석 FE | 1열 고장영향 | state.l1.failureScopes[] |
| FailureMode | 고장분석 FM | 2열 고장형태 | state.l2[].failureModes[] |
| FailureCause | 고장분석 FC | 3열 고장원인 | state.l2[].l3[].failureCauses[] |
| FailureLink | ALL화면 고장사슬 | 연결선(SVG) | state.failureLinks[] |
| RiskAnalysis | ALL화면 위험분석 | SOD셀 + DC/PC | riskData[`risk-${fmId}-${fcId}-S`] |
| Optimization | ALL화면 최적화 | LLD/개선안 | riskData[`lesson-opt-${fmId}-${fcId}`] |

### 12.2 riskData 키 패턴 전수

| 키 패턴 | 소스 DB | 용도 | 화면 |
|---------|--------|------|------|
| `risk-{fmId}-{fcId}-S` | RiskAnalysis.severity | 심각도 | SOD 셀 |
| `risk-{fmId}-{fcId}-O` | RiskAnalysis.occurrence | 발생도 | SOD 셀 |
| `risk-{fmId}-{fcId}-D` | RiskAnalysis.detection | 검출도 | SOD 셀 |
| `prevention-{fmId}-{fcId}` | RiskAnalysis.preventionControl | 예방관리 | 3L PC |
| `detection-{fmId}-{fcId}` | RiskAnalysis.detectionControl | 검출관리 | 2L DC |
| `lesson-opt-{fmId}-{fcId}` | Optimization.lldOptReference | LLD추천 결과 | 최적화 LLD |
| `detection-opt-{fmId}-{fcId}` | Optimization.detectionAction | 검출개선 | 최적화 DC |
| `prevention-opt-{fmId}-{fcId}` | Optimization.recommendedAction | 예방개선 | 최적화 PC |
| `responsible-opt-{fmId}-{fcId}` | Optimization.responsible | 책임자 | 최적화 |
| `targetDate-opt-{fmId}-{fcId}` | Optimization.targetDate | 목표일 | 최적화 |
| `completedAction-opt-{fmId}-{fcId}` | Optimization.completedAction | 완료 조치 | 최적화 |

### 12.3 Import→FC사슬→DB 빌드 순서 (FMEA 핵심 흐름)

```
Import Excel → 파싱 → buildWorksheetState
                              │
                ┌─────────────┼──────────────┐
                ▼             ▼              ▼
          Phase 1         Phase 2        Phase 3
        구조 빌드       기능/고장 빌드    FC사슬 빌드
     L1/L2/L3 구조    FM/FC/FE 엔티티   FailureLink
                              │              │
                              ▼              ▼
                     migrateToAtomicDB    buildFailureLinksDBCentric
                              │              │
                              ▼              ▼
                     $transaction 내 원자 저장:
                     1. L1/L2/L3 Structure
                     2. L1/L2/L3 Function
                     3. ProcessProductChar (A4, 공유)
                     4. FailureMode (A5)
                     5. FailureCause (B4)
                     6. FailureEffect (C4)
                     7. FailureLink (FM+FE+FC FK)
                     8. RiskAnalysis (SOD+DC+PC)
                     9. Optimization (LLD+개선안)
                     10. FmeaLegacyData (riskData 캐시)
```

### 12.4 프로젝트별 검증 현황 (2026-03-19 파이프라인 재설계 후)

| 항목 | m066 | m069 | m071 |
|------|------|------|------|
| 마스터 JSON | ✅ 존재 | ✅ 존재 | ✅ 존재 |
| STEP 0~4 | ✅ ALL OK | ✅ ALL OK | ⚠️ WARN (FL Atm 115 vs Leg 118) |
| STEP 5 WS orphanPC | ✅ **0건** | ✅ **0건** | ⚠️ **8건** (기존 Legacy — 재Import 시 해결) |
| STEP 6 OPT | ⚠️ Opt DB=0 | ⚠️ Opt DB=0 | ⚠️ Opt DB=0 |
| 자동수정 비활성화 | ✅ 경고만 | ✅ 경고만 | ✅ 경고만 |
| B4→B3 매핑 | ✅ 적용 | ✅ 적용 | ✅ 적용 (재Import 필요) |
| RA.lldReference | ⚠️ 0건 | ⚠️ 0건 | ⚠️ 0건 (데이터 입력 필요) |
| Public↔Project sync | ✅ | ✅ 동기화 완료 | ✅ 동기화 완료 |

#### 파이프라인 재설계 변경사항 (2026-03-19)

| # | 변경 | 파일 | 효과 |
|---|------|------|------|
| 1 | **B4.parentItemId → B3 ID** (기존: B1 ID) | `import-builder.ts` | orphanPC 근본 해결 |
| 2 | **fixStep3Uuid placeholder FC 생성 비활성화** | `pipeline-verify/route.ts` | Atomic↔Legacy 불일치 차단 |
| 3 | **fixStep4Fk FailureLink 자동생성 비활성화** | `pipeline-verify/route.ts` | FL 카운트 불일치 차단 |
| 4 | **fixStep5Ws orphan PC→FC 자동보충 비활성화** | `pipeline-verify/route.ts` | Legacy cascade 차단 |

---

## 13. 5회 순차 회귀 검증 프로토콜

### 검증 커맨드

```powershell
# 0단계: 타입 체크
npx tsc --noEmit

# 1단계: pipeline-verify GET (읽기전용)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m066" -Method GET | ConvertTo-Json -Depth 5

# 2단계: pipeline-verify POST (자동수정)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify" -Method POST -Body '{"fmeaId":"pfm26-m066"}' -ContentType "application/json" | ConvertTo-Json -Depth 3

# 3단계: rebuild-atomic
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/rebuild-atomic?fmeaId=pfm26-m066" -Method POST | ConvertTo-Json -Depth 3

# 4단계: export-master + 검증
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/export-master" -Method POST -Body '{"fmeaId":"pfm26-m066"}' -ContentType "application/json" | ConvertTo-Json -Depth 5
```

### 5회 검증 기록 양식

```
## [회차] 파이프라인 검증 — [날짜]
- tsc: [ ] 에러 0건
- STEP1 IMPORT: [ ] L2=21
- STEP2 파싱: [ ] A5=26, B4=104, C4=20, A6≥20, B5≥90
- STEP3 UUID: [ ] FM=26, FC=104, 고아L3F=0
- STEP4 FK: [ ] FL=104, broken FM/FE/FC=0, unlinked FC=0
- STEP5 WS: [ ] emptyPC=0, orphanPC=0, legacyFL=104
- STEP6 OPT: [ ] RA=104, DC=104, PC=104, lld≥64
- 교차: [ ] Atomic↔Legacy 일치
- 재Import: [ ] FM=26(불변), FC=104(불변), FL=104(불변)
- allGreen: [ ]
```

### 회차별 목표

| 회차 | 범위 | 목표 |
|------|------|------|
| 1회 | STEP 1~6 전체 | 현재 상태 진단, FAIL 항목 식별 |
| 2회 | FAIL 항목 수정 후 재검증 | FAIL → PASS 전환 확인 |
| 3회 | 재Import 회귀 | 동일 엑셀 재Import 후 베이스라인 유지 |
| 4회 | 저장→로드 왕복 | 워크시트 저장 후 새로고침 → 데이터 보존 |
| 5회 | 코드프리즈 최종 | 모든 항목 ALL GREEN → 코드프리즈 승인 |

---

## 부록: 버그 이력 요약 (2026-03-16~19, 30건)

| # | 날짜 | 단계 | 증상 | 근본 원인 | 수정 파일 |
|---|------|------|------|----------|----------|
| B01 | 03-16 | S4 | PC 삭제 → orphan FM | PC deleteMany | route.ts |
| B02 | 03-16 | S2 | procHasChains 공정 스킵 | procHasChains 조건 | assignChainUUIDs |
| B03 | 03-17 | S1 | A6/B5 파싱 0건 | 통합시트 스킵 | excel-parser.ts |
| B04 | 03-17 | S3 | orphan L3Function | L3F fallback 누락 | migration.ts |
| B05 | 03-17 | S4 | FL INSERT-ONLY → 변경 안됨 | deleteMany 누락 | route.ts |
| B06 | 03-17 | S5 | feId 빈 링크 → FK 위반 | FE 4단계 할당 | route.ts |
| B07 | 03-17 | RA | RA 중복 208건 | deleteMany 누락 | rebuild-atomic |
| B08 | 03-17 | RA | RA upsert 누락 | upsert 로직 없음 | rebuild-atomic |
| B09 | 03-17 | RA | processCharId 88건 NULL | 복사 누락 | rebuild-atomic |
| B10 | 03-17 | S5 | FL FK 에러 | FK 검증 누락 | rebuild-atomic |
| B11 | 03-17 | S5 | 미연결 FC 50건 | 보충 링크 없음 | rebuild-atomic |
| B12 | 03-17 | S6 | riskData↔RA 비동기 | sync 누락 | useWorksheetSave |
| B13 | 03-17 | S3 | fcIdx 이중 증가 | 중복 fcIdx++ | migration.ts |
| B14 | 03-17 | S6 | stale localStorage | 캐시 클리어 없음 | useWorksheetDataLoader |
| B15 | 03-17 | S2 | distribute 라운드로빈 | parentItemId 미사용 | buildWorksheetState |
| B16 | 03-17 | S5 | processCharId NULL → UI 사라짐 | l3FuncId 폴백 누락 | route.ts |
| B17 | 03-17 | S6 | FE severity legacy 누락 | 주입 누락 | route.ts |
| B18 | 03-18 | S3 | orphan PC 1건 | placeholder FC 조건 | buildWorksheetState |
| B19 | 03-18 | S6 | LLD 저장 후 사라짐 (1차) | OPT_PREFIXES 병합 누락 | useWorksheetDataLoader |
| B20 | 03-18 | S4 | RA 없는 FL → STEP 6 고아 | RA 자동생성 누락 | pipeline-verify |
| B21 | 03-18 | S4 | Opt→RA FK 고아 | rebuild-atomic RA ID 변경 | pipeline-verify |
| B22 | 03-18 | RA | RA=0 FALLBACK | riskData 기반 RA 없음 | rebuild-atomic |
| B23 | 03-19 | S6 | LLD 재발 (2차) | legacy riskData 역매핑 누락 | route.ts |
| B24 | 03-18 | S6 | Opt↔riskData 비동기 | sync 누락 | useWorksheetSave |
| B25 | 03-16 | S2 | parentItemId UUID 매칭 | 하드코딩 매핑 | buildWorksheetState |
| B26 | 03-16 | S2 | FM 없는 PC placeholder | A5=0 조건 누락 | buildWorksheetState |
| B27 | 03-15 | S2 | A4 카테시안 복제 | 공유 참조 없음 | buildWorksheetState |
| B28 | 03-17 | S2 | C2 productFuncs 누락 | L1_UNIFIED 보충 없음 | excel-parser.ts |
| B29 | 03-15 | S3 | processCharId 단일 매칭 | 4단계 매칭 없음 | migration.ts |
| B30 | 03-18 | INF | 프로젝트 스키마 컬럼 누락 | syncMissingColumns 없음 | project-schema.ts |

---

---

## 14. 범용 프로젝트 적용 가이드

### 14.1 새 프로젝트 Import 완전 파이프라인

```
1. 엑셀 Import → excel-parser → flatData + failureChains
2. flatData → PfmeaMasterFlatItem (staging)
3. failureChains → MasterFailureChain[] (FC 시트)
4. buildWorksheetState(flatData, { chains }) → WorksheetState
   - Phase 1: L1/L2/L3 구조 빌드
   - Phase 2: FM/FC/FE + A4/B3 기능 빌드
   - Phase 3: chains → FailureLink + riskData
5. save-from-import → migrateToAtomicDB → $transaction
6. pipeline-verify → 6단계 검증
7. export-master → 마스터 JSON (chains 포함)
8. generate-master-sample → 재Import용 엑셀
```

### 14.2 프로젝트별 필수 사전 조건

| 조건 | 확인 방법 | 없으면 |
|------|----------|--------|
| 마스터 JSON | `data/master-fmea/{fmeaId}.json` | export-master 실행 |
| chains > 0 | JSON의 chains[].length | rebuild-atomic + export-master |
| A6/B5 > 0 | FlatItem 카운트 | 엑셀 원본에 A6/B5 시트 확인 |
| Opt 내용 | Optimization 비어있지 않음 | 워크시트에서 최적화 입력 후 저장 |
| Project riskData | project schema legacy | rebuild-atomic + sync 실행 |

### 14.3 m071 개선 작업 계획

| # | 작업 | 방법 | 검증 |
|---|------|------|------|
| 1 | 마스터 JSON 생성 | `export-master POST {fmeaId: "pfm26-m071"}` | JSON 파일 존재 |
| 2 | chains 확인 | JSON chains[].length > 0 | chains ≥ 100 |
| 3 | A6/B5 보강 | rebuild-atomic로 DC/PC 동기화 | FlatItem A6/B5 > 0 |
| 4 | Opt 보강 | 워크시트 최적화 입력 또는 inherit | Opt 내용 > 0 |
| 5 | Public↔Project sync | sync-opt-to-legacy 실행 | 차이 0건 |
| 6 | 마스터 샘플 생성 | generate-master-sample.mjs | FC 시트 ALL PASS |
| 7 | deep 검증 | deep-checklist-verify.mjs | PASS ≥ 80, FAIL = 0 |

---

> **최종 업데이트**: 2026-03-19 v2.3 (파이프라인 재설계: 자동수정 비활성화 + B4→B3 근본수정)  
> **작성**: AI 에이전트 총동원 (explore×2 + shell + generalPurpose)  
> **검증 결과**: m066/m069 orphanPC=0 ALL OK, m071 orphanPC=8 (기존 Legacy, 재Import 필요)  
> **승인 필요**: 코드프리즈 승인
