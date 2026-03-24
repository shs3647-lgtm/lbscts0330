# FMEA 계층 구조 + CP/PFD 연동 아키텍처

> **작성일**: 2026-03-23  
> **최종 확정**: 2026-03-23 — §12 AIAG-VDA 5ST / 산업DB 6ST O·D 설계 추가  
> **이전 확정**: 2026-03-22 — Master 포함 **모든 PFMEA 행 데이터**는 `pfmea_{fmeaId}` 프로젝트 스키마에 저장 (§6.4 검증 레퍼런스 2026-03-22 보강)  
> **목적**: Master/Family/Part FMEA 계층과 CP/PFD 연동 방식 확정  
> **핵심**: **Master(M001)도 Family/Part와 동일하게 `pfmea_m001` 패턴**. public은 프로젝트 목록·등록정보·사용자 등 **메타 전용**. CP/PFD 행은 **항상 FMEA와 동일 프로젝트 스키마**.

---

## 1. FMEA 3계층 구조

```
Master FMEA (M001)
│  "제품군 전체의 표준 FMEA"
│  예: 12inch AU Bump 전체 공정 표준
│  저장: 프로젝트 스키마 pfmea_m001 (public 아님)
│
├── Family FMEA (F001, F002...)
│     "제품 패밀리 단위 FMEA"
│     예: AU Bump 5μm 패밀리, AU Bump 10μm 패밀리
│     저장: 프로젝트 스키마 (pfmea_{fmeaId})
│     기초정보: Master에서 상속
│
└── Part FMEA (P001, P002...)
      "개별 제품/부품 단위 FMEA"
      예: 고객A향 AU Bump 10μm Rev.3
      저장: 프로젝트 스키마 (pfmea_{fmeaId})
      기초정보: Master 또는 Family에서 상속
```

---

## 2. DB 저장 원칙

### 2.1 public 스키마 (메타·공통 참조 전용)

```
public 스키마에 저장하는 것 (행 단위 PFMEA/CP/PFD 데이터 아님):
  ├── FMEA 프로젝트 목록 (fmea_projects)
  ├── FMEA 등록 (fmea_registrations) — linkedCpNo, linkedPfdNo 등 연동 메타
  ├── CP/PFD 등록 메타 (cp_registrations, pfd_registrations 일부 조회용)
  ├── Triplet / APQP 연동
  ├── 사용자/권한 (users)
  ├── LLD 교훈사례 (lessons_learned)
  ├── AP 판정 매트릭스
  └── 표준공정 마스터 (master_processes)

역할:
  - Master **기초정보**는 Family/Part 생성 시 모달/API에서 **소스로 조회** (복사 원천)
  - public은 **프로젝트 식별·연결 정보**의 인덱스 역할
```

### 2.2 프로젝트 스키마 (Master / Family / Part 공통 패턴)

```
pfmea_{fmeaId} 스키마에 저장하는 것 (행 데이터 SSoT):
  ├── 해당 FMEA의 24개 엔티티 전체 (v4 기준, Master 포함)
  ├── 해당 FMEA의 CP (control_plans / control_plan_items)
  ├── 해당 FMEA의 PFD (pfd_registrations / pfd_items)
  └── 변경 이력 (audit trail 등)

예시:
  pfmea_m001 → Master M001의 FMEA + CP + PFD
  pfmea_f001 → Family F001의 FMEA + CP + PFD
  pfmea_p001 → Part P001의 FMEA + CP + PFD
```

### 2.3 왜 이렇게 분리하는가

```
Master 기초정보를 제공하는 방식:
  - Master의 **행 데이터**는 pfmea_m001에 있음
  - Family/Part 생성 시 모달에서 Master를 **복사** (상속 = 복사, §3.3)
  - public에 Master 행을 두지 않아도, 메타·API로 M001을 가리키면 됨

모든 프로젝트를 pfmea_{fmeaId}에 두는 이유:
  - Master/Family/Part **동일 패턴** → sync-cp-pfd / create-cp / 워크시트 단일 경로
  - fmeaId별 완전 독립, CP/PFD FK가 FMEA Atomic과 **같은 스키마**에서 유지
```

### 2.4 이중 경로 제거 (2026-03-23)

```
금지: sync-cp-pfd는 public.control_plans에 쓰고, 워크시트는 pfmea_* 스키마를 읽는 구조
필수: POST /api/fmea/sync-cp-pfd 도 CP/PFD 행을 pfmea_{fmeaId} 에만 저장 (create-cp / sync-to-cp 와 동일)

레거시 public CP/PFD 행: scripts/migrate-public-cp-pfd-to-project-schema.ts 로 이관 후 public 정리(선택)
```

---

## 3. Master → Family → Part 상속 흐름

### 3.1 Family 생성 시

```
[Family FMEA 신규 생성]
    │
    ▼
[모달: Master 기초정보 선택]
    │  public.master_fmea에서 조회
    │  ├── 공정 목록 (L2Structure)
    │  ├── 4M/작업요소 (L3Structure)
    │  ├── 표준 FM/FE/FC
    │  └── 표준 DC/PC
    │
    ▼
[사용자: 필요한 항목 선택/수정]
    │  ├── 공정 추가/삭제
    │  ├── FM/FC 수정
    │  └── Family 고유 항목 추가
    │
    ▼
[프로젝트 스키마 생성]
    │  pfmea_{familyFmeaId}
    │
    ▼
[선택된 Master 데이터 → 프로젝트 스키마에 복사]
    │  ★ 복사본이므로 이후 독립 운영
    │  ★ Master 수정해도 Family에 자동 반영 안 됨
    │  ★ 필요 시 "Master 동기화" 기능으로 수동 병합
    │
    ▼
[Family FMEA 독립 운영 시작]
```

### 3.2 Part 생성 시

```
[Part FMEA 신규 생성]
    │
    ▼
[모달: 기초정보 소스 선택]
    │  ├── 옵션 A: Master에서 상속
    │  └── 옵션 B: Family에서 상속
    │
    ▼
[기초정보 모달 표시]
    │  소스(Master 또는 Family)에서 조회:
    │  ├── 공정 목록
    │  ├── FM/FE/FC
    │  ├── DC/PC
    │  └── 기존 SOD 참고값
    │
    ▼
[사용자: Part 고유 항목 수정]
    │
    ▼
[프로젝트 스키마 생성 + 데이터 복사]
    │
    ▼
[Part FMEA 독립 운영]
```

### 3.3 상속 규칙

```
규칙 1: 상속 = 복사. 참조가 아님.
  → Family/Part는 생성 시점의 Master 스냅샷을 복사받음
  → 이후 Master 변경이 자동 전파되지 않음

규칙 2: 동기화는 수동.
  → "Master 동기화" 버튼으로 Master 변경분을 diff 비교
  → 사용자가 항목별로 수락/거부 선택

규칙 3: 상위→하위 방향만.
  → Master → Family → Part (하향 상속만 가능)
  → Part에서 발견한 개선사항은 LLD(교훈사례)로 등록 후
    Master에 반영하는 별도 프로세스
```

---

## 4. CP/PFD 연동

### 4.1 CP 저장 위치 (핵심 수정)

```
원칙 (2026-03-23 확정):
  CP 행 데이터는 해당 FMEA와 같은 프로젝트 스키마에만 저장

  Master M001의 CP → pfmea_m001.control_plans
  Family F001의 CP → pfmea_f001.control_plans
  Part P001의 CP → pfmea_p001.control_plans

API: POST /api/fmea/sync-cp-pfd — public이 아닌 pfmea_{fmeaId} 에 INSERT/UPDATE
```

### 4.2 CP 연동 구조

```
FMEA 워크시트
    │
    │  FM(고장형태) + FC(고장원인) + PC(예방관리) + DC(검출관리)
    │  + SOD/AP + 제품특성(A4) + 공정특성(B3) + 특별특성
    │
    ▼
[CP 동기화 (sync-to-cp)]
    │
    ▼
CP 워크시트 (같은 프로젝트 스키마)
    ├── control_plans (CP 헤더)
    │     id, fmeaId, cpNo, title, ...
    │
    └── control_plan_items (CP 항목)
          id, cpId, processNo, processName,
          productChar, processChar, specialChar,
          controlMethod, sampleSize, sampleFreq,
          reactionPlan, ...
          
          FK 참조:
          fmeaFmId → FailureMode UUID
          fmeaPcId → ProductChar UUID
          fmeaL3CharId → L3ProcessChar UUID  ★v4 핵심
          fmeaFcId → FailureCause UUID
```

### 4.3 FMEA → CP 동기화 매핑

```
FMEA 엔티티              →  CP 항목 필드
─────────────────────────────────────────
L2Structure.processNo     →  cp_item.processNo
L2Structure.processName   →  cp_item.processName
ProductChar.charText      →  cp_item.productChar
L2SpecialChar.specialChar →  cp_item.productSpecialChar
L3ProcessChar.charText    →  cp_item.processChar        ★v4
L3SpecialChar.specialChar →  cp_item.processSpecialChar  ★v4
FailureMode.modeText      →  cp_item.failureMode
DetectionControl.controlText → cp_item.controlMethod
PreventionControl.pcText  →  cp_item.preventionMethod
RiskAnalysis.ap           →  cp_item.actionPriority

CP 고유 필드 (FMEA에 없는 것):
  sampleSize, sampleFreq, reactionPlan, responsiblePerson
  → CP 워크시트에서 사용자가 직접 입력
```

### 4.4 PFD 연동 구조

```
FMEA 워크시트
    │
    │  L2Structure (공정 목록, 순서)
    │  L3Structure (작업요소)
    │  FM/FC (고장형태/원인)
    │
    ▼
[PFD 동기화 (sync-to-pfd)]
    │
    ▼
PFD (같은 프로젝트 스키마)
    ├── pfd_registrations (PFD 헤더)
    │     id, fmeaId, pfdNo, ...
    │
    └── pfd_items (PFD 항목)
          id, pfdId, processNo, processName,
          processType, inputMaterial, outputMaterial,
          equipment, controlPoint, ...
          
          FK 참조:
          fmeaL2StructId → L2Structure UUID
          fmeaProcessNoId → L2ProcessNo UUID  ★v4
```

### 4.5 FMEA → PFD 동기화 매핑

```
FMEA 엔티티              →  PFD 항목 필드
─────────────────────────────────────────
L2Structure               →  pfd_item 행 (공정 1개 = PFD 1행)
L2ProcessNo.processNo     →  pfd_item.processNo
L2ProcessName.processName →  pfd_item.processName
L2Function.functionText   →  pfd_item.processDescription

PFD 고유 필드:
  processType (가공/검사/이동/보관/지연)
  inputMaterial, outputMaterial
  → PFD 워크시트에서 사용자가 직접 입력
```

---

## 5. 전체 연동 아키텍처

```
public 스키마 (메타)
┌─────────────────────────────────────────────────┐
│  fmea_projects / fmea_registrations             │
│  users, LLD, ap_matrix, master_processes …      │
└─────────────────────────────────────────────────┘
        │
        │  fmeaId
        ▼
┌─────────────────────────────────────────────────┐
│  pfmea_m001 — Master (M001)                     │
│  24개 엔티티 + CP + PFD (행 데이터 SSoT)         │
└─────────────────────────────────────────────────┘
        │                          │
        │ 기초정보 제공             │ 기초정보 제공
        ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│ pfmea_f001       │    │ pfmea_f002       │
│ Family FMEA #1   │    │ Family FMEA #2   │
│ ├── 24개 엔티티  │    │ ├── 24개 엔티티  │
│ ├── Family CP    │    │ ├── Family CP    │
│ └── Family PFD   │    │ └── Family PFD   │
└──────────────────┘    └──────────────────┘
    │          │
    ▼          ▼
┌────────┐  ┌────────┐
│pfmea_  │  │pfmea_  │
│p001    │  │p002    │
│Part #1 │  │Part #2 │
│├─24엔티│  │├─24엔티│
│├─Part  │  │├─Part  │
││ CP    │  ││ CP    │
│└─Part  │  │└─Part  │
│  PFD   │  │  PFD   │
└────────┘  └────────┘
```

---

## 6. 기초정보 모달 (수동/자동 작성 시)

### 6.1 모달 동작 흐름

```
[사용자: Family 또는 Part FMEA 작성 시작]
    │
    ▼
[기초정보 모달 열림]
    │
    ├── 소스 선택: [Master M001 ▼] 또는 [Family F001 ▼]
    │
    ├── 공정 목록 표시 (Master/Family에서 로드)
    │   □ 01 작업환경
    │   ☑ 10 IQA
    │   ☑ 20 Sorter
    │   ☑ 40 UBM Sputter
    │   ...
    │   → 사용자가 필요한 공정 체크
    │
    ├── 선택된 공정의 기초정보 미리보기
    │   공정 40 UBM Sputter:
    │     A3: Ti/Cu UBM 증착으로...
    │     A4: UBM 두께 (★), 막질 균일도
    │     A5: UBM 두께 부족, 막질 불균일
    │     4M/WE: MC-Sputter장비, IM-Ti Target, ...
    │     B3: DC Power, 전압안정도, ...
    │     B4: Power 변동, 전압 변동, ...
    │
    ├── [수동 모드]: 사용자가 항목별 수정/추가/삭제
    │   또는
    ├── [자동 모드]: 선택된 공정의 기초정보 전체 자동 복사
    │
    ▼
[확인] → 프로젝트 스키마에 데이터 생성
```

### 6.2 모달 API

```
GET /api/fmea/master-base-info?sourceId={masterId}&processNos=10,20,40

응답:
{
  source: "M001",
  sourceType: "master",
  processes: [
    {
      processNo: "40",
      processName: "UBM Sputter",
      l2Struct: { id: "L2-R13", ... },
      l2Func: { id: "L2-R13-C3", functionText: "..." },
      productChars: [ { id: "L2-R13-C4", charText: "UBM 두께", ... } ],
      failureModes: [ { id: "L2-R13-C6", modeText: "UBM 두께 부족", ... } ],
      l3Items: [
        {
          fourM: "MC", workElement: "Sputter 장비",
          l3Func: { functionText: "...", processChar: "DC Power" },
          failureCause: { causeText: "Power 변동" },
          preventionControl: { pcText: "..." }
        },
        ...
      ],
      detectionControl: { controlText: "4-Point Probe..." }
    }
  ]
}
```

### 6.3 기초정보 복사 시 UUID 처리

```
Master의 UUID: L2-R13-C6 (Master 엑셀 기준 위치)
Family에 복사 시: 새 UUID 부여 (Family 자체 위치 기반)

방법 A: Family Import 엑셀을 생성해서 Import
  → Master 기초정보 → 엑셀 생성 → Family Import → 위치기반 UUID 자동 부여

방법 B: 직접 DB 복사 + UUID 재생성
  → Master 데이터 읽기 → UUID를 Family 프로젝트용으로 재생성 → 프로젝트 스키마에 저장

권장: 방법 A (Import 파이프라인 재사용, 일관성)
```

### 6.4 위치기반 Import — 엑셀 행 기준(기준행) + FC는 관계만

**원칙 (정답):**

- Import 시 **엑셀 물리 행(1-based)** 을 **기준행**으로 삼아 L1/L2/L3 각 시트에서 행 단위로 엔티티를 생성·등록한다.
- **FC(고장사슬) 시트**는 L1/L2/L3 본문을 다시 텍스트 매칭하지 않고, `L1원본행` / `L2원본행` / `L3원본행`에 적힌 기준행 번호만으로 FE–FM–FC **상호관계(FailureLink)** 를 연결한다.
- 즉 FC의 역할은 **“어느 행의 FE·FM·FC를 한 체인으로 묶을지”** 를 행 포인터로만 지정하는 것이다.

**저장·검증 (개발 레퍼런스):**

- 위치기반 파서 산출물 → DB: `POST /api/fmea/save-position-import` — `risk_analyses` 행은 **`linkId`**(FailureLink FK)와 **`fmId` / `fcId` / `feId`**(EX-06)를 함께 저장한다. (타입상 E-22 `parentId`는 FL id와 동일 의미이나 Prisma 스키마에는 `linkId`만 존재.)
- 회귀(DB 불필요): `npm run test:import-slice` — 위치 가드·`save-from-import`·`position-parser`·`atomicToFlatData`(C1–C4 FK)·`buildAtomicFromFlat` fallback. Import 반영 후: `npm run verify:pipeline-baseline` (대상 `fmeaId` Atomic 존재 전제).
- 상세: `docs/MAINTENANCE_MANUAL.md` §2.2·§2.5, `docs/SMART_FMEA_IMPORT_PIPELINE_OPTIMIZATION_GUIDE.md`.

### 6.5 글로벌 내비·Part FMEA (출시 정책)

- **FMEA Core 사이드바** 메뉴는 `src/components/layout/fmea-core-sidebar-menu.tsx` 단일 소스이며, Master/Family/Part **계층 개념**과 별개로 **PFMEA 리스트·등록**에서 동일 `fmeaId` 패턴으로 접근한다.
- **Part FMEA** 전용 화면(`/part-fmea/*`)은 글로벌 사이드바 최상위에서 **비노출**(직접 URL·내부 링크·등록 시 Part 선택 유지). 상세: `docs/FMEA_RELEASE_FORGE_SIDEBAR_AUDIT_REPORT.md` §6.1.
- 사이드바에 없는 PFMEA 보조 경로(`compare`, `fmea4`, 임포트 서브경로 등)는 매뉴얼·도움말에 URL을 안내하거나 메뉴 정책을 확정할 것.

---

## 7. Master 동기화 (변경분 반영)

### 7.1 Master 변경 시 하위 프로젝트 알림

```
[Master M001 수정]
    │
    ▼
[변경 이벤트 기록]
    public.master_change_log:
      changeId, masterId, entityType, entityId,
      changeType (add/modify/delete), changedAt
    │
    ▼
[하위 프로젝트에 알림 배지 표시]
    Family F001: "Master 변경 3건"
    Part P001: "Master 변경 3건"
    │
    ▼
[사용자: "동기화" 클릭]
    │
    ▼
[Diff 비교 화면]
    │  Master 현재값 vs 프로젝트 현재값
    │
    │  공정 40 A5 "UBM 두께 부족":
    │    Master: "UBM 두께 Spec Out (Under/Over)"  ← 변경됨
    │    F001:   "UBM 두께 부족"                   ← 기존 값
    │    [수락] [거부]
    │
    ▼
[수락한 항목만 프로젝트에 반영]
```

---

## 8. CP 스키마 불일치 해결 (기존 문제)

### 8.1 문제 원인 (해결됨)

```
과거:
  일부 경로가 public.control_plans / public.pfd_* 에만 쓰고
  워크시트는 getPrismaForCp → pfmea_{fmeaId} 를 읽음 → 빈 화면

현재:
  sync-cp-pfd POST는 프로젝트 스키마에만 쓴다 (create-cp / sync-to-cp 와 동일 SSoT)
```

### 8.2 마이그레이션 (레거시 public 행)

```
기존 public에만 남아 있는 CP/PFD 행:
  → scripts/migrate-public-cp-pfd-to-project-schema.ts
  → dry-run 후 본 실행
  → 이관 완료 후 public 행 삭제는 운영 정책에 따라 (백업 후)
```

### 8.3 CP/PFD 통합 스키마 구조

```
프로젝트 스키마 (pfmea_{fmeaId}) 테이블 전체:

FMEA 데이터 (v4 24개 엔티티):
  l1_structures, l1_scopes, l1_functions, l1_requirements,
  failure_effects,
  l2_structures, l2_process_nos, l2_process_names,
  l2_functions, product_chars, l2_special_chars,
  failure_modes, detection_controls,
  l3_structures, l3_process_nos, l3_four_ms, l3_work_elements,
  l3_functions, l3_process_chars, l3_special_chars,
  failure_causes, prevention_controls,
  failure_links, risk_analyses

CP 데이터:
  control_plans           (CP 헤더)
  control_plan_items      (CP 항목, FMEA FK 참조)

PFD 데이터:
  pfd_registrations       (PFD 헤더)
  pfd_items              (PFD 항목, FMEA FK 참조)

메타 데이터:
  fmea_confirmed_states   (확정 상태)
  optimizations          (최적화 조치)
  audit_trail            (변경 이력)
```

---

## 9. linkedCpNo 문제 해결

```
기존 문제:
  linkedCpNo가 없으면 useCpSync가 "연동할 CP가 없습니다" 경로로 감

해결:
  FMEA 등록 시 CP를 자동 생성하지 않음
  사용자가 "CP 생성" 버튼 클릭 시:
    1. 프로젝트 스키마에 control_plans 레코드 생성
    2. fmea_projects.linkedCpNo 업데이트
    3. FMEA → CP 동기화 실행 (sync-to-cp)
    4. CP 워크시트에 항목 표시

  CP가 이미 있으면:
    1. linkedCpNo로 CP 조회 (프로젝트 스키마)
    2. sync-to-cp로 최신 FMEA 데이터 반영
    3. CP 워크시트 표시
```

---

## 10. 전체 API 흐름

### 10.1 Master 관련

```
GET  /api/fmea/master-base-info    Master 기초정보 조회 (모달용)
GET  /api/fmea/master-processes    Master 공정 목록
POST /api/fmea/master-sync-check   Master 변경분 diff
POST /api/fmea/master-sync-apply   Master 변경분 수락/반영
```

### 10.2 Family/Part 생성

```
POST /api/fmea/create-from-master  Master 기초정보 → Family/Part 생성
POST /api/fmea/create-from-family  Family 기초정보 → Part 생성
```

### 10.3 CP 연동

```
POST /api/fmea/create-cp           CP 신규 생성 (프로젝트 스키마)
POST /api/fmea/sync-to-cp          FMEA → CP 동기화
GET  /api/fmea/cp-items            CP 항목 조회
```

### 10.4 PFD 연동

```
POST /api/fmea/create-pfd          PFD 신규 생성 (프로젝트 스키마)
POST /api/fmea/sync-to-pfd         FMEA → PFD 동기화
GET  /api/fmea/pfd-items           PFD 항목 조회
```

---

## 11. 핵심 정리

```
1. Master FMEA + CP + PFD 행 데이터 → pfmea_m001 (public 아님)
2. Family/Part 동일 패턴 → pfmea_{fmeaId}
3. public → 프로젝트 목록·등록정보·사용자 등 메타 전용
4. 상속 = 복사 (참조 아님). Master basic data는 Family/Part 생성 시 기초정보 원천.
5. CP/PFD는 FMEA와 같은 스키마. sync-cp-pfd / create-cp / 워크시트 단일 패턴.
6. Master 변경 → 하위에 알림 → 사용자가 수동 동기화 (§7, 별도 구현 시)
7. v4 UUID/FK가 CP/PFD FK 참조의 기반 (특히 L3ProcessChar)
```

---

## 12. AIAG-VDA(5ST) + 산업DB(6ST) 발생도·검출도 설계

> **목적**: 리스크분석(5ST)에서는 **AIAG-VDA FMEA Handbook 기준**으로 O/D를 산정하고, 최적화(6ST)에서는 **산업 공통 DB**를 **개선안 추천** 소스로 사용하여 **O·D를 4 이하(낮은 값 = 유리)** 로 끌어내린다.  
> **SSoT**: 5ST의 현재 등급은 `risk_analyses`(프로젝트 스키마). 6ST의 “개선 후” 목표는 `optimizations.newOccurrence` / `newDetection` + 개선 조치 텍스트.

### 12.1 척도 정의 (앱·DB와 동일)

```
발생도 O (1–10): 숫자가 낮을수록 원인 발생 가능성이 낮음(예방이 효과적).
검출도 D (1–10): 숫자가 낮을수록 검출이 잘됨(관리가 효과적).

★ “4 이하로 낮춘다” = 목표 구간 O∈[1,4], D∈[1,4] (개선 후 바람직한 상한)
```

### 12.2 5ST 리스크분석 — AIAG-VDA 우선

| 요소 | 기준 | 코드·데이터 참조 |
|------|------|------------------|
| 현재 O | 예방관리(PC) 텍스트 키워드 + (보조) 산업DB `KrIndustryPrevention.defaultRating` | `pcOccurrenceMap`, `occurrenceRecommendMap`, `applyOccurrenceFromPrevention` |
| 현재 D | 검출관리(DC) 텍스트 키워드 + (보조) 산업DB `KrIndustryDetection.defaultRating` | `detectionRatingMap.recommendDetection`, `useAutoRecommendDC` |

**원칙**

- 5ST에서는 **확정된 PC/DC 문구**를 입력·Import 기준으로 두고, **핸드북 매트릭스**로 O/D를 맞춘다.
- 산업DB `defaultRating`은 **동일 method명 매칭 시** 보조값으로 쓰되, **FK 자동연결에는 사용하지 않음** (Rule 0.9: 추천 전용).

### 12.3 6ST 최적화 — 산업DB 추천으로 O·D를 4 이하 방향으로

**역할 분리**

- **AIAG-VDA**: “현재 관리가 어떤 등급인가” (5ST 해석).
- **산업DB (`kr_industry_prevention` / `kr_industry_detection`)**: “업계에서 쓰는 **더 강한** 예방·검출 **방법(문구)** 과 그에 대한 **기대 O/D** (`defaultRating`)” → **6ST 개선안 후보**.

**추천 파이프라인 (설계)**

```
입력: riskId, 현재 O/D, 현재 PC/DC, FM·FC·공정 컨텍스트
  ↓
① 산업DB에서 PC·DC 후보 랭킹 (유사도·키워드·공정 — 기존 useAutoRecommendPC/DC 패턴 재사용)
  ↓
② 선택 후보의 defaultRating을 「개선 적용 후 기대 O/D」로 해석
  ↓
③ 목표값 산출 (단조 감소 + 상한 4):
     newO = min( currentO, min( candidateO_industry, 4 ) )
     newD = min( currentD, min( candidateD_industry, 4 ) )
   ※ industry 값이 없으면: 추천 PC/DC 문구로 AIAG-VDA만 재평가한 값을 후보로 두고 동일 min 규칙 적용
  ↓
④ Optimization 레코드에 기록:
     newOccurrence, newDetection, recommendedAction(산업 method + 근거),
     prevention/검출 조치 문구(산업DB method) — 필요 시 riskData 최적화 컬럼과 동기화
```

**비즈니스 규칙**

- **개선은 등급을 올리지 않는다**: `newO ≤ currentO`, `newD ≤ currentD` (이미 4 이하면 유지 또는 미세 조정만).
- **목표 상한**: `newO ≤ 4`, `newD ≤ 4` 를 만족하도록 후보를 고른다; 한 번에 못 내려가면 **다단계 개선안**(여러 Optimization 행 또는 일정)으로 쪼갠다.
- **사용자 확정 전까지** SSoT는 5ST `risk_analyses`; 6ST는 **계획값**(`optimizations`).

### 12.4 구현 매핑 (향후 작업 시)

| 구분 | 파일·API (참고) |
|------|------------------|
| 산업DB 조회 | `GET /api/kr-industry?type=all` |
| 5ST O/D | `fillPCDCFromImport`, `useAutoRecommendDC`, `applyOccurrenceFromPrevention` |
| 6ST 저장 | `POST /api/fmea` 내 `optimization` upsert (`newOccurrence`, `newDetection`) |
| 마스터·Living DB | `syncMasterChainsInTx` — 개선 반영 후 체인·`MasterFmeaReference` 갱신 (Rule 18) |

### 12.5 운영 순서 (권장)

```
Import·고장연결 확정
  → PC/DC 매칭 (마스터·체인)
  → O추천·D추천 (AIAG-VDA로 5ST 확정)
  → 6ST: 산업DB 기반 개선안 추천 → newO/newD ≤ 4 방향 검토·승인 → 저장
```

이 순서를 지키면 **5ST는 핸드북 정합**, **6ST는 산업 베스트프랙티스로 추가 절감**이 분리되어 Living DB가 쌓인다.