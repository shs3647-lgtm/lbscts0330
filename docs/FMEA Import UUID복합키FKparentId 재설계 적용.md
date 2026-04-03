## 작업: FMEA Import UUID/복합키/FK/parentId 재설계 적용 — Phase 3

### 선행 완료 사항
- Phase 1: 네이밍 전수조사 완료 (85파일, 120개소 하드코딩 식별)
- Phase 2A: CP/PFD/FA 네임스페이스 분리 완료 (cp-column-ids.ts, pfd-column-ids.ts 생성)
- Phase 2B: PFMEA 헤더 정규화 완료 (pfmea-header-map.ts 생성, 12파일 수정)

### 핵심 의사결정 (확정)

| 항목 | 결정 | 근거 |
|------|------|------|
| A4 dedupKey | `ProcessProductChar.id` (엔티티 FK) 기준 | SSoT. `L2Function.productChar`는 텍스트 캐시 |
| C3 parentId | `L1Function.id` 기준 | 현재 렌더링/편집 파이프라인이 `L1Function.requirement` 사용. `L1Requirement`는 저장만 |

### 엔티티 명칭 규칙 (Phase 2에서 확정)
- Import 컬럼 ID: A1~A6, B1~B5, C1~C4 (기존 유지)
- 엔티티(DB 모델): ST_L1/ST_L2/ST_L3, FN_L1/FN_L2/FN_L3, FL_FE/FL_FM/FL_FC
- 상수 참조: `FMEA_COLUMN_IDS`, `pfmea-header-map.ts`

### 이 Phase의 목표
Import 파이프라인의 중복 렌더링 / FL 누락 / 배열 깨짐을 근본적으로 해결하기 위해:
1. dedupKey 생성 유틸리티 구현
2. 파싱 단계에서 중복제거 제거 (DB에 모든 행 저장)
3. parentId 주입 순서 및 매칭 로직 정비
4. 렌더링 시점 dedupKey 기반 중복제거 적용

---

### 참조: 엔티티 ↔ Import 컬럼 ↔ dedupKey 매핑 (최종 확정)

```
엔티티      Import 컬럼 조합              dedupKey 구성
─────────  ──────────────────────────   ─────────────────────────────────────
ST_L1      (프로젝트명)                   projectId :: processName
ST_L2      A1(공정번호) + A2(공정명)       st_l1_id :: A1
ST_L3      B1(작업요소) + 4M              st_l2_id :: 4M :: B1
FN_L1      C1(구분) + C2(제품기능)         st_l1_id :: C1 :: C2
FN_L2      A3(공정기능) + A4(제품특성)      st_l2_id :: A3 :: ProcessProductChar.id
FN_L3      B2(요소기능) + B3(공정특성)      st_l3_id :: B2 :: B3
FL_FE      C4(고장영향)                   fn_l1_id :: C4
FL_FM      A5(고장형태)                   fn_l2_id :: A5
FL_FC      B4(고장원인)                   fn_l3_id :: B4
```

> ⚠️ FN_L2의 dedupKey에서 A4는 `ProcessProductChar.id` (FK)를 사용한다.
> `L2Function.productChar` 텍스트 필드가 아님.
> ProcessProductChar 레코드가 아직 없으면 먼저 생성하여 id를 확보한 후 dedupKey에 포함.

> ⚠️ FL_FE의 parentId는 `fn_l1_id` (= L1Function.id).
> C3(요구사항)는 L1Function.requirement 필드에서 읽되, parentId 체인에는 L1Function.id를 사용.

---

### 작업 순서 (3단계, 순서 엄수)

#### Step 3-1: dedupKey 생성 유틸리티 + normalize 함수

파일: `src/lib/fmea/utils/dedup-key.ts` (신규 생성)

```typescript
/**
 * FMEA 렌더링 중복제거용 dedupKey 생성 유틸리티
 * 
 * 원칙:
 * - dedupKey = parentId(n-1) + '::' + 자기 레벨 식별 필드
 * - parentId 없이 이름만으로 중복제거하면 다른 부모의 동명 항목 누락
 * - dedupKey는 렌더링 전용 — DB PK(UUID)와 별개
 */

// normalize: 헤더/셀 텍스트 정규화
export function normalize(value: string | null | undefined): string {
  if (!value) return '__EMPTY__';
  return value
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // ⚠️ toLowerCase() 적용 여부는 기존 데이터 패턴에 따라 판단
  // 한영병기 데이터에서 대소문자가 의미를 가지면 toLowerCase 생략
}

// 엔티티별 dedupKey 생성 함수
export function dedupKey_ST_L2(st_l1_id: string, processNo: string): string {
  return `${st_l1_id}::${normalize(processNo)}`;
}

export function dedupKey_ST_L3(st_l2_id: string, fourM: string, elementName: string): string {
  return `${st_l2_id}::${normalize(fourM)}::${normalize(elementName)}`;
}

export function dedupKey_FN_L1(st_l1_id: string, category: string, functionName: string): string {
  return `${st_l1_id}::${normalize(category)}::${normalize(functionName)}`;
}

export function dedupKey_FN_L2(st_l2_id: string, functionName: string, productCharId: string): string {
  // ⚠️ productCharId = ProcessProductChar.id (FK), 텍스트가 아님
  return `${st_l2_id}::${normalize(functionName)}::${productCharId}`;
}

export function dedupKey_FN_L3(st_l3_id: string, functionName: string, processChar: string): string {
  return `${st_l3_id}::${normalize(functionName)}::${normalize(processChar)}`;
}

export function dedupKey_FL_FE(fn_l1_id: string, effectName: string): string {
  return `${fn_l1_id}::${normalize(effectName)}`;
}

export function dedupKey_FL_FM(fn_l2_id: string, modeName: string): string {
  return `${fn_l2_id}::${normalize(modeName)}`;
}

export function dedupKey_FL_FC(fn_l3_id: string, causeName: string): string {
  return `${fn_l3_id}::${normalize(causeName)}`;
}

// 렌더링 중복제거 함수
export function deduplicateForRendering<T extends { dedupKey: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.dedupKey)) return false;
    seen.add(item.dedupKey);
    return true;
  });
}
```

이 파일을 생성한 후 나에게 보여줘라. 승인 후 Step 3-2로 진행.

---

#### Step 3-2: Import 파이프라인 수정 — 파싱 + DB 저장

이 단계가 가장 크고 위험하다. 아래 세부 단계를 하나씩 진행한다.

##### Step 3-2a: 파싱 단계 — 중복제거 로직 제거

현재 코드에서 파싱 시점에 중복을 제거하는 로직을 모두 찾아:
```bash
grep -rn "dedup\|duplicate\|중복\|skip\|already\|seen\|Set()\|Map()" src/ --include="*.ts" --include="*.tsx" | grep -i "pars\|import\|excel"
```

찾은 각 위치에서:
1. 파싱 시점 중복제거 → 제거 (모든 행을 DB에 저장)
2. 대신 각 파싱된 행에 `dedupKey` 필드를 추가 (Step 3-1의 함수 사용)
3. **fill-down 로직은 유지** — NaN 셀을 위 행 값으로 채우는 것은 파싱의 일부

fill-down 대상 필드 (탭별):
```
구조분석:         processName, processNo, fourM
1L_완제품기능:     processName, category
2L_메인공정기능:   processName, functionName
3L_작업요소기능:   processName, fourM, elementName, functionName
1L_고장영향:      processName, category, functionName, requirement
2L_고장형태:      processName, functionName, productChar
3L_고장원인:      processName, fourM, elementName, functionName
```

fill-down하면 안 되는 필드: FM, FC, FE, 일부 processCharacteristic
(NaN이 "빈 값"을 의미하는 경우가 있으므로 함부로 fill-down 금지)

##### Step 3-2b: DB 저장 — parentId 주입 순서

반드시 아래 순서대로 저장. 각 단계에서 id를 확보한 후 다음 단계 parentId로 전달:

```
Phase A: 구조 저장 (순서 필수)
  ① ST_L1 저장 → st_l1_id 확보
  ② ST_L2 저장 (st_l1_id 주입) → st_l2_id 확보
  ③ ST_L3 저장 (st_l2_id 주입) → st_l3_id 확보

Phase B: 기능 저장 (Phase A 완료 후)
  ④ FN_L1 저장 (st_l1_id 매칭) → fn_l1_id 확보
  ⑤ FN_L2 저장 (st_l2_id 매칭) → fn_l2_id 확보
     ⚠️ A4 처리: ProcessProductChar 레코드 생성/조회 → id 확보 → FN_L2.productCharId에 FK 저장
  ⑥ FN_L3 저장 (st_l3_id 매칭) → fn_l3_id 확보

Phase C: 고장 저장 (Phase B 완료 후)
  ⑦ FL_FE 저장 (fn_l1_id 매칭)
  ⑧ FL_FM 저장 (fn_l2_id 매칭)
  ⑨ FL_FC 저장 (fn_l3_id 매칭)
```

parentId 매칭 방법 — 예시 (FN_L2 → ST_L2 매칭):
```typescript
// B3 파싱 행에서 공정번호(A1)가 "05"인 경우
// Phase A에서 저장된 ST_L2 목록에서 processNo="05"인 것을 찾아 st_l2_id 확보

function matchToSTL2(processNo: string, stL2List: STL2Entity[]): string {
  const matched = stL2List.find(s => s.processNo === processNo);
  if (!matched) {
    throw new ImportError('PARENT_NOT_FOUND', 
      `공정번호 "${processNo}"에 해당하는 ST_L2를 찾을 수 없습니다.`);
  }
  return matched.id;
}
```

##### Step 3-2c: 트랜잭션 범위 명확화

전체 Import를 하나의 `prisma.$transaction`으로 감싸되,
Phase A/B/C를 순차 실행:

```typescript
await prisma.$transaction(async (tx) => {
  // Phase A: 구조
  const stL1 = await saveSTL1(tx, parsedData);
  const stL2List = await saveSTL2(tx, parsedData, stL1.id);
  const stL3List = await saveSTL3(tx, parsedData, stL2List);
  
  // Phase B: 기능
  const fnL1List = await saveFNL1(tx, parsedData, stL1.id);
  const fnL2List = await saveFNL2(tx, parsedData, stL2List);  // A4 FK 처리 포함
  const fnL3List = await saveFNL3(tx, parsedData, stL3List);
  
  // Phase C: 고장
  await saveFLFE(tx, parsedData, fnL1List);
  await saveFLFM(tx, parsedData, fnL2List);
  await saveFLFC(tx, parsedData, fnL3List);
});
// 실패 시 전체 롤백 — 고아 레코드 방지
```

---

#### Step 3-3: 렌더링 중복제거 수정

현재 렌더러에서 중복제거하는 코드를 찾아 dedupKey 기반으로 교체:

```bash
grep -rn "dedup\|duplicate\|중복\|filter\|unique\|Set()\|Map()" src/ --include="*.ts" --include="*.tsx" | grep -iv "import\|pars\|excel"
```

각 렌더러/탭 컴포넌트에서:
1. 기존 dedup 로직 → `deduplicateForRendering()` 호출로 교체
2. 탭별 렌더링 단위 확인:

```
탭             렌더링 1행 =              dedupKey 기준
───────────   ────────────────────────  ──────────────
구조분석        ST_L1 + ST_L2 + ST_L3    ST_L3.dedupKey
1L_완제품기능    FN_L1 1건                FN_L1.dedupKey
2L_메인공정기능  FN_L2 1건                FN_L2.dedupKey
3L_작업요소기능  FN_L3 1건                FN_L3.dedupKey
1L_고장영향     FN_L1 + FL_FE            FL_FE.dedupKey
2L_고장형태     FN_L2 + FL_FM            FL_FM.dedupKey
3L_고장원인     FN_L3 + FL_FC            FL_FC.dedupKey
워크시트(WS)    전체 고장사슬              FC→FM→FE 체인 조인
```

워크시트(WS) 탭 조인 시 카테시안 곱 방지:
- FM↔FE, FC↔FM 연결 필드를 통해 1:1 경로로 제한
- 단순 JOIN 금지 — 반드시 고장사슬 연결 FK를 통한 경로 조인

---

### 안티패턴 체크리스트 (모든 수정 후 반드시 확인)

수정 완료 후 아래 패턴이 코드에 남아 있지 않은지 전수 검색:

```bash
# 안티패턴 1: 이름만으로 중복제거 (parentId 없이)
grep -rn "dedupKey.*=.*name\|dedupKey.*=.*Name" src/ | grep -v "parentId\|_id"

# 안티패턴 2: 파싱 시점 중복제거 (DB 저장 전 skip)
grep -rn "if.*already\|if.*seen\|if.*has(" src/ | grep -i "pars\|import"

# 안티패턴 3: FM/FC를 구조(ST_L2/ST_L3)에 직접 연결
grep -rn "parentId.*processId\|parentId.*elementId\|parentItemId.*structure" src/

# 안티패턴 4: UUID를 dedupKey로 사용
grep -rn "dedupKey.*=.*\.id\b" src/ | grep -v "parentId\|_id::"
```

발견되면 수정. 발견되지 않으면 체크리스트 통과 기록.

---

### 산출물

1. `src/lib/fmea/utils/dedup-key.ts` (신규)
2. 수정된 파서 파일 목록 + 변경 요약
3. 수정된 DB 저장 로직 파일 목록 + 변경 요약
4. 수정된 렌더러 파일 목록 + 변경 요약
5. 안티패턴 체크리스트 결과
6. `UUID_FK_REDESIGN_COMPLETE.md` (전체 변경 요약)

### 검증 (Phase 4 전 자체 확인)

- TypeScript 컴파일 에러 없음
- 기존 Guard Test 전체 통과
- Import 후 DB에 고아 레코드(parentId가 null이거나 존재하지 않는 id) 없음
- 렌더링에서 FL 누락 없음 (수동 확인 or 테스트)

### 금지 사항
- CP/PFD 코드 수정 금지 (Phase 2A에서 분리 완료)
- Prisma 스키마에 @relation 추가는 이 Phase에서 하지 않음 (별도 migration PR)
- 기존 데이터 마이그레이션 하지 않음 (신규 Import부터 적용)
- pfmea-header-map.ts / fmea-column-ids 변경 금지 (Phase 2B에서 확정)