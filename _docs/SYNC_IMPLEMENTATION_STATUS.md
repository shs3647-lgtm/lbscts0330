# 모듈 간 연동 구현 현황

> **최종 업데이트**: 2026-02-05  
> **목적**: PFMEA, CP, PFD 간 연동 구현 상태 추적

---

## 1. 연동 매트릭스

| 출발 ↓ / 도착 → | **FMEA** | **CP** | **PFD** |
|-----------------|:--------:|:------:|:-------:|
| **FMEA** | - | ✅ Wizard | ✅ API |
| **CP** | ✅ API | - | ✅ API |
| **PFD** | ✅ API | ✅ API | - |

### 범례
- ✅ Wizard: 위저드 UI + API 완료
- ✅ API: API 완료, 메뉴 버튼 연결됨

---

## 2. 구현 상세

### 2.1 FMEA 워크시트 연동 (출발: FMEA)

| 도착 | 함수 | 파일 | API | 상태 |
|------|------|------|-----|:----:|
| **CP 생성** | `handleCreateCp` | `useCpSync.ts` | `/api/pfmea/create-cp` | ✅ |
| **CP 연동 위저드** | `startSyncWizard` | `useCpSync.ts` + `CpSyncWizard.tsx` | `/api/pfmea/sync-to-cp/all` | ✅ |
| **PFD 생성** | `handleCreatePfd` | `useCpSync.ts` | `/api/pfmea/create-pfd` | ✅ |

### 2.2 CP 워크시트 연동 (출발: CP)

| 도착 | 함수 | 파일 | API | 상태 |
|------|------|------|-----|:----:|
| **FMEA 구조 동기화** | `handleStructureSync` | `useFmeaSync.ts` | `/api/sync/structure` | ✅ |
| **FMEA 데이터 동기화** | `handleDataSync` | `useFmeaSync.ts` | `/api/sync/data` | ✅ |
| **PFD 연동** | - | - | - | 🔶 TODO |

### 2.3 PFD 워크시트 연동 (출발: PFD)

| 도착 | 함수 | 파일 | API | 상태 |
|------|------|------|-----|:----:|
| **FMEA 구조 동기화** | `handleFmeaStructureSync` | `usePfdSync.ts` | `/api/sync/structure` | ✅ |
| **CP 구조 동기화** | `handleCpStructureSync` | `usePfdSync.ts` | `/api/sync/structure` | ✅ |
| **데이터 동기화** | `handleDataSync` | `usePfdSync.ts` | `/api/sync/data` | ✅ |

### 2.4 역방향 연동 (FMEA로 가져오기)

| 출발 | 함수 | 파일 | API | 상태 |
|------|------|------|-----|:----:|
| **CP → FMEA** | `handleCpToFmea` | `useCpSync.ts` | `/api/pfmea/sync-from-cp` | ✅ |
| **PFD → FMEA** | `handlePfdToFmea` | `useCpSync.ts` | `/api/pfmea/sync-from-pfd` | ✅ |

---

## 3. 하드코딩 상수

### 3.1 CP 병합 구조 (HARDCODED)

```typescript
const CP_MERGE_STRUCTURE = {
    PROCESS_PARENT: ['processNo', 'processName', 'processLevel', 'processDesc'],
    PRODUCT_CHAR_PARENT: 'partName',  // 제품특성 부모 = 부품명
    PROCESS_CHAR_PARENT: 'equipment', // 공정특성 부모 = 설비 (4M=MC)
} as const;
```

### 3.2 4M 제외 규칙 (HARDCODED)

```typescript
const M4_EXCLUDE_FROM_CP = ['MN'] as const; // 사람(MN)은 CP 연동에서 제외
```

### 3.3 특별특성 코드 (HARDCODED)

```typescript
const SPECIAL_CHAR_CODES = ['CC', 'SC', 'IC'] as const;
```

---

## 4. 컬럼 매핑 규칙

### 4.1 FMEA → CP 매핑

| FMEA 소스 | CP 컬럼 | 병합 |
|----------|--------|:----:|
| `L2.no` | processNo | ✅ |
| `L2.name` | processName | ✅ |
| `L2.level` | processLevel | ✅ |
| `L2.functions[].name` | processDesc | ✅ |
| `partName` | partName | ✅ (제품특성 부모) |
| `[4M] L3.name` | workElement | ✅ (공정특성 부모) |
| `L2.functions[].productChars[].name` | productChar | |
| `L3.functions[].processChars[].name` | processChar | |
| `specialChar` | specialChar | |

### 4.2 CP 행 계산

```
CP 행 수 = 제품특성 개수 + 공정특성 개수 (MN 제외)
```

---

## 5. 관련 파일

### FMEA 워크시트
- `src/app/pfmea/worksheet/hooks/useCpSync.ts`
- `src/app/pfmea/worksheet/components/CpSyncWizard.tsx`

### CP 워크시트
- `src/app/control-plan/worksheet/hooks/useFmeaSync.ts`
- `src/app/control-plan/worksheet/components/CPTopMenuBar.tsx`

### PFD 워크시트
- `src/app/pfd/worksheet/hooks/usePfdSync.ts`
- `src/app/pfd/worksheet/components/PfdTopMenuBar.tsx`

### API
- `src/app/api/pfmea/create-cp/route.ts`
- `src/app/api/pfmea/create-pfd/route.ts`
- `src/app/api/pfmea/sync-to-cp/all/route.ts`
- `src/app/api/pfmea/sync-from-cp/route.ts`
- `src/app/api/pfmea/sync-from-pfd/route.ts`
- `src/app/api/sync/structure/route.ts`
- `src/app/api/sync/data/route.ts`

---

## 6. 변경 이력

| 날짜 | 버전 | 내용 |
|-----|------|-----|
| 2026-02-04 | 1.0 | 연동 현황 문서 작성 |
| 2026-02-04 | 1.1 | 하드코딩 상수 추가 (CP 병합 구조) |
