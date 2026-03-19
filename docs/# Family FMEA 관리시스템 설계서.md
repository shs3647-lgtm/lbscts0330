# Family FMEA 관리시스템 설계서

> **문서 버전**: v1.2 — 2026-03-19  
> **대상 제품**: 12inch AU BUMP  
> **기술 스택**: Smart FMEA (Next.js 14 + PostgreSQL + Prisma + TypeScript)  
> **핵심 개념**: Master FMEA(기초정보) → Family FMEA(공정별, 복수 CP/PFD) / Part FMEA(별도 계층, 1 CP + 1 PFD)

---

## 1. 시스템 개요

### 1.1 FMEA 계층 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Master FMEA                                  │
│                  12inch AU BUMP 전 공정                              │
│              (모든 FMEA의 기초정보 원천)                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Family FMEA                                                   │  │
│  │                                                               │  │
│  │  Family FMEA Master-00 (전체 공정 통합본)                       │  │
│  │  001번 ~ 200번 공정 전체를 포함하는 완전한 FMEA                 │  │
│  │                                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     ┌──────────┐     │  │
│  │  │ F/F-010  │ │ F/F-020  │ │ F/F-030  │ ... │ F/F-200  │     │  │
│  │  │ Wafer    │ │ UBM      │ │ Photo    │     │ Final    │     │  │
│  │  │ Cleaning │ │ Sputter  │ │ Litho    │     │ Test     │     │  │
│  │  │          │ │          │ │          │     │          │     │  │
│  │  │ CP 복수  │ │ CP 복수  │ │ CP 복수  │     │ CP 복수  │     │  │
│  │  │ PFD 복수 │ │ PFD 복수 │ │ PFD 복수 │     │ PFD 복수 │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘     └──────────┘     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Part FMEA (별도 계층)                                         │  │
│  │                                                               │  │
│  │  데이터 소스: Master F/F에서 가져오기 또는 독립 작성              │  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │  │
│  │  │ P/F-A사-001   │  │ P/F-B사-001   │  │ P/F-독립-001  │        │  │
│  │  │ Master F/F    │  │ Master F/F    │  │ 독립 데이터    │        │  │
│  │  │ 데이터 참조   │  │ 데이터 참조   │  │ 자체 작성     │        │  │
│  │  │ 1 CP + 1 PFD │  │ 1 CP + 1 PFD │  │ 1 CP + 1 PFD │        │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 계층별 역할 정의

| 계층 | 역할 | 범위 | CP/PFD | 데이터 소스 |
|------|------|------|--------|-----------|
| **Master FMEA** | 모든 FMEA의 기초정보 원천 | 전 공정 (001~200) | 없음 | 원천 데이터 |
| **Family FMEA Master-00** | 전체 공정 통합 FMEA | 001~200번 전체 | 없음 (하위 F/F가 보유) | 하위 F/F 최신 승인 데이터 통합 |
| **공정별 Family FMEA** | 공정번호별 개별 FMEA | 단일 공정 | **복수** CP/PFD | Master FMEA 기초정보에서 추출 |
| **Part FMEA** | 고객/제품별 실운영 FMEA | 고객사별 제품별 | **1 CP + 1 PFD** | Master F/F 참조 **또는** 독립 작성 |

### 1.3 Family FMEA vs Part FMEA — 핵심 차이점

| 구분 | Family FMEA (F/F) | Part FMEA (P/F) |
|------|-------------------|-----------------|
| **계층** | Family FMEA 계층 내 | **별도 계층/테이블** |
| **범위** | 단일 공정 (010, 020 등) | 고객사 × 제품 단위 (전 공정 또는 일부) |
| **CP 수량** | **복수** (고객별/라인별/조건별) | **1개** 고정 |
| **PFD 수량** | **복수** (변형 공정흐름) | **1개** 고정 |
| **데이터 소스** | Master FMEA 기초정보에서 추출 | Master F/F에서 가져오기 **또는** 독립 작성 |
| **개정 시 상위 전파** | ✅ 승인 시 Master-00 자동 업데이트 | ❌ 상위 전파 없음 (독립 운영) |
| **담당자** | 공정별 담당자 (작성/검토/승인) | 제품/고객별 담당자 |
| **용도** | 공정 전문성 기반 FMEA 운영 | 고객 납품, PPAP, 심사 대응 |
| **하위→상위** | F/F 승인 → Master-00 자동 반영 | 없음 (독립) |
| **상위→하위** | Master FMEA 기초정보 제공 | Master F/F 데이터 선택적 참조 |

### 1.4 Part FMEA 데이터 소스 — 두 가지 모드

```
┌─────────────────────────────────────────────────────────────────┐
│              Part FMEA 데이터 소스 모드                           │
│                                                                 │
│  모드 A: Master F/F 참조                                        │
│  ├── Master F/F(Master-00)에서 필요 공정 데이터를 가져옴          │
│  ├── 가져온 데이터 기반으로 고객 요구사항 반영 (SOD 조정 등)       │
│  ├── Master F/F 개정 시 알림 → 수동 갱신 판단                    │
│  └── 용도: 기존 Family 체계가 있는 제품의 고객 납품용             │
│                                                                 │
│  모드 B: 독립 작성                                               │
│  ├── Master F/F와 무관하게 자체 FMEA 데이터 작성                  │
│  ├── 별도 고장사슬, 별도 SOD, 별도 DC/PC                         │
│  ├── Master F/F와 연동 없음                                      │
│  └── 용도: Family 체계 밖 특수 제품, 신규 고객, 시작품 등          │
│                                                                 │
│  공통: 두 모드 모두 1 CP + 1 PFD만 보유                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 핵심 운영 원칙

1. **Master FMEA = SSoT**: 모든 기초정보의 유일한 원천
2. **공정별 F/F = 실질적 FMEA 운영 단위**: 공정 전문가가 작성/검토/승인, 복수 CP/PFD
3. **하위→상위 자동 개정**: 하위 F/F 승인 시 Master-00 자동 업데이트
4. **Part FMEA = 별도 계층**: Master F/F 참조 또는 독립 작성, 1 CP + 1 PFD 고정
5. **Part FMEA는 독립 운영**: 상위 전파 없음, 자체 개정/승인 체계

---

## 2. 데이터 모델

### 2.1 Master FMEA 스키마

```
MasterFmea (기초정보 원천)
├── id: UUID (PK)
├── name: "12inch AU BUMP Master FMEA"
├── version: string
├── status: ACTIVE | ARCHIVED
├── createdAt / updatedAt
│
├── MasterProcess[] (전체 공정 목록)
│   ├── id: UUID (PK)
│   ├── masterFmeaId: FK → MasterFmea
│   ├── processNo: string ("010", "020", ... "200")
│   ├── processName: string
│   ├── category: string ("전처리", "증착", "식각", "검사")
│   ├── order: number
│   ├── isActive: boolean
│   │
│   ├── MasterStructure[] (1L/2L/3L 기초 구조)
│   ├── MasterFailureMode[] (기초 고장모드)
│   └── MasterControl[] (기초 관리방법)
│
└── RevisionHistory[]
```

### 2.2 Family FMEA Master-00 스키마

```
FamilyMaster (Master-00: 전체 공정 통합본)
├── id: UUID (PK)
├── masterFmeaId: FK → MasterFmea
├── name: "12inch AU BUMP Family FMEA Master-00"
├── version: string (하위 개정 반영 시 자동 증가)
├── status: ACTIVE
│
├── FamilyFmea[] (하위 공정별 F/F 참조)
│
└── MasterRevisionLog[] (하위 F/F 개정 반영 이력)
    ├── familyFmeaId: FK → FamilyFmea
    ├── familyCode: string
    ├── fromVersion / toVersion: string
    ├── changeDescription: string
    ├── approvedAt / propagatedAt: DateTime
```

### 2.3 공정별 Family FMEA 스키마

```
FamilyFmea (공정별 F/F)
├── id: UUID (PK)
├── familyMasterId: FK → FamilyMaster
├── masterProcessId: FK → MasterProcess
├── familyCode: string ("FF-010", "FF-020")
├── processNo: string
├── processName: string
├── version: string
├── status: DRAFT | REVIEW | APPROVED | SUPERSEDED
│
├── 담당자
│   ├── authorId / reviewerId / approverId: FK → User
│   └── authorDate / reviewDate / approvalDate: DateTime
│
├── FMEA 데이터 (Atomic DB)
│   ├── L1~L3 Structure / Function
│   ├── FailureEffect / FailureMode / FailureCause
│   ├── FailureLink[] (고장사슬)
│   ├── RiskAnalysis[] (SOD + DC/PC)
│   └── Optimization[]
│
├── ControlPlan[] (★ 복수 가능)
│   ├── id: UUID
│   ├── familyFmeaId: FK → FamilyFmea
│   ├── cpCode: string ("CP-010-A", "CP-010-B")
│   ├── cpName: string
│   ├── isPrimary: boolean (대표 CP)
│   ├── version / status
│   └── ControlPlanItem[]
│
├── ProcessFlowDiagram[] (★ 복수 가능)
│   ├── id: UUID
│   ├── familyFmeaId: FK → FamilyFmea
│   ├── pfdCode: string ("PFD-010-A")
│   ├── isPrimary: boolean (대표 PFD)
│   ├── version
│   └── PfdItem[]
│
└── RevisionHistory[]
```

### 2.4 Part FMEA 스키마 (별도 테이블)

```
PartFmea (별도 계층 — 고객/제품별)
├── id: UUID (PK)
├── partCode: string ("PF-SEC-HBM3E-001")
├── customerName: string ("삼성전자")
├── productName: string ("HBM3E-24H")
├── version: string
├── status: DRAFT | REVIEW | APPROVED | SUPERSEDED
│
├── 데이터 소스 모드
│   ├── sourceType: FAMILY_REF | INDEPENDENT
│   ├── sourceFamilyMasterId: FK → FamilyMaster (nullable)
│   │   └── sourceType=FAMILY_REF일 때만 사용
│   └── sourceProcessNos: string[] (참조할 공정번호 목록, nullable)
│       └── 예: ["010","020","030"] (전체 또는 일부)
│
├── 담당자
│   ├── authorId / reviewerId / approverId: FK → User
│   └── authorDate / reviewDate / approvalDate: DateTime
│
├── FMEA 데이터 (Atomic DB — 자체 보유)
│   ├── L1~L3 Structure / Function
│   ├── FailureEffect / FailureMode / FailureCause
│   ├── FailureLink[]
│   ├── RiskAnalysis[]
│   └── Optimization[]
│   │
│   └── sourceType에 따라:
│       FAMILY_REF: Master F/F에서 복사 + 고객 커스텀
│       INDEPENDENT: 전부 자체 작성
│
├── ControlPlan (★ 1개 고정)
│   ├── id: UUID
│   ├── partFmeaId: FK → PartFmea
│   ├── cpCode: string
│   ├── version / status
│   └── ControlPlanItem[]
│
├── ProcessFlowDiagram (★ 1개 고정)
│   ├── id: UUID
│   ├── partFmeaId: FK → PartFmea
│   ├── pfdCode: string
│   ├── version
│   └── PfdItem[]
│
└── RevisionHistory[]
    ├── revNo / revDate
    ├── changeDescription
    └── changedBy: FK → User
```

### 2.5 전체 ER 관계도

```
MasterFmea (1)
  │
  ├──→ MasterProcess (N)
  │       ├──→ MasterStructure (N)
  │       ├──→ MasterFailureMode (N)
  │       └──→ MasterControl (N)
  │
  ├──→ FamilyMaster (1) ── Master-00
  │       │
  │       ├──→ FamilyFmea (N) ── 공정별 F/F
  │       │       ├──→ Atomic DB
  │       │       ├──→ ControlPlan (N) ── ★ 복수 CP
  │       │       ├──→ ProcessFlowDiagram (N) ── ★ 복수 PFD
  │       │       └──→ RevisionHistory (N)
  │       │
  │       └──→ MasterRevisionLog (N)
  │
  └──→ RevisionHistory (N)

PartFmea (N) ── ★ 별도 계층/테이블
  │
  ├── sourceType: FAMILY_REF → FamilyMaster 참조 (선택적)
  │                INDEPENDENT → 연결 없음
  │
  ├──→ Atomic DB (자체 보유)
  ├──→ ControlPlan (1) ── ★ 1개 고정
  ├──→ ProcessFlowDiagram (1) ── ★ 1개 고정
  └──→ RevisionHistory (N)

관계 요약:
  MasterFmea ──1:1──→ FamilyMaster
  FamilyMaster ──1:N──→ FamilyFmea
  FamilyFmea ──1:N──→ ControlPlan (복수)
  FamilyFmea ──1:N──→ ProcessFlowDiagram (복수)
  PartFmea ──1:1──→ ControlPlan (1개)
  PartFmea ──1:1──→ ProcessFlowDiagram (1개)
  PartFmea ──N:1──→ FamilyMaster (선택적 참조, nullable)
```

---

## 3. F/F vs P/F 상세 비교

### 3.1 데이터 구조 비교

| 항목 | Family FMEA (F/F) | Part FMEA (P/F) |
|------|-------------------|-----------------|
| **테이블** | `FamilyFmea` | `PartFmea` (별도) |
| **상위 연결** | `familyMasterId` → FamilyMaster (필수) | `sourceFamilyMasterId` → FamilyMaster (선택) |
| **데이터 소스** | Master FMEA에서 추출 (항상) | Master F/F 참조 **또는** 독립 작성 |
| **FMEA 데이터** | Atomic DB (자체 보유) | Atomic DB (자체 보유) |
| **CP** | `ControlPlan[]` (복수, 1:N) | `ControlPlan` (1개, 1:1) |
| **PFD** | `ProcessFlowDiagram[]` (복수, 1:N) | `ProcessFlowDiagram` (1개, 1:1) |
| **isPrimary** | ✅ CP/PFD에 대표 지정 | 해당 없음 (1개뿐) |

### 3.2 운영 비교

| 항목 | Family FMEA (F/F) | Part FMEA (P/F) |
|------|-------------------|-----------------|
| **생성 방법** | Master FMEA 공정 선택 → 추출 | 모드A: Master F/F 참조 / 모드B: 독립 작성 |
| **범위** | 단일 공정 (010, 020 등) | 고객×제품 (전체 또는 일부 공정) |
| **승인 시 상위 전파** | ✅ Master-00 자동 업데이트 | ❌ 없음 (독립 운영) |
| **승인 워크플로우** | 작성→검토→승인 (공정별 담당자) | 작성→검토→승인 (제품별 담당자) |
| **개정이력 전파** | Master-00 + Master FMEA에 기록 | 자체 RevisionHistory만 |
| **Master F/F 개정 시** | 해당 없음 (자신이 구성요소) | 알림 수신 → 수동 갱신 판단 (FAMILY_REF 모드) |
| **용도** | 공정 전문성 기반 상세 FMEA | 고객 납품, PPAP, 심사, 특수 제품 |

### 3.3 CP/PFD 비교

| 항목 | F/F의 CP/PFD | P/F의 CP/PFD |
|------|-------------|-------------|
| **수량** | CP 복수, PFD 복수 | CP 1개, PFD 1개 |
| **대표 지정** | isPrimary 플래그 | 해당 없음 |
| **용도** | 라인별/고객별/조건별 다양한 관리계획 | 특정 고객·제품의 단일 관리계획 |
| **상위 반영** | 대표 CP/PFD → Master-00 통합 가능 | 상위 반영 없음 |
| **FK 연결** | familyFmeaId → FamilyFmea | partFmeaId → PartFmea |

---

## 4. Part FMEA 생성 프로세스

### 4.1 모드 A: Master F/F 참조

```
┌──────────────────────────────────────────────────────────────────┐
│          Part FMEA 생성 — 모드 A (Master F/F 참조)                │
│                                                                  │
│  1. 담당자가 "새 Part FMEA 생성" 요청                             │
│     ├── 고객사 / 제품명 입력                                      │
│     ├── 데이터 소스: "Master F/F 참조" 선택                       │
│     └── 참조할 공정 범위 선택 (전체 또는 일부)                     │
│                                                                  │
│  2. Master F/F (Master-00)에서 데이터 복사                        │
│     ├── 선택된 공정의 FMEA 데이터 (Atomic DB) 복사                │
│     ├── 역설계 경로 A: reverseExtract() + remapFmeaId()           │
│     └── 새 Part FMEA 테이블에 저장                                │
│                                                                  │
│  3. 고객 요구사항 반영 (복사된 데이터 위에 편집)                   │
│     ├── 고객별 SOD 기준 조정                                     │
│     ├── 추가 고장모드 / 고장원인 입력                              │
│     ├── CC/SC 지정                                               │
│     ├── CP 작성 (1개)                                            │
│     └── PFD 작성 (1개)                                           │
│                                                                  │
│  4. 검토 → 승인 (상위 전파 없음)                                  │
│                                                                  │
│  5. Master F/F 개정 시:                                           │
│     ├── 알림 수신 ("참조 원본이 개정되었습니다")                    │
│     └── 담당자가 수동으로 갱신 여부 판단                           │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 모드 B: 독립 작성

```
┌──────────────────────────────────────────────────────────────────┐
│          Part FMEA 생성 — 모드 B (독립 작성)                      │
│                                                                  │
│  1. 담당자가 "새 Part FMEA 생성" 요청                             │
│     ├── 고객사 / 제품명 입력                                      │
│     └── 데이터 소스: "독립 작성" 선택                              │
│                                                                  │
│  2. 빈 FMEA 템플릿 생성                                          │
│     ├── 빈 Atomic DB 구조 생성                                   │
│     ├── Master FMEA/F/F와 연결 없음                               │
│     └── 또는 Import 파이프라인(경로 B)으로 외부 데이터 투입         │
│                                                                  │
│  3. 담당자가 전체 FMEA 자체 작성                                  │
│     ├── 구조분석 (1L/2L/3L)                                      │
│     ├── 기능분석 / 고장분석 / 리스크분석                           │
│     ├── CP 작성 (1개)                                            │
│     └── PFD 작성 (1개)                                           │
│                                                                  │
│  4. 검토 → 승인 (상위 전파 없음, 완전 독립)                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Family FMEA 개정 전파 메커니즘

### 5.1 개정 흐름 (F/F만 — P/F는 전파 없음)

```
┌──────────────────────────────────────────────────────────────────┐
│                    개정 전파 프로세스                               │
│                                                                  │
│  1. 공정 담당자가 F/F-010 개정                                    │
│     │  작성 (DRAFT) → 검토 (REVIEW) → 승인 (APPROVED)            │
│     │                                                            │
│  2. 승인 시점에 자동 트리거                                       │
│     │                                                            │
│     ├──→ ① Master-00 FMEA 데이터 업데이트                        │
│     │    ├── 010번 공정 데이터를 최신 F/F-010으로 교체             │
│     │    └── Master-00 version 자동 증가                          │
│     │                                                            │
│     ├──→ ② 개정이력 기록                                         │
│     │    ├── MasterRevisionLog에 기록                             │
│     │    └── Master FMEA RevisionHistory에 기록                   │
│     │                                                            │
│     └──→ ③ Part FMEA 알림 (FAMILY_REF 모드인 P/F에만)            │
│          ├── F/F-010을 참조하는 Part FMEA 목록 조회               │
│          └── 각 P/F 담당자에게 "원본 개정" 알림 발송               │
│              (갱신은 수동 — P/F 담당자 판단)                       │
│                                                                  │
│  ※ Part FMEA 개정은 상위 전파하지 않음                            │
│  ※ Part FMEA(INDEPENDENT 모드)는 알림도 받지 않음                 │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 상태 관리 (F/F, P/F 공통)

```
  DRAFT ──작성완료──→ REVIEW ──검토승인──→ APPROVED
    ↑                   │                    │
    └───반려(사유기재)───┘                    │
    └───반려(사유기재)────────────────────────┘
                                             │
                                     ┌───────┘
                                     ▼
                              SUPERSEDED (이전 버전)

차이점:
  F/F 승인 → 상위 전파 트리거 발동
  P/F 승인 → 상위 전파 없음 (자체 이력만 기록)
```

---

## 6. CP/PFD 관리 구조

### 6.1 데이터 모델

```
ControlPlan
├── id: UUID (PK)
├── familyFmeaId: FK → FamilyFmea (nullable — F/F용)
├── partFmeaId: FK → PartFmea (nullable — P/F용)
├── cpCode: string
├── cpName: string
├── isPrimary: boolean (F/F에서만 의미, P/F는 항상 null)
├── version / status
│
└── ControlPlanItem[]
    ├── processNo / processName
    ├── productCharId: FK → ProcessProductChar
    ├── processCharId: FK → L3Function
    ├── ccSc: CC | SC | null
    ├── controlMethod / sampleSize / sampleFreq
    └── reactionPlan

ProcessFlowDiagram
├── id: UUID (PK)
├── familyFmeaId: FK → FamilyFmea (nullable — F/F용)
├── partFmeaId: FK → PartFmea (nullable — P/F용)
├── pfdCode: string
├── isPrimary: boolean (F/F에서만 의미)
├── version
│
└── PfdItem[]
    ├── stepNo / processNo / processName
    ├── symbolType: OPERATION | TRANSPORT | INSPECT | STORE | DELAY
    ├── productCharId: FK → ProcessProductChar
    └── description
```

### 6.2 CP/PFD 제약 조건

```
-- F/F: 복수 CP/PFD 허용
familyFmeaId IS NOT NULL → CP/PFD 개수 제한 없음

-- P/F: 1 CP + 1 PFD 강제
partFmeaId IS NOT NULL →
  CHECK: COUNT(ControlPlan WHERE partFmeaId = ?) <= 1
  CHECK: COUNT(ProcessFlowDiagram WHERE partFmeaId = ?) <= 1

-- 동시에 양쪽 FK를 가질 수 없음
CHECK: NOT (familyFmeaId IS NOT NULL AND partFmeaId IS NOT NULL)
```

---

## 7. 고유번호 체계

| 유형 | 패턴 | 예시 | 설명 |
|------|------|------|------|
| Master FMEA | `MF-{제품코드}` | MF-12AU | 기초정보 원천 |
| Family Master-00 | `FM-{제품코드}-00` | FM-12AU-00 | 전체 공정 통합본 |
| 공정별 F/F | `FF-{공정번호}-{seq}` | FF-010-001 | 공정별 Family FMEA |
| Part FMEA | `PF-{고객코드}-{제품}-{seq}` | PF-SEC-HBM3E-001 | 고객/제품별 Part FMEA |
| F/F CP | `CP-{공정번호}-{suffix}` | CP-010-A | 공정별 CP (복수) |
| F/F PFD | `PFD-{공정번호}-{suffix}` | PFD-010-A | 공정별 PFD (복수) |
| P/F CP | `CP-PF-{partCode}` | CP-PF-SEC-HBM3E-001 | Part FMEA CP (1개) |
| P/F PFD | `PFD-PF-{partCode}` | PFD-PF-SEC-HBM3E-001 | Part FMEA PFD (1개) |

---

## 8. 담당자 및 권한 관리

| 역할 | 권한 | 범위 |
|------|------|------|
| **시스템 관리자** | 전체 관리, Master FMEA, 담당자 지정 | 전체 |
| **F/F 작성자** | F/F 작성, DRAFT 편집 | 지정된 공정 |
| **F/F 검토자** | F/F 검토, 승인/반려 | 지정된 공정 |
| **F/F 승인자** | F/F 최종 승인 → 상위 전파 | 지정된 공정 |
| **P/F 담당자** | P/F 작성/검토/승인 (독립 운영) | 지정된 고객/제품 |
| **조회자** | 읽기 전용 | 권한 부여 범위 |

---

## 9. API 설계

### 9.1 공정별 Family FMEA API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/family-fmea/create` | Master에서 추출하여 새 F/F 생성 |
| GET | `/api/family-fmea/[id]` | F/F 상세 조회 |
| PUT | `/api/family-fmea/[id]` | F/F 수정 (DRAFT만) |
| POST | `/api/family-fmea/[id]/submit-review` | 검토 요청 |
| POST | `/api/family-fmea/[id]/approve` | 승인 → Master-00 자동 반영 |
| POST | `/api/family-fmea/[id]/reject` | 반려 |
| POST | `/api/family-fmea/[id]/new-version` | 새 버전 생성 |
| GET | `/api/family-fmea/[id]/cp` | CP 목록 (복수) |
| POST | `/api/family-fmea/[id]/cp` | 새 CP 추가 |
| PUT | `/api/family-fmea/[id]/cp/[cpId]/set-primary` | 대표 CP 지정 |
| GET | `/api/family-fmea/[id]/pfd` | PFD 목록 (복수) |
| POST | `/api/family-fmea/[id]/pfd` | 새 PFD 추가 |
| PUT | `/api/family-fmea/[id]/pfd/[pfdId]/set-primary` | 대표 PFD 지정 |

### 9.2 Part FMEA API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/part-fmea/create` | 새 P/F 생성 (모드 A 또는 B) |
| GET | `/api/part-fmea/[id]` | P/F 상세 조회 |
| PUT | `/api/part-fmea/[id]` | P/F 수정 (DRAFT만) |
| POST | `/api/part-fmea/[id]/submit-review` | 검토 요청 |
| POST | `/api/part-fmea/[id]/approve` | 승인 (상위 전파 없음) |
| POST | `/api/part-fmea/[id]/reject` | 반려 |
| POST | `/api/part-fmea/[id]/sync-from-master` | Master F/F 최신 데이터로 갱신 (FAMILY_REF만) |
| GET | `/api/part-fmea/[id]/cp` | CP 조회 (1개) |
| PUT | `/api/part-fmea/[id]/cp` | CP 수정 |
| GET | `/api/part-fmea/[id]/pfd` | PFD 조회 (1개) |
| PUT | `/api/part-fmea/[id]/pfd` | PFD 수정 |
| GET | `/api/part-fmea/by-customer/[code]` | 고객별 P/F 목록 |

### 9.3 P/F 생성 API 상세

```typescript
POST /api/part-fmea/create

Body: {
  customerName: string,
  productName: string,
  sourceType: "FAMILY_REF" | "INDEPENDENT",

  // FAMILY_REF 모드 전용
  sourceFamilyMasterId?: string,   // Master-00 ID
  sourceProcessNos?: string[],      // 참조할 공정번호 (null=전체)

  // 공통
  authorId: string,
  reviewerId: string,
  approverId: string,
}

처리:
  FAMILY_REF → Master F/F에서 해당 공정 데이터 복사 (경로 A)
  INDEPENDENT → 빈 Atomic DB 생성
  두 모드 모두 → 빈 CP 1개 + 빈 PFD 1개 자동 생성
```

---

## 10. UI 구조

```
Smart FMEA
├── Dashboard
│   ├── Master FMEA 현황
│   ├── F/F 공정별 상태 (승인/검토중/작성중)
│   └── P/F 고객별 현황
│
├── Master FMEA
│   ├── 기초정보 관리
│   └── 개정이력
│
├── Family FMEA
│   ├── Master-00 (전체 공정 통합 WS)
│   │   ├── 통합 워크시트
│   │   ├── 공정별 현황 (버전/상태/담당자)
│   │   └── 개정이력 (하위 F/F 반영 로그)
│   │
│   ├── 공정별 F/F 목록
│   │   ├── FF-010 Wafer Cleaning
│   │   │   ├── FMEA 워크시트
│   │   │   ├── CP 목록 (복수, ★대표 표시)
│   │   │   ├── PFD 목록 (복수, ★대표 표시)
│   │   │   ├── 개정이력
│   │   │   └── 담당자
│   │   └── ...
│   │
│   └── 새 F/F 생성
│
├── Part FMEA                          ← ★ 별도 메뉴
│   ├── P/F 목록 (고객별/제품별)
│   │   ├── PF-SEC-HBM3E-001
│   │   │   ├── FMEA 워크시트
│   │   │   ├── CP (1개)
│   │   │   ├── PFD (1개)
│   │   │   ├── 개정이력
│   │   │   ├── 데이터 소스 표시 (참조/독립)
│   │   │   └── [Master F/F 최신 반영] 버튼 (참조 모드만)
│   │   └── ...
│   │
│   └── 새 P/F 생성
│       ├── 모드 선택: Master F/F 참조 / 독립 작성
│       └── 고객사 / 제품명 / 담당자 입력
│
├── CP 관리
│   ├── F/F CP 목록 (공정별 복수)
│   └── P/F CP 목록 (고객별 1개씩)
│
├── PFD 관리
│   ├── F/F PFD 목록 (공정별 복수)
│   └── P/F PFD 목록 (고객별 1개씩)
│
└── 관리
    ├── 사용자/권한
    ├── 담당자 지정
    └── 알림 설정
```

---

## 11. 역설계 시스템과의 연계

| 용도 | 원본 | 대상 | 방법 |
|------|------|------|------|
| F/F 생성 | Master FMEA 해당 공정 | 새 FamilyFmea | 경로 A: `reverseExtract()` |
| F/F 승인 → Master-00 | FamilyFmea (APPROVED) | FamilyMaster 해당 공정 | `replaceMasterProcessData()` |
| P/F 생성 (FAMILY_REF) | Master F/F (Master-00) | 새 PartFmea | 경로 A: `reverseExtract()` + 공정 필터 |
| P/F 생성 (INDEPENDENT) | 없음 | 새 PartFmea | 빈 템플릿 또는 경로 B Import |
| P/F 수동 갱신 | Master F/F 최신 | 기존 PartFmea | `sync-from-master` API |
| 구버전 이관 | 구버전 엑셀 | F/F 또는 P/F | 경로 B: Claude 변환 → Import |

---

## 12. 구현 로드맵

| Phase | 기간 | 내용 | 선행 조건 |
|-------|------|------|----------|
| **Phase 1** | 2주 | Prisma 스키마 (FamilyMaster, FamilyFmea, PartFmea, CP/PFD 제약조건) | 역설계 v2.0 완료 |
| **Phase 2** | 2주 | F/F CRUD + 승인 워크플로우 + 개정 전파 | Phase 1 |
| **Phase 3** | 1주 | P/F CRUD + 두 가지 소스 모드 + 1CP/1PFD 제약 | Phase 1 |
| **Phase 4** | 1주 | F/F CP/PFD 복수 관리 + 대표 지정 | Phase 2 |
| **Phase 5** | 2주 | UI (F/F 목록, P/F 목록, Master-00 통합뷰, 승인 워크플로우) | Phase 2~4 |
| **Phase 6** | 1주 | 알림 + 담당자 관리 + 권한 제어 | Phase 5 |
| **Phase 7** | 1주 | 안정화 + E2E 테스트 | Phase 6 |

---

## 부록 A: 용어 정의

| 용어 | 정의 |
|------|------|
| **Master FMEA** | 전 공정의 기초정보(구조, 고장모드, 관리방법)를 보유한 원천 데이터 |
| **Family FMEA Master-00** | 001~200번 전체 공정을 통합한 완전한 FMEA. 하위 F/F 승인 시 자동 업데이트 |
| **Family FMEA (F/F)** | 공정번호별 실질적 FMEA. 복수 CP/PFD. 승인 시 상위 전파 |
| **Part FMEA (P/F)** | 별도 계층/테이블. 고객/제품별 FMEA. 1 CP + 1 PFD. Master F/F 참조 또는 독립 작성 |
| **sourceType** | P/F의 데이터 소스 모드. `FAMILY_REF`(Master F/F 참조) 또는 `INDEPENDENT`(독립) |
| **isPrimary** | F/F의 복수 CP/PFD 중 대표 지정 플래그 |
| **개정 전파** | F/F 승인 시 Master-00에 자동 반영. P/F는 전파 없음 (독립 운영) |
| **CP** | 관리계획서. F/F=복수, P/F=1개 |
| **PFD** | 공정흐름도. F/F=복수, P/F=1개 |
| **CC/SC** | CC: 핵심특성(안전/법규), SC: 중요특성(기능/성능) |

## 부록 B: 관련 문서

| 문서 | 경로 |
|------|------|
| 역설계 시스템 설계서 v2.0 | `docs/역설계_FMEA_Import_시스템_설계서_v2.0.md` |
| DB 중앙 아키텍처 | `docs/CENTRAL_DB_ARCHITECTURE.md` |
| AIAG-VDA FMEA 1판 | 외부 참조 |
| IATF 16949 | 외부 참조 |