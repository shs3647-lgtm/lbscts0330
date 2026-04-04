# Rule 18: Living DB 아키텍처 — 산업DB/LLD/SOD 자동 동기화

> **산업DB(DC/PC), LLD, SOD 기준표는 독립 UUID 테이블로 관리하며,**
> **워크시트 저장 시 Master DB에 자동 동기화한다.**

---

## 데이터 소스 우선순위

| 우선순위 | 소스 | 테이블 | 용도 |
|---------|------|--------|------|
| 1순위 | 프로젝트 Atomic DB | L1~L3, FM/FE/FC, FailureLink | 현재 프로젝트 확정 |
| 2순위 | Master FMEA DB | `master_fmea_reference` | 골든 레퍼런스 |
| 3순위 | 산업 DB | `kr_industry_detection/prevention` | DC/PC 추천 |
| 4순위 | LLD DB | `lld_filter_code`, `lessons_learned` | 과거 이력 추천 |
| ❌ 금지 | 코드 내 자동생성 | — | — |

## 소스 추적 (Source Traceability)

| 필드 | 테이블 | 용도 |
|------|--------|------|
| `dcSourceType` | `risk_analyses` | DC 출처: manual/master/industry/lld/keyword |
| `dcSourceId` | `risk_analyses` | DC 소스 엔티티 UUID |
| `pcSourceType` | `risk_analyses` | PC 출처: manual/master/industry/lld |
| `pcSourceId` | `risk_analyses` | PC 소스 엔티티 UUID |

## 산업DB 자동 레이팅

| 테이블 | 필드 | 용도 |
|--------|------|------|
| `kr_industry_detection` | `defaultRating` | 기본 D값 (1-10) |
| `kr_industry_prevention` | `defaultRating` | 기본 O값 (1-10) |

- DC/PC 자동추천 시 산업DB `defaultRating` 우선 적용

## Master DB 지속 발전 (Living Database)

> Master DB는 사용할수록 풍부해지는 "살아있는 DB".

| 이벤트 | Master DB 업데이트 |
|--------|-------------------|
| 새 FMEA Import | 확정 데이터 upsert |
| SOD 등급 변경 | 해당 FM/FC SOD 갱신 |
| LLD Import | cross-reference |
| 사용자 수동 입력 | 입력 데이터 저장 |
| 워크시트 저장 | `syncMasterFromWorksheet()` |
| 새 항목 추가 | Master에 신규 등록 |

### 동기화 체인

```
워크시트 저장
  → extractChainsFromAtomicDB() (optimization 포함)
  → syncMasterReferenceFromChains()
  → MasterFmeaReference 자동 업데이트
```

## Living DB 테이블 현황

| 테이블 | 건수 | 용도 |
|--------|------|------|
| `lld_filter_code` | 12+ | LLD 통합 교훈DB (SOD 포함) |
| `lessons_learned` | 8+ | LLD 레거시 |
| `kr_industry_detection` | 25+ | 산업 DC (D 레이팅) |
| `kr_industry_prevention` | 25+ | 산업 PC (O 레이팅) |
| `continuous_improvement_plan` | 8+ | AP 개선 계획 |
| `master_fmea_reference` | 91+ | 마스터 참조 |

## API 엔드포인트

| API | 용도 |
|-----|------|
| `GET /api/kr-industry?type=all` | 산업DB 조회 (defaultRating 포함) |
| `GET /api/kr-industry/usage` | 산업DB 사용 통계 |
| `GET /api/lld/usage` | LLD 사용 현황 역추적 |
| `POST /api/lld/apply` | LLD 적용결과 업데이트 |

## 누락 데이터 처리

```
DB 조회 (1순위→4순위)
  ├─ 있음 → UUID + FK → 꽂아넣기
  └─ 없음 → MASTER_MISSING 경고
             → 사용자 "입력" → Master에 저장 (Living DB 발전)
             → 사용자 "삭제" → cascade 삭제
```
