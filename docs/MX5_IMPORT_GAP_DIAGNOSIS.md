# MX5 / 대형 PFMEA Import 누락(FM·FC·FE) 진단 가이드

**최종 업데이트**: 2026-03-24

## 1. 증상 구분 (어디서 숫자가 나오는가)

| 화면/도구 | 의미 |
|-----------|------|
| **Import — 파싱 검증 표** (`FAVerificationBar`) | 메인시트 flat(A5/B4/C4) **고유 키** vs FC시트(또는 도출 체인) **고유 키** 불일치 → 엑셀·파싱·체인 도출 단계 |
| **4ST 고장연결 — 누락 N건** (`FailureLinkTab`) | `failureLinks`에 **해결된** feId/fcId/fmId가 `feData`/`fcData`/`fmData`의 UUID와 맞지 않거나, FM에 FC 미연결 |
| **`pipeline-verify` API** | 프로젝트 스키마 **Atomic DB** FK·emptyPC·orphan 등 (고장연결 UI와 축이 다를 수 있음) |

## 2. 근본 원인 (2026-03-24 코드 분석 — FE 대량 누락)

### 2.1 결정적 버그: `canFeRowLink` (통합 시트 L1 위 / L2 아래)

**파일**: `src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts` — `buildFailureChainsFromFlat`

- 예전 조건: `max(C4 엑셀행) < min(A5 엑셀행)` 이면 **행 기반 FE 매핑 비활성화**.
- 전형적 통합 시트: **L1(C4) 블록이 위**, **L2(A5) 블록이 아래** → 위 조건이 참이 됨.
- 결과: 모든 체인이 **동일 carry-forward FE 텍스트**만 가지고 **`feFlatId` 없음** → `assignChainUUIDs`가 `feIdByText`에서 **정규화 텍스트당 첫 UUID만** 연결.
- L1에는 C4마다 별도 `failureScopes` UUID가 있으나, 링크에는 **한두 개의 feId**만 등장 → **FE 누락 수백 건**으로 표시.

**수정**: C4·A5에 행 번호가 있으면 **항상** `pickFeAtOrBeforeRow`로 FM/FC 행 이하 최근 C4를 FE로 싣고 `feFlatId`를 부여 (동일 시트 좌표계 전제).

### 2.2 그 외 축 (여전히 수동·데이터 점검)

| 축 | 점검 |
|----|------|
| **엑셀 원본** | A5/B4/C4 빈칸, 공정번호 불일치, FC시트 누락 행 |
| **파싱** | `parseStatistics` / `import-validation` ERROR |
| **UUID / flatMap** | `fillL1Data`의 C4↔FE `flatMap.fe` 순서 불일치 (C3/C4 개수 불균형) |
| **FK** | `validate-fk`, `repair-fk`, `pipeline-verify` STEP3 |
| **API** | `save-from-import` 409, 스키마 `ensureProjectSchemaReady` |

## 3. FORGE 루프 (재현 ~ 100% 맞추기)

- **Import 파싱 검증바 M1/M8 (2026-03-24)**: 행 #1·#8은 체인 행수 vs VERIFY수식 명세 축이다. 통합 시트·`supplementChainsFromFlatData` 등으로 수량이 명세와 1:1이 아닐 수 있어, **파싱 체인이 1건 이상이면 명세 대비 증감은 FAIL 배너·NG로 보지 않음** (`faVerificationSpecRelax.ts`). 연결 품질은 행 5~7·미매칭 패널로 확인.

1. **EXPLORE**: `fmeaId` 확정 후 아래 API로 스냅샷 저장.
2. **PLAN**: 누락이 Import 검증인지 / 고장연결 UI인지 / DB FK인지 분기.
3. **TDD**: `failure-chain-parsing-diagnosis` · `failure-link-pipeline` 등 회귀.
4. **EXECUTE**: 코드 수정 또는 엑셀 수정.
5. **VERIFY**: Re-Import → `pipeline-verify` POST → 워크시트 고장연결 누락 0 목표.
6. **COMMIT**: `APPROVED-BY-USER` 및 매뉴얼 동기화.

## 4. 자동 스크립트 (서버 없이 + 선택 API)

```powershell
# ① 통합 게이트: tsc + test:import-slice + 파이프라인·고장연결 Vitest 묶음 + 체인 스크립트
npm run verify:all

# ② 체인 스크립트만 (빠름)
npm run verify:import-fe-layout

# ③ dev 서버 + DB — pipeline-verify GET (필요 시 POST)
$env:VERIFY_BASE_URL='http://127.0.0.1:3000'
$env:VERIFY_FMEA_ID='pfm26-mXXX'
$env:VERIFY_PIPELINE_POST='1'          # 선택: 자동수정 루프
$env:VERIFY_PIPELINE_WARN_ONLY='1'      # 선택: allGreen=false여도 종료 0
npm run verify:import-fe-layout
# 또는 한 번에:
$env:VERIFY_BASE_URL='http://127.0.0.1:3000'; $env:VERIFY_FMEA_ID='pfm26-mXXX'; $env:VERIFY_PIPELINE_WARN_ONLY='1'; npm run verify:all
```

> **전체 `npx vitest run`**: Playwright/E2E·서버 의존 스펙 포함으로 로컬에서 다수 FAIL 가능. 풀 스위트는 `TEST_ENV=FULL_SYSTEM` 등 별도 절차 권장.

## 5. PowerShell 수동 검증 (로컬 서버 가동 후)

```powershell
$f = 'pfm26-mXXX'   # 실제 MX5 fmeaId로 교체

# DB·FK·누락(Atomic)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=$f" -Method GET | ConvertTo-Json -Depth 6

# 자동수정 루프 (최대 3회)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify" -Method POST -Body "{`"fmeaId`":`"$f`"}" -ContentType "application/json" | ConvertTo-Json -Depth 4
```

## 6. 수정 후 사용자 액션 (MX5)

1. 동일 엑셀로 **Import 재실행** (또는 `resave-import` 파이프라인이 있으면 규정에 따름).
2. **고장연결** 탭에서 누락 배너 재확인.
3. 필요 시 **고장연결 확정** 후 **워크시트 저장** → `FailureLink`·`RiskAnalysis` DB 반영.

---

**Vitest**: `진단 7: L1 위 / L2 아래 레이아웃` — `failure-chain-parsing-diagnosis.test.ts`
