# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ MANDATORY DEVELOPMENT RULES (2026-01-19)

> **❌ 위반 시 롤백 대상** - 아래 룰을 반드시 준수해야 합니다.

### 🔴 Rule 1: TDD 필수 + 검증 체계 + 품질 유지 프로세스 — 2026-02-20

**모든 코드 수정은 반드시 테스트 먼저 수정/작성한 후 구현 코드를 수정합니다.**

| 단계 | 명칭 | 방법 | 용도 |
|------|------|------|------|
| **0단계** | **테스트 먼저 (TDD)** | 기대 동작을 테스트 코드로 먼저 작성 → 실패 확인 → 사용자에게 보고 | 요구사항을 코드로 명확히 정의 |
| 1단계 | **타입 체크 (Type Check)** | `npx tsc --noEmit` | 타입 에러 0개 확인 |
| 2단계 | **단위 테스트 (Unit Test)** | 비정상 엑셀 47개로 함수 검증, structureGuard 구조 보호 검증 | 개별 함수/모듈이 정확히 동작하는지 |
| 3단계 | **통합 테스트 (E2E Test)** | 앱에 실제 임포트해서 화면 확인 | 전체 흐름이 정상인지 |

**⚠️ TDD 절차 (0단계 상세)**:
1. 기대 동작을 테스트 코드로 **먼저** 작성/수정
2. 테스트 실행 → **FAIL 확인** (Red)
3. 사용자에게 "이 테스트가 실패합니다. 이제 구현을 수정합니다." 보고
4. 구현 코드 수정
5. 테스트 실행 → **PASS 확인** (Green)
- ❌ **구현 먼저 수정 → 테스트를 맞춰 변경 = TDD 위반 (금지)**
- ✅ **테스트 먼저 수정 → 실패 확인 → 구현 수정 → 통과 확인 = 올바른 TDD**

- 1단계만 통과하고 "완료"라고 하면 안 됨 — 1단계는 결과(타입)만 보는 것
- 2단계로 **각 함수가 올바르게 동작하는지** 검증해야 함
- 3단계로 **실제 사용 시나리오**에서 확인해야 함
- **FMEA는 복잡한 연계 시스템** — 타입체크만으로는 연계성 검증이 불가능
- **7단계(구조→기능→고장→위험→최적화→CP→PFD) 진행 시 E2E 검증을 모두 통과해야 다음 단계 진행 가능**

**🛡️ 온프레미스 품질 유지 프로세스 (2026-02-20 확정, 매 수정 시 필수)**:

**매 커밋 전 (필수)**:
```bash
npx tsc --noEmit          # 타입 에러 0개 확인 (절대 스킵 금지)
```

**주요 기능 수정 후 (권장)**:
```bash
npm run build             # 209페이지 프로덕션 빌드 성공 확인
```

**코드 작성 시 필수 준수 사항**:

| # | 원칙 | 위반 시 영향 |
|---|------|-------------|
| 1 | **empty catch 금지** — `catch(e) {}` 대신 `console.error()` 또는 `toast.error()` | 에러 묵살 → 디버깅 불가 |
| 2 | **새 API에 보안 적용** — `src/lib/security.ts`의 `isValidFmeaId`, `pickFields`, `escapeHtml` 사용 | SQL injection, XSS |
| 3 | **새 페이지에 error.tsx 추가** — 기존 `pfmea/worksheet/error.tsx` 참고 | 화이트 스크린 |
| 4 | **빈 데이터 상태 처리** — `items.length === 0` 시 안내 메시지 표시 | 빈 화면 방치 |
| 5 | **React.memo 유지** — `SelectableCell`, `SpecialCharBadge`, `AllViewRow` memo 해제 금지 | 리렌더 폭발 |
| 6 | **Users API password 제외** — `select: {...}` 유지, password 필드 절대 응답에 포함 금지 | 비밀번호 해시 노출 |
| 7 | **700행 초과 시 파일 분리** | 유지보수 불가 |
| 8 | **Handsontable 도입 금지** — HTML table + Tailwind만 사용 | 라이선스 위반 |

**Forge 문제해결 프로세스 (2026-03-07 확정, 비-트리비얼 작업 시 필수)**:

모든 비-트리비얼 작업(3파일+ 변경, UI 전체 수정, 아키텍처 변경)은 반드시 6단계 파이프라인을 따른다:

| 단계 | 명칭 | 방법 | 산출물 |
|------|------|------|--------|
| 1 | **EXPLORE** | 코드베이스 탐색, 현재 상태 파악 | 현황 분석 보고 |
| 2 | **PLAN** | 수정 파일 목록 + 변경 내용 + 검증 기준 정의 | 승인된 계획 |
| 3 | **TDD** | Playwright/Vitest 테스트 먼저 작성 → RED 확인 | 실패하는 테스트 |
| 4 | **EXECUTE** | 계획대로만 구현 (계획 외 변경 금지) | 구현 코드 |
| 5 | **VERIFY** | `tsc --noEmit` + 테스트 PASS + Playwright 브라우저 검증 | 검증 보고서 |
| 6 | **COMMIT** | 검증 통과 후 커밋 | 커밋 해시 |

- VERIFY에서 실패 시 → EXECUTE로 돌아가 수정 → 재검증 (VERIFY-LOOP)
- Playwright 브라우저 검증은 UI 변경 작업 시 필수
- 단순 타이포/1-2줄 수정은 예외 (Forge 생략 가능)

**새 API 라우트 작성 시 필수 패턴**:
```typescript
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
// 1. 입력 검증 (isValidFmeaId, isValidIdentifier)
// 2. try-catch + console.error (empty catch 금지)
// 3. safeErrorMessage(error) (스택 트레이스 노출 금지)
// 4. 참조 데이터는 Cache-Control 헤더 추가
```

### 🔴 Rule 2: 기존 UI 변경 금지
기존 UI는 절대 변경하지 않습니다. 사용자가 명시적으로 UI 변경을 요청한 경우에만 수정합니다.

### 🔴 Rule 3: 코드프리즈 수정 금지
`CODEFREEZE` 주석이 있는 파일은 절대 수정하지 않습니다. 수정 필요시 반드시 사용자에게 허락을 먼저 요청합니다.

### 🔴 Rule 4: 명시적 허락 필수 (유추 허락 금지)
수정이 필요한 경우 반드시 사용자의 명시적 허락을 받습니다.
- ❌ "아마 괜찮을 것 같아서" 수정 → 금지
- ✅ "이 파일의 이 부분을 수정해도 될까요?" → 필수

### 🟡 Rule 5: 데이터 연동 고려
관련 앱 화면의 데이터 연동을 항상 고려합니다 (PFMEA↔DFMEA, FMEA↔CP 등)

### 🟡 Rule 6: 모듈화/표준화/공용화 검토 (700행 제한)
새로운 기능 추가 시 반드시 검토합니다:
- 기존 코드 줄 수: **700행 초과 시 분리 필수**
- 동일 패턴의 코드는 공용 함수로 추출
- PFMEA/DFMEA 공통 로직은 공용 모듈 사용

### 🟡 Rule 7: DB 원자성 보장
모든 화면 데이터는 DB에 원자성 있게 보관되어야 합니다. `saveAtomicDB()` 호출 필수.

### 🟡 Rule 8: CRUD 종합 검토
기능 개발 시 CRUD 모든 측면에서 종합적으로 검토합니다:
- Create/Read/Update/Delete 각각 DB 저장/로드 확인
- `setStateSynced` + `saveAtomicDB` 패턴 사용

### 🟡 Rule 9: 타입 지정 필수
모든 코드에 명확한 타입을 지정합니다. `any` 타입 남발 금지.

### 🔴 Rule 10: 기존 기능 손상 금지 (핵심 로직 보호)
새 기능 추가 시 기존 핵심 로직을 절대 수정하지 않습니다.
- ⛔ **고장연결 절대 수정 금지**: `useSVGLines.ts`, `linkedFEs`/`linkedFCs` 상태, FM 선택 useEffect
- ✅ **안전한 방법**: 기존 상태는 읽기만, 수정은 `savedLinks`만, 별도 상태 사용
- 위반 시 **즉시 롤백**

### 🔴 Rule 10.5: 데이터 로드 파이프라인 불변 원칙 (2026-02-09)
> 사고 경위: 데이터 로드 경로에 필터 함수 삽입 → 수동모드 placeholder 삭제 → 기능 파괴

1. **`useWorksheetDataLoader.ts`의 `l2:` 할당 라인에 필터/변환 함수 삽입 절대 금지**
2. **빈 이름(`''`)의 L3를 삭제하는 로직 추가 금지** (수동모드 입력용 placeholder)
3. 새 로직 필요 시 → 별도 useEffect 또는 useMemo에서 처리 (원본 불변)
4. 위반 시 **즉시 롤백** + `tests/e2e/manual-mode-guard.spec.ts` 실행 필수

### 🔴 Rule 12: 온프레미스 출시 에러 제로 정책 (2026-02-16)
1. **어떤 에러가 발견되더라도 완벽하게 모두 수정한다** (`tsc --noEmit` 에러 0개 유지)
2. 관련 앱(PFMEA/DFMEA/CP/PFD/PM/WS/APQP) 전체를 에이전트로 진단하고 **병렬 수정**한다
3. 수정 완료된 파일은 즉시 **코드프리즈** 적용한다
4. 빌드/타입체크 통과 확인 후 커밋한다

### 🔴 Rule 13: 배포환경 코드 품질 (2026-02-16)
1. **페이지 로드 시 `createSample*()` 자동 호출 금지** (개발 모드 전용 기능)
2. **DB가 비어있으면 빈 상태 유지** → 사용자가 Import/추가로 직접 등록
3. **미사용 export 함수/import는 즉시 제거** (dead code 방치 금지)
4. 기능 삭제 시 관련 함수·타입·import 모두 연쇄 제거

### 🔴 Rule 14: Handsontable 사용 금지 (2026-02-20)
> 마이그레이션 완료: Handsontable → HTML `<table>` + Tailwind CSS (2026-02-20)

1. **Handsontable 라이브러리 신규 도입/재설치 절대 금지** (`npm install handsontable` 금지)
2. **모든 데이터 그리드/테이블은 HTML `<table>` + Tailwind CSS로 구현**
3. 정렬 기능: `useState(sortKey/sortDir)` + `useMemo` 패턴 사용 (BdStatusTable 참조)
4. 셀 렌더러: React 인라인 컴포넌트로 구현 (ProgressCell, StatusCell 등)
5. **금지 사유**: 라이선스 이슈 (`non-commercial-and-evaluation`), 번들 크기 (~550KB), deprecated 패키지
6. **참조 문서**: `docs/Handsontable_마이그레이션_계획서.md`
7. **롤백 태그**: `rollback-20260220-b2b3guard`

### 🔵 Rule 11: UI 슬림화 및 패딩 최소화 (2026-01-23)
1. 모든 테이블 셀 내의 불필요한 아이콘(드롭다운 꺽쇄, 날짜 아이콘 등)은 기본적으로 감춥니다.
2. 행 높이 및 패딩을 최소화하여 100% 배율에서 더 많은 정보가 보이도록 최적화합니다. (LLD No 등 주요 컬럼 패딩 0~2px)
3. 드롭다운이나 날짜 선택 등의 상호작용은 테이블 헤더 라벨링을 통해 암시하거나 호버 시에만 표시하여 화면을 넓고 깔끔하게 유지합니다.

---

## Project Overview

FMEA On-Premise is a Korean-language enterprise quality management system for APQP (Advanced Product Quality Planning), PFMEA/DFMEA (Process/Design FMEA), Control Plans, and PFD (Process Flow Diagrams). Built as a full-stack Next.js application with PostgreSQL.

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Frontend**: React 19.2.3, Radix UI, Tailwind CSS 4
- **Database**: PostgreSQL with Prisma ORM 7.2.0
- **Spreadsheets**: HTML `<table>` + Tailwind CSS for data grids, ExcelJS/xlsx for import/export
- **Charts**: Chart.js with react-chartjs-2

## Development Commands

```bash
# Development server (default port 3000)
npm run dev
npm run dev:4000    # Port 4000
npm run dev:5000    # Port 5000

# Production build
npm run build
npm start

# Database
npm run db:generate  # Generate Prisma client (run after schema changes)
npm run db:migrate   # Run migrations
npm run db:push      # Push schema to DB
npm run db:studio    # Open Prisma Studio GUI

# Linting
npm run lint
```

## Architecture

### Data Model Hierarchy

The system follows a strict hierarchical structure:

```
APQPProject (최상위)
├── FMEA Project (PFMEA/DFMEA)
│   ├── L1Structure (완제품 공정) → L1Function → FailureEffect
│   ├── L2Structure (공정) → L2Function → FailureMode
│   └── L3Structure (작업요소) → L3Function → FailureCause
│
├── ControlPlan (관리계획서)
│   └── CpAtomicProcess → Detectors, ControlItems, Methods, ReactionPlans
│
└── PFD (공정흐름도)
    └── PfdItem
```

### Key Database Patterns

1. **Hybrid ID System**: Tables use `parentId`, `mergeGroupId`, `rowSpan`, `colSpan` fields for row merging in worksheets
2. **FailureLink**: Central table connecting FailureMode ↔ FailureEffect ↔ FailureCause (FM-FE-FC triad)
3. **Atomic DB Pattern**: Control Plan uses atomic row-level tables for worksheet synchronization

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # 55+ REST API routes
│   ├── apqp/              # APQP module
│   ├── pfmea/             # PFMEA module (register, worksheet, import, revision)
│   ├── dfmea/             # DFMEA module
│   ├── control-plan/      # Control Plan module
│   ├── pfd/               # Process Flow Diagram
│   └── master/            # Master data management
├── components/
│   ├── layout/            # Header, Sidebar, TopNav
│   ├── modals/            # Dialog components
│   ├── tables/            # Table components
│   └── worksheets/        # Worksheet-specific components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   └── fmea-core/         # Core FMEA logic
└── types/                 # TypeScript type definitions
```

### Module Pattern (Worksheets)

Each worksheet module follows this structure:
```
worksheet/
├── page.tsx              # Main page (<700 lines)
├── constants.ts
├── utils.ts
├── components/
├── hooks/
├── tabs/                 # Tab-specific components
└── panels/               # Right-side panels (AP Table, RPN Chart, Tree)
```

## Key Rules

### File Size Limits
- **Maximum 700 lines per file** - split larger files
- New features should always be in new files
- Separate data/constants into `data/` folders

### Worksheet Design Principles
1. Menu bar fixed at top, doesn't scroll
2. Only one horizontal scrollbar per container
3. Vertical scrollbar controls worksheet only
4. Design for 1440px browser width

### Database Operations
- Always use `prisma.ts` singleton from `@/lib/prisma`
- Schema file: `prisma/schema.prisma`
- Run `npm run db:generate` after schema changes

### Git Hooks
Protected paths are enforced via git hooks:
- `pre-commit`: Check staged files
- `commit-msg`: Validate commit messages
- `pre-push`: Branch protection

## Important Files

- `prisma/schema.prisma` - Database schema (60+ models)
- `src/lib/prisma.ts` - Prisma client singleton
- `src/app/api/` - All API endpoints
- `docs/` - Extensive documentation (50+ files)
- `scripts/` - Database and migration utilities

## Documentation References

- `docs/MODULARIZATION_GUIDE.md` - File organization patterns
- `docs/WORKSHEET_DESIGN_PRINCIPLES.md` - UI layout rules
- `docs/DB_SCHEMA.md` - Database schema details
- `docs/중요_ONPREMISE_MASTER_PLAN.md` - FMEA workflow sequence
- `docs/매뉴얼사진/02_사용자매뉴얼.md` - 사용자 매뉴얼 (업무 순서 기반)

### 사용자 매뉴얼 이미지 규칙
- 이미지 저장 경로: `docs/images/`
- 매뉴얼 내 이미지 자리 표시 형식:
  ```markdown
  > 📸 **[화면 캡처]** 화면 설명
  >
  > ![대체텍스트](images/파일명.png)
  ```
- 사용자가 직접 캡처 → `docs/images/`에 저장 → 마크다운에서 자동 표시
- 매뉴얼은 **업무 순서 기반** 구성 (등록→Import→워크시트→연동→관리)
