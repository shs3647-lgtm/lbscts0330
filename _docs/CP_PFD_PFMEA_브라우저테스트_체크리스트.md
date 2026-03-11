# CP / PFD / PFMEA 3모듈 연동 브라우저 테스트 체크리스트

> **작성일**: 2026-03-08
> **목적**: 3모듈(PFMEA↔CP↔PFD) 연동 기능 수정 후 브라우저 수동 테스트
> **테스트 환경**: `http://localhost:3000` (또는 배포 서버)
> **소요 시간**: 약 60~90분

---

## 사전 준비

### 테스트 데이터 확인
- [ ] PFMEA 프로젝트 1건 이상 등록 확인 (L2 공정 3개+, L3 작업요소 5개+ 포함)
- [ ] 해당 PFMEA에 L2 기능분석 완료 (functions + productChars 입력)
- [ ] 해당 PFMEA에 L3 기능분석 완료 (functions + processChars 입력)
- [ ] L3 작업요소에 4M 분류 입력 (MC/MD/JG/IM/MN 혼합)
- [ ] PFD 1건 이상 등록 확인

### 테스트용 FMEA ID / CP No / PFD No 기록

| 항목 | 값 | 비고 |
|------|-----|------|
| PFMEA ID | | 예: pfm26-f001-l68-r00 |
| CP No | | 예: cp-f001 (자동생성 또는 기존) |
| PFD No | | 예: pfd26-f001-01 |

---

## 1. PFMEA → CP 연동 (핵심)

### 1-1. CP 신규 생성 (PFMEA → CP)

**경로**: PFMEA 워크시트 → 상단 메뉴 "CP연동" → "CP생성"

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | CP생성 버튼 클릭 → 위자드 모달 열림 | 5단계 위자드 UI 확인 | |
| 2 | 1단계: 공정 구조 미리보기 표시 | 공정번호, 공정명, 공정설명 확인 | |
| 3 | "전체연동" 클릭 → 성공 메시지 | "N건의 CP 항목을 생성했습니다" 토스트 | |
| 4 | CP 워크시트로 이동 확인 | "CP이동→" 버튼 → CP 워크시트 페이지 로드 | |
| 5 | **공정번호** 정상 표시 | PFMEA L2.no와 동일한 값 | |
| 6 | **공정명** 정상 표시 | PFMEA L2.name과 동일한 값 | |
| 7 | **공정설명** 정상 표시 | L2.functions[].name 조합 또는 L2.desc | |
| 8 | **설비/금형/JIG** 정상 표시 | L3 작업요소명 표시 (4M 프리픽스 제거됨) | |
| 9 | **제품특성** 행 분리 확인 | L2.functions[].productChars → 별도 행(product 타입) | |
| 10 | **공정특성** 행 분리 확인 | L3.functions[].processChars → 별도 행(process 타입) | |
| 11 | **특별특성(SC)** 정상 표시 | CC/SC 등 특성 코드 유지 | |
| 12 | **MN(사람) 제외** 확인 | 4M이 MN인 L3 작업요소가 CP에 없어야 함 | |
| 13 | **빈 공정번호 제외** 확인 | 공정번호가 비어있거나 "00"인 행 없어야 함 | |
| 14 | **대응계획 기본값** 확인 | 제품특성→"재작업 또는 폐기", 공정특성→"조건조정" | |

### 1-2. CP 구조 연동 (PFMEA → CP 2단계)

**경로**: PFMEA 워크시트 → 상단 메뉴 "CP연동" → "구조연동"

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | 구조연동 클릭 → 성공 메시지 | "구조 연동 완료: N건" 토스트 | |
| 2 | CP에 공정+작업요소 행 생성 확인 | CP 워크시트에서 구조 행 확인 | |
| 3 | **equipmentM4 원본 보존** | DB에 equipmentM4 필드에 원본 4M 코드 저장 확인 (Prisma Studio) | |
| 4 | **같은 공정번호 L2 병합** | 동일 공정번호의 L2가 여러 개일 때 L3 합침 | |
| 5 | **역링크 저장** | FmeaRegistration.linkedCpNo에 CP 번호 저장 확인 | |

### 1-3. CP 전체 데이터 연동 (PFMEA → CP 5단계)

**경로**: PFMEA 워크시트 → 상단 메뉴 "CP연동" → "데이터연동"

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | 데이터연동 클릭 → 성공 메시지 | 토스트 확인 | |
| 2 | **사용자 편집 필드 보존** | CP에서 수동 입력한 evalMethod, sampleSize 등 연동 후에도 유지 | |
| 3 | 연동 후 CP 새로고침 → 데이터 유지 | F5 후 동일 데이터 표시 | |
| 4 | **SyncLog 기록** | DB SyncLog 테이블에 기록 존재 (Prisma Studio) | |

### 1-4. 사용자 편집 필드 보존 (C1) — 핵심 테스트

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | CP 워크시트에서 `평가방법` 수동 입력 | 예: "SPC 관리도" 입력 후 저장 | |
| 2 | CP 워크시트에서 `시료크기` 수동 입력 | 예: "5개" 입력 후 저장 | |
| 3 | CP 워크시트에서 `시료빈도` 수동 입력 | 예: "매 로트" 입력 후 저장 | |
| 4 | CP 워크시트에서 `관리방법` 수동 입력 | 예: "X-R 관리도" 입력 후 저장 | |
| 5 | PFMEA에서 "CP연동" → "데이터연동" 재실행 | | |
| 6 | **CP에서 수동 입력값 유지 확인** | 위 4개 필드가 연동 후에도 동일 값 유지 | |
| 7 | PFMEA 측 데이터(공정명 등) 변경 후 재연동 | | |
| 8 | **변경된 필드만 업데이트, 수동 필드 보존** | 공정명 변경 반영 + evalMethod 유지 | |

---

## 2. CP → PFD 연동

### 2-1. CP → PFD 연동

**경로**: CP 워크시트 → 상단 메뉴 "PFD연동"

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | PFD연동 버튼 클릭 → 성공 메시지 | 토스트 확인 | |
| 2 | PFD 워크시트로 이동 | PFD 페이지 로드 확인 | |
| 3 | **공정번호** 정상 표시 | CP.processNo → PFD.processNo | |
| 4 | **공정명** 정상 표시 | CP.processName → PFD.processName | |
| 5 | **공정설명** 정상 표시 | CP.processDesc → PFD.processDesc | |
| 6 | **부품명** 정상 표시 | CP.partName → PFD.partName | |
| 7 | **작업요소** 정상 표시 | CP.workElement → PFD.workElement (H1 수정) | |
| 8 | **설비** 정상 표시 | CP.equipment → PFD.equipment | |
| 9 | **제품특성/공정특성** 전달 | CP 특성 → PFD 특성 컬럼 | |
| 10 | **특별특성** CC/SC 분리 | productSC, processSC 올바르게 분류 | |
| 11 | PFD 새로고침 후 데이터 유지 | F5 → 동일 데이터 | |
| 12 | **SyncLog 기록** | DB 확인 | |

---

## 3. PFD → CP 연동 (역방향)

### 3-1. PFD → CP 연동

**경로**: PFD 워크시트 → 상단 메뉴 "CP연동"
**또는**: API 직접 호출 `/api/control-plan/sync-from-pfd`

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | CP연동 버튼 클릭 → 성공 메시지 | "PFD에서 N건의 공정정보를 CP로 연동" | |
| 2 | CP에 공정 행 생성 확인 | CP 워크시트에서 확인 | |
| 3 | **연결된 CP 자동 감지** | PFD.linkedCpNos에서 CP 번호 자동 결정 | |
| 4 | **CP 없으면 에러 반환** | "CP 번호를 결정할 수 없습니다" 에러 (C5 수정) | |
| 5 | **트랜잭션 원자성** | 중간 실패 시 기존 데이터 롤백 (C6 수정) | |
| 6 | **빈 공정번호 제외** | processNo가 빈 행 CP에 없어야 함 (H8 수정) | |
| 7 | **SyncLog 기록** | DB 확인 | |

---

## 4. FMEA → PFD 연동

### 4-1. PFMEA → PFD 연동

**경로**: PFMEA 워크시트 → 상단 메뉴 "PFD연동"
**또는**: API `/api/pfd/sync-from-fmea`

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | PFD연동 클릭 → 성공 메시지 | 토스트 확인 | |
| 2 | **작업요소(workElement)** PFD에 전달 | L3.name → PFD.workElement (H1 수정) | |
| 3 | **equipmentM4** 보존 | 4M 코드별 설비 매핑 정보 PFD에 저장 (H2 수정) | |
| 4 | **공정 레벨** 전달 | L2.level → PFD.processLevel (M7 수정) | |
| 5 | **MN(사람) 제외** | 4M=MN인 작업요소 PFD에 없어야 함 | |
| 6 | PFD 새로고침 후 데이터 유지 | F5 → 동일 데이터 | |
| 7 | **역링크 저장** | PfdRegistration에 FMEA 연결 정보 저장 | |
| 8 | **SyncLog 기록** | DB 확인 | |

---

## 5. CP → PFMEA 역연동

### 5-1. CP → PFMEA 역연동

**경로**: CP 워크시트 → "FMEA연동"
**또는**: API `/api/pfmea/sync-from-cp`

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | FMEA연동 클릭 → 성공 메시지 | 토스트 확인 | |
| 2 | **역링크 트랜잭션 내부 실행** | 역링크 저장이 메인 트랜잭션 안에서 실행 (C4 수정) | |
| 3 | PFMEA에서 변경 사항 확인 | PFMEA 워크시트 로드 → CP에서 변경한 필드 반영 | |
| 4 | **기존 PFMEA 데이터 덮어쓰기 방지** | 이미 값이 있는 필드는 덮어쓰지 않음 (H3 수정) | |
| 5 | **SyncLog 기록** | DB 확인 | |

---

## 6. PFD → PFMEA 역연동

### 6-1. PFD → PFMEA 역연동

**경로**: API `/api/pfmea/sync-from-pfd`

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | 연동 성공 메시지 | API 응답 success: true | |
| 2 | **역링크 저장** | PFD → PFMEA linkedPfdNo 트랜잭션 내부 저장 (C4 수정) | |
| 3 | **기존 값 보호** | 이미 입력된 PFMEA 필드 덮어쓰지 않음 (H3 수정) | |
| 4 | **SyncLog 기록** | DB 확인 | |

---

## 7. 4M 분류 (M4) 관련 테스트

### 7-1. 4M 코드 정규화 + 원본 보존

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | **MC(설비)** → CP 설비 컬럼에 표시 | 4M=MC인 L3가 CP equipment에 나타남 | |
| 2 | **MD(금형)** → CP 설비 컬럼에 표시 | 4M=MD인 L3가 CP equipment에 나타남 | |
| 3 | **JG(지그)** → CP 설비 컬럼에 표시 | 4M=JG인 L3가 CP equipment에 나타남 | |
| 4 | **MN(사람)** → CP에서 제외 | 4M=MN인 L3가 CP에 없어야 함 | |
| 5 | **IM(자재)** → CP 설비 컬럼에 표시 | 4M=IM인 L3가 CP equipment에 나타남 | |
| 6 | **EN(환경)** → CP 설비 컬럼에 표시 | 4M=EN인 L3가 CP equipment에 나타남 | |
| 7 | **equipmentM4 DB 저장** | Prisma Studio에서 ControlPlanItem.equipmentM4 확인 | |
| 8 | **한글 4M 입력** | "기계", "금형", "지그" 등 한글 입력 시 정규화 | |
| 9 | **4M 미입력** | 4M이 빈 L3 → 기본값 '' 처리, CP에 포함 | |

---

## 8. 엣지 케이스 테스트

### 8-1. 빈 데이터 / 에러 처리

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | L3가 없는 L2만 있는 PFMEA → CP 연동 | 구조만 행(structure) 생성됨 | |
| 2 | 특성이 없는 L3만 있는 경우 | 설비/구조 행만 생성됨 | |
| 3 | CP가 없는 상태에서 PFD→CP 연동 시도 | "CP 번호를 결정할 수 없습니다" 에러 | |
| 4 | 동일 공정번호 L2가 2개 이상 | L3/functions 병합 후 단일 공정으로 처리 | |
| 5 | 연동 중 네트워크 끊김 | 에러 메시지 표시 + 기존 데이터 보존 | |
| 6 | 대량 데이터 (50+ 공정) 연동 | 타임아웃 없이 정상 완료 | |
| 7 | 같은 연동 2번 연속 실행 | 중복 데이터 없이 최신 상태 유지 | |

### 8-2. 연동 후 새로고침 (데이터 영속성)

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | PFMEA→CP 연동 후 CP 새로고침 | 데이터 유지 | |
| 2 | CP→PFD 연동 후 PFD 새로고침 | 데이터 유지 | |
| 3 | PFD→CP 연동 후 CP 새로고침 | 데이터 유지 | |
| 4 | CP→PFMEA 연동 후 PFMEA 새로고침 | 데이터 유지 | |
| 5 | 브라우저 탭 닫기 후 재접속 | 모든 연동 데이터 유지 | |

---

## 9. UI/UX 확인

### 9-1. 연동 위자드 (CpSyncWizard)

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | 위자드 열기/닫기 | X 버튼, 배경 클릭으로 닫기 | |
| 2 | 5단계 탭 전환 | 각 단계 클릭 시 데이터 변경 | |
| 3 | "전체연동" 버튼 동작 | 5단계 순차 실행 후 완료 | |
| 4 | "다음→" 버튼 동작 | 현재 단계 실행 후 다음으로 이동 | |
| 5 | "CP이동→" 버튼 | 연동 완료 후 CP 워크시트로 이동 | |
| 6 | 진행 표시 (로딩) | 연동 중 로딩 인디케이터 표시 | |
| 7 | 에러 시 토스트 메시지 | 실패 시 사용자 친화적 에러 메시지 | |

### 9-2. CP 워크시트 컬럼 표시

| # | 테스트 항목 | 확인 방법 | Pass/Fail |
|---|------------|-----------|-----------|
| 1 | 공정번호 컬럼 표시 | processNo 정상 | |
| 2 | 공정명 컬럼 표시 | processName 정상 | |
| 3 | 공정설명 컬럼 표시 | processDesc 정상 | |
| 4 | 부품명 컬럼 표시 | partName 정상 | |
| 5 | 설비/금형/JIG 컬럼 표시 | equipment 정상 (4M 프리픽스 없이) | |
| 6 | 제품특성 컬럼 표시 | productChar 정상 | |
| 7 | 공정특성 컬럼 표시 | processChar 정상 | |
| 8 | 특별특성 컬럼 표시 | specialChar 정상 (CC/SC 표시) | |
| 9 | 대응계획 컬럼 표시 | reactionPlan 기본값 표시 | |

---

## 10. DB 검증 (Prisma Studio)

**Prisma Studio 실행**: `npx prisma studio` → http://localhost:5555

| # | 테이블 | 확인 항목 | Pass/Fail |
|---|--------|-----------|-----------|
| 1 | ControlPlan | cpNo, fmeaId, linkedPfmeaNo, linkedPfdNo 존재 | |
| 2 | ControlPlanItem | equipmentM4 필드에 원본 4M 코드 저장 | |
| 3 | ControlPlanItem | pfmeaProcessId, pfmeaWorkElemId 연결 | |
| 4 | ControlPlanItem | linkStatus = 'linked' 확인 | |
| 5 | ControlPlanItem | rowType = 'product' / 'process' / 'structure' 구분 | |
| 6 | PfdRegistration | linkedCpNos, linkedPfmeaNo 존재 | |
| 7 | PfdItem | workElement 필드 값 존재 (H1 수정) | |
| 8 | PfdItem | equipmentM4 필드 값 존재 (H2 수정) | |
| 9 | FmeaRegistration | linkedCpNo 역링크 존재 (C4 수정) | |
| 10 | SyncLog | 각 연동 작업별 로그 기록 (M6 수정) | |
| 11 | DocumentLink | CP↔PFD 문서 연결 레코드 존재 | |

---

## 테스트 결과 요약

| 카테고리 | 총 항목 | Pass | Fail | N/A |
|----------|---------|------|------|-----|
| 1. PFMEA→CP 신규생성 | 14 | | | |
| 2. PFMEA→CP 구조연동 | 5 | | | |
| 3. PFMEA→CP 전체연동 | 4 | | | |
| 4. 사용자 편집 보존 (C1) | 8 | | | |
| 5. CP→PFD | 12 | | | |
| 6. PFD→CP | 7 | | | |
| 7. FMEA→PFD | 8 | | | |
| 8. CP→PFMEA | 5 | | | |
| 9. PFD→PFMEA | 4 | | | |
| 10. 4M 분류 | 9 | | | |
| 11. 엣지 케이스 | 12 | | | |
| 12. UI/UX | 16 | | | |
| 13. DB 검증 | 11 | | | |
| **합계** | **115** | | | |

---

## 버그 발견 시 기록 양식

| # | 발견일 | 카테고리 | 테스트 항목 # | 증상 | 재현 단계 | 스크린샷 |
|---|--------|----------|---------------|------|-----------|----------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

---

## 참고: 수정된 이슈 목록 (21건)

이번 수정으로 해결된 이슈 코드:

| 코드 | 심각도 | 설명 |
|------|--------|------|
| C1 | CRITICAL | CP 사용자 편집 필드 보존 (deleteMany 시 유실 방지) |
| C2 | CRITICAL | M4(4M) 정규화 원본 보존 |
| C3 | CRITICAL | 분리배치 미적용 → Phase A/B 분리 |
| C4 | CRITICAL | 역링크 저장 트랜잭션 밖 → 안으로 이동 |
| C5 | CRITICAL | linkedCpNos JSON 파싱 안전성 |
| C6 | CRITICAL | PFD→CP 트랜잭션 원자성 |
| H1 | HIGH | workElement PFD 미전달 → 전달 |
| H2 | HIGH | equipmentM4 PFD 미전달 → 전달 |
| H3 | HIGH | 기존 PFMEA 값 무조건 덮어쓰기 → 보호 |
| H4 | HIGH | DFMEA→CP M4 매핑 누락 → 추가 |
| H5 | HIGH | 로컬 normalizeM4 중복 → sync-helpers 통합 |
| H6 | HIGH | findOrCreateCp 역링크 누락 → 추가 |
| H7 | HIGH | equipmentM4 원본 보존 → DB 저장 |
| H8 | HIGH | 빈 공정번호 검증 → isValidProcessNo |
| M1 | MEDIUM | 빈 catch 블록 → console.error |
| M2 | MEDIUM | any 타입 → 명시적 타입 |
| M3 | MEDIUM | 스키마 equipmentM4 필드 추가 |
| M4 | MEDIUM | 공통 유틸 sync-helpers.ts 생성 |
| M5 | MEDIUM | CpAtomicProcess equipmentM4 추가 |
| M6 | MEDIUM | SyncLog 기록 추가 |
| M7 | MEDIUM | processLevel 하드코딩 → 동적 |
