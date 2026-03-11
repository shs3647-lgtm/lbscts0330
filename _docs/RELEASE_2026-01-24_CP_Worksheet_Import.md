# CP 병합된 워크시트 Import 기능 - 코드프리즈 문서

> **Release Date**: 2026-01-24 21:27 (Code Freeze)  
> **Version**: 1.0.0  
> **Author**: Antigravity AI Assistant

---

## 📋 개요

Control Plan(관리계획서) 모듈에 **병합된 Excel 파일을 원자성 DB에 저장**하는 기능을 추가했습니다.

기존에는 병합된 셀이 포함된 Excel 파일을 Import할 때, 공정번호당 1개의 레코드만 저장되어 다수의 특성 정보가 손실되는 문제가 있었습니다. 이번 업데이트로 각 행을 개별 레코드로 저장하고, 병합 정보(rowSpan, mergeGroupId)를 함께 기록하여 Excel 원본과 동일한 레이아웃을 재현할 수 있게 되었습니다.

---

## 🆕 신규 기능

### 1. 워크시트 Import 기능

| 항목 | 설명 |
|------|------|
| **위치** | CP Import 페이지 → 4번째 행 (보라색 테마) |
| **기능** | 병합된 CP 워크시트 Excel 파일을 원자성 DB에 저장 |
| **동작** | Import 완료 후 자동으로 워크시트 페이지 이동 |

### 2. 신규 파일

| 파일 경로 | 설명 |
|-----------|------|
| `src/app/control-plan/import/worksheet-excel-parser.ts` | Excel 병합 정보 파싱 (ExcelJS 기반) |
| `src/app/api/control-plan/import-worksheet/route.ts` | 원자성 DB 저장 API |

### 3. UI 변경

- `ImportMenuBar.tsx`: 워크시트 Import 행 추가 (보라색)
- `page.tsx`: 워크시트 Import 핸들러 및 상태 관리

---

## 🔧 스키마 변경

### CpAtomicProcess

```prisma
// 변경 전
@@unique([cpNo, processNo])

// 변경 후 (여러 행 허용)
@@index([cpNo, processNo])
@@index([cpNo, rowIndex])
```

### CpAtomicControlMethod

```prisma
// 신규 필드 추가
controlMethod String? // 관리방법
```

---

## 🐛 버그 수정 및 안정화

| 파일 | 수정 내용 |
|------|-----------|
| `step/route.ts` | `@/lib/prismaClient` → `@/lib/prisma` 모듈 경로 수정 |
| `useImportHandlers.ts` (CP) | `RefObject<HTMLInputElement>` → `HTMLInputElement \| null` |
| `useImportHandlers.ts` (PFD) | 동일 RefObject 타입 수정 |
| `worksheet/page.tsx` | `createEmptyItem()` → `createEmptyItem(state.cpNo)` |
| `useProcessHandlers.ts` | `item.l3` → `(item.l3 \|\| [])` 옵셔널 체이닝 |
| `useRowsCalculation.ts` | `row.l1TypeId` 등 undefined 기본값 처리 |
| `useWorksheetSave.ts` | `migrateToAtomicDB(worksheetData as any)` 타입 캐스팅 |
| `useRegisterHandlers.ts` | `bizInfo.bizName` → `bizInfo.factory` 등 필드명 수정 |

### 삭제된 파일

- `src/app/dfmea/worksheet/hooks/_deprecated/` 폴더 전체 삭제 (미사용 레거시 코드)

---

## ✅ 테스트 결과

```bash
npx tsc --noEmit
# Exit code: 0 (오류 없음)
```

---

## 📂 영향받는 파일 목록

```
prisma/schema.prisma
src/app/api/control-plan/import-worksheet/route.ts (신규)
src/app/api/control-plan/step/route.ts
src/app/control-plan/import/worksheet-excel-parser.ts (신규)
src/app/control-plan/import/page.tsx
src/app/control-plan/import/components/ImportMenuBar.tsx
src/app/control-plan/import/hooks/useImportHandlers.ts
src/app/control-plan/worksheet/page.tsx
src/app/dfmea/worksheet/hooks/useProcessHandlers.ts
src/app/dfmea/worksheet/hooks/useRowsCalculation.ts
src/app/dfmea/worksheet/hooks/useWorksheetSave.ts
src/app/pfd/import/hooks/useImportHandlers.ts
src/app/pfmea/register/hooks/useRegisterHandlers.ts
```

---

## 🚀 사용 방법

1. **CP Import 페이지** 접속: `/control-plan/import`
2. **CP 선택**: 드롭다운에서 대상 CP 선택 (예: `cp26-m001`)
3. **워크시트 Import 행**에서 **파일 선택** 클릭
4. 병합된 관리계획서 Excel 파일 선택
5. 파싱 완료 후 **적용** 버튼 클릭
6. 자동으로 워크시트 페이지로 이동하여 결과 확인

---

## ⚠️ 주의사항

- Excel 파일의 **첫 번째 시트**만 파싱됩니다.
- **헤더 행**은 자동 감지되며, 데이터는 헤더 다음 행부터 시작합니다.
- 병합된 셀의 값은 첫 번째 셀의 값을 사용하며, 하위 셀에 자동 상속됩니다.

---

## 📌 향후 계획

1. **워크시트 화면 rowSpan 적용**: 저장된 병합 정보를 기반으로 테이블 셀 병합 표시
2. **Excel Export 병합 복원**: Export 시 원본 병합 구조 재현
3. **다중 시트 지원**: 여러 시트가 포함된 Excel 파일 처리

---

*Code Freeze: 2026-01-24 21:27 KST*
