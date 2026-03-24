# FMEA 온프레미스 출시 — 사이드바·연동 메뉴 Forge 감사 보고서

> **문서 버전:** 1.0  
> **작성일:** 2026-03-22  
> **범위:** `SidebarRouter` → `FmeaSidebar` / `Sidebar`(Full)에 노출되는 경로, 대응 `page.tsx`, 이중 정의·리스크, 자동 검증  
> **방법론:** Forge (EXPLORE → PLAN → EXECUTE → VERIFY → 문서화)

---

## 1. Forge 프로세스 적용 요약

| 단계 | 산출물 |
|------|--------|
| **EXPLORE** | `FmeaSidebar.tsx`, `Sidebar.tsx`, `SidebarRouter.tsx`, `SidebarShell.tsx`, `src/app/**/page.tsx` 전수 매핑 |
| **PLAN** | 본 문서 구조 + `scripts/audit-fmea-sidebar-routes.ts` 유지보수 규칙 |
| **EXECUTE** | 감사 스크립트 추가, 보고서 작성 |
| **VERIFY** | `npx tsx scripts/audit-fmea-sidebar-routes.ts` → **EXIT 0** (33개 기대 경로 모두 `page.tsx` 존재) |
| **COMMIT** | 스크립트·본 문서·`package.json` 스크립트 항목 |

> **TDD:** 이번 작업은 **라우트 존재 정적 검증** 위주이며, UI E2E는 별도 Playwright 시나리오(출시 체크리스트 §7)로 권장.

---

## 2. 사이드바 라우팅 원리

| 조건 | 컴포넌트 |
|------|----------|
| `pathname`이 `^\/(pfmea\|control-plan\|pfd\|master\|myjob\|approval\|admin\|part-fmea)/` 에 매칭 | **`FmeaSidebar`** (`SidebarShell`) |
| 그 외 (예: `/dashboard`, `/welcomeboard`, `/login`) | **`Sidebar`** (레거시 Full 사이드바, `Sidebar.tsx`) |

- **Part FMEA:** 글로벌 사이드바 **최상위 메뉴는 제거됨** (2026-03-22). `/part-fmea/*` 직접 URL·API·등록 연동은 유지.  
- **동일 앱 내 사이드바 이중 구현:** 운영 시 **메뉴 불일치** 위험 → §6 권고.

---

## 3. FMEA Core 사이드바 (`FmeaSidebar.tsx`) 메뉴 전체

### 3.1 My Job

| 라벨 | href | 대응 페이지 (요약) |
|------|------|-------------------|
| 나의 업무현황 | `/myjob` | `(common)/myjob/page.tsx` |
| 결재현황 | `/approval/approver-portal` | `(common)/approval/approver-portal/page.tsx` |
| 프로젝트 진행현황 | `/pfmea/list` | PFMEA 리스트 |
| AP 개선 진행현황 | `/pfmea/ap-improvement` | AP 개선 |

### 3.2 PFMEA

| 라벨 | href |
|------|------|
| 대시보드 | `/pfmea/dashboard` |
| 등록 | `/pfmea/register` |
| 리스트 | `/pfmea/list` |
| New FMEA | `/pfmea/worksheet` |
| 개정관리 | `/pfmea/revision` |
| LLD(필터코드) | `/pfmea/lld` |
| AP 개선관리 | `/pfmea/ap-improvement` |

**상위 클릭:** `/pfmea` → `(fmea-core)/pfmea/page.tsx`

**사이드바에 없으나 구현된 주요 PFMEA 경로 (출시 QA 시 참고):**  
`/pfmea/compare`, `/pfmea/import/manual`, `/pfmea/import/legacy`, `/pfmea/cft`, `/pfmea/all-template`, `/pfmea/fmea4`, `/pfmea/approve` 등 — **직접 URL·내부 링크로만 진입.**

### 3.3 Control Plan / PFD

`createSubItems(base)` 공통:

| 라벨 | 경로 패턴 |
|------|-----------|
| 대시보드 | `{base}/dashboard` |
| 등록 | `{base}/register` |
| 리스트 | `{base}/list` |
| 작성화면 | `{base}/worksheet` |
| 개정관리 | `{base}/revision` |

- `base=/control-plan` → 모두 `(fmea-core)/control-plan/.../page.tsx` 존재.  
- `base=/pfd` → 모두 `(fmea-core)/pfd/.../page.tsx` 존재.  
- **추가 노출 경로:** `/control-plan/import`, `/pfd/import` (기초정보 블록과 동일).

상위: `/control-plan`, `/pfd` 각 `page.tsx` 존재.

### 3.4 기초정보 (하단 블록)

| 라벨 | href |
|------|------|
| 고객사정보 | `/master/customer` |
| 사용자정보 | `/master/user` |
| PFMEA 임포트 | `/pfmea/import` |
| CP 기초정보 | `/control-plan/import` |
| PFD 기초정보 | `/pfd/import` |
| 데이타 복구 관리 | `/master/trash` |

상위: `/master` → `(fmea-core)/master/page.tsx`

### 3.5 시스템 관리

| 라벨 | href |
|------|------|
| 관리자 홈 | `/admin` |
| 사용자관리 | `/admin/users` |
| 권한(CSV) | `/admin/settings/users` |
| 결재환경설정 | `/admin/settings/approval` |

---

## 4. 정적 검증 결과

- **스크립트:** `npm run audit:sidebar-routes` (`scripts/audit-fmea-sidebar-routes.ts`)  
- **결과:** 기대 **33개** 고유 경로 모두 `src/app` 하위 `page.tsx`와 매칭 (**EXIT 0**).  
- **주의:** `FmeaSidebar`에 `createSubItems`처럼 **템플릿 리터럴**로만 정의된 경로는 스크립트가 자동 파싱하지 않음 → **스크립트 내 `expectedSidebarHrefs()`를 메뉴 변경 시 반드시 동기화.**

---

## 5. Full 사이드바 (`Sidebar.tsx`) — FMEA Core와의 차이

FMEA Core 경로에서는 `FmeaSidebar`가 쓰이므로, 일반 사용자는 아래 불일치를 **느끼지 않을 수 있음**. 다만 `/dashboard`, `/welcomeboard` 등 **비 FMEA 패턴** 진입 시 `Sidebar.tsx`가 로드됨.

| 항목 | `FmeaSidebar` | `Sidebar.tsx` (2026-03-22 조치 후) |
|------|----------------|--------------------------------------|
| Admin 하위 | `사용자관리` → `/admin/users`, `권한(CSV)` → `/admin/settings/users` | **동일하게 통일** |
| 결재 설정 라벨 | `결재환경설정` | **오타 `결제` → `결재` 수정** |

**남은 권고:** 메뉴 배열을 **`SidebarShell`용 공유 모듈**로 한 곳에서만 정의해 드리프트 방지(§6 P0).

---

## 6. 개선 과제 (우선순위)

### P0 — 출시 전 권장

1. **메뉴 단일 소스(SSoT):** `FmeaSidebar` vs `Sidebar.tsx` 중복 제거 → 공유 `menuConfig` + `SidebarShell`.  
2. ~~**`Sidebar.tsx` 오타·Admin 링크**~~ → **2026-03-22 반영** (`결재` 라벨, `/admin/users` + 권한(CSV) 행).

### P1 — 출시 직후

4. **감사 스크립트 CI 연계:** `npm run audit:sidebar-routes` 를 릴리스/주요 PR 게이트에 추가.  
5. **Playwright 스모크:** FMEA 패턴에서 사이드바 각 1-depth 링크 HTTP 200 (로그인 세션 모의).  

### P2 — 제품 기획 연동

6. **숨은 기능 노출:** `compare`, `fmea4` 등 — 매뉴얼/도움말에 URL 안내 또는 메뉴 정책 확정.  
7. **Part FMEA:** 사이드바 비노출 정책 유지 시, `docs/Fmea master family part cp pfd architecture.md` 등과 문구 일치 유지.

---

## 7. 출시 전 수동 체크리스트 (E2E)

- [ ] 로그인 후 `/pfmea/list` 에서 사이드바 전 항목 클릭 → 화면 로드·주요 API 오류 없음  
- [ ] CP/PFD **작성화면** 실제 데이터 로드 (빈 상태 안내 포함)  
- [ ] **PFMEA 임포트** `/pfmea/import` 파일 선택 ~ 미리보기까지  
- [ ] **Admin** 권한 계정으로 `/admin/users`, `/admin/settings/users` 각각 접근 의도 확인  
- [ ] **비 FMEA** 홈(`/dashboard` 등)에서 Full 사이드바 메뉴 클릭 시 의도한 화면인지 확인  

---

## 8. 참조 파일

| 파일 | 역할 |
|------|------|
| `src/components/layout/FmeaSidebar.tsx` | FMEA Core 메뉴 정의 |
| `src/components/layout/Sidebar.tsx` | 비 FMEA 구간 Full 메뉴 |
| `src/components/layout/SidebarRouter.tsx` | pathname → 사이드바 분기 |
| `src/components/layout/SidebarShell.tsx` | 공통 렌더 |
| `scripts/audit-fmea-sidebar-routes.ts` | 기대 경로 ↔ `page.tsx` 검증 |

---

## 9. 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-22 | 초안 — Forge 감사, 정적 라우트 검증 스크립트, P0~P2 권고 |
