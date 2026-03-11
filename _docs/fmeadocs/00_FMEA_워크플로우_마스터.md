# FMEA On-Premise 워크플로우 마스터 문서

> **문서 버전**: 1.0.0  
> **최종 수정**: 2026-01-23  
> **목적**: 유지보수 및 QA 검증을 위한 워크플로우 정의

---

## 📊 시스템 개요

### 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    FMEA On-Premise System                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 16 + React 19)                           │
│  ├── /pfmea/* - 공정 FMEA                                   │
│  ├── /dfmea/* - 설계 FMEA                                   │
│  ├── /pfd/*   - 공정흐름도                                  │
│  ├── /cp/*    - 관리계획서                                  │
│  └── /apqp/*  - APQP 관리                                   │
├─────────────────────────────────────────────────────────────┤
│  Backend (Next.js API Routes)                               │
│  ├── /api/fmea/*        - FMEA CRUD                         │
│  ├── /api/pfd/*         - PFD CRUD                          │
│  ├── /api/control-plan/*- CP CRUD                           │
│  ├── /api/sync/*        - 연계 동기화                       │
│  └── /api/admin/*       - 관리자 기능                       │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL + Prisma)                             │
│  ├── FMEAProject        - 프로젝트 정보                     │
│  ├── FMEAWorksheet      - 워크시트 데이터                   │
│  ├── ProcessFlowDiagram - PFD 데이터                        │
│  └── ControlPlan        - CP 데이터                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FMEA 워크플로우 (순서도)

### 전체 흐름

```
[1. 프로젝트 등록] → [2. CFT 구성] → [3. 기초정보] → [4. 구조분석]
        ↓
[5. 기능분석] → [6. 고장분석] → [7. 고장연결] → [8. 리스크분석]
        ↓
[9. 최적화] → [10. 보고서 출력] → [11. 승인/개정]
```

---

## 📋 단계별 상세 워크플로우

### 1️⃣ 프로젝트 등록 (`/pfmea/register`, `/dfmea/register`)

| 항목 | 상세 |
|------|------|
| **화면** | `register/page.tsx` (PFMEA: 1688행, DFMEA: 1735행) |
| **API** | `POST /api/fmea` (프로젝트 생성) |
| **DB** | `FMEAProject` 테이블 INSERT |
| **localStorage** | `pfmea-projects`, `dfmea-projects` |

#### 입력 필드
- 품목명, 모델연도, 고객명, 공급자명
- FMEA 유형 (PFMEA/DFMEA)
- 프로젝트 시작일/종료일

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| CFT 구성 | → | 프로젝트 ID 전달 |
| 마스터 데이터 | ← | 품목/공장 목록 로드 |

---

### 2️⃣ CFT 구성 (`/pfmea/register` 내 CFT 탭)

| 항목 | 상세 |
|------|------|
| **화면** | `register/page.tsx` CFT 섹션 |
| **API** | `PUT /api/fmea/cft` |
| **DB** | `FMEACft` 테이블 |

#### 기능
- CFT 멤버 추가/수정/삭제
- 역할 배정 (팀장, 기술, 품질, 생산 등)
- 승인 권한 설정

---

### 3️⃣ 기초정보 등록 (`/pfmea/worksheet?tab=basic`)

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/basic/*` |
| **API** | `PUT /api/fmea` (업데이트) |
| **DB** | `FMEAWorksheet.fmeaInfo` |

#### 입력 필드
- 공정명, 공정번호
- 마스터 데이터 Import (엑셀)
- 작업요소 정의

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| PFD | ← | 공정 목록 Import |
| 구조분석 | → | L1/L2 구조 초기화 |

---

### 4️⃣ 구조분석 (`/pfmea/worksheet?tab=structure`)

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/structure/*` |
| **API** | `PUT /api/fmea`, `POST /api/sync/structure` |
| **DB** | `FMEAWorksheet.l1Structure`, `l2Structures`, `l3Structures` |
| **Hook** | `useWorksheetState.ts` → `useRowsCalculation.ts` |

#### 계층 구조
```
L1 (상위 수준)     - 제품/시스템
├── L2 (초점 요소) - 공정/서브시스템
│   └── L3 (하위 수준) - 작업요소/부품
```

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| 기능분석 | → | L1/L2/L3 구조 전달 |
| PFD | ↔ | 공정 동기화 |

---

### 5️⃣ 기능분석 (`/pfmea/worksheet?tab=function`)

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/function/*` |
| **API** | `PUT /api/fmea` |
| **DB** | `l1Functions`, `l2Functions`, `l3Functions` |

#### 입력 필드
- L1 기능 (시스템 기능)
- L2 기능 (공정 기능)
- L3 기능 (작업요소 기능/특성)
- 특별특성 (CC/SC)

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| 고장분석 | → | 기능 ID 전달 |
| CP | → | 특별특성 동기화 |

---

### 6️⃣ 고장분석 (`/pfmea/worksheet?tab=failure-l1,l2,l3`)

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/failure/*` |
| **API** | `PUT /api/fmea` |
| **DB** | `failureEffects`, `failureModes`, `failureCauses` |
| **Hook** | `useFailureLinkUtils.ts` (정규화) |

#### 고장 계층
```
FE (고장영향) - L1 수준, 고객/사용자 영향
├── FM (고장모드) - L2 수준, 공정 고장
│   └── FC (고장원인) - L3 수준, 작업요소 고장원인
```

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| 고장연결 | → | FE/FM/FC ID 전달 |
| 리스크분석 | → | 심각도(S) 결정 |

---

### 7️⃣ 고장연결 (`/pfmea/worksheet?tab=failure-link`)

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/failure/FailureLinkTab.tsx` |
| **API** | `PUT /api/fmea` |
| **DB** | `failureLinks` 배열 |
| **Hook** | `useFailureLinkUtils.ts` (정규화) |

#### 기능
- FE ↔ FM ↔ FC 연결 (SVG 다이어그램)
- 연결선 드래그 & 드롭
- 자동 정규화 (ID 복구)

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| 리스크분석 | → | 연결된 조합 전달 |
| 최적화 | → | 동일 조합 유지 |

---

### 8️⃣ 리스크분석 (`/pfmea/worksheet?tab=risk`)

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/risk/RiskTabConfirmable.tsx` |
| **API** | `PUT /api/fmea` |
| **DB** | `riskData` (JSON), `FMEARisk` 테이블 |
| **Hook** | `useWorksheetSave.ts` (riskData 저장) |

#### SOD 평가
- **S (심각도)**: 1-10 (FE 기준)
- **O (발생도)**: 1-10 (FC 기준)
- **D (검출도)**: 1-10 (현 관리방법)

#### AP 계산
```
AP = S × O × D (RPN 방식) 또는 AP 매트릭스 방식
H (High): 즉시 조치 필요
M (Medium): 조치 권장
L (Low): 모니터링
```

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| 최적화 | → | AP=H인 항목 전달 |
| CP | → | S=9,10 항목 특별특성 |

---

### 9️⃣ 최적화 (`/pfmea/worksheet?tab=opt`)

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/opt/OptTabConfirmable.tsx` |
| **API** | `PUT /api/fmea` |
| **DB** | `optimization` 배열 |

#### 입력 필드
- 권장 조치 (예방/검출)
- 담당자, 목표일
- 조치 결과
- 새 SOD 평가 → 새 AP

#### 연계 데이터
| 연계 대상 | 방향 | 설명 |
|----------|------|------|
| CP | → | 관리방법 동기화 |
| 보고서 | → | 조치 이력 출력 |

---

### 🔟 보고서 출력 & 승인

| 항목 | 상세 |
|------|------|
| **화면** | `worksheet/tabs/report/*` |
| **API** | `POST /api/fmea/export`, `POST /api/fmea/approval` |

#### 출력 형식
- Excel (AIAG VDA 7-Step 양식)
- PDF (요약 보고서)

---

## 🔗 시스템 연계 매트릭스

| From \ To | PFMEA | DFMEA | PFD | CP | APQP |
|-----------|-------|-------|-----|-----|------|
| **PFMEA** | - | 참조 | ↔ 동기화 | → 특성 | → 일정 |
| **DFMEA** | 참조 | - | - | → 특성 | → 일정 |
| **PFD** | ↔ 동기화 | - | - | → 공정 | - |
| **CP** | ← 특성 | ← 특성 | ← 공정 | - | → 일정 |
| **APQP** | ← 일정 | ← 일정 | - | ← 일정 | - |

---

## 📂 관련 문서

- `01_PFMEA_PRD_테스트체크리스트.md` - PFMEA 상세 테스트
- `02_DFMEA_PRD_테스트체크리스트.md` - DFMEA 상세 테스트
- `03_연계성_테스트체크리스트.md` - 시스템 간 연계 테스트
- `04_API_명세서.md` - API 상세 명세
- `05_DB_스키마.md` - 데이터베이스 스키마

---

## 📝 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | 2026-01-23 | AI | 초기 작성 |
