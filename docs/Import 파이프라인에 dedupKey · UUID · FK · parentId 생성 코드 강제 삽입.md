## 지시: Import 파이프라인에 dedupKey · UUID · FK · parentId 생성 코드 강제 삽입

### 배경
`dedup-key.ts` 유틸 함수와 설계 가이드는 존재하지만,
Import 저장 로직이 이것들을 호출하지 않아 실제로 동작하지 않는다.
dedupKey 없이 저장이 통과되고, parentId 주입 순서가 강제되지 않는다.
이 작업에서 설계를 코드로 강제한다.

### 참조
- `src/lib/fmea/utils/dedup-key.ts` — dedupKey 생성 함수 (이미 존재)
- `src/lib/fmea/types/import-interfaces.ts` — 엔티티 인터페이스 (이미 존재)
- `docs/FMEA_ID_DESIGN_GUIDE_v2.md` — 설계 기준

### 현재 Import 저장 코드 파악 (먼저 수행)

아래를 먼저 조사하여 나에게 보여줘라:
```bash
# Import 저장 진입점 찾기
grep -rn "save.*import\|create.*from.*import\|insert.*bulk\|transaction" src/app/api/fmea/ --include="*.ts" -l

# 현재 어떤 순서로 엔티티를 저장하는지
grep -rn "L1Function\|L2Function\|L3Function\|FailureMode\|FailureCause\|FailureEffect\|L2Structure\|L3Structure\|ProcessProduct" src/app/api/fmea/*/import/ --include="*.ts" -l
```

조사 결과를 보여주고, 현재 저장 순서와 파일 구조를 설명한 뒤 승인 후 코드 수정 진행.

---

### 구현할 내용 (3가지)

#### 1. 엔티티 저장 시 dedupKey 필수 생성 + DB 저장

각 엔티티를 DB에 저장할 때 `dedupKey` 필드를 반드시 포함:

```typescript
import { 
  dedupKey_ST_L2, dedupKey_ST_L3,
  dedupKey_FN_L1, dedupKey_FN_L2, dedupKey_FN_L3,
  dedupKey_FL_FE, dedupKey_FL_FM, dedupKey_FL_FC,
  normalize
} from '@/lib/fmea/utils/dedup-key';

// 예시: L2Structure 저장 시
const st_l2_record = {
  id: generateId(),  // UUID/cuid 생성
  processNo: parsedRow.processNo,
  name: parsedRow.processName,
  parentItemId: st_l1_id,  // FK → ST_L1
  dedupKey: dedupKey_ST_L2(st_l1_id, parsedRow.processNo),
  // ... 기타 필드
};
```

엔티티별 dedupKey 생성 규칙 (설계 가이드 기준):
```
ST_L2:  dedupKey_ST_L2(st_l1_id, processNo)
ST_L3:  dedupKey_ST_L3(st_l2_id, fourM, elementName)
FN_L1:  dedupKey_FN_L1(st_l1_id, category, functionName)
FN_L2:  dedupKey_FN_L2(st_l2_id, functionName, productCharId)
        ⚠️ productCharId = ProcessProductChar 레코드의 id (FK)
        텍스트가 아닌 id를 사용할 것
FN_L3:  dedupKey_FN_L3(st_l3_id, functionName, processChar)
FL_FE:  dedupKey_FL_FE(fn_l1_id, effectName)
FL_FM:  dedupKey_FL_FM(fn_l2_id, modeName)
FL_FC:  dedupKey_FL_FC(fn_l3_id, causeName)
```

**Prisma 스키마에 dedupKey 필드가 없으면 추가:**
```prisma
model L2Structure {
  // 기존 필드들...
  dedupKey  String?  // 렌더링 중복제거용
}
```
모든 Import 관련 모델에 `dedupKey String?` 필드 추가.
nullable로 두어 기존 데이터 마이그레이션 영향 없음.

---

#### 2. parentId 주입 — 순서 강제 + 존재 검증

Import 저장 로직에서 반드시 아래 순서로 저장하고,
각 단계에서 parentId가 유효한지 검증:

```typescript
import { ImportError } from '@/lib/fmea/errors/import-errors';

// ===== Phase A: 구조 저장 (순서 필수) =====

// ① ST_L1 저장 → st_l1_id 확보
const st_l1 = await tx.l1Structure.create({ data: { ... } });
const st_l1_id = st_l1.id;

// ② ST_L2 저장 — parentId = st_l1_id (필수)
for (const row of parsedST_L2) {
  if (!st_l1_id) {
    throw new ImportError('PARENT_NOT_FOUND', 'ST_L2 저장 실패: st_l1_id 없음');
  }
  const st_l2 = await tx.l2Structure.create({
    data: {
      id: generateId(),
      processNo: row.processNo,
      name: row.processName,
      parentItemId: st_l1_id,
      dedupKey: dedupKey_ST_L2(st_l1_id, row.processNo),
    }
  });
  st_l2_map.set(row.processNo, st_l2.id);  // 다음 단계에서 매칭용
}

// ③ ST_L3 저장 — parentId = st_l2_id (매칭 필수)
for (const row of parsedST_L3) {
  const st_l2_id = st_l2_map.get(row.processNo);
  if (!st_l2_id) {
    throw new ImportError('PARENT_NOT_FOUND',
      `ST_L3 저장 실패: 공정번호 "${row.processNo}"에 해당하는 ST_L2 없음`);
  }
  const st_l3 = await tx.l3Structure.create({
    data: {
      id: generateId(),
      fourM: row.fourM,
      name: row.elementName,
      parentItemId: st_l2_id,
      dedupKey: dedupKey_ST_L3(st_l2_id, row.fourM, row.elementName),
    }
  });
  // st_l3 매칭 키: processNo + fourM + elementName
  const matchKey = `${row.processNo}::${row.fourM}::${row.elementName}`;
  st_l3_map.set(matchKey, st_l3.id);
}

// ===== Phase B: 기능 저장 (Phase A 완료 후) =====

// ④ FN_L1 저장 — parentId = st_l1_id
for (const row of parsedFN_L1) {
  const fn_l1 = await tx.l1Function.create({
    data: {
      id: generateId(),
      category: row.category,
      name: row.functionName,
      requirement: row.requirement,
      parentItemId: st_l1_id,
      dedupKey: dedupKey_FN_L1(st_l1_id, row.category, row.functionName),
    }
  });
  const matchKey = `${row.category}::${normalize(row.functionName)}`;
  fn_l1_map.set(matchKey, fn_l1.id);
}

// ⑤ FN_L2 저장 — parentId = st_l2_id, A4 = ProcessProductChar FK
for (const row of parsedFN_L2) {
  const st_l2_id = st_l2_map.get(row.processNo);
  if (!st_l2_id) {
    throw new ImportError('PARENT_NOT_FOUND',
      `FN_L2 저장 실패: 공정번호 "${row.processNo}"에 해당하는 ST_L2 없음`);
  }

  // A4: ProcessProductChar 생성/조회 → FK id 확보
  let productCharId: string;
  const existingPC = await tx.processProductChar.findFirst({
    where: { name: row.productChar, l2StructureId: st_l2_id }
  });
  if (existingPC) {
    productCharId = existingPC.id;
  } else {
    const newPC = await tx.processProductChar.create({
      data: { id: generateId(), name: row.productChar, l2StructureId: st_l2_id }
    });
    productCharId = newPC.id;
  }

  const fn_l2 = await tx.l2Function.create({
    data: {
      id: generateId(),
      name: row.functionName,
      productCharId: productCharId,  // FK → ProcessProductChar
      parentItemId: st_l2_id,
      dedupKey: dedupKey_FN_L2(st_l2_id, row.functionName, productCharId),
    }
  });
  // 매칭 키: processNo + functionName + productChar
  const matchKey = `${row.processNo}::${normalize(row.functionName)}::${productCharId}`;
  fn_l2_map.set(matchKey, fn_l2.id);
}

// ⑥ FN_L3 저장 — parentId = st_l3_id
for (const row of parsedFN_L3) {
  const st_l3_key = `${row.processNo}::${row.fourM}::${row.elementName}`;
  const st_l3_id = st_l3_map.get(st_l3_key);
  if (!st_l3_id) {
    throw new ImportError('PARENT_NOT_FOUND',
      `FN_L3 저장 실패: 작업요소 "${row.elementName}"에 해당하는 ST_L3 없음`);
  }
  await tx.l3Function.create({
    data: {
      id: generateId(),
      name: row.functionName,
      processChar: row.processChar,
      parentItemId: st_l3_id,
      dedupKey: dedupKey_FN_L3(st_l3_id, row.functionName, row.processChar),
    }
  });
}

// ===== Phase C: 고장 저장 (Phase B 완료 후) =====

// ⑦ FL_FE 저장 — parentId = fn_l1_id
// ⑧ FL_FM 저장 — parentId = fn_l2_id (기능+제품특성에 연결, 공정에 직접 연결 금지)
// ⑨ FL_FC 저장 — parentId = fn_l3_id (기능+공정특성에 연결, 작업요소에 직접 연결 금지)
```

> ⚠️ 위 코드는 설계 패턴 예시이다. 실제 구현 시:
> - Prisma 모델명, 필드명은 현재 코드 기준으로 맞출 것
> - 기존 `$transaction` 경계를 유지할 것 (Step 3-2b 면제)
> - 기존 저장 함수가 있으면 그 안에 위 패턴을 적용할 것
> - 기존 저장 함수를 통째로 교체하지 말고 dedupKey 생성 + parentId 검증만 추가

---

#### 3. parentId NOT NULL 검증 미들웨어

Import 저장 완료 직후, 저장된 레코드에 parentId가 빠진 것이 없는지 검증:

```typescript
// Import 트랜잭션 마지막에 실행
async function validateImportIntegrity(
  tx: PrismaTransaction,
  fmeaId: string
): Promise<void> {
  // 고아 FN_L2 (parentItemId가 null)
  const orphanFnL2 = await tx.l2Function.count({
    where: { parentItemId: null }
  });
  if (orphanFnL2 > 0) {
    throw new ImportError('FK_ORPHAN_DETECTED',
      `FN_L2 고아 ${orphanFnL2}건 — parentItemId가 null`,
      { entity: 'L2Function', count: orphanFnL2 });
  }

  // 고아 FL_FM (l2FuncId가 null이거나 존재하지 않는 id)
  const orphanFlFm = await tx.failureMode.count({
    where: { 
      OR: [
        { l2FuncId: null },
        { l2FuncId: { not: null } }  // 존재 확인은 별도 쿼리 필요
      ]
    }
  });

  // dedupKey가 빈 레코드
  const emptyDedupKey = await tx.l2Function.count({
    where: { dedupKey: null }
  });
  if (emptyDedupKey > 0) {
    throw new ImportError('NORMALIZE_EMPTY',
      `dedupKey가 null인 FN_L2 ${emptyDedupKey}건`,
      { entity: 'L2Function', count: emptyDedupKey });
  }

  // 카테시안 검증: FM 건수 > 파싱된 원본 행 수이면 이상
  // (parsedRowCount를 파라미터로 받아 비교)
}
```

이 함수를 Import 트랜잭션의 **마지막 단계**에서 호출.
검증 실패 시 `ImportError` throw → 트랜잭션 전체 롤백 → 고아 레코드 방지.

---

### 구현 시 주의사항

1. **기존 저장 함수를 통째로 교체하지 말 것**
   - 기존 로직에 dedupKey 생성 + parentId 검증을 추가하는 방식
   - 기존 `$transaction` 경계 유지 (Step 3-2b 면제 사항)

2. **Prisma 스키마 변경 범위 최소화**
   - `dedupKey String?` 필드 추가만 (nullable)
   - `npx prisma migrate dev --name add-dedupkey-field`
   - 기존 데이터에 영향 없음 (null 허용)

3. **FN_L2의 A4 처리**
   - productCharId는 반드시 `ProcessProductChar.id` (FK)
   - `L2Function.productChar` 텍스트 필드는 표시용 캐시로만 유지
   - dedupKey에는 id를 사용

4. **FL_FM의 parentId**
   - fn_l2_id (기능+제품특성)에 연결
   - st_l2_id (공정)에 직접 연결 금지 (안티패턴 3)

5. **FL_FC의 parentId**
   - fn_l3_id (기능+공정특성)에 연결
   - st_l3_id (작업요소)에 직접 연결 금지 (안티패턴 4)

### 완료 기준
- `npx tsc --noEmit` 통과
- `npm run test:import-slice` 전체 통과
- Import 실행 후 `dedupKey`가 null인 레코드 0건
- Import 실행 후 `parentItemId`가 null인 FN/FL 레코드 0건
- `pipeline-verify` FK step 통과

### 금지 사항
- CODEFREEZE 파일(dedup-key.ts, pfmea-header-map.ts) 내용 변경 금지
- 워크시트 렌더링 코드 변경 금지 (CLAUDE.md Rule 2)
- 기존 저장 함수의 비즈니스 로직 변경 금지 (추가만)