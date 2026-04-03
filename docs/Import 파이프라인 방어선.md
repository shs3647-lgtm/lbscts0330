## 긴급 지시: Import 파이프라인 방어선 + 구조 강화 + 안정화 — 일괄 구축

> 월요일 출시 마감. 아래 11개 작업을 순서대로 전부 수행한다.
> 각 작업은 이전 작업 결과에 의존하므로 순서를 바꾸지 않는다.
> 모든 작업 완료 후 하나의 요약 보고서를 작성한다.

### 문서 대비 실제 진행 (2026-04-03 스냅샷)

아래 11개 작업은 **계획/체크리스트**이며, 본 문서만으로는 전부 완료된 상태가 아님.

| 이미 연계된 작업 | 참고 |
|------------------|------|
| Phase 3 Import 경로 | `dedup-key.ts`, `flat-dedup-key-enrich.ts`, `validate-import` enrich, `atomicToFlatData`, Import UI `dedupKey`/`getBK` — 상세 `docs/UUID_FK_REDESIGN_COMPLETE.md` |
| Phase 4 검증 | `docs/PHASE4_검증결과보고서.md`, `docs/Import 파이프라인 재설계 검증.md` |
| 자동 검증 | `npm run test:import-slice`, `npm run verify:all` (로컬에서 통과 기록 있음) |
| 작업 1 일부 | `tests/lib/fmea/dedup-key.test.ts`, `flat-dedup-key-enrich.test.ts` 등 — 문서의 “7개 Guard” 전부와는 다름 |
| 작업 2 | 저장소는 **simple-git-hooks** + `guard:protected:staged` 등 — 본문의 bash 배열 pre-commit 예시와는 별개 |
| 로컬 DB 정리 | `pfm26-m002` 고아 RA 1건 — 사용자 승인 후 `POST /api/fmea/repair-fk` 로 삭제 완료 (`validate-fk` allGreen) |

---

## Round 1: 방어선 구축 (Phase 3 보호)

### 작업 1: Guard Test 확장 (7개 신규)

파일: `tests/lib/fmea/` 하위에 테스트 추가

Phase 4에서 만든 `dedup-key.test.ts`를 확장하여 아래 7개 Guard Test 추가:

```typescript
// Guard 1: FL dedupKey — 동명 FM이 다른 부모면 dedupKey 다름
// (Phase 4 Case E 확장 — 실제 파서 출력에서 검증)

// Guard 2: B4 parentId — FC의 parentId가 FN_L3(기능+공정특성)을 가리키는지
// FC.parentId가 ST_L3(작업요소)을 직접 가리키면 FAIL

// Guard 3: 카테시안 방지 — 동일 Import에서 FM 건수가 Excel 원본 행 수를 초과하지 않음
// FM_COUNT_DB <= FM_COUNT_EXCEL (초과 = 카테시안 복제 발생)

// Guard 4: FN_L2 dedupKey에 productCharId(FK)가 포함되는지
// 텍스트(L2Function.productChar)가 아닌 ProcessProductChar.id 사용 확인

// Guard 5: 파싱 시점 중복제거 부재 확인
// Import 파서 코드에 Set()/Map() 기반 skip 로직이 없는지 정적 검증
// (코드 문자열 검색 기반 테스트)

// Guard 6: fill-down 정합성 — NaN 셀이 올바른 상위 값으로 채워지는지
// 공정번호가 NaN인 행에서 fill-down 후 이전 공정번호와 일치

// Guard 7: normalize 엣지케이스
// null → '__EMPTY__', 연속공백, 탭문자, 줄바꿈+공백 조합
```

각 Guard에 실패 시 메시지를 명확히:
```typescript
expect(fc.parentId).not.toBe(stL3.id); 
// "FC는 ST_L3이 아닌 FN_L3에 연결되어야 합니다 (안티패턴 4 위반)"
```

**완료 기준**: `npm run test:import-slice` 전체 통과, 7개 Guard 추가 확인.

---

### 작업 2: Pre-commit Hook (CODEFREEZE 자동 차단)

파일: `.husky/pre-commit` 또는 프로젝트의 기존 git hook 설정

보호 대상 파일 목록:
```
src/lib/fmea/utils/dedup-key.ts
src/lib/fmea/constants/pfmea-header-map.ts
src/lib/fmea/constants/fmea-column-ids.ts  (있으면)
src/lib/cp/constants/cp-column-ids.ts
src/lib/pfd/constants/pfd-column-ids.ts
```
+ 기존 CODEFREEZE v6.3 대상 14파일

Hook 로직:
```bash
#!/bin/sh
PROTECTED_FILES=(
  "src/lib/fmea/utils/dedup-key.ts"
  "src/lib/fmea/constants/pfmea-header-map.ts"
  "src/lib/cp/constants/cp-column-ids.ts"
  "src/lib/pfd/constants/pfd-column-ids.ts"
  # 기존 CODEFREEZE 14파일도 여기에 추가
)

STAGED=$(git diff --cached --name-only)
BLOCKED=""
for f in "${PROTECTED_FILES[@]}"; do
  if echo "$STAGED" | grep -q "$f"; then
    BLOCKED="$BLOCKED\n  $f"
  fi
done

if [ -n "$BLOCKED" ]; then
  echo "⛔ CODEFREEZE 파일 변경 감지:"
  echo -e "$BLOCKED"
  echo ""
  echo "의도적 변경이면: git commit --no-verify -m '[CODEFREEZE-OVERRIDE] 사유'"
  exit 1
fi
```

husky가 설치 안 되어 있으면 `.git/hooks/pre-commit`에 직접 생성.
기존 hook이 있으면 위 로직을 기존 hook에 추가.

**완료 기준**: 보호 대상 파일 수정 후 `git commit` 시 차단 메시지 확인.

---

### 작업 3: @relation 추가 (Prisma migration)

Phase 4에서 FK allGreen, 고아 0건이 확인된 상태.
같은 프로젝트 스키마(pfmea_{fmeaId}) 내의 FK에 @relation 추가.

⚠️ **프로젝트 스키마가 동적 생성되는 구조인 경우**:
- Prisma migration이 기존 프로젝트 스키마에 소급 적용되는지 확인
- 소급 불가면 migration 스크립트 별도 작성 필요
- 확실하지 않으면 이 작업만 TODO 주석으로 남기고 건너뛰어라

확실한 경우에만 진행:
```prisma
// 예시 — 실제 필드명은 코드 확인 후 적용
model FailureMode {
  id        String @id
  l2FuncId  String
  l2Func    L2Function @relation(fields: [l2FuncId], references: [id], onDelete: Cascade)
  // ...
}
```

**완료 기준**: `npx prisma validate` 통과. migration 생성은 하되 `prisma migrate deploy`는 하지 않음 (리뷰 후 적용).

---

## Round 2: 구조 강화

### 작업 4: API isValidFmeaId 미적용 30개 route 적용

NAMING_AUDIT_REPORT.md 또는 기존 진단에서 식별된 미적용 route 목록 확인:
```bash
# isValidFmeaId 미적용 route 찾기
grep -rL "isValidFmeaId" src/app/api/ --include="route.ts" | head -40
```

각 route.ts에서:
1. fmeaId를 받는 route인지 확인
2. fmeaId를 받으면 핸들러 초입에 `isValidFmeaId` 검증 추가:
```typescript
const fmeaId = params.id;
if (!isValidFmeaId(fmeaId)) {
  return NextResponse.json({ error: 'Invalid fmeaId' }, { status: 400 });
}
```
3. fmeaId를 안 받는 route는 스킵

**완료 기준**: `grep -rL "isValidFmeaId" src/app/api/ --include="route.ts"` 결과에서 fmeaId 사용 route가 0개.

---

### 작업 5: 대형 파일 분할 (1,700~1,900행 4파일)

대상 파일 확인:
```bash
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -10
```

1,500행 이상 파일을 식별하여 분할:

분할 원칙:
- 함수/클래스 단위로 분리 (의미 있는 모듈 경계)
- 분할된 각 파일은 500행 이하 목표
- index.ts에서 re-export하여 기존 import 경로 유지
- 분할 후 기존 테스트 전체 통과 확인

⚠️ CODEFREEZE 대상 파일이면 분할하지 않는다.
⚠️ 분할 후 tsc 에러 없음 + 기존 테스트 통과 확인 필수.

**완료 기준**: 1,500행 이상 파일 0개 (CODEFREEZE 제외).

---

### 작업 6: Empty catch + Raw SQL 정리

```bash
# Empty catch 찾기
grep -rn "catch\s*(" src/ --include="*.ts" --include="*.tsx" -A2 | grep -B1 "{\s*}"

# Raw SQL 찾기
grep -rn "\$queryRaw\|\$executeRaw\|\.query(" src/ --include="*.ts"
```

Empty catch:
- 최소한 `console.error(e)` 추가
- Import 파이프라인이면 구체적 에러 코드 반환

Raw SQL:
- Prisma 쿼리로 전환 가능한 것 → 전환
- 전환 불가능한 것 (동적 스키마 등) → TODO 주석 + 사유 기록

**완료 기준**: Empty catch 0건. Raw SQL은 전환 또는 사유 기록.

---

### 작업 7: Import 에러 체계

파일: `src/lib/fmea/errors/import-errors.ts` (신규)

```typescript
export class ImportError extends Error {
  constructor(
    public code: ImportErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

export type ImportErrorCode =
  | 'PARENT_NOT_FOUND'        // parentId 매칭 실패
  | 'FK_ORPHAN_DETECTED'      // FK 대상 레코드 없음
  | 'CARTESIAN_DETECTED'      // FM 건수 > Excel 행 수
  | 'DUPLICATE_DEDUPKEY'      // 동일 dedupKey 충돌
  | 'PARSE_HEADER_UNKNOWN'    // 인식 불가 헤더
  | 'FILL_DOWN_FAILED'        // fill-down 대상 없음
  | 'NORMALIZE_EMPTY'         // 필수 필드 빈 값
  | 'TRANSACTION_FAILED';     // 트랜잭션 롤백

export const IMPORT_ERROR_MESSAGES: Record<ImportErrorCode, string> = {
  PARENT_NOT_FOUND: 'parentId 매칭 실패 — 상위 구조가 존재하지 않습니다',
  FK_ORPHAN_DETECTED: 'FK 대상 레코드가 존재하지 않습니다',
  CARTESIAN_DETECTED: '카테시안 복제 감지 — FM 건수가 Excel 원본을 초과합니다',
  DUPLICATE_DEDUPKEY: '동일 dedupKey 충돌이 발생했습니다',
  PARSE_HEADER_UNKNOWN: '인식할 수 없는 헤더입니다',
  FILL_DOWN_FAILED: 'fill-down 대상 상위 값이 없습니다',
  NORMALIZE_EMPTY: '필수 필드가 비어 있습니다',
  TRANSACTION_FAILED: '트랜잭션 롤백 — 부분 저장을 방지했습니다',
};
```

기존 Import 파이프라인에서 `throw new Error(...)` 또는 `console.error(...)` →
`throw new ImportError(코드, 메시지, 상세)` 로 교체.

전체를 교체할 필요 없음 — Import route(`save-from-import` 등)와 
파서(`excel-parser`, `position-parser` 등) 핵심 경로만 적용.

**완료 기준**: Import 핵심 경로에서 ImportError 사용, 기존 에러보다 구체적 코드 포함.

---

## Round 3: 장기 건강성

### 작업 8: any 타입 제거 (Import 핵심 경로 한정)

전체 287파일이 아닌 Import 파이프라인 핵심 파일만:
```bash
grep -rn ": any\|as any\|<any>" src/lib/fmea/ src/app/api/fmea/*/import/ --include="*.ts" | wc -l
```

찾은 any를 적절한 타입으로 교체:
- 파서 출력 → `ParsedRow` 인터페이스 정의
- DB 저장 입력 → Prisma generated type 사용
- 함수 파라미터 → 구체 타입 또는 generic

**완료 기준**: Import 핵심 경로(`src/lib/fmea/`, Import route)에서 any 0개.
나머지 파일은 이번에 안 함.

---

### 작업 9: 모듈 인터페이스 정의

Phase 2~3에서 생성/수정된 핵심 모듈 간 계약을 interface로 정의:

파일: `src/lib/fmea/types/import-interfaces.ts` (신규)

```typescript
// 파서 → DB 저장 사이의 계약
export interface ParsedStructure {
  st_l1: { processName: string };
  st_l2: { processNo: string; processName: string; parentDedupKey: string }[];
  st_l3: { fourM: string; elementName: string; parentDedupKey: string }[];
}

export interface ParsedFunction {
  fn_l1: { category: string; functionName: string; requirement: string }[];
  fn_l2: { functionName: string; productChar: string; parentProcessNo: string }[];
  fn_l3: { functionName: string; processChar: string; parentElementKey: string }[];
}

export interface ParsedFailure {
  fl_fe: { effectName: string; severity: number; parentFnKey: string }[];
  fl_fm: { modeName: string; parentFnKey: string }[];
  fl_fc: { causeName: string; parentFnKey: string }[];
}

// DB 저장 결과
export interface SavedEntityMap {
  st_l1_id: string;
  st_l2_map: Map<string, string>; // dedupKey → id
  st_l3_map: Map<string, string>;
  fn_l1_map: Map<string, string>;
  fn_l2_map: Map<string, string>;
  fn_l3_map: Map<string, string>;
}
```

이 interface 파일을 CODEFREEZE 보호 대상에 추가 (작업 2의 목록에 포함).
실제 파서/저장 코드가 이 interface를 사용하도록 수정할 필요는 없음 — 
타입 정의만 해두고 점진적으로 적용.

**완료 기준**: interface 파일 생성 + CODEFREEZE 목록에 추가.

---

### 작업 10: 헬스체크 API

파일: `src/app/api/fmea/health/import-integrity/route.ts` (신규)

기존 `pipeline-verify` 로직을 경량화하여 cron 호출 가능한 엔드포인트:

```typescript
// GET /api/fmea/health/import-integrity?fmeaId=xxx
// 응답:
{
  "status": "healthy" | "degraded" | "critical",
  "checks": {
    "fk_orphans": { "count": 0, "status": "ok" },
    "null_parentId": { "count": 0, "status": "ok" },
    "cartesian_suspect": { "count": 0, "status": "ok" },
    "dedupKey_collision": { "count": 0, "status": "ok" }
  },
  "timestamp": "2026-04-04T..."
}
```

pipeline-verify와 중복되는 로직이 있으면 공통 함수로 추출.
없으면 pipeline-verify를 래핑하는 경량 버전으로 구현.

**완료 기준**: API 호출 시 JSON 응답 정상. fmeaId 없으면 400.

---

### 작업 11: DFMEA/PFMEA 공용화 — 설계 문서만

⚠️ 코드 수정 하지 않는다. 분석 문서만 작성.

파일: `docs/DFMEA_PFMEA_공용화_설계.md`

내용:
1. DFMEA와 PFMEA의 동명 파일 목록 (파일명이 같은 것)
2. 각 파일의 실제 차이점 (diff 요약)
3. 공용화 가능한 것 / 불가능한 것 분류
4. causeCategory enum 차이
5. 구조트리 depth 차이
6. SOD 평가기준 차이
7. 공용화 시 예상 작업량 (S/M/L)

**완료 기준**: 설계 문서 작성 완료. 코드 수정 없음.

---

## 전체 검증 (11개 작업 완료 후)

```bash
# 1. 컴파일
npx tsc --noEmit

# 2. 테스트
npm run test:import-slice

# 3. 린트
npm run lint

# 4. pipeline-verify (dev 서버 실행 중이면)
curl http://127.0.0.1:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m002

# 5. 헬스체크 (작업 10 완료 후)
curl http://127.0.0.1:3000/api/fmea/health/import-integrity?fmeaId=pfm26-m002
```

전부 통과 확인 후 보고서 작성.

---

## 산출물: 일괄구축_완료보고서.md

```markdown
# Import 파이프라인 방어선 + 구조 강화 + 안정화 일괄 구축 보고서

## Round 1: 방어선
| # | 작업 | 상태 | 생성/수정 파일 | 비고 |
| 1 | Guard Test 7개 | | | |
| 2 | Pre-commit Hook | | | |
| 3 | @relation migration | | | |

## Round 2: 구조 강화
| 4 | isValidFmeaId 30개 | | | |
| 5 | 대형 파일 분할 | | | |
| 6 | Empty catch + Raw SQL | | | |
| 7 | Import 에러 체계 | | | |

## Round 3: 장기 건강성
| 8 | any 제거 (Import 경로) | | | |
| 9 | 모듈 인터페이스 | | | |
| 10 | 헬스체크 API | | | |
| 11 | DFMEA/PFMEA 설계문서 | | | |

## 전체 검증
- tsc: PASS/FAIL
- test: PASS/FAIL (N개 중 N개 통과)
- lint: PASS/FAIL
- pipeline-verify: allGreen true/false
- health API: status

## 통계
- 신규 파일: N개
- 수정 파일: N개
- 삭제 파일: N개
- 신규 테스트: N개
```

## 금지 사항
- CODEFREEZE 대상 파일(dedup-key.ts, pfmea-header-map.ts 등) 내용 변경 금지
- 워크시트 렌더링 코드 변경 금지 (CLAUDE.md Rule 2)
- 작업 11에서 코드 수정 금지 (설계 문서만)
- 작업 3(@relation)에서 동적 스키마 소급 불확실하면 건너뛰고 TODO 기록
- **임의** DB 데이터 삭제·수정 금지. 예외: 문서·승인 절차에 따른 FK 수선(`repair-fk` 등), 파이프라인 검증용 복구 작업. (Phase 4: `pfm26-m002` 고아 RA 1건 `repair-fk`로 정리 완료.)