# 📊 FMEA 데이터베이스별 샘플 레코드

> **버전**: 1.0.0  
> **최종 수정일**: 2026-01-03  
> **관련 문서**: [DB_SCHEMA.md](./DB_SCHEMA.md), [DB_SCHEMA_ERD.md](./DB_SCHEMA_ERD.md)  

---

## 1. APQPProject (프로젝트)

최상위 컨테이너 - 모든 FMEA, CP, PFD, WS, PM이 여기에 속함

| id | name | productName | customer | status | startDate | targetDate |
|----|------|-------------|----------|--------|-----------|------------|
| `PFM25-310` | SDD NEW FMEA 개발 | PCR 타이어 | SDD | active | 2025-12-01 | 2026-06-30 |

---

## 2. L1Structure (완제품 공정)

1L - 완제품 공정 (루트)

| id | fmeaId | name | confirmed |
|----|--------|------|-----------|
| `l1-001` | PFM25-310 | PCR 225/45R17 완제품 제조라인 | true |

---

## 3. L2Structure (메인공정)

2L - 메인공정 (공정 단위)

| id | fmeaId | l1Id | no | name | order |
|----|--------|------|----|------|-------|
| `proc-1` | PFM25-310 | l1-001 | 10 | 프레스 | 10 |
| `proc-2` | PFM25-310 | l1-001 | 20 | 가류 | 20 |
| `proc-3` | PFM25-310 | l1-001 | 30 | 검사 | 30 |

---

## 4. L3Structure (작업요소)

3L - 작업요소 (4M 분류 포함)

| id | fmeaId | l1Id | l2Id | m4 | name | order |
|----|--------|------|------|----|------|-------|
| `we-1` | PFM25-310 | l1-001 | proc-1 | MN | 원료계량 | 10 |
| `we-2` | PFM25-310 | l1-001 | proc-2 | MC | 온도관리 | 10 |
| `we-3` | PFM25-310 | l1-001 | proc-3 | MN | 외관검사 | 10 |

### 4M 분류 코드

| 코드 | 영문 | 한글 |
|------|------|------|
| MN | Man | 작업자 |
| MC | Machine | 설비 |
| IM | In-Material | 부자재 |
| EN | Environment | 환경 |

---

## 5. L1Function (완제품 기능)

1L 기능분석 - 구분 + 기능 + 요구사항

| id | fmeaId | l1StructId | category | functionName | requirement |
|----|--------|------------|----------|--------------|-------------|
| `func-l1-1` | PFM25-310 | l1-001 | Your Plant | 타이어 제조 | 제조공정 안정성 확보 |
| `func-l1-2` | PFM25-310 | l1-001 | Ship to Plant | 타이어 납품 | 품질 기준 충족 |
| `func-l1-3` | PFM25-310 | l1-001 | User | 주행 성능 | 안전한 주행 가능 |

### Category (구분)

| 값 | 설명 |
|----|------|
| Your Plant | 자사 공장 내 영향 |
| Ship to Plant | 고객사 공장 영향 |
| User | 최종 사용자 영향 |

---

## 6. L2Function (메인공정 기능)

2L 기능분석 - 기능 + 제품특성

| id | fmeaId | l2StructId | functionName | productChar | specialChar |
|----|--------|------------|--------------|-------------|-------------|
| `func-l2-1` | PFM25-310 | proc-1 | 원료투입 | 배합비율 | CC |
| `func-l2-2` | PFM25-310 | proc-2 | 가열성형 | 가류도 | SC |
| `func-l2-3` | PFM25-310 | proc-3 | 품질검사 | 외관품질 | - |

---

## 7. L3Function (작업요소 기능)

3L 기능분석 - 기능 + 공정특성

| id | fmeaId | l3StructId | l2StructId | functionName | processChar | specialChar |
|----|--------|------------|------------|--------------|-------------|-------------|
| `func-l3-1` | PFM25-310 | we-1 | proc-1 | 원료 계량 | 계량 정밀도 | CC |
| `func-l3-2` | PFM25-310 | we-2 | proc-2 | 온도 제어 | 온도 편차 | SC |
| `func-l3-3` | PFM25-310 | we-3 | proc-3 | 외관 판정 | 검사 정확도 | - |

---

## 8. FailureEffect (고장영향 - FE)

1L 고장분석 - 고장영향 + 심각도

| id | fmeaId | l1FuncId | category | effect | severity |
|----|--------|----------|----------|--------|----------|
| `fe-1` | PFM25-310 | func-l1-1 | Your Plant | 공정 중단으로 생산성 저하 | 6 |
| `fe-2` | PFM25-310 | func-l1-2 | Ship to Plant | 제품 경도 불균일로 성능 저하 | 7 |
| `fe-3` | PFM25-310 | func-l1-2 | Ship to Plant | 트레드 치수 불량으로 성형 불가 | 8 |
| `fe-4` | PFM25-310 | func-l1-3 | User | 조인트 불량으로 타이어 분리 위험 | 9 |
| `fe-5` | PFM25-310 | func-l1-3 | User | 미가류로 인한 내구성 저하 | 8 |

---

## 9. FailureMode (고장형태 - FM) ★ 중심축

2L 고장분석 - 고장형태 (FE와 FC를 연결하는 중심축)

| id | fmeaId | l2FuncId | l2StructId | productCharId | mode | specialChar |
|----|--------|----------|------------|---------------|------|-------------|
| `fm-1` | PFM25-310 | func-l2-1 | proc-1 | pc-1 | 배합 불균일 | true |
| `fm-2` | PFM25-310 | func-l2-1 | proc-1 | pc-1 | 투입 누락 | true |
| `fm-3` | PFM25-310 | func-l2-2 | proc-2 | pc-2 | 가류 불량 | true |
| `fm-4` | PFM25-310 | func-l2-2 | proc-2 | pc-2 | 미가류/과가류 | true |
| `fm-5` | PFM25-310 | func-l2-3 | proc-3 | pc-3 | 검사 누락 | false |

---

## 10. FailureCause (고장원인 - FC)

3L 고장분석 - 고장원인 + 발생도

| id | fmeaId | l3FuncId | l3StructId | l2StructId | cause | occurrence |
|----|--------|----------|------------|------------|-------|------------|
| `fc-1` | PFM25-310 | func-l3-1 | we-1 | proc-1 | 원료 계량 오차 | 4 |
| `fc-2` | PFM25-310 | func-l3-1 | we-1 | proc-1 | 원료 투입 실수 | 3 |
| `fc-3` | PFM25-310 | func-l3-2 | we-2 | proc-2 | 온도 센서 오작동 | 2 |
| `fc-4` | PFM25-310 | func-l3-2 | we-2 | proc-2 | 온도 편차 | 3 |
| `fc-5` | PFM25-310 | func-l3-3 | we-3 | proc-3 | 검사 기준 미숙지 | 2 |

---

## 11. FailureLink (고장연결)

관계 테이블 - FM을 중심으로 FE, FC 연결

| id | fmeaId | fmId | feId | fcId | cache.fmText | cache.feText | cache.fcText |
|----|--------|------|------|------|--------------|--------------|--------------|
| `link-1` | PFM25-310 | fm-1 | fe-2 | fc-1 | 배합 불균일 | 경도 불균일 | 계량 오차 |
| `link-2` | PFM25-310 | fm-2 | fe-2 | fc-2 | 투입 누락 | 경도 불균일 | 투입 실수 |
| `link-3` | PFM25-310 | fm-3 | fe-3 | fc-4 | 가류 불량 | 치수 불량 | 온도 편차 |
| `link-4` | PFM25-310 | fm-4 | fe-5 | fc-3 | 미가류 | 내구성 저하 | 센서 오작동 |
| `link-5` | PFM25-310 | fm-5 | fe-4 | fc-5 | 검사 누락 | 분리 위험 | 기준 미숙지 |

---

## 12. RiskAnalysis (리스크분석)

5단계 - SOD 평가 + AP 산출

| id | fmeaId | linkId | severity | occurrence | detection | ap | preventionControl | detectionControl |
|----|--------|--------|----------|------------|-----------|----|--------------------|------------------|
| `risk-1` | PFM25-310 | link-1 | 7 | 4 | 5 | M | 원료 자동계량 시스템 | MSS 검사 |
| `risk-2` | PFM25-310 | link-2 | 7 | 3 | 4 | M | 투입 확인 체크리스트 | 중량 검사 |
| `risk-3` | PFM25-310 | link-3 | 8 | 3 | 3 | M | Die 주기 교체 | 인라인 치수 측정 |
| `risk-4` | PFM25-310 | link-4 | 8 | 2 | 3 | M | 센서 정기 교정 | 경도 검사 |
| `risk-5` | PFM25-310 | link-5 | 9 | 5 | 4 | H | 조인트 길이 검증 | 조인트 검사 |

### AP (Action Priority) 기준

| AP | 기준 | 조치 |
|----|------|------|
| H (High) | 즉시 조치 필요 | 개선조치 수립 필수 |
| M (Medium) | 조치 권고 | 개선조치 검토 |
| L (Low) | 현 수준 유지 | 모니터링 |

---

## 13. Optimization (최적화)

6단계 - 개선조치 + 개선 후 평가

| id | fmeaId | riskId | recommendedAction | responsible | targetDate | status | newS | newO | newD | newAP |
|----|--------|--------|-------------------|-------------|------------|--------|------|------|------|-------|
| `opt-1` | PFM25-310 | risk-5 | 자동 조인트 검증 시스템 도입 | 생산기술팀 | 2025-03-31 | in_progress | 9 | 2 | 2 | M |
| `opt-2` | PFM25-310 | risk-3 | 비전 검사 시스템 도입 | 품질팀 | 2025-04-15 | planned | 8 | 2 | 2 | L |

### Status (상태)

| 값 | 설명 |
|----|------|
| planned | 계획됨 |
| in_progress | 진행중 |
| completed | 완료 |

---

## 14. SpecialCharacteristic (특별특성)

공유 마스터 - 모든 모듈에서 참조

| id | apqpId | type | symbol | name | specification | sourceType | status |
|----|--------|------|--------|------|---------------|------------|--------|
| `sc-1` | PFM25-310 | CC | ◆ | 조인트 강도 | 15N 이상 | PFMEA | active |
| `sc-2` | PFM25-310 | SC | ◇ | 가류 온도 | 180±5°C | PFMEA | active |
| `sc-3` | PFM25-310 | SC | ◇ | 배합비율 | 레시피 ±2% | Customer | active |
| `sc-4` | PFM25-310 | CC | ◆ | 트레드 치수 | 규격 ±0.5mm | Regulation | active |

### 특별특성 유형

| 유형 | 설명 |
|------|------|
| CC (Critical) | 안전 관련 핵심 특성 |
| SC (Significant) | 품질 영향 주요 특성 |
| HIC (High Impact) | 고객 영향 특성 |
| SIC (Safety Impact) | 안전 영향 특성 |

---

## 15. ProcessMaster (공정 마스터)

공유 마스터 - PFMEA, CP, PFD, WS, PM에서 공유

| id | apqpId | no | name | order | description |
|----|--------|-----|------|-------|-------------|
| `pm-1` | PFM25-310 | 10 | 정련 | 10 | 원료 혼합 및 가소화 |
| `pm-2` | PFM25-310 | 20 | 압출 | 20 | 트레드 압출 성형 |
| `pm-3` | PFM25-310 | 30 | 압연 | 30 | 고무 시트 성형 |
| `pm-4` | PFM25-310 | 40 | 성형 | 40 | 그린타이어 조립 |
| `pm-5` | PFM25-310 | 50 | 가류 | 50 | 타이어 가류 성형 |

---

## 16. WorkElementMaster (작업요소 마스터)

공유 마스터 - 공정별 작업요소

| id | apqpId | processId | m4 | name | order |
|----|--------|-----------|-----|------|-------|
| `wem-1` | PFM25-310 | pm-1 | MC | 밴버리 믹서 | 10 |
| `wem-2` | PFM25-310 | pm-2 | MC | 압출기 | 10 |
| `wem-3` | PFM25-310 | pm-3 | MC | 캘린더 | 10 |
| `wem-4` | PFM25-310 | pm-4 | MC | 성형기 | 10 |
| `wem-5` | PFM25-310 | pm-4 | MN | 성형 작업자 | 20 |
| `wem-6` | PFM25-310 | pm-5 | MC | 가류기 | 10 |

---

## 📋 전체 워크시트 통합 뷰 (샘플 5행)

| No | 공정명 | 작업요소 | 4M | 제품특성 | 공정특성 | 고장형태 | 고장영향 | 고장원인 | S | O | D | AP | 특성 |
|----|--------|---------|----|---------|---------|---------|---------|---------|----|----|----|----|----|
| 1 | 10.정련 | 밴버리믹서 | MC | 고무경도 | 믹싱온도 | 배합불균일 | 경도불균일→성능저하 | 원료계량오차 | 7 | 4 | 5 | M | SC |
| 2 | 20.압출 | 압출기 | MC | 트레드치수 | 압출온도 | 치수과다/과소 | 치수불량→성형불가 | Die마모 | 8 | 3 | 3 | M | CC |
| 3 | 30.압연 | 캘린더 | MC | 시트두께 | 롤온도 | 두께편차 | 두께불균일→중량편차 | 롤온도불균일 | 6 | 4 | 4 | M | SC |
| 4 | 40.성형 | 성형기 | MC | G/T형상 | 드럼폭 | 조인트불량 | 조인트불량→분리위험 | 조인트길이부족 | 9 | 5 | 4 | **H** | CC |
| 5 | 50.가류 | 가류기 | MC | 가류도 | 가류온도 | 미가류 | 미가류→내구성저하 | 온도센서오작동 | 8 | 2 | 3 | M | CC |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-03 | 샘플 레코드 문서 생성 |

