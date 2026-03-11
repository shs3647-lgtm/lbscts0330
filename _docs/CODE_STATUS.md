# 📋 코드 상태 현황

> **최종 업데이트**: 2026-02-04
> **참고 문서**: [HARDCODING.md](./HARDCODING.md)

---

## 🔒 코드프리즈 파일 목록

### 🔴 LEVEL 1 - 절대 수정 금지
| 파일 | 설명 | 프리즈 날짜 | 담당자 |
|------|------|------------|--------|
| `src/types/linkage.ts` | 모듈 ID 접두사 규칙 (APP_CONFIGS) | 2026-02-04 | AI |

### 🟡 LEVEL 2 - 버그 수정만 허용
| 파일 | 설명 | 프리즈 날짜 | 담당자 |
|------|------|------------|--------|
| `src/app/pfmea/list/page.tsx` | PFMEA 리스트 페이지 | 2026-02-04 | AI |
| `src/app/pfmea/worksheet/components/TopMenuBar.tsx` | 워크시트 상단 메뉴바 (연동/이동 버튼) | 2026-02-04 | AI |
| `src/app/pfmea/worksheet/components/CpSyncWizard.tsx` | CP 연동 위저드 (병합구조/4M제외 규칙) | 2026-02-04 | AI |
| `src/app/control-plan/worksheet/hooks/useFmeaSync.ts` | CP→FMEA/PFD 동기화 훅 (병합구조/4M제외) | 2026-02-05 | AI |

### 🟢 LEVEL 3 - 신중한 수정
| 파일 | 설명 | 프리즈 날짜 | 담당자 |
|------|------|------------|--------|
| - | - | - | - |

---

## ⚙️ 하드코딩 적용 파일

| 파일 | 하드코딩 항목 | 적용 날짜 |
|------|-------------|----------|
| `src/app/pfmea/list/page.tsx` | CONFIG, COLUMN_WIDTHS (체크박스/No 2.5% 고정), 컬럼 정의 | 2026-02-04 |
| `src/types/linkage.ts` | APP_CONFIGS (모듈 접두사: APQ, PFM, DFM, PFD, CP, WS, PM) | 2026-02-04 |
| `src/app/pfmea/worksheet/components/CpSyncWizard.tsx` | CP_MERGE_STRUCTURE, M4_EXCLUDE_FROM_CP, SPECIAL_CHAR_CODES | 2026-02-04 |
| `src/app/control-plan/worksheet/hooks/useFmeaSync.ts` | CP_MERGE_STRUCTURE, M4_EXCLUDE | 2026-02-05 |

---

## 🛡️ 랩핑 적용 함수

| 파일 | 함수명 | 랩핑 유형 | 적용 날짜 |
|------|--------|----------|----------|
| `src/app/pfmea/list/page.tsx` | handleDelete | console.log 디버그 | 2026-02-04 |

---

## 📝 변경 이력

| 날짜 | 파일 | 변경 내용 | 상태 변경 |
|------|------|----------|----------|
| 2026-02-04 | pfmea/list/page.tsx | 체크박스/No 컬럼 2.5% 고정, 반응형 적용 | → L2 FREEZE |
| 2026-02-04 | types/linkage.ts | APP_CONFIGS APQP→APQ 변경 | → L1 FREEZE |
| 2026-02-04 | pfmea/list/page.tsx | TYPE/공정책임 컬럼 제거, UI 최적화 | → L2 FREEZE |

---

> ⚠️ **주의**: 코드프리즈 파일 수정 시 반드시 이 문서도 업데이트하세요.
