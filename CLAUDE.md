# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

FMEA On-Premise: 한국어 기반 품질관리 시스템 (APQP/PFMEA/DFMEA/CP/PFD). Next.js + PostgreSQL 풀스택. Backend 중심 아키텍처 — DB가 SSoT, 프론트엔드는 DB 렌더링 전용.

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router), TypeScript 5 (strict)
- **Frontend**: React 19.2.3, Radix UI, Tailwind CSS 4
- **Database**: PostgreSQL + Prisma ORM 7.2.0 (프로젝트별 스키마 분리)
- **Testing**: Vitest (unit), Playwright (E2E), MSW (mock)
- **Excel**: ExcelJS/xlsx (import/export), HTML `<table>` + Tailwind (데이터 그리드)
- **Charts**: Chart.js + react-chartjs-2

## Development Commands

```bash
npm run dev              # Dev server (port 3000, 3GB heap)
npm run dev:4000         # Port 4000
npm run build            # Production build
npm start                # Production server

# Database
npm run db:generate      # Prisma client 생성 (스키마 변경 후 필수)
npm run db:migrate       # Migration 실행
npm run db:push          # 스키마 DB 동기화
npm run db:studio        # Prisma Studio GUI

# Testing
npx tsc --noEmit         # 타입 체크 (커밋 전 필수, 에러 0개)
npm run test:run         # Vitest 1회 실행
npm run test:import-slice # Import 핵심 7개 스펙
npm run verify:all       # tsc + Vitest + 파이프라인 검증 묶음
npm run release:audit    # 출시 전 사이드바 + tsc 감사

# Pipeline Verification (dev 서버 필수)
# GET  /api/fmea/pipeline-verify?fmeaId=pfm26-m002  (읽기전용)
# POST /api/fmea/pipeline-verify {fmeaId}            (자동수정 루프)

# Guard & Snapshot
npm run guard:invariants        # 데이터 불변식 검증
npm run snapshot                # DB 스냅샷 생성
scripts/check-cartesian.sh      # 카테시안 복제 탐지
```

## Architecture

```
APQPProject / TripletGroup (프로젝트 최상위)
  ├── FmeaProject → FmeaRegistration (등록정보, public 스키마)
  ├── Atomic Structure (프로젝트 스키마 — SSoT)
  │     ├── L1Structure → L1Function → FailureEffect
  │     ├── L2Structure → L2Function + ProcessProductChar
  │     │                   FailureMode ← productCharId FK
  │     └── L3Structure → L3Function → FailureCause
  ├── FailureLink (FM↔FE↔FC 확정 FK)
  │     └── FailureAnalysis → RiskAnalysis → Optimization
  ├── ControlPlan → ControlPlanItem (productCharId FK 공유)
  └── PFD → PfdItem (fmeaL2Id/fmeaL3Id FK 공유)
```

### Key Patterns

- **프로젝트 스키마 분리**: `pfmea_{fmeaId}` 전용 스키마에 Atomic 데이터 저장 (public 금지)
- **FailureLink**: FM-FE-FC 삼각 FK — 엔지니어 기술 판단으로만 생성 (카테시안 금지)
- **Import 3단계**: Excel 파싱(임시) → FC검증(사용자 확인) → DB 원자 저장($transaction)
- **Living DB**: Master/산업DB/LLD → 워크시트 저장 시 Master 자동 동기화

### Directory Structure

```
src/app/                     # Next.js App Router
  ├── (common)/              # APQP, Dashboard, Admin, Auth
  ├── (fmea-core)/           # PFMEA, DFMEA, CP, PFD, Master
  └── api/                   # 50+ REST API routes
src/lib/fmea-core/           # 핵심 비즈니스 로직 (13개 보호 레이어)
src/lib/fmea/                # Import/Export/Parser 유틸
src/components/              # 공용 UI 컴포넌트
src/hooks/                   # Custom React hooks
src/types/                   # TypeScript 타입 정의
tests/                       # Vitest + Playwright 테스트
  ├── guard/                 # FK/Import 방어 테스트
  ├── e2e/                   # Playwright E2E
  └── import/                # Import 파이프라인 테스트
prisma/schema.prisma         # 138개 DB 모델
scripts/                     # DB 백업/시드/감사/검증 스크립트
docs/prd/                    # PRD 문서
```

---

## MANDATORY RULES — 위반 시 즉시 롤백

> 모든 규칙의 상세 내용은 `.claude/rules/` 하위 파일에 정의. 이 섹션은 인덱스.

### 최우선 원칙 (RED)

| Rule | 요약 | 상세 |
|------|------|------|
| **R0** | DB 중앙 아키텍처 — Atomic DB = SSoT, JSON blob은 캐시 | [00-db-architecture.md](docs/claude-rules/00-db-architecture.md) |
| **R1.5** | UUID 중심 꽂아넣기 — 자동생성/추론 절대 금지 | [01-uuid-fk-design.md](docs/claude-rules/01-uuid-fk-design.md) |
| **R1.6** | 근본원인 분석 원칙 — 증상 처방 금지, 5대 체크리스트 | [01-uuid-fk-design.md](docs/claude-rules/01-uuid-fk-design.md) |
| **R1.7** | UUID/FK 설계 — dedup key에 공정번호 필수, ID-ONLY 매칭 | [01-uuid-fk-design.md](docs/claude-rules/01-uuid-fk-design.md) |
| **R1** | TDD 필수 + Forge 6단계 프로세스 | [02-tdd-forge-process.md](docs/claude-rules/02-tdd-forge-process.md) |
| **R3.1** | FK 필드 제거 절대 금지 (3중 방어) | [04-import-parser-guard.md](docs/claude-rules/04-import-parser-guard.md) |
| **R3.2** | isPositionBasedFormat 라우팅 보호 | [04-import-parser-guard.md](docs/claude-rules/04-import-parser-guard.md) |
| **R10** | 기존 핵심 로직 손상 금지 (고장연결 등) | [05-codefreeze-protection.md](docs/claude-rules/05-codefreeze-protection.md) |
| **R15** | 코드 수정 후 파이프라인 검증 필수 (3회 루프) | [06-pipeline-verification.md](docs/claude-rules/06-pipeline-verification.md) |
| **R16** | Raw SQL — Prisma @@map snake_case 필수 | [03-api-sql-patterns.md](docs/claude-rules/03-api-sql-patterns.md) |
| **R19** | 프로젝트별 별도 DB 스키마 필수 | [00-db-architecture.md](docs/claude-rules/00-db-architecture.md) |

### 보조 원칙 (YELLOW/BLUE)

| Rule | 요약 | 상세 |
|------|------|------|
| **R2** | 기존 UI 변��� 금지 (명��적 요청 시만) | [09-ui-rendering-rules.md](docs/claude-rules/09-ui-rendering-rules.md) |
| **R3** | 코드프��즈 — CODEFREEZE 주석 파일 주의 | [05-codefreeze-protection.md](docs/claude-rules/05-codefreeze-protection.md) |
| **R4** | 명시적 허락 필수 (유추 허락 금지) | — |
| **R5** | 데이터 연동 고려 (PFMEA↔CP↔PFD) | — |
| **R6** | 700행 초과 시 파일 분리 필수 | — |
| **R7** | DB 원자성 보장 — `saveAtomicDB()` 호출 필수 | — |
| **R8** | CRUD 종합 검토 | — |
| **R9** | 타입 지정 필수 — `any` 남발 금지 | — |
| **R11** | UI 슬림화 — 패�� 최소화, 아이콘 숨김 | [09-ui-rendering-rules.md](docs/claude-rules/09-ui-rendering-rules.md) |
| **R12** | 온프레미스 에러 제로 — `tsc --noEmit` 에러 0개 | — |
| **R13** | 배포환경 품질 — `createSample*()` 금지, dead code 제거 | — |
| **R14** | Handsontable 사용 금지 — HTML table + Tailwind만 | [09-ui-rendering-rules.md](docs/claude-rules/09-ui-rendering-rules.md) |
| **R17** | 코드 변경 시 CLAUDE.md + 매뉴얼 동기화 | — |
| **R18** | Living DB ���키텍처 — 산업DB/LLD/SOD 동기화 | [08-living-db-sync.md](docs/claude-rules/08-living-db-sync.md) |

### 코드 작성 필수 준수

| # | 원칙 |
|---|------|
| 1 | `catch(e) {}` 금지 — `console.error()` 또는 `toast.error()` 사용 |
| 2 | 새 API: `src/lib/security.ts`의 `isValidFmeaId`, `pickFields`, `escapeHtml` 사용 |
| 3 | 새 페이지: `error.tsx` 추가 |
| 4 | 빈 데이터: 안내 메시지 표시 |
| 5 | `React.memo` 유지 — `SelectableCell`, `AllViewRow` 등 해제 금지 |
| 6 | Users API: password 필드 응답 포함 금지 |
| 7 | 700행 초과 → 파일 분리 |
| 8 | Handsontable 금지 — HTML table + Tailwind |
| 9 | CFT 디렉터리: `cft_public_members` + `cft-public-db.ts`만 사용, users 테이블 연동 금지 |

---

## 개발 프로세스 요약

### Forge 6단계 (비-트리비얼 작업 필수)

```
EXPLORE → PLAN → TDD(Red) → EXECUTE → VERIFY → COMMIT
                                         ↑ FAIL ↓
                                       EXECUTE (루프)
```

### 파이프라인 검증 루프

```
코드 수정 → tsc --noEmit → pipeline-verify POST
                             ↓ FAIL
                      수정 → 재검증 (최대 3회)
                             ↓ PASS → 완료 보고
```

### 커밋 전 체크리스트

```
[ ] tsc --noEmit 에러 0개
[ ] pipeline-verify → allGreen=true
[ ] 신규 ERROR 0건
[ ] CLAUDE.md + 매뉴얼 동기화
```

---

## Documentation References

- `docs/CENTRAL_DB_ARCHITECTURE.md` — 중앙 DB 설계
- `docs/UUID_FK_SPECIFICATION.md` — UUID/FK 상세 명세
- `docs/MAINTENANCE_MANUAL.md` — Import 파이프라인 유지보수
- `docs/00_MAINTENANCE_MANUAL.md` — 전체 모듈 체크리스트, 버그 수정 이력
- `docs/WORKSHEET_DESIGN_PRINCIPLES.md` — UI 레이아웃 룰
- `docs/매뉴얼사진/02_사용자매뉴얼.md` — 사용자 매뉴얼 (업무 순서 기반)
- `docs/prd/` — PRD 문서

## Sub-Rule Files (docs/claude-rules/)

```
docs/claude-rules/
├── 00-db-architecture.md       # DB ��앙 아키��처, SSoT, 프로젝�� 스키마 분���
├── 01-uuid-fk-design.md        # UUID dedup key, FK 설계, ���본원인 분석
├── 02-tdd-forge-process.md     # TDD 필수, Forge 6단계, 에이전트 검증
├── 03-api-sql-patterns.md      # API 패턴, Raw SQL, Prisma 매핑
├─��� 04-import-parser-guard.md   # Import 파이프라인, ��치파서, FK 필드 보호
├── 05-codefreeze-protection.md # 코��프리즈, ��냅샷, 롤백, 기존 코드 보호
├���─ 06-pipeline-verification.md # 파이프��인 검증, 골든 베이스라��, 자동수정
├── 07-failure-history.md       # 과거 버그 이력, 안티패턴, 재발 방지
├── 08-living-db-sync.md        # Master DB, 산업DB, LLD 동기화
└── 09-ui-rendering-rules.md    # UI 규칙, DB 기반 렌더링만 허용
```
