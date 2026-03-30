# CODEFREEZE L4 파이프라인 매니페스트

> 적용일: 2026-03-30
> 태그: codefreeze-v5.0-pre-dfmea-20260330
> 목적: DFMEA 개발 착수 전 PFMEA 파이프라인 전체 보호

## CODEFREEZE L4 적용 대상

### 1. Import 파이프라인 (엑셀 → 파싱 → DB)

| 파일 | 역할 |
|------|------|
| `src/lib/fmea/position-parser.ts` | 위치기반 엑셀 파서 (78KB) |
| `src/lib/fmea/cellid-parser.ts` | 셀ID 파서 |
| `src/lib/fmea/cellid-to-atomic.ts` | 셀ID → Atomic 변환 |
| `src/lib/fmea/cross-sheet-resolver.ts` | 크로스시트 매칭 |
| `src/lib/fmea/deep-verify.ts` | 깊이 검증 |
| `src/lib/fmea/import-data-cleaner.ts` | Import 데이터 정리 |
| `src/lib/fmea/scope-constants.ts` | 스코프 상수 |
| `src/lib/fmea/invariants.ts` | 불변 규칙 |
| `src/app/(fmea-core)/pfmea/import/excel-parser.ts` | 엑셀 파서 |
| `src/app/(fmea-core)/pfmea/import/excel-template.ts` | 엑셀 템플릿 (150KB) |
| `src/app/(fmea-core)/pfmea/import/types.ts` | Import 타입 |

### 2. Atomic DB 저장/로드

| 파일 | 역할 |
|------|------|
| `src/lib/fmea-core/raw-to-atomic.ts` | raw → Atomic DB 변환 |
| `src/lib/fmea-core/save-atomic.ts` | Atomic DB 저장 |
| `src/lib/fmea-core/atomic-cell-save.ts` | 셀 단위 저장 |
| `src/lib/fmea-core/atomic-risk-map.ts` | 리스크 맵 |
| `src/lib/fmea-core/atomicRiskToRiskData.ts` | Atomic → RiskData 변환 |

### 3. 고장사슬/FK 검증

| 파일 | 역할 |
|------|------|
| `src/lib/fmea-core/enrichFailureChains.ts` | 고장사슬 보강 |
| `src/lib/fmea-core/fk-chain-validator.ts` | FK 체인 검증 |
| `src/lib/fmea-core/fk-repair.ts` | FK 수선 |
| `src/lib/fmea-core/validate-import.ts` | Import 검증 |
| `src/lib/fmea-core/validate-export.ts` | Export 검증 |
| `src/lib/fmea-core/validate-fk-doors.ts` | FK Door 검증 |
| `src/lib/fmea-core/validate-pfd-fk.ts` | PFD FK 검증 |
| `src/lib/failure-link-utils.ts` | 고장연결 유틸 |

### 4. 워크시트 코어

| 파일 | 역할 |
|------|------|
| `src/app/(fmea-core)/pfmea/worksheet/schema.ts` | Atomic 스키마 (40KB) |
| `src/app/(fmea-core)/pfmea/worksheet/migration.ts` | 데이터 마이그레이션 (42KB) |
| `src/app/(fmea-core)/pfmea/worksheet/atomicToLegacyAdapter.ts` | Atomic→Legacy 변환 |
| `src/app/(fmea-core)/pfmea/worksheet/page.tsx` | 워크시트 메인 (이미 L4) |
| `src/app/(fmea-core)/pfmea/worksheet/constants.ts` | 상수 (이미 L4) |
| `src/app/(fmea-core)/pfmea/worksheet/db-storage.ts` | DB 저장 관리 |

### 5. API 라우트 (파이프라인 핵심)

| 파일 | 역할 |
|------|------|
| `src/app/api/fmea/save-position-import/route.ts` | 위치기반 Import 저장 |
| `src/app/api/fmea/raw-to-atomic/route.ts` | raw→Atomic API |
| `src/app/api/fmea/rebuild-atomic/route.ts` | Atomic 재빌드 |
| `src/app/api/fmea/repair-fk/route.ts` | FK 수선 API |
| `src/app/api/fmea/pipeline-verify/route.ts` | 파이프라인 검증 |
| `src/app/api/fmea/import-validation/route.ts` | Import 검증 API |
| `src/app/api/fmea/import-to-raw/route.ts` | Import→Raw API |
| `src/app/api/fmea/deep-verify/route.ts` | 깊이 검증 API |

### 6. 공용 코어 (fmea-core)

| 파일 | 역할 |
|------|------|
| `src/lib/fmea-core/types/index.ts` | 공용 타입 (PFMEA/DFMEA) |
| `src/lib/fmea-core/index.ts` | 코어 엔트리 |
| `src/lib/fmea-core/guards.ts` | 가드 함수 |
| `src/lib/fmea-core/project-clone.ts` | 프로젝트 복제 |
| `src/lib/fmea-core/undo-redo.ts` | Undo/Redo |
| `src/lib/fmea-core/dc-pc-source-tracker.ts` | DC/PC 소스 추적 |
| `src/lib/fmea-core/compare-atomic.ts` | Atomic 비교 |
| `src/lib/fmea-core/build-cp-pfd-skeleton.ts` | CP/PFD 스켈레톤 |

### 7. UUID/FK 시스템

| 파일 | 역할 |
|------|------|
| `src/lib/uuid-generator.ts` | UUID 생성기 |
| `src/lib/uuid-rules.ts` | UUID 규칙 |
| `src/lib/uuid-generator-stub.ts` | UUID 스텁 |

### 8. DB 스키마

| 파일 | 역할 |
|------|------|
| `prisma/schema.prisma` | Prisma 스키마 |

---

## 수정 허용 범위

- **DFMEA 전용 신규 파일**: 제한 없음 (`dfmea/` 디렉토리)
- **Sidebar/TopNav 추가**: DFMEA 메뉴 항목 추가만 허용
- **위 목록 파일 수정**: 사용자 명시적 승인 + full test pass 필수

## 롤백

```powershell
git reset --hard codefreeze-v5.0-pre-dfmea-20260330
```
