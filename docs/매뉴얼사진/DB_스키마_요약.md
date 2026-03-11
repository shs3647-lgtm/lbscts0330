# DB 스키마 요약 (PostgreSQL)

> SMART FMEA 시스템의 주요 데이터베이스 테이블 구조

---

## 1. 프로젝트 관리

### apqp_projects (APQP 프로젝트)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 고유 ID |
| name | String | 프로젝트명 |
| productName | String | 제품명 |
| customerName | String | 고객명 |
| status | String | 상태 |
| startDate | String? | 시작일 |
| targetDate | String? | 목표일 |

### project_linkages (문서 연동)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 고유 ID |
| apqpNo | String? | APQP 번호 |
| pfmeaId | String? | PFMEA ID |
| dfmeaId | String? | DFMEA ID |
| pfdNo | String? | PFD 번호 |
| cpNo | String? | CP 번호 |
| companyName | String? | 회사명 |
| customerName | String? | 고객명 |
| confidentialityLevel | String? | 보안 등급 |

### fmea_projects (FMEA 프로젝트)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| fmeaId | String | FMEA ID (unique) |
| fmeaType | String | M(Master)/F(Family)/P(Part) |
| status | String | active/archived |
| step | Int | 현재 진행 단계 (1~7) |
| revisionNo | String | 개정번호 (Rev.00) |
| revMajor/revMinor | Int | 주/부 개정번호 |

### fmea_registrations (FMEA 등록 정보)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| fmeaId | String | FMEA ID |
| companyName | String? | 회사명 |
| customerName | String? | 고객명 |
| subject | String? | 주제 |
| partName/partNo | String? | 부품명/부품번호 |
| linkedCpNo | String? | 연동 CP 번호 |
| linkedPfdNo | String? | 연동 PFD 번호 |

---

## 2. 구조/기능 분석 (FMEA 7단계 중 1~2단계)

### l1_structures (L1: 완제품 공정)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| fmeaId | String | 소속 FMEA |
| name | String | 완제품 공정명 |
| confirmed | Boolean | 확정 여부 |
| rowIndex/colIndex | Int | 워크시트 위치 |

### l2_structures (L2: 공정)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| fmeaId | String | 소속 FMEA |
| l1Id | String | 상위 L1 ID |
| no | String | 공정번호 (OP10, OP20...) |
| name | String | 공정명 |

### l3_structures (L3: 작업요소)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| fmeaId | String | 소속 FMEA |
| l2Id | String | 상위 L2 ID |
| m4 | String? | 4M 분류 (MN/MC/IM/EN) |
| name | String | 작업요소명 |

### l1/l2/l3_functions (기능)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| functionName | String | 기능명 |
| productChar / processChar | String | 제품특성 / 공정특성 |
| specialChar | String? | 특별특성 기호 |

---

## 3. 고장 분석 (3~4단계)

### failure_effects (고장영향 - FE)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| l1FuncId | String | 소속 L1 기능 |
| category | String | 영향 범위 |
| effect | String | 고장 영향 설명 |
| severity | Int | 심각도 S (1~10) |

### failure_modes (고장형태 - FM)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| l2FuncId | String | 소속 L2 기능 |
| l2StructId | String | 소속 L2 구조 |
| mode | String | 고장형태 설명 |
| specialChar | Boolean | 특별특성 여부 |

### failure_causes (고장원인 - FC)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| l3FuncId | String | 소속 L3 기능 |
| l3StructId | String | 소속 L3 구조 |
| cause | String | 고장원인 설명 |
| occurrence | Int? | 발생도 O (1~10) |

### failure_links (고장연결 - FE-FM-FC 삼각관계)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| fmId | String | 고장형태 ID |
| feId | String | 고장영향 ID |
| fcId | String | 고장원인 ID |
| severity | Int? | 심각도 |
| fmText/feText/fcText | String? | 텍스트 캐시 |

---

## 4. 리스크 분석 및 최적화 (5~6단계)

### risk_analyses (리스크 분석)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| linkId | String | 고장연결 ID |
| severity | Int | 심각도 S |
| occurrence | Int | 발생도 O |
| detection | Int | 검출도 D |
| ap | String | AP (H/M/L) |
| preventionControl | String? | 예방관리 방법 |
| detectionControl | String? | 검출관리 방법 |

### optimizations (최적화/개선)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| riskId | String | 리스크 분석 ID |
| recommendedAction | String | 권장 조치 |
| responsible | String | 담당자 |
| targetDate | String | 목표일 |
| newSeverity/newOccurrence/newDetection | Int? | 개선 후 SOD |
| newAP | String? | 개선 후 AP |
| status | String | 진행 상태 |

---

## 5. 관리계획서 (Control Plan)

### control_plans (관리계획서 헤더)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| cpNo | String | CP 번호 (unique) |
| fmeaId | String | 연동 FMEA ID |
| projectName | String? | 프로젝트명 |
| partName/partNo | String? | 부품명/번호 |
| status | String | draft/active/archived |

### control_plan_items (관리계획서 항목)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| cpId | String | 소속 CP |
| processNo/processName | String | 공정번호/명 |
| productChar/processChar | String? | 제품/공정특성 |
| specialChar | String? | 특별특성 |
| specTolerance | String? | 규격/공차 |
| evalMethod | String? | 측정방법 |
| sampleSize/sampleFreq | String? | 시료크기/주기 |
| controlMethod | String? | 관리방법 |
| reactionPlan | String? | 반응계획 |

---

## 6. PFD (공정흐름도)

### pfd_registrations (PFD 등록)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| pfdNo | String | PFD 번호 (unique) |
| fmeaId | String? | 연동 FMEA ID |
| cpNo | String? | 연동 CP 번호 |

### pfd_items (PFD 항목)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| processNo/processName | String? | 공정번호/명 |
| productChar/processChar | String? | 제품/공정특성 |
| specialChar | String? | 특별특성 |
| equipment | String? | 설비/장치 |

---

## 7. LLD / 산업 공통 DB

### lessons_learned (교훈학습 - 구형)
### lld_filter_code (LLD 필터코드 - 신형)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| lldNo | String | LLD 번호 |
| classification | String | 분류 (RMA/ABN/CIP/ECN 등) |
| applyTo | String | prevention / detection |
| processNo/processName | String | 공정번호/명 |
| failureMode | String | 고장형태 |
| cause | String | 원인 |
| improvement | String | 개선대책 |
| occurrence/detection | Int? | O/D 값 |

### kr_industry_detection / kr_industry_prevention (산업 공통)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| category | String | 산업 카테고리 |
| fmKeyword / fcKeyword | String | 매칭 키워드 |
| method | String | 관리 방법 |

---

## 8. 사용자/시스템

### users (사용자)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| factory | String | 공장 |
| department | String | 부서 |
| name | String | 이름 |
| position | String | 직급 |
| role | String | 권한 (admin/editor/viewer) |
| permPfmea/permDfmea/permCp/permPfd | String | 모듈별 권한 |

### access_logs (접근 로그)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| userName | String | 사용자명 |
| module | String | 모듈명 |
| action | String | 행동 |
| loginTime | DateTime | 접근 시각 |

---

## 9. 테이블 관계도 (요약)

```
APQPProject
    └─ ProjectLinkage ──── PFMEA / DFMEA / CP / PFD 연결
         │
         ├─ FmeaProject ── FmeaRegistration
         │      └─ FmeaWorksheetData (l1Data, l2Data, riskData)
         │
         ├─ L1Structure ── L1Function ── FailureEffect (FE)
         │      └─ L2Structure ── L2Function ── FailureMode (FM)
         │             └─ L3Structure ── L3Function ── FailureCause (FC)
         │
         ├─ FailureLink (FE ↔ FM ↔ FC 삼각 연결)
         │      ├─ FailureAnalysis (고장분석 스냅샷)
         │      └─ RiskAnalysis ── Optimization (리스크 → 최적화)
         │
         ├─ ControlPlan ── ControlPlanItem
         │
         └─ PfdRegistration ── PfdItem
```
