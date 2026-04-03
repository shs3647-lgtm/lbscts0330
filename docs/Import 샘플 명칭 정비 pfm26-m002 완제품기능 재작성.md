## 지시: Import 샘플 명칭 정비 + pfm26-m002 완제품기능 재작성

### 작업 A: Excel Import 샘플 테이블명 · PFMEA WS 명칭 표준화

Phase 2B에서 `pfmea-header-map.ts`로 상수를 통일했지만,
Excel 샘플 다운로드 파일과 PFMEA 워크시트 UI의 탭/테이블 명칭이
아직 구버전 표기를 쓰고 있을 수 있다. 확인하여 수정.

#### Step A-1: Import 샘플 Excel 생성 코드 점검
```bash
grep -rn "download-import-sample\|샘플\|sample\|template" src/ --include="*.ts" --include="*.tsx"
```

찾은 파일에서:
- 시트명이 "L2-1(A1) 공정번호" 같은 구 형식이면 확인
- 헤더 텍스트가 `pfmea-header-map.ts` 상수를 참조하는지 확인
- 하드코딩이면 → `PFMEA_CODE_TO_HEADER` 또는 `FMEA_COLUMN_IDS` 참조로 교체

#### Step A-2: PFMEA 워크시트 탭/컬럼 명칭 점검
```bash
grep -rn "완제품기능\|제품기능\|공정기능\|작업요소\|고장형태\|고장원인\|고장영향" src/app/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|.next"
```

Phase 2B에서 처리 안 된 하드코딩이 남아 있으면:
- `pfmea-header-map.ts` 상수 참조로 교체
- 이미 상수 참조면 변경 불필요

#### Step A-3: 수동 Import 시트 탭명은 변경하지 않는다
기존 사용자가 다운로드한 Excel과 호환 유지를 위해
시트 탭명("L2-1(A1) 공정번호" 등)은 그대로 둔다.
`HEADER_NORMALIZE_MAP`이 모든 변형을 처리하므로 문제없음.

**작업 A 진행 메모 (2026-04-03)**

- **A-1**: `excel-template.ts`·`register/page.tsx`·`import/types.ts` 등은 **CODEFREEZE/보호 경로** — 샘플 생성 코드·시트 탭명은 **수정하지 않음** (A-3 준수).
- **A-2**: `PipelineStep0Detail.tsx` FC 고장사슬 테이블 헤더를 `pfmea-header-map`의 `FAIL_FM_NAME` / `FAIL_FC_NAME` / `FAIL_FE_NAME` 참조로 통일. 그 외 `allTabConstants`·등록 화면 라벨 등은 frozen/보호 파일로 동일 이유에서 유지.

---

### 작업 B: pfm26-m002 완제품기능(FN_L1) 재작성

#### 배경
현재 pfm26-m002의 L1 기능 구조에 문제:
- "공정 파라미터가 규격을 충족하여 Bump 품질을 확보한다" → 요구사항 6개 매칭 (과다)
- "제품 안전·법규 기준 및 고객 품질 요구사항을 만족한다" → 요구사항 4개+ 매칭 (과다)

AIAG-VDA 기준: 하나의 기능에 요구사항 2~3개가 적정.
기능을 성격별로 분리하여 각각 2~3개 요구사항과 매칭되도록 재작성한다.

#### 재작성 기준 데이터

현재:
```
기능                                                    요구사항
─────────────────────────────────────────────────────  ──────────────────────────────────
Au Bump 제품특성이 자사 공정 수율 기준을 충족한다              Au Bump 높이 규격 (Bump Height Spec, μm)
Wafer 표면 청정도가 공정 파티클 기준을 만족한다               Au Bump 외관 결함 기준 (Visual Defect Acceptance Criteria)
공정 파라미터가 규격을 충족하여 Bump 품질을 확보한다 ←6개     파티클 수 허용 기준 (Max Particle Count, ea)
                                                        UBM 두께 규격 (UBM Thickness Spec, Å)
                                                        CD 규격 (Critical Dimension Spec, μm)
                                                        PR 두께 규격 (PR Thickness Spec, μm)
                                                        PR 잔사 허용 기준 (PR Residue Acceptance Criteria)
                                                        Seed 잔류물 허용 기준 (Seed Residue Acceptance Criteria)
제품 안전·법규 기준 및 고객 품질 요구사항을 만족한다 ←4개+    Au Bump 외관 고객 기준 (Customer Visual Defect Criteria)
                                                        고객 납품 파티클 기준 (Customer Particle Criteria, ea)
                                                        포장 기준 적합성 (Packaging Compliance)
                                                        Au 순도 고객 규격 (Au Purity Spec, %)
                                                        IMC 두께 고객 규격 (IMC Thickness Spec, μm)
```

변경 후:
```
구분   기능                                                          요구사항 (2~3개)
────  ──────────────────────────────────────────────────────────    ───────────────────────────────────
YP    Au Bump 높이 및 형상이 공정 수율 기준을 충족한다                   Au Bump 높이 규격 (Bump Height Spec, μm)
      \nEnsure Au Bump height and geometry meet process yield spec      CD 규격 (Critical Dimension Spec, μm)

YP    UBM·PR 막두께가 공정 규격을 충족한다                              UBM 두께 규격 (UBM Thickness Spec, Å)
      \nEnsure UBM and PR film thickness meet process spec              PR 두께 규격 (PR Thickness Spec, μm)

YP    공정 후 표면 청정도가 잔류물 기준을 충족한다                        PR 잔사 허용 기준 (PR Residue Acceptance Criteria)
      \nEnsure post-process surface cleanliness meets residue spec       Seed 잔류물 허용 기준 (Seed Residue Acceptance Criteria)

YP    Wafer 표면 청정도가 공정 파티클 기준을 만족한다                     파티클 수 허용 기준 (Max Particle Count, ea)
      \nEnsure wafer surface cleanliness meets particle spec             Au Bump 외관 결함 기준 (Visual Defect Acceptance Criteria)

SP    고객 납품 품질이 외관·파티클 기준을 만족한다                        Au Bump 외관 고객 기준 (Customer Visual Defect Criteria)
      \nEnsure delivery quality meets visual and particle criteria       고객 납품 파티클 기준 (Customer Particle Criteria, ea)

SP    고객 소재·포장 규격을 만족한다                                     Au 순도 고객 규격 (Au Purity Spec, %)
      \nEnsure material and packaging meet customer spec                 IMC 두께 고객 규격 (IMC Thickness Spec, μm)
                                                                        포장 기준 적합성 (Packaging Compliance)
```

> 위 표는 기획자 제안 기준. 실제 DB 업데이트 시 기존 L1Function 레코드를 수정하고
> 하위 FE(고장영향), FM, FC 연결이 끊어지지 않도록 주의.

#### Step B-1: 현재 pfm26-m002 L1 Function 데이터 확인
```sql
-- pfmea_pfm26_m002 스키마에서 (Prisma 모델: L1Function — 컬럼은 functionName)
SELECT id, category, "functionName", requirement FROM l1_functions
WHERE "fmeaId" = 'pfm26-m002' ORDER BY category, "functionName";
```

**실행 결과 (2026-04-03, `npx tsx --require dotenv/config scripts/dump-l1-functions.ts pfm26-m002`)**

| id | category | functionName (완제품기능) | requirement (요구사항) |
|----|----------|---------------------------|-------------------------|
| L1-R114-C2 | SP | 제품 안전·법규 기준 및 고객 품질 요구사항을 만족한다 | Au Bump 높이 고객 출하 규격 (Customer Bump Height Spec, μm) |
| L1-R185-C2 | USER | RoHS 등 환경·안전 규제를 준수하는 제품을 제공한다 | ESD 민감도 기준 (ESD Sensitivity Class) |
| L1-R2-C2 | YP | Au Bump 제품특성이 자사 공정 수율 기준을 충족한다 | Au Bump 높이 규격 (Bump Height Spec, μm) |
| L1-R15-C2 | YP | RoHS 등 환경·안전 규제를 준수하는 제품을 제공한다 | RoHS 유해물질 기준 적합성 (RoHS Compliance) |
| L1-R3-C2 | YP | Wafer 표면 청정도가 공정 파티클 기준을 만족한다 | Au Bump 외관 결함 기준 (Visual Defect Acceptance Criteria) |
| L1-R4-C2 … L1-R9-C2 | YP | **공정 파라미터가 규격을 충족하여 Bump 품질을 확보한다** (6행) | 파티클/CD/UBM/PR/Seed 등 각 1건씩 |
| L1-R10-C2 … L1-R14-C2 | YP | **제품 안전·법규 기준 및 고객 품질 요구사항을 만족한다** (5행) | 외관·파티클·포장·Au 순도·IMC |

문서 본문의 “과다 매칭” 진단과 일치: 동일 `functionName`에 요구사항이 6개·5개 묶여 있음.

덤프 스크립트: `scripts/dump-l1-functions.ts`

#### Step B-2: L1 Function 수정 (**2026-04-03 승인 반영 완료**)

기존 6개 요구사항 묶음 → 2~3개씩 분리된 새 기능으로 교체.

방법:
1. 기존 "공정 파라미터가 규격을 충족하여..." L1Function 레코드 → 삭제하지 않고 name 변경
2. 신규 L1Function 레코드 추가 (분리된 기능)
3. 각 요구사항(requirement)을 올바른 L1Function에 재매칭
4. FE(고장영향)의 parentId가 올바른 L1Function.id를 가리키는지 확인

⚠️ FE-FM-FC 고장사슬이 끊어지지 않도록:
- Prisma FK는 `FailureEffect.l1FuncId` → `L1Function.id`
- **모든 L1 행 id 유지**(`L1-R2-C2` 등)로 갱신하여 **FL/FM/FC 마이그레이션 불필요**
- 구분이 YP→SP로 바뀐 L1(`R10`~`R14`, `R114`)에 연결된 `FailureEffect.category`를 `SP`로 `updateMany` 정합

**적용 스크립트**: `scripts/migrate-pfm26-m002-l1-functions.ts`  
실행: `npx tsx --require dotenv/config scripts/migrate-pfm26-m002-l1-functions.ts`

#### Step B-3: Import로 반영
직접 DB 수정이 복잡하면:
1. 수정된 데이터로 Import Excel을 재작성
2. 기존 pfm26-m002 L1 데이터 초기화
3. 재작성된 Excel로 Import 실행

이번 작업은 **DB 직접 갱신(B-2 스크립트)** 으로 반영했으며 Import 엑셀 재작성(B-3)은 생략.

최종 확인: `npx tsx --require dotenv/config scripts/dump-l1-functions.ts pfm26-m002`

#### Step B-4: 검증
```bash
# FK 무결성
curl http://127.0.0.1:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m002

# 헬스체크
curl http://127.0.0.1:3000/api/fmea/health/import-integrity?fmeaId=pfm26-m002
```
- FK allGreen 확인
- 고아 FE 0건 확인
- 브라우저에서 WS 탭 열어 FE-FM-FC 연결 정상 확인 (기획자 육안)

**2026-04-03 자동 검증**: `GET /api/fmea/validate-fk?fmeaId=pfm26-m002` → `allGreen: true`.  
`GET /api/fmea/health/import-integrity?fmeaId=pfm26-m002` → `status: healthy`.

> 워크시트가 **레거시 JSON 캐시**만 보여 옛 문구가 남으면, Atomic 재로드 또는 `export-master`/동기화 절차로 스냅샷을 맞출 것.

### 금지 사항
- Import 샘플의 시트 탭명(L2-1(A1) 등) 변경 금지 (기존 호환)
- CODEFREEZE 파일 변경 금지
- Step B-2는 승인 후 적용 완료(위 스크립트·검증 기록 참고)
- FE-FM-FC 고장사슬 연결 끊지 않을 것