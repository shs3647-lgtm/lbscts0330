# PFMEA Import Sample 설계기준서

## 개요

m066 (12inch Au Bump) 완성 데이터를 기반으로 작성된 Import 샘플.
6단계(구조→기능→고장→고장연결→위험분석→최적화) 전체 DB/UUID/FK/WS 구현을 보장하는 완전한 데이터.

## 골든 베이스라인

| 항목 | 기대값 | 소스 |
|------|--------|------|
| L2 (공정) | 21 | Atomic DB L2Structure |
| L3 (작업요소) | 91 | Atomic DB L3Structure |
| L1Function | 17 | Atomic DB L1Function |
| L2Function | 26 | Atomic DB L2Function |
| L3Function | 103 | Atomic DB L3Function |
| FM (고장형태) | 26 | Atomic DB FailureMode |
| FE (고장영향) | 20 | Atomic DB FailureEffect |
| FC (고장원인) | 104 | FailureLink 기준 (Atomic FC=103 + 1 공유) |
| FailureLink | 104 | Atomic DB FailureLink |
| RiskAnalysis | 104 | Atomic DB RiskAnalysis |
| DC (검출관리) | 104 | RiskAnalysis.detectionControl NOT NULL |
| PC (예방관리) | 104 | RiskAnalysis.preventionControl NOT NULL |
| Optimization | 104 | Atomic DB Optimization |
| flatData 합계 | 669 | PfmeaMasterFlatItem |

## flatData 항목별 기대값

| 코드 | 이름 | 기대값 | 레벨 |
|------|------|--------|------|
| A1 | 공정번호 | 21 | L2 |
| A2 | 공정명 | 21 | L2 |
| A3 | 공정기능 | 21 | L2 |
| A4 | 제품특성 | 26 | L2 |
| A5 | 고장형태 | 26 | L2 |
| A6 | 검출관리 | 21 | L2 (공정별 중복제거) |
| B1 | 작업요소 | 91 | L3 |
| B2 | 요소기능 | 91 | L3 |
| B3 | 공정특성 | 103 | L3 |
| B4 | 고장원인 | 103 | L3 |
| B5 | 예방관리 | 98 | L3 (L3별 중복제거) |
| C1 | L1 범주 | 3 | L1 (YP/SP/USER) |
| C2 | L1 기능 | 7 | L1 |
| C3 | L1 요구사항 | 17 | L1 |
| C4 | 고장영향 | 20 | L1 |

## Excel 시트 구조 (7개)

### 1. L1 통합(C1-C4)
| 열 | 내용 | 필수 |
|----|------|------|
| 구분(C1) | YP / SP / USER | Y |
| 제품기능(C2) | 완제품 기능 | Y |
| 요구사항(C3) | 기능별 요구사항 | Y |
| 고장영향(C4) | 고장의 최종 영향 | Y |

### 2. L2 통합(A1-A6)
| 열 | 내용 | 필수 |
|----|------|------|
| A1.공정번호 | 10, 20, ... | Y |
| A2.공정명 | 공정 이름 | Y |
| A3.공정기능 | 공정 기능 설명 | Y |
| A4.제품특성 | 제품 특성 | Y |
| 특별특성 | SC/CC/O 등 | N |
| A5.고장형태 | 고장 모드 | Y |
| A6.검출관리 | D: 접두사 없이 | Y |

### 3. L3 통합(B1-B5) — Chain-driven
| 열 | 내용 | 필수 |
|----|------|------|
| 공정번호 | A1과 동일 | Y |
| 4M | MN/MC/IM/EN | Y |
| 작업요소(B1) | 작업 요소 | Y |
| 요소기능(B2) | 요소 기능 | Y |
| 공정특성(B3) | 공정 특성 | Y |
| 특별특성 | SC/CC/O 등 | N |
| 고장원인(B4) | 고장 원인 | Y |
| 예방관리(B5) | P: 접두사 없이 | Y |

### 4. FC 고장사슬
| 열 | 내용 | 필수 |
|----|------|------|
| FE구분 | YP/SP/USER | Y |
| FE(고장영향) | C4 값 | Y |
| L2-1.공정번호 | 공정번호 | Y |
| FM(고장형태) | A5 값 | Y |
| 4M | MN/MC/IM/EN | Y |
| 작업요소(WE) | B1 값 | Y |
| FC(고장원인) | B4 값 | Y |
| B5.예방관리 | P: 없이 | Y |
| A6.검출관리 | D: 없이 | Y |
| S | 1-10 | Y |
| O | 1-10 | Y |
| D | 1-10 | Y |
| AP | H/M/L (자동계산) | N |

### 5. P-FMEA 고장분석
FE-S-FM-FC 간결 포맷 (사용자 확인용)

### 6. FA 통합분석
C1-C4 + A1-A4 + B1-B3 + FE + FM + FC + SOD/AP + PC/DC 전체 통합

### 7. VERIFY
자동 검증 결과 테이블

## 역대 오류 패턴 및 수정 사항

| # | 오류 패턴 | 근본 원인 | 수정 |
|---|----------|----------|------|
| 1 | processNo 형식 불일치 (01 vs 1) | 텍스트 키 정규화 누락 | normalizePno() 적용 |
| 2 | A3×A4 카테시안 복제 | distribute() 없이 groupBy | 공정 단위 1회 생성 |
| 3 | A6/B5 파싱 누락 | 개별시트 있으면 통합시트 스킵 | 통합시트 우선 정책 |
| 4 | B3-B4 오연결 | carry-forward 방식 | chain-driven L3 (v4) |
| 5 | DC/PC NULL 104건 | rebuild-atomic deleteMany 누락 | 중복 삭제 후 upsert |
| 6 | C4(FE) 0건 | FE 생성이 processNo 루프 내부 | 루프 외부 이동 |
| 7 | orphan PC 1건 | FC의 l3StructId 오연결 | fix-legacy-complete.mjs |

## 파일 목록

| 파일 | 설명 |
|------|------|
| `master_import_m066_sample.xlsx` | Import용 완전한 Excel (7시트) |
| `IMPORT_SAMPLE_DESIGN.md` | 이 설계기준서 |
| `../pfm26-m066.json` | Master JSON (Atomic DB + flatData + chains) |
