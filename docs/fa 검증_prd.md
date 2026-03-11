# FA 검증 PRD (Count + Consistency)

## 1) 목적
- FA(통합분석) 확정 전, Import 데이터의 신뢰성을 100% 검증한다.
- 단순 건수 일치뿐 아니라 셀 값/관계 일치성까지 검증하여 잘못된 데이터 저장을 차단한다.

## 2) 범위
- 대상 화면: `PFMEA Import > SA/FC/FA 단계`
- 대상 시점: `FA 확정 버튼 클릭 직전`
- 대상 데이터:
  - `flatData` (A/B/C 시트 파싱 결과)
  - `externalChains` (FC_고장사슬 파싱 원본)
  - `parseStatistics` (원본 대비 통계/검증 결과)

---

## 3) 검증항목 갯수

| 구분 | 항목 수 | 상세 |
|------|---------|------|
| **Count 검증** | 5 | 체인 총건수, FM/FC/FE 고유건수(3), 원본대조 |
| **Consistency 필수** | 8 | 행 필수값 4건 + 관계 일치 4건 |
| **Consistency 선택** | 2 | m4 허용값·매핑, 선택컬럼 전건검증 |
| **합계** | **15** | 모두 통과 시에만 FA 확정 허용 |

### 3.1 Count 검증 (5개)

| # | 검증항목 | 소스 | 기대조건 |
|---|----------|------|----------|
| C1 | 체인 총 건수 | `parseStatistics` / `externalChains` | `chainCount === externalChains.length` |
| C2 | FM 고유건수 | A5 unique / chains.fmValue unique | 동일 |
| C3 | FC 고유건수 | B4 unique / chains.fcValue unique | 동일 |
| C4 | FE 고유건수 | C4 unique / chains.feValue unique | 동일 |
| C5 | 원본대조 | `verification` | `verification.pass === true` (제공 시) |

### 3.2 Consistency 검증 (10개)

| # | 검증항목 | 소스 | 기대조건 |
|---|----------|------|----------|
| S1 | processNo 누락 | 체인 각 행 | 0건 |
| S2 | fmValue 누락 | 체인 각 행 | 0건 |
| S3 | fcValue 누락 | 체인 각 행 | 0건 |
| S4 | feValue 누락 | 체인 각 행 | 0건 |
| S5 | processNo 존재성 | 체인 vs A1 공정목록 | 모든 processNo ∈ A1 |
| S6 | fmValue 존재성 | 체인 vs 해당 공정 A5 | fmValue ∈ 해당 공정 A5 |
| S7 | fcValue 존재성 | 체인 vs 해당 공정 B4 | fcValue ∈ 해당 공정 B4 |
| S8 | feValue 존재성 | 체인 vs C4 전역 | feValue ∈ C4 |
| S9 | m4 허용값·매핑 | m4 사용 시 | `MN|MC|IM|EN` + B1/B2/B3 매핑 |
| S10 | 선택컬럼 전건검증 | A3,A4,B2,B3,PC,DC,S/O/D/AP | 1건이라도 있으면 전건 검증 |

---

## 4) 일치성 테이블 (Source ↔ Expected)

### 4.1 Count 일치성

| 소스 데이터 | 비교 대상 | 일치 조건 | 실패 시 메시지 |
|-------------|-----------|-----------|----------------|
| `externalChains.length` | `parseStatistics.chainCount` | `===` | "체인 건수 불일치 (기대 N, 실제 M)" |
| `chains.fmValue` unique count | `flatData A5` unique count | `===` | "FM 고유건수 불일치" |
| `chains.fcValue` unique count | `flatData B4` unique count | `===` | "FC 고유건수 불일치" |
| `chains.feValue` unique count | `flatData C4` unique count | `===` | "FE 고유건수 불일치" |
| `verification` | - | `pass === true` | "원본대조 검증 실패" |

### 4.2 Consistency 일치성 (필수)

| 체인 필드 | 검증 대상 | 일치 조건 | 실패 시 메시지 |
|-----------|-----------|-----------|----------------|
| `processNo` | - | null/빈값 0건 | "processNo 누락 (행 N)" |
| `fmValue` | - | null/빈값 0건 | "fmValue 누락 (행 N)" |
| `fcValue` | - | null/빈값 0건 | "fcValue 누락 (행 N)" |
| `feValue` | - | null/빈값 0건 | "feValue 누락 (행 N)" |
| `processNo` | A1 공정 목록 | `processNo ∈ A1` | "processNo 미존재 (공정: X)" |
| `fmValue` | 해당 공정 A5 | `fmValue ∈ A5[processNo]` | "fmValue 공정 불일치 (공정 X, 값 Y)" |
| `fcValue` | 해당 공정 B4 | `fcValue ∈ B4[processNo]` | "fcValue 공정 불일치 (공정 X, 값 Y)" |
| `feValue` | C4 전역 | `feValue ∈ C4` | "feValue 미존재 (값 Y)" |

### 4.3 Consistency 일치성 (선택)

| 조건 | 검증 대상 | 일치 조건 | 실패 시 메시지 |
|------|-----------|-----------|----------------|
| m4 컬럼 사용 | m4 값 | `MN|MC|IM|EN` 중 하나 | "m4 허용값 위반 (값: X)" |
| m4 컬럼 사용 | B1/B2/B3 | workElement 매핑 유효 | "m4-workElement 매핑 오류" |
| A3,A4,B2,B3,PC,DC,S/O/D/AP 중 1건 이상 존재 | 해당 컬럼 전건 | null/빈값 0건 또는 허용값 | "선택컬럼 값 오류 (컬럼 X, 행 N)" |

---

## 5) FA 차단 정책
- 위 15개 검증항목 중 **하나라도 실패**하면:
  - FA 확정 중단
  - 실패 항목(C1~C5, S1~S10) 번호·메시지 요약 경고
  - `재Import` 유도
- **전부 통과** 시에만 `saveWorksheetFromImport` 실행

---

## 6) TDD 개발 계획
1. 테스트 작성 (실패 상태 확인)
   - Count 불일치 차단
   - Consistency 불일치 차단
   - 정상 데이터 통과
2. 최소 구현
   - `faValidation` 유틸 생성
   - `useImportSteps.confirmFA`에 게이트 연결
3. 테스트 통과
4. 리팩터링 (중복 제거/메시지 정리)

## 7) 테스트 케이스
- Unit (Vitest) – **15개 검증항목 전체 커버**
  - C1: `chainCount` 불일치 -> fail
  - C2~C4: `fm/fc/fe` 고유건수 불일치 -> fail
  - C5: `verification.pass` false -> fail
  - S1~S4: `processNo`/`fmValue`/`fcValue`/`feValue` 누락 -> fail
  - S5: `processNo` 미존재(A1) -> fail
  - S6: `fmValue` 공정 불일치(가짜 데이터 주입) -> fail
  - S7: `fcValue` 공정 불일치 -> fail
  - S8: `feValue` 미존재 -> fail
  - S9~S10: 선택컬럼(m4 등) 오류 -> fail
  - 정상 데이터(15개 모두 통과) -> pass

## 8) 순차/회귀 검증 (3회)
- 순차 검증: Import -> SA -> FC -> FA 를 3회 반복
- 회귀 검증: 기존 정상 샘플 3회 재검증
- 각 회차에서 FA 차단/통과가 기대값과 동일해야 PASS

## 9) 렌더/스냅샷 검증
- 실제 화면에서 FA 버튼 동작 확인
  - 실패 데이터: 차단 메시지 노출
  - 정상 데이터: 워크시트 생성 진행
- 마지막에 스냅샷 생성:
  - `npm run snapshot`

## 10) 완료 조건
- [x] Unit test PASS (13개)
- [x] 순차/회귀 3회 PASS (fa-validation.test.ts)
- [x] FA 차단 정책이 실제 화면에서 재현 (tests/fa-validation-e2e.spec.ts)
- [x] 스냅샷 생성 완료
