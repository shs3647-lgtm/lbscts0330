## 작업: Import 파이프라인 재설계 검증 — Phase 4

**관련 문서**: `docs/FMEA Import UUID복합키FKparentId 재설계 적용.md`, `docs/UUID_FK_REDESIGN_COMPLETE.md`

### 선행 완료 사항
- Phase 1: 네이밍 전수조사 완료
- Phase 2A: CP/PFD/FA 네임스페이스 분리 완료
- Phase 2B: PFMEA 헤더 정규화 완료
- Phase 3: dedupKey/parentId/FK 재설계 **Import 경로** 적용 완료 (상세는 `UUID_FK_REDESIGN_COMPLETE.md`)
  - `dedup-key.ts` + `flat-dedup-key-enrich.ts` (`enrichImportedFlatWithDedupKeys`)
  - `validate-import.ts`: 검증 전 enrich, Check 5에서 `dedupKey` 우선
  - 위치기반 `position-parser` `atomicToFlatData` + 워크시트 `atomicToFlatData` 반환 시 enrich
  - Auto/Legacy Import UI: 병합·마스터 저장/재로드 시 `dedupKey` 우선 (`getBK`)
  - **미적용**: `save-from-import` 등 DB 저장을 Phase A/B/C 함수로 쪼개는 리팩터(문서 Step 3-2b)
  - **미적용**: 워크시트 본탭 렌더에 `deduplicateForRendering` 삽입 — `CLAUDE.md` Rule 2 유지

### 이 Phase의 목적
Phase 3 수정이 실제로 중복 렌더링/FL 누락/고아 레코드를 해결했는지 데이터로 확인한다.
워크시트 렌더링 수정 없이 Import 쪽만으로 문제가 해결되는지 판단하는 것이 핵심 목표.

---

### 검증 1: Import 파이프라인 단위 검증

#### 검증 1-1: dedupKey 생성 정합성
`dedup-key.ts`의 각 함수에 대해 테스트.

**자동 실행 (엑셀·DB 불필요)**

```powershell
cd C:\lbscts0330
npx tsc --noEmit
npm run test:import-slice
```

포함 스펙: `tests/lib/fmea/dedup-key.test.ts`, `tests/lib/fmea/flat-dedup-key-enrich.test.ts`, `tests/import/atomic-to-flat-*.test.ts`, `tests/import/worksheet-atomic-to-flat-fk.test.ts`, guard·`position-parser` 등 (`package.json`의 `test:import-slice` 정의 참조).

**기록 예시 (2026-04-03)**: `test:import-slice` 66 tests PASS, `tsc` 0 errors.

```typescript
// 아래 Case는 문서상 기대 동작 예시. 실제 단위 테스트: tests/lib/fmea/dedup-key.test.ts

// Case A: 동일 부모 + 동일 이름 → dedupKey 동일 (중복제거 대상)
expect(dedupKey_ST_L3('st_l2_005', 'MC', 'INNER Extruder'))
  .toBe(dedupKey_ST_L3('st_l2_005', 'MC', 'INNER Extruder'));

// Case B: 다른 부모 + 동일 이름 → dedupKey 다름 (누락 방지)
expect(dedupKey_ST_L3('st_l2_005', 'MC', 'INNER Extruder'))
  .not.toBe(dedupKey_ST_L3('st_l2_006', 'MC', 'INNER Extruder'));

// Case C: 동일 부모 + 동일 기능 + 다른 제품특성 → dedupKey 다름
expect(dedupKey_FN_L2('st_l2_005', '스틸코드 압연', 'prodchar_001'))
  .not.toBe(dedupKey_FN_L2('st_l2_005', '스틸코드 압연', 'prodchar_002'));

// Case D: 동일 FN_L2 + 다른 FM → dedupKey 다름 (FL 누락 방지)
expect(dedupKey_FL_FM('fn_l2_006', 'T50 길다'))
  .not.toBe(dedupKey_FL_FM('fn_l2_006', '고무 덜풀림'));

// Case E: 다른 FN_L2 + 동명 FM → dedupKey 다름 (FL 누락 방지)
expect(dedupKey_FL_FM('fn_l2_016', '길이 부족'))
  .not.toBe(dedupKey_FL_FM('fn_l2_017', '길이 부족'));

// Case F: normalize 정합성 — 줄바꿈, 공백, null 처리
expect(dedupKey_ST_L2('st_l1_001', '05'))
  .toBe(dedupKey_ST_L2('st_l1_001', ' 05 '));  // trim

expect(dedupKey_FN_L1('st_l1_001', 'YP', '림과 조립이\n잘 되어야 한다'))
  .toBe(dedupKey_FN_L1('st_l1_001', 'YP', '림과 조립이 잘 되어야 한다'));  // \n→공백
```

총 6개 Case 모두 통과 확인.

#### 검증 1-2: parentId 주입 순서 검증
Import 파이프라인을 실제 실행한 뒤 (또는 모의 실행). 프로젝트 스키마·`fmeaId`에 맞게 조회.

**API(읽기/수정 주의)**: `GET/POST /api/fmea/validate-fk`, `GET/POST /api/fmea/pipeline-verify`, `POST /api/fmea/repair-fk?dryRun=true` — `CLAUDE.md` 검증 매뉴얼 참조.

```typescript
// 검증 쿼리: parentId가 null인 레코드
const orphanFNL2 = await tx.l2Function.findMany({
  where: { parentItemId: null }
});
expect(orphanFNL2.length).toBe(0);

const orphanFLFM = await tx.failureMode.findMany({
  where: { parentItemId: null }
});
expect(orphanFLFM.length).toBe(0);

// 검증 쿼리: parentId가 존재하지 않는 id를 가리키는 레코드
// (실제 Prisma 쿼리로 FK 무결성 확인)
```

---

### 검증 2: 실 데이터 Import 테스트

#### 검증 2-1: 복합시트 Import 실행
`PFMEA_ReverseImport_pfm26-p047-i47_2026-04-03.xlsx` 파일을 Import한 후
DB 상태를 조회하여 아래 수치 확인.

> 저장소 `data/` 등에 해당 파일이 없으면 로컬에 배치한 뒤 수행. 골든 회귀는 `pfm26-m002` + `npm run verify:pipeline-baseline`(선택 strict)로 병행 가능.

```
엔티티        기대 건수    실제 건수    일치?
──────────   ────────    ────────    ─────
ST_L2         13건
ST_L3         22건
FN_L1         11건
FN_L2         28건
FN_L3         38건
FL_FE         11건
FL_FM         34건
FL_FC         (데이터 있으면 확인)
```

실제 건수를 채워 보고서에 기록.
기대 건수와 불일치 시 원인 분석 필수.

#### 검증 2-2: 수동 Import 실행
`수동_기초정보_Import_pfm26-p047-i47_2026-04-03.xlsx` 파일을 Import한 후
동일한 수치 확인.

#### 검증 2-3: 수동 vs 복합 결과 비교
두 Import 결과의:
- 엔티티 수 일치 여부
- dedupKey 집합의 차집합 (한쪽에만 있는 항목)
- parentId 연결 구조 동일 여부

불일치 항목이 있으면 각각 원인 분석.

---

### 검증 3: 핵심 엣지케이스 개별 확인

Phase 3에서 해결 대상으로 지정된 구체적 버그 케이스:

#### 엣지 3-1: 공정 03 — 동일 FN_L2에 FL_FM 2건
```
공정: 03 (정련)
기능: "원료고무에 배합재료를 혼합한다"
제품특성: "Rheo 점도"
FM 1: "50% 가류도(T50) 길다"
FM 2: "고무 덜풀림 관리"
```
확인: DB에 FL_FM 2건 존재하는가? 렌더링에서 2건 모두 표시되는가?

#### 엣지 3-2: 공정 05 — 동일 기능 다른 제품특성
```
공정: 05 (압연 S-CAL)
기능: "스틸코드 양면에 고무 필름을 압연한다"
제품특성 1: "압연물 보관품질" → FM "이물 검출 실패"
제품특성 2: "EPI" → FM "Air Loss 증가"
```
확인: FN_L2 2건 + FL_FM 2건 존재하는가? "EPI" 제품특성이 누락되지 않았는가?

#### 엣지 3-3: 공정 06 — 동명 FM "길이 부족" 2건
```
공정: 06 (압출 TREAD)
FM "길이 부족" case A: FN_L2 = "Side Assy 제조 + Tread(Under) 폭"
FM "길이 부족" case B: FN_L2 = "Rework 밀링 + 두께"
```
확인: 동명이지만 fn_l2_id가 다르므로 DB에 FL_FM 2건 존재하는가?
dedupKey가 다른가? 렌더링에서 2건 모두 표시되는가?

#### 엣지 3-4: Traed Ext. — 동일 작업요소 3개 FN_L3
```
공정: 06, 작업요소: Traed Ext.
FN_L3 1: 기능="트레드 부품 제조" + 공정특성="Screw 온도"
FN_L3 2: 기능="정상 작동 확보" + 공정특성="Screw 온도"
FN_L3 3: 기능="정상 작동 확보" + 공정특성="모터 고장 상태"
```
확인: FN_L3 3건 존재하는가? 기능이 같아도 공정특성이 다르면 별도인가?

#### 엣지 3-5: 고아 레코드 제로
```sql
-- parentId가 null인 기능/고장 레코드
SELECT COUNT(*) FROM "L2Function" WHERE "parentItemId" IS NULL;
SELECT COUNT(*) FROM "FailureMode" WHERE "parentItemId" IS NULL;
SELECT COUNT(*) FROM "FailureCause" WHERE "parentItemId" IS NULL;

-- parentId가 존재하지 않는 id를 참조하는 레코드
-- (Prisma 쿼리 또는 raw SQL로 확인)
```
기대: 모두 0건.

---

### 검증 4: 워크시트 렌더링 영향 확인

> 이 검증은 워크시트 코드를 수정하지 않은 상태에서 수행

Import 후 워크시트(WS) 탭을 열어 육안 확인:
- [ ] FL 누락 없음 (엣지 3-1~3-4의 항목이 WS에 모두 표시되는가)
- [ ] 중복 렌더링 없음 (동일 행이 2줄로 나오지 않는가)
- [ ] 배열 깨짐 없음 (FE-FM-FC 고장사슬이 올바르게 연결되는가)
- [ ] SOD/AP 값이 정상 표시되는가

#### 판정 기준
```
결과 A: Import 수정만으로 WS 표시 정상
  → Rule 2 예외 불필요. Phase 4 완료.

결과 B: Import은 정상이지만 WS에서 중복/누락 발생
  → 원인 기록 (어떤 컴포넌트에서, 어떤 dedup 로직 때문에)
  → Rule 2 예외 필요 범위를 최소한으로 특정
  → 기획자에게 보고 후 별도 Phase로 진행
```

---

### 산출물: PHASE4_검증결과보고서.md

```markdown
# Phase 4 검증 결과 보고서
> 작성일: YYYY-MM-DD
> 검증 대상: Phase 3 Import 파이프라인 재설계

## 1. dedupKey 단위 테스트
| Case | 설명 | 결과 |
| A | 동일 부모+동일 이름 → 같은 키 | PASS/FAIL |
| B | 다른 부모+동일 이름 → 다른 키 | PASS/FAIL |
| C | 동일 기능+다른 제품특성 → 다른 키 | PASS/FAIL |
| D | 동일 FN_L2+다른 FM → 다른 키 | PASS/FAIL |
| E | 다른 FN_L2+동명 FM → 다른 키 | PASS/FAIL |
| F | normalize 정합성 | PASS/FAIL |

## 2. 실 데이터 수치 검증
| 엔티티 | 기대 | 복합 Import | 수동 Import | 일치? |

## 3. 수동 vs 복합 비교
| 항목 | 일치 여부 | 차이 내역 |

## 4. 엣지케이스 검증
| # | 케이스 | DB 확인 | 렌더링 확인 | 결과 |
| 3-1 | 공정03 동일B3 2FM | | | |
| 3-2 | 공정05 동일기능 다른특성 | | | |
| 3-3 | 공정06 동명FM 2건 | | | |
| 3-4 | Traed Ext. 3개 FN_L3 | | | |
| 3-5 | 고아 레코드 | | | |

## 5. 워크시트 렌더링 판정
- 판정: 결과 A / 결과 B
- (결과 B인 경우) 원인 분석:
- (결과 B인 경우) Rule 2 예외 필요 범위:

## 6. 최종 결론
- Phase 3 수정 효과: 유효 / 부분유효 / 무효
- 추가 작업 필요 여부:
- Rule 2 예외 필요 여부:
```

### 금지 사항
- 워크시트 렌더링 코드 수정 금지 (`CLAUDE.md` Rule 2)
- 검증 중 발견된 버그를 즉시 수정하지 말 것 — 보고서에 기록만
- Import 파서/저장 로직 추가 수정 금지 — 검증 결과로 판단 후 결정