# 🔧 개발자 핸드오프: `fix/db-atomicity-audit`

> **작성일**: 2026-02-10  
> **브랜치**: `fix/db-atomicity-audit`  
> **목적**: DB 원자성 감사 — 에러 처리 + 가드 추가 (기존 기능 로직 변경 없음)

---

## 1. 환경 셋업

```bash
git fetch origin
git checkout fix/db-atomicity-audit
npm install
npm run db:generate
npm run build
```

---

## 2. 커밋 이력 (6건)

| # | 커밋 | 설명 |
|---|------|------|
| 1 | `33de05f0` | Docker 배포 준비 — `.gitignore` 정리 + 미커밋 파일 일괄 추가 |
| 2 | `2837d1c0` | 서버 원클릭 배포 스크립트 추가 (`deploy.sh`) |
| 3 | `54ab9721` | 전체 모듈 리스트 삭제 기능 code-freeze — `confirm/alert` → `useConfirmDialog/toast` 마이그레이션 |
| 4 | `c94f1c89` | DFMEA 리스트 페이지 — 서버 prefix 필터 영속화 |
| 5 | `aa7e2f30` | PFMEA 워크시트 — DFMEA prefix 필터 영속화 |
| 6 | `64b8a896` | **DB 원자성 감사 P0~P1 수정 6건** — 트랜잭션 안전성 + 빈 데이터 보호 |

---

## 3. 변경 범위 (테스트 포인트)

| 영역 | 테스트 항목 |
|------|------------|
| **PFMEA 워크시트 저장** | 빈 상태에서 자동저장이 DB를 덮어쓰지 않는지 확인 |
| **PFMEA 워크시트 로드** | 고장연결(`failureLinks`) 로드 후 ID-텍스트 매핑 정상 여부 |
| **CP 등록** | CP 등록 + CFT 멤버 저장이 정상 동작하는지 |
| **FMEA 프로젝트 생성** | 등록 화면에서 프로젝트 생성 시 에러 없는지 |

---

## 4. 주요 변경 파일

### DB 원자성 감사 (핵심)
| 파일 | 변경 내용 |
|------|----------|
| `src/lib/services/fmea-project-service.ts` | `fmeaType` 필터 가드 조건 개선 |
| `src/app/pfmea/worksheet/hooks/useWorksheetSave.ts` | 빈 데이터 자동저장 보호 가드 추가 |
| `src/app/pfmea/worksheet/hooks/useWorksheetDataLoader.ts` | 데이터 로드 안전성 보강 |
| `src/app/pfmea/worksheet/hooks/useWorksheetState.ts` | 상태 초기화 가드 |
| `src/app/pfmea/worksheet/page.tsx` | 저장 트리거 가드 |
| `src/app/pfmea/worksheet/tabs/StructureTab.tsx` | 구조분석 셀 가드 |
| `src/app/pfmea/worksheet/tabs/fmea4/Fmea4Tab.tsx` | FMEA 4탭 가드 |
| `src/app/api/cp/register/route.ts` | CP 등록 트랜잭션 안전성 |
| `src/app/api/fmea/register/route.ts` | FMEA 등록 트랜잭션 안전성 |

### 삭제 기능 code-freeze
| 파일 | 변경 내용 |
|------|----------|
| `src/app/*/list/page.tsx` (6개 모듈) | `confirm()` → `useConfirmDialog` + `toast` 전환 |
| `src/hooks/useConfirmDialog.tsx` | 공통 확인 다이얼로그 훅 |
| `src/hooks/useToast.ts` | 공통 토스트 훅 |
| `src/components/ui/ToastContainer.tsx` | 토스트 UI 컴포넌트 |

### 배포/인프라
| 파일 | 변경 내용 |
|------|----------|
| `deploy.sh` | 서버 원클릭 배포 스크립트 |
| `.gitignore` | Docker/배포 관련 파일 정리 |

---

## 5. 주의사항

> [!IMPORTANT]
> - 기존 기능 로직은 **변경 없음** (에러 처리 + 가드만 추가)
> - **UI 변경 없음**
> - **DB 스키마 변경 없음** → `db:migrate` 불필요

> [!TIP]
> 빌드 에러가 나면 `tsc --noEmit`으로 타입 체크를 먼저 해보세요.  
> `next.config.ts`에 `ignoreBuildErrors: true`가 설정되어 있어 빌드는 통과하지만,  
> 실제 타입 에러는 `tsc`로 잡아야 합니다.

---

## 6. 검증 체크리스트

- [ ] PFMEA 워크시트 빈 상태 → 자동저장 트리거 → DB 기존 데이터 보존 확인
- [ ] PFMEA 워크시트 로드 → 고장연결 탭 → ID-텍스트 매핑 정상
- [ ] CP 등록 화면 → 신규 등록 + CFT 멤버 저장 → 정상 완료
- [ ] FMEA 프로젝트 등록 → 신규 생성 → 에러 없이 완료
- [ ] DFMEA/PFMEA 목록 페이지 → 프로젝트 목록 정상 표시
- [ ] 모든 모듈 리스트 → 삭제 버튼 → 확인 다이얼로그 + 토스트 동작
