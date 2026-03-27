# 위치기반 FK 100% — 스냅샷 · 코드프리즈 기준점

**최종 업데이트:** 2026-03-23

## 1단계: 스냅샷 백업 (완료)

| 항목 | 값 |
|------|-----|
| **커밋** | `646f63b` — `위치기반 FK 100% 구현.3월23일 11시 15분` |
| **태그** | `snapshot-location-fk-100pct-2026-03-23` (annotated) |

### 이 시점으로 되돌리기

```bash
# 읽기 전용 확인
git checkout snapshot-location-fk-100pct-2026-03-23

# 브랜치로 복구 작업
git checkout -b recover/location-fk-100pct snapshot-location-fk-100pct-2026-03-23
```

---

## 2단계: 코드프리즈 (정책)

**핵심 원칙:** *동작하는 코드를 먼저 보호하고, 그 다음에 개선한다.*

이 태그 이후 아래 순서를 지킨다:

1. ✅ **백업** — 위 태그
2. ✅ **프리즈(정책)** — 본 문서 + 보호 경로 가드 (`scripts/guard/*`)
3. ✅ **검증 테스트 스크립트** — `scripts/verify-location-fk-baseline.ts` + `npm run verify:pipeline-baseline` (아래 §3)
4. ✅ **주석(읽기 전용 성격)** — `verify-steps.ts` 파일 헤더·`verifyFk`/`verifyMissing` JSDoc 보강 (로직 불변)
5. ⏳ **최적화** — 맨 마지막, 매 변경마다 동일 검증 스크립트 실행

**금지:** 프리즈·검증 없이 보호 경로(워크시트/고장분석 등)에서 로직 변경.

**보호 경로 변경 시:** 저장소 정책에 따라 `FMEA_GUARD_OVERRIDE=APPROVED-BY-USER` 및 사용자 서면 승인.

---

## 3단계: 파이프라인·FK 검증 스크립트 (완료)

**전제:** `npm run dev` 등으로 API가 떠 있고, 대상 `fmeaId`가 프로젝트 스키마에 Import·저장되어 있어야 합니다.

| 명령 | 설명 |
|------|------|
| `npm run verify:pipeline-baseline` | `GET /api/fmea/pipeline-verify?fmeaId=…` 호출 → `success` + `allGreen` 필수 (5단계 모두 `status=ok`) |
| `npm run verify:pipeline-baseline:strict` | 위 + **`pfm26-m002` 골든**: L2=21, FailureLink=111, FK 고아 0, `feId` NULL FL 0 |

**환경 변수**

| 변수 | 기본값 |
|------|--------|
| `VERIFY_BASE_URL` | `http://127.0.0.1:3000` |
| `VERIFY_FMEA_ID` | `pfm26-m002` |

PowerShell 예:

```powershell
$env:VERIFY_BASE_URL="http://localhost:3000"
$env:VERIFY_FMEA_ID="pfm26-m002"
npm run verify:pipeline-baseline:strict
```

---

## 4단계: FK·누락 검증 주석 (완료)

- `src/app/api/fmea/pipeline-verify/verify-steps.ts`: 프로젝트 스키마 맥락, STEP 3 FailureLink SSoT·3요소·고아/미연결/RA 커버, STEP 4 FK와의 역할 구분.

## 5단계 이후 (예정)

- 최적화: 변경 후 `npm run verify:pipeline-baseline` 재실행
- 상세 명세: `docs/UUID_FK_SPECIFICATION.md`, `CLAUDE.md` Rule 0·1.7 참고
