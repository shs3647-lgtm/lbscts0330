# 앱별 itemCode 네임스페이스 충돌 매핑표

> 작성일: 2026-04-03
> 근거: `NAMING_AUDIT_REPORT.md` Phase 1 전수조사 결과

---

## 1. 앱별 itemCode 의미 비교표

### A 계열 (공정/구조 정보)

| Code | PFMEA (표준) | CP (관리계획서) | PFD (공정흐름도) | 충돌 |
|------|-------------|----------------|-----------------|------|
| **A1** | 공정번호 (processNo) | 공정번호 (processNo) | 공정번호 (processNo) | ✅ 동일 |
| **A2** | 공정명 (processName) | 공정명 (processName) | 공정명 (processName) | ✅ 동일 |
| **A3** | **공정기능** (L2 function) | **레벨** (Main/Sub) | **공정설명** (processDesc) | ⛔ 3앱 모두 다름 |
| **A4** | **제품특성** (productChar) | **공정설명** (processDesc) | **작업요소** (workElement) | ⛔ 3앱 모두 다름 |
| **A5** | **고장형태** (failureMode) | **설비/금형/지그** (equipment) | **설비/금형/지그** (equipment) | ⛔ PFMEA ≠ CP=PFD |
| **A6** | **검출관리** (detectionCtrl) | **EP** (Error Proof Y/N) | — (미사용) | ⛔ 다름 |
| **A7** | — (미사용) | **자동검사장치** (autoDetector) | — (미사용) | CP 전용 |

### B 계열 (특성/고장 정보)

| Code | PFMEA (표준) | CP (관리계획서) | PFD (공정흐름도) | 충돌 |
|------|-------------|----------------|-----------------|------|
| **B1** | **작업요소** (WE) | **제품특성** (productChar) | **제품특별특성** (productSC) | ⛔ 3앱 모두 다름 |
| **B2** | **요소기능** (L3 function) | **공정특성** (processChar) | **제품특성** (productChar) | ⛔ 3앱 모두 다름 |
| **B3** | **공정특성** (processChar) | **특별특성기호** (SC symbol) | **공정특별특성** (processSC) | ⛔ 3앱 모두 다름 |
| **B4** | **고장원인** (failureCause) | **스펙/공차** (spec) | **공정특성** (processChar) | ⛔ 3앱 모두 다름 |
| **B5** | **예방관리** (preventionCtrl) | **평가방법** (evalMethod) | — (미사용) | ⛔ 다름 |
| **B6** | — | 샘플크기 | — | CP 전용 |
| **B7** | — | 주기 (freq) | — | CP 전용 |
| **B7-1** | — | 관리방법 (controlMethod) | — | CP 전용 |
| **B8** | — | 책임1 (owner1) | — | CP 전용 |
| **B9** | — | 책임2 (owner2) | — | CP 전용 |
| **B10** | — | 대응계획 (reactionPlan) | — | CP 전용 |

### C 계열 (PFMEA L1 전용)

| Code | PFMEA (표준) | CP | PFD | 충돌 |
|------|-------------|-----|-----|------|
| **C1** | 구분 (scope) | — | — | PFMEA 전용 |
| **C2** | 제품기능 (productFunction) | — | — | PFMEA 전용 |
| **C3** | 요구사항 (requirement) | — | — | PFMEA 전용 |
| **C4** | 고장영향 (failureEffect) | — | — | PFMEA 전용 |

---

## 2. FA검증 PRD 코드 충돌

`faValidation.ts`에서 PRD 체크리스트 항목으로 C0~C5를 사용하며, FMEA L1 컬럼 코드 C1~C4와 동일 문자열이 다른 의미로 사용됨.

| PRD 코드 | FA검증 의미 | FMEA 컬럼 의미 | 충돌 여부 |
|----------|-----------|---------------|----------|
| **C0** | 엑셀 수식 vs 파서 불일치 (체인/FM/FC/FE 건수) | — (미사용) | 없음 |
| **C1** | FC시트 없음 / 체인 건수 불일치 | **구분** (L1 scope) | ⚠️ 같은 문자열, 다른 의미 |
| **C2** | FM 고유건수 불일치 | **제품기능** (L1 function) | ⚠️ 같은 문자열, 다른 의미 |
| **C3** | FC 고유건수 불일치 | **요구사항** (L1 requirement) | ⚠️ 같은 문자열, 다른 의미 |
| **C4** | FE 고유건수 불일치 | **고장영향** (L1 FE) | ⛔ **같은 파일에서 두 의미로 사용** |
| **C5** | verificationPass 실패 | — (미사용) | 없음 |

> ⛔ `faValidation.ts` L133: `failedItems.push('C4')` (PRD 의미)
> ⛔ `faValidation.ts` L145: `r.itemCode === 'C4'` (FMEA 컬럼 의미)
> **같은 함수 내에서 같은 문자열 'C4'가 두 가지 의미**

---

## 3. DataSelectModal 코드 체계 혼재

`DataSelectModal.tsx` + `defaultItems.ts`에서 3가지 코드 체계 혼재:

| 체계 | 사용 코드 | 의미 | 파일 |
|------|----------|------|------|
| **PFMEA Import** | `C1`~`C4` | L1 컬럼 ID (구분/기능/요구/FE) | `defaultItems.ts` L19~22 |
| **고장 엔티티** | `FM1`, `FC1`, `FE1`, `FE2` | 고장형태/원인/영향 (모달용) | `defaultItems.ts` L26~29 |
| **PFMEA Import** | `A5`, `B4`, `C4` | 같은 FM/FC/FE (flat 코드) | Import 파이프라인 |

> 모달에서 `FM1`=고장형태 ↔ Import에서 `A5`=고장형태 → 같은 데이터, 다른 코드
> 모달에서 `FE2`=고장영향 ↔ Import에서 `C4`=고장영향 → 같은 데이터, 다른 코드

---

## 4. 제안: 접두사 분리 체계

### CP 전용 코드 (CP_ 접두사)

| 기존 코드 | 제안 상수명 | 의미 |
|----------|-----------|------|
| `'A3'` | `CP_A3` | 레벨 (Level) |
| `'A4'` | `CP_A4` | 공정설명 (Process Desc) |
| `'A5'` | `CP_A5` | 설비 (Equipment) |
| `'A6'` | `CP_A6` | EP (Error Proof) |
| `'A7'` | `CP_A7` | 자동검사장치 (Auto Detector) |
| `'B1'` | `CP_B1` | 제품특성 (Product Char) |
| `'B2'` | `CP_B2` | 공정특성 (Process Char) |
| `'B3'` | `CP_B3` | 특별특성기호 (SC) |
| `'B4'` | `CP_B4` | 스펙/공차 (Spec) |
| `'B5'` | `CP_B5` | 평가방법 (Eval Method) |
| `'B6'`~`'B10'` | `CP_B6`~`CP_B10` | CP 전용 (샘플~대응계획) |

> A1, A2는 PFMEA와 동일 의미이므로 접두사 불필요

### PFD 전용 코드 (PFD_ 접두사)

| 기존 코드 | 제안 상수명 | 의미 |
|----------|-----------|------|
| `'A3'` | `PFD_A3` | 공정설명 (Process Desc) |
| `'A4'` | `PFD_A4` | 작업요소 (Work Element) |
| `'A5'` | `PFD_A5` | 설비 (Equipment) |
| `'B1'` | `PFD_B1` | 제품특별특성 (Product SC) |
| `'B2'` | `PFD_B2` | 제품특성 (Product Char) |
| `'B3'` | `PFD_B3` | 공정특별특성 (Process SC) |
| `'B4'` | `PFD_B4` | 공정특성 (Process Char) |

> A1, A2는 PFMEA와 동일 의미이므로 접두사 불필요

### FA PRD 코드 (FA_ 접두사)

| 기존 코드 | 제안 상수명 | 의미 |
|----------|-----------|------|
| `'C0'` | `FA_C0` | 엑셀 수식 vs 파서 불일치 |
| `'C1'` | `FA_C1` | FC시트 없음 / 체인 불일치 |
| `'C2'` | `FA_C2` | FM 고유건수 불일치 |
| `'C3'` | `FA_C3` | FC 고유건수 불일치 |
| `'C4'` | `FA_C4` | FE 고유건수 불일치 |
| `'C5'` | `FA_C5` | verificationPass 실패 |

### DataSelectModal 코드 (변경 없음, 문서화만)

| 코드 | 의미 | 비고 |
|------|------|------|
| `C1`~`C4` | PFMEA L1 컬럼 ID | PFMEA 표준과 동일, 변경 불필요 |
| `FM1` | 고장형태 (모달용) | PFMEA `A5`와 동일 데이터, 모달 전용 코드 |
| `FC1` | 고장원인 (모달용) | PFMEA `B4`와 동일 데이터, 모달 전용 코드 |
| `FE1` | FE 구분 (모달용) | PFMEA `C1` FE 맥락 |
| `FE2` | 고장영향 (모달용) | PFMEA `C4`와 동일 데이터, 모달 전용 코드 |

> DataSelectModal은 PFMEA 전용 UI이므로, FM1/FC1/FE2 코드는 이 모달 내에서만 사용.
> Import 코드 A5/B4/C4와의 매핑만 주석으로 명시하면 충분.

---

## 5. 영향받는 파일 목록

### CP 파일 (접두사 적용 대상)

| 파일 | 사용 코드 | 변경 범위 |
|------|----------|----------|
| `src/app/api/control-plan/[id]/master-data/route.ts` | A1~A5, B1~B10 | 상수 참조 교체 |
| `src/app/api/control-plan/[id]/basic-info/route.ts` | A1, A2 | 변경 불필요 (동일) |
| `src/app/api/control-plan/[id]/stats/route.ts` | A1~B10 그룹 | 상수 참조 교체 |
| `src/app/api/control-plan/master-to-worksheet/route.ts` | A1~B10 switch | 상수 참조 교체 |
| `src/app/api/control-plan/master/sync.ts` | A1~B10 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/hooks/useImportHandlers.ts` | A1~B5 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/hooks/useEditHandlers.ts` | A1~B5 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/page.tsx` | A2, B1, B2 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/excel-template.ts` | A1~B5 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/components/CpMasterPreviewTabs.tsx` | A1~B10 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/components/PreviewTable.tsx` | A1~B5 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/components/CpRelationPanel.tsx` | A1~B5 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/import/components/CpCellInputModal.tsx` | A4, B3 (PFMEA ref) | 주석 명확화 |
| `src/app/(fmea-core)/control-plan/worksheet/components/StandardInputModal.tsx` | B1~B8 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/worksheet/components/EquipmentInputModal.tsx` | A5 | 상수 참조 교체 |
| `src/app/(fmea-core)/control-plan/register/components/CpMasterInfoTable.tsx` | A1~B5 | 상수 참조 교체 |

### PFD 파일 (접두사 적용 대상)

| 파일 | 사용 코드 | 변경 범위 |
|------|----------|----------|
| `src/app/(fmea-core)/pfd/import/constants.ts` | A1~B4 | 상수 참조 교체 |
| `src/app/(fmea-core)/pfd/import/hooks/useImportHandlers.ts` | A1~B4 | 상수 참조 교체 |
| `src/app/(fmea-core)/pfd/import/hooks/useEditHandlers.ts` | A1~B4 | 상수 참조 교체 |
| `src/app/(fmea-core)/pfd/import/page.tsx` | A3~B4 | 상수 참조 교체 |
| `src/app/(fmea-core)/pfd/import/excel-template.ts` | A1~B4 | 상수 참조 교체 |
| `src/app/(fmea-core)/pfd/import/components/PreviewTable.tsx` | A1~B4 | 상수 참조 교체 |

### FA 파일 (접두사 적용 대상)

| 파일 | 사용 코드 | 변경 범위 |
|------|----------|----------|
| `src/app/(fmea-core)/pfmea/import/utils/faValidation.ts` | C0~C5 (PRD), C4 (FMEA) | PRD 코드에 FA_ 접두사 |

---

## 6. 구현 시 주의사항

1. **DB 저장값은 변경하지 않는다** — `CpMasterFlatItem.itemCode`와 `PfdMasterFlatItem.itemCode` 컬럼에 저장되는 값('A3', 'B1' 등)은 그대로 유지. 상수는 **코드 내 식별/가독성 개선**만 목적.

2. **상수값 = 기존 문자열** — `CP_A5 = 'A5'` (값 자체는 동일). DB 마이그레이션 불필요.

3. **PFMEA A1~C4는 수정하지 않는다** — 이미 확립된 표준이며 `types.ts`의 `ITEM_CODE_LABELS`가 SSoT.

4. **CP `A1`, `A2`와 PFD `A1`, `A2`는 PFMEA와 동일 의미** — 접두사 불필요하나, 상수 파일에는 완전성을 위해 포함하되 값은 공유 가능.
