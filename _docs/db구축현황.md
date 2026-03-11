# 📊 FMEA On-Premise DB 구축 현황

> 작성일: 2026-01-26
> 버전: 1.0
> 작성자: AI Assistant

---

## 📋 목차
1. [현황 요약](#현황-요약)
2. [공통 DB (기초정보)](#공통-db-기초정보)
3. [PFMEA DB](#pfmea-db)
4. [DFMEA DB](#dfmea-db)
5. [Control Plan DB](#control-plan-db)
6. [PFD DB](#pfd-db)
7. [APQP DB](#apqp-db)
8. [공유 데이터 동기화 DB](#공유-데이터-동기화-db)
9. [라이브러리 vs DB 관리 구분](#라이브러리-vs-db-관리-구분)
10. [TODO 리스트](#todo-리스트)

---

## 현황 요약

### 📈 전체 테이블 통계
| 분류 | 테이블 수 | 현황 |
|------|-----------|------|
| 공통 DB (기초정보) | 15 | ✅ 구축 완료 |
| PFMEA | 22 | ✅ 구축 완료 |
| DFMEA | 3 | ⚠️ PFMEA 재사용 |
| Control Plan | 25 | ✅ 구축 완료 |
| PFD | 3 | ✅ 구축 완료 |
| APQP | 7 | ✅ 구축 완료 |
| 공유/동기화 | 10 | ✅ 구축 완료 |
| **총계** | **85+** | ✅ |

---

## 공통 DB (기초정보)

### 1. 사용자 관리
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `users` | 사용자 정보 | ✅ 완료 | 인증, 권한 포함 |
| `access_logs` | 접속 로그 | ✅ 완료 | 로그인/로그아웃 추적 |

**users 주요 필드:**
- 기본정보: factory, department, name, position, phone, email
- 인증: password (해시), isActive, lastLoginAt
- 권한: role (admin/editor/viewer)
- 모듈별 권한: permPfmea, permDfmea, permCp, permPfd (none/read/write)

### 2. 고객사 관리
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `customers` | 고객사 정보 | ✅ 완료 | 현대, 기아, GM 등 |

### 3. 프로젝트 기초정보
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `bizinfo_projects` | 프로젝트 기초정보 | ✅ 완료 | 고객/모델/제품 정보 |

### 4. SOD 기준 (심각도/발생도/검출도)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `pfmea_severity_criteria` | PFMEA 심각도 기준 (1-10) | ✅ 완료 | DB 관리 |
| `pfmea_occurrence_criteria` | PFMEA 발생도 기준 (1-10) | ✅ 완료 | DB 관리 |
| `pfmea_detection_criteria` | PFMEA 검출도 기준 (1-10) | ✅ 완료 | DB 관리 |
| `dfmea_severity_criteria` | DFMEA 심각도 기준 (1-10) | ✅ 완료 | DB 관리 |
| `dfmea_occurrence_criteria` | DFMEA 발생도 기준 (1-10) | ✅ 완료 | DB 관리 |
| `dfmea_detection_criteria` | DFMEA 검출도 기준 (1-10) | ✅ 완료 | DB 관리 |

### 5. 공정/부품 마스터
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `parts` | 부품 마스터 | ✅ 완료 | 품번/품명 |
| `master_processes` | 공통 공정 마스터 | ✅ 완료 | PFMEA/CP 공유 |

### 6. EP 검사장치
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `ep_devices` | EP검사장치 마스터 | ✅ 완료 | Error Proofing / 자동검사 |

---

## PFMEA DB

### 1. 프로젝트 관리
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `fmea_projects` | FMEA 프로젝트 기본정보 | ✅ 완료 | M/F/P 유형 지원 |
| `fmea_registrations` | 등록정보 (1단계) | ✅ 완료 | 기획 및 준비 |
| `fmea_cft_members` | CFT 멤버 | ✅ 완료 | 팀 구성원 |
| `fmea_worksheet_data` | 워크시트 JSON 데이터 | ✅ 완료 | 레거시 호환 |
| `fmea_legacy_data` | 레거시 데이터 백업 | ✅ 완료 | 하위호환 |
| `fmea_confirmed_states` | 단계별 확정 상태 | ✅ 완료 | 잠금 관리 |

### 2. 구조분석 (2단계)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `l1_structures` | L1 구조 (완제품) | ✅ 완료 | 하이브리드 ID |
| `l2_structures` | L2 구조 (공정) | ✅ 완료 | 하이브리드 ID |
| `l3_structures` | L3 구조 (작업요소) | ✅ 완료 | 4M 분류 포함 |

### 3. 기능분석 (3단계)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `l1_functions` | L1 기능 (완제품) | ✅ 완료 | 요구사항 포함 |
| `l2_functions` | L2 기능 (공정) | ✅ 완료 | 제품특성/특별특성 |
| `l3_functions` | L3 기능 (작업요소) | ✅ 완료 | 공정특성/특별특성 |

### 4. 고장분석 (4단계)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `failure_effects` | 고장영향 (FE) | ✅ 완료 | L1 레벨 |
| `failure_modes` | 고장형태 (FM) | ✅ 완료 | L2 레벨 |
| `failure_causes` | 고장원인 (FC) | ✅ 완료 | L3 레벨 |
| `failure_links` | 고장연결 (FE-FM-FC) | ✅ 완료 | 연결 관계 |
| `failure_analyses` | 고장분석 통합 | ✅ 완료 | All 화면용 |

### 5. 리스크/최적화 (5-6단계)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `risk_analyses` | 리스크분석 | ✅ 완료 | S/O/D/AP |
| `optimizations` | 최적화 | ✅ 완료 | 개선 조치 |

### 6. 개정관리
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `fmea_revision_history` | 개정 이력 | ✅ 완료 | 작성/검토/승인 |
| `fmea_meeting_minutes` | 회의록 | ✅ 완료 | 개정관리 화면 |
| `fmea_sod_history` | SOD 변경 히스토리 | ✅ 완료 | 자동 기록 |
| `fmea_official_revisions` | 정식 개정 이력 | ✅ 완료 | 책임자 전용 |
| `fmea_version_backups` | 버전 백업 | ✅ 완료 | 복구용 |
| `fmea_approvals` | 결재 | ✅ 완료 | 이메일 승인 |

### 7. 마스터 데이터
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `pfmea_master_datasets` | 마스터 데이터셋 | ✅ 완료 | Import 용 |
| `pfmea_master_flat_items` | 마스터 플랫 항목 | ✅ 완료 | Import 용 |
| `lessons_learned` | 습득교훈 | ✅ 완료 | LLD 관리 |

---

## DFMEA DB

DFMEA는 PFMEA와 동일한 테이블 구조를 재사용합니다.

| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `dfmea_master_datasets` | DFMEA 마스터 데이터셋 | ✅ 완료 | Import 용 |
| `dfmea_master_flat_items` | DFMEA 마스터 플랫 항목 | ✅ 완료 | Import 용 |

> **참고**: DFMEA는 `fmea_projects.fmeaId`가 'DFM'으로 시작하는 프로젝트로 구분하며, L1-L3 구조/기능/고장 테이블을 공유합니다.

---

## Control Plan DB

### 1. 레거시 (하위호환)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `control_plans` | CP 헤더 | ✅ 완료 | 레거시 |
| `control_plan_items` | CP 항목 (24컬럼) | ✅ 완료 | 레거시 |

### 2. 프로젝트별 데이터
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `cp_registrations` | CP 등록정보 | ✅ 완료 | 기본정보 + 메타 |
| `cp_cft_members` | CP CFT 멤버 | ✅ 완료 | 팀 구성원 |
| `cp_revisions` | CP 개정 이력 | ✅ 완료 | Rev 관리 |
| `cp_confirmed_states` | CP 확정 상태 | ✅ 완료 | 단계별 잠금 |

### 3. 단계별 데이터
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `cp_processes` | 공정현황 | ✅ 완료 | 단계 1 |
| `cp_detectors` | 검출장치 | ✅ 완료 | 단계 2 |
| `cp_control_items` | 관리항목 | ✅ 완료 | 단계 3 |
| `cp_control_methods` | 관리방법 | ✅ 완료 | 단계 4 |
| `cp_reaction_plans` | 대응계획 | ✅ 완료 | 단계 5 |

### 4. 원자성 워크시트 (병합 지원)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `cp_atomic_processes` | 공정 원자성 | ✅ 완료 | 하이브리드 ID |
| `cp_atomic_detectors` | 검출장치 원자성 | ✅ 완료 | 하이브리드 ID |
| `cp_atomic_control_items` | 관리항목 원자성 | ✅ 완료 | 하이브리드 ID |
| `cp_atomic_control_methods` | 관리방법 원자성 | ✅ 완료 | 하이브리드 ID |
| `cp_atomic_reaction_plans` | 대응계획 원자성 | ✅ 완료 | 하이브리드 ID |

### 5. CP 마스터 데이터
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `cp_master_processes` | 공정현황 마스터 | ✅ 완료 | 기초정보 Import |
| `cp_master_detectors` | 검출장치 마스터 | ✅ 완료 | EP/자동검사 |
| `cp_master_control_items` | 관리항목 마스터 | ✅ 완료 | 특성/스펙 |
| `cp_master_control_methods` | 관리방법 마스터 | ✅ 완료 | 평가/책임 |
| `cp_master_reaction_plans` | 대응계획 마스터 | ✅ 완료 | 부적합 대응 |
| `cp_master_datasets` | CP 마스터 데이터셋 | ✅ 완료 | Import 용 |
| `cp_master_flat_items` | CP 마스터 플랫 항목 | ✅ 완료 | Import 용 |

---

## PFD DB

| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `pfd_registrations` | PFD 등록 헤더 | ✅ 완료 | FMEA/CP 연결 |
| `pfd_items` | PFD 항목 (행) | ✅ 완료 | 공정/특성 정보 |
| `document_links` | 문서 연결 | ✅ 완료 | 3앱 연결 관계 |

---

## APQP DB

| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `apqp_projects` | APQP 프로젝트 (레거시) | ✅ 완료 | 하위호환 |
| `apqp_registrations` | APQP 등록정보 | ✅ 완료 | 기본정보 |
| `apqp_cft_members` | APQP CFT 멤버 | ✅ 완료 | 팀 구성원 |
| `apqp_revisions` | APQP 개정 이력 | ✅ 완료 | Rev 관리 |
| `apqp_phases` | APQP 단계 (Phase 1~5) | ✅ 완료 | 5단계 |
| `apqp_activities` | APQP 활동 항목 | ✅ 완료 | 단계별 활동 |
| `apqp_deliverables` | APQP 산출물 | ✅ 완료 | 첨부파일 |
| `apqp_schedules` | APQP 일정/마일스톤 | ✅ 완료 | Gantt용 |

---

## 공유 데이터 동기화 DB

### PFMEA-CP-PFD 실시간 동기화 (Polling 기반)
| 테이블명 | 설명 | 상태 | 비고 |
|---------|------|------|------|
| `shared_process_master` | 공유 공정 마스터 (SSOT) | ✅ 완료 | PFMEA가 원본 |
| `shared_characteristics_master` | 공유 특성 마스터 | ✅ 완료 | 제품/공정특성 |
| `shared_risk_references` | 공유 리스크 참조 | ✅ 완료 | SOD 참조용 |
| `pfmea_cp_mappings` | PFMEA-CP 매핑 | ✅ 완료 | 행 단위 추적 |
| `pfmea_pfd_mappings` | PFMEA-PFD 매핑 | ✅ 완료 | 행 단위 추적 |
| `sync_tracker` | 동기화 추적 | ✅ 완료 | 변경 감지 |
| `polling_sync_states` | 폴링 상태 관리 | ✅ 완료 | 클라이언트별 |
| `pfmea_state_history` | PFMEA 상태 머신 | ✅ 완료 | CP 잠금 제어 |
| `sync_logs` | 동기화 로그 | ✅ 완료 | 히스토리 |

---

## 📊 통계분석 DB (현황 및 필요사항)

### 현재 상태
> ⚠️ **통계분석 전용 DB 테이블이 없음** - 현재 대시보드는 기존 테이블에서 실시간 집계

### 1. 현재 통계 데이터 소스 (기존 테이블 활용)
| 통계 항목 | 데이터 소스 | 상태 |
|----------|------------|------|
| 총 FMEA 건수 | `fmea_projects` COUNT | ✅ 가능 |
| AP 분포 (H/M/L) | `risk_analyses` GROUP BY ap | ✅ 가능 |
| RPN 분포 | `risk_analyses` S*O*D 계산 | ✅ 가능 |
| 개선조치 현황 | `optimizations` GROUP BY status | ✅ 가능 |
| 공정별 고장 수 | `failure_modes` + `l2_structures` | ✅ 가능 |
| SOD 변경 이력 | `fmea_sod_history` | ✅ 가능 |

### 2. ❌ 누락된 통계 DB (신규 생성 필요)

#### 2.1 대시보드 집계 캐시 테이블
| 테이블명 (제안) | 설명 | 필요 필드 |
|----------------|------|----------|
| `dashboard_stats_cache` | 대시보드 통계 캐시 | fmeaId, totalItems, avgRPN, highRiskCount, apH/M/L, updatedAt |
| `kpi_snapshots` | KPI 스냅샷 (일별) | date, module, metric, value |
| `quality_trends` | 품질 트렌드 (주별/월별) | period, rpnTrend, apTrend, defectRate |

#### 2.2 SPC (통계적 공정관리) 테이블
| 테이블명 (제안) | 설명 | 필요 필드 |
|----------------|------|----------|
| `spc_control_charts` | 관리도 헤더 | chartNo, processNo, charType (Xbar-R, p, c 등), ucl, lcl, cl |
| `spc_measurements` | 측정값 데이터 | chartId, sampleNo, measuredAt, values[], subgroupMean, range |
| `spc_out_of_control` | 이상점 기록 | chartId, measurementId, rule (Western Electric), action |
| `spc_process_capability` | 공정능력 분석 | chartId, cp, cpk, pp, ppk, sigma, calculatedAt |

#### 2.3 MSA (측정시스템분석) 테이블
| 테이블명 (제안) | 설명 | 필요 필드 |
|----------------|------|----------|
| `msa_studies` | MSA 연구 헤더 | studyNo, processNo, gageId, studyType (Gage R&R, Bias, Linearity) |
| `msa_gage_master` | 게이지 마스터 | gageNo, gageName, calibrationDate, nextCalibrationDate |
| `msa_measurements` | MSA 측정값 | studyId, operator, trial, partNo, measuredValue |
| `msa_results` | MSA 결과 | studyId, totalRR, repeatability, reproducibility, ndc, status (Pass/Fail) |

#### 2.4 품질 KPI 테이블
| 테이블명 (제안) | 설명 | 필요 필드 |
|----------------|------|----------|
| `quality_kpi_definitions` | KPI 정의 | kpiCode, kpiName, formula, unit, target, owner |
| `quality_kpi_values` | KPI 값 | kpiCode, period (YYYY-MM), value, status (G/Y/R) |
| `quality_issues` | 품질 이슈 | issueNo, processNo, issueType, severity, status, rootCause |
| `nonconformance_reports` | 부적합 보고서 (NCR) | ncrNo, partNo, processNo, defectType, qty, disposition |

### 3. 통계분석 테이블 vs 실시간 집계 비교

| 방식 | 장점 | 단점 | 추천 |
|-----|------|------|------|
| **실시간 집계** | 항상 최신 데이터 | 대용량 시 느림 | 소규모 |
| **캐시 테이블** | 빠른 응답 | 동기화 필요 | 대용량 |
| **스냅샷 테이블** | 이력 추적 가능 | 저장 공간 필요 | KPI 추적 |

### 권장 사항
1. **당장 필요**: `dashboard_stats_cache` - 대시보드 로딩 속도 개선
2. **출시 후 필요**: `kpi_snapshots`, `quality_trends` - 품질 보고서
3. **장기 계획**: SPC/MSA 테이블 - 통계 품질관리 모듈

## 라이브러리 vs DB 관리 구분

### 🔵 DB로 관리해야 하는 항목 (사용자가 수정 가능)

| 항목 | 테이블명 | 이유 |
|------|---------|------|
| **SOD 기준 (심각도/발생도/검출도)** | `pfmea_severity_criteria`, `pfmea_occurrence_criteria`, `pfmea_detection_criteria`, `dfmea_*_criteria` | 고객사별로 다를 수 있음, 관리자가 조정 가능해야 함 |
| **EP 자동검사 장치목록** | `ep_devices`, `cp_master_detectors` | 공정마다 다름, 신규 장비 추가/삭제 필요 |
| **특별특성 기준** | 없음 (TODO) | ⚠️ 현재 하드코딩 → DB 관리 필요 |
| **고객사 정보** | `customers` | 신규 고객사 추가 필요 |
| **사용자 정보** | `users` | 입/퇴사 관리 |
| **공정 마스터** | `master_processes`, `cp_master_processes` | 신규 공정 추가/수정 |
| **습득교훈** | `lessons_learned` | 지속적 축적 필요 |

### 🟢 라이브러리(코드)로 관리할 항목 (고정값)

| 항목 | 현재 위치 | 이유 |
|------|----------|------|
| **AP (Action Priority) 계산 로직** | `src/lib/fmea/apCalculation.ts` | AIAG 표준, 변경 불가 |
| **4M 분류 (MN/MC/IM/EN)** | 컴포넌트 내 상수 | 표준, 변경 불가 |
| **FMEA 7단계 정의** | 컴포넌트 내 상수 | AIAG VDA 표준 |
| **APQP 5단계 정의** | 컴포넌트 내 상수 | AIAG 표준 |
| **CP 6단계 정의** | 컴포넌트 내 상수 | 시스템 표준 |
| **권한 레벨 (admin/editor/viewer)** | 상수 | 시스템 표준 |
| **문서 상태값 (draft/active/locked/obsolete)** | 상수 | 시스템 표준 |

### ⚠️ 현재 라이브러리인데 DB로 이관 필요한 항목

| 항목 | 현재 상태 | 이관 필요 |
|------|----------|----------|
| **특별특성 기준 (CC/SC/IC)** | 하드코딩 | ❗ DB 테이블 필요 |
| **고객사별 SOD 기준 변형** | 미구현 | ❗ 고객사-SOD 연결 필요 |
| **평가방법 라이브러리** | 미구현 | ❗ DB 테이블 필요 |
| **관리방법 라이브러리** | 미구현 | ❗ DB 테이블 필요 |
| **대응계획 템플릿** | 미구현 | ❗ DB 테이블 필요 |

---

## TODO 리스트

### 🔴 긴급 (출시 전 필수)

- [ ] **특별특성 기준 테이블 생성**: `special_characteristic_criteria`
  - CC (Critical Characteristic) 정의
  - SC (Significant Characteristic) 정의
  - IC (Important Characteristic) 정의
  - 고객사별 특별특성 심볼/마크 관리

- [ ] **SOD 기준 UI 관리 화면**
  - 심각도/발생도/검출도 기준 CRUD
  - 기본값 시드 확인

- [ ] **EP 장치 UI 관리 화면**
  - 공정별 EP/자동검사 장치 CRUD
  - Import/Export 기능

### 🟡 중요 (출시 후 개선)

- [ ] **평가방법 라이브러리 테이블**: `eval_method_library`
  - 육안검사, 치수측정, 게이지, CMM 등

- [ ] **관리방법 라이브러리 테이블**: `control_method_library`
  - 관리도, 체크시트, 검증 등

- [ ] **대응계획 템플릿 테이블**: `reaction_plan_templates`
  - 부적합품 격리, 라인 정지, 검토회의 등

- [ ] **고객사별 SOD 기준 연결**
  - customers ↔ sod_criteria 다대다 관계
  - 현대차, 기아차, GM 등 각 고객사 기준 차이 대응

- [ ] **통계분석 캐시 테이블**: `dashboard_stats_cache`
  - 대시보드 로딩 속도 개선
  - fmeaId별 통계 캐시 저장

- [ ] **KPI 스냅샷 테이블**: `kpi_snapshots`
  - 일별/월별 KPI 값 저장
  - 트렌드 분석용

### 🟢 개선 (장기)

- [ ] **DFMEA 전용 테이블 분리** (현재 PFMEA 재사용)
- [ ] **PFD 원자성 테이블 추가** (병합 지원)
- [ ] **문서 첨부파일 관리 테이블**
- [ ] **사용자 그룹/팀 관리 테이블**

### 📊 통계분석 모듈 (장기 - 별도 프로젝트)

- [ ] **SPC (통계적 공정관리) 테이블 세트**
  - `spc_control_charts`: 관리도 헤더 (Xbar-R, p, c, np, u)
  - `spc_measurements`: 측정값 데이터
  - `spc_out_of_control`: 이상점 기록
  - `spc_process_capability`: 공정능력 (Cp, Cpk, Pp, Ppk)

- [ ] **MSA (측정시스템분석) 테이블 세트**
  - `msa_studies`: MSA 연구 헤더
  - `msa_gage_master`: 게이지 마스터 (교정 관리)
  - `msa_measurements`: 측정값 (Gage R&R)
  - `msa_results`: 분석 결과

- [ ] **품질 지표 테이블 세트**
  - `quality_kpi_definitions`: KPI 정의
  - `quality_kpi_values`: KPI 값 (기간별)
  - `quality_issues`: 품질 이슈 트래킹
  - `nonconformance_reports`: NCR (부적합 보고서)

---

## 참고: DB 스키마 경로

```
prisma/schema.prisma  (2,366줄)
```

### 주요 섹션
- Line 1-30: 설정
- Line 31-115: 구조분석 (L1/L2/L3)
- Line 116-200: 기능분석 (L1/L2/L3)
- Line 201-530: 고장분석 (FE/FM/FC/Link/Risk)
- Line 531-730: FMEA 프로젝트 관리
- Line 730-850: 공통 마스터 (User/Customer/LessonsLearned)
- Line 850-1100: Control Plan (레거시 + 단계별)
- Line 1100-1250: SOD 기준
- Line 1250-1750: CP 마스터/원자성
- Line 1750-1950: APQP
- Line 1950-2275: 공유 데이터/동기화
- Line 2275-2366: 결재/백업

---

> **마지막 업데이트**: 2026-01-26
