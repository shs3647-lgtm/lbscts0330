# PFMEA 리스트 PRD

> **버전**: v1.0.0  
> **최종 업데이트**: 2026-01-24  
> **코드 프리즈**: `9f76d91`

---

## 1. 개요

### 1.1 목적
등록된 PFMEA 프로젝트 목록을 조회하고 관리하는 화면입니다.

### 1.2 경로
- **URL**: `/pfmea/list`
- **파일**: `src/app/pfmea/list/page.tsx`

---

## 2. 화면 구성

### 2.1 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ TopNav: PFMEA 리스트                                     │
├─────────────────────────────────────────────────────────┤
│ Sidebar │ 메인 컨텐츠                                    │
│         │ ┌───────────────────────────────────────────┐ │
│         │ │ 헤더: 📋 PFMEA 리스트 (총 N건)             │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 검색바 | 액션버튼 (새로고침,저장,수정,삭제,등록) │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 테이블 (15개 컬럼)                         │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 하단 상태바                                │ │
│         │ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 컬럼 정의

| No | 컬럼명 | 필드 | 너비 | 설명 |
|----|--------|------|------|------|
| 1 | No | - | 35px | 순번 |
| 2 | FMEA ID | id | 85px | pfm{YY}-{T}{NNN} 형식 |
| 3 | TYPE | - | 40px | M(Master)/F(Family)/P(Part) |
| 4 | 상위 FMEA | parentFmeaId | 70px | 상속받은 상위 FMEA |
| 5 | 프로젝트명 | project.projectName | 140px | APQP 연계 프로젝트 |
| 6 | FMEA명 | fmeaInfo.subject | 140px | FMEA 제목 |
| 7 | 고객사 | project.customer | 65px | 고객사명 |
| 8 | 모델명 | fmeaInfo.modelYear | 60px | 모델/연식 |
| 9 | 공정책임 | fmeaInfo.designResponsibility | 65px | 설계/공정 책임 부서 |
| 10 | 담당자 | fmeaInfo.fmeaResponsibleName | 55px | FMEA 담당자 |
| 11 | CFT | cftMembers.length | 35px | CFT 인원수 (숫자만) |
| 12 | 시작일자 | fmeaInfo.fmeaStartDate | 75px | FMEA 시작일 |
| 13 | 개정일자 | fmeaInfo.fmeaRevisionDate | 75px | 최근 개정일 |
| 14 | Rev | revisionNo | 40px | 개정번호 |
| 15 | 단계 | step | 50px | 1~7단계 (배지) |

---

## 4. TYPE 코드

| 코드 | 명칭 | 색상 | 설명 |
|------|------|------|------|
| `M` | Master | 보라색 | 기준 FMEA |
| `F` | Family | 파란색 | 패밀리 FMEA |
| `P` | Part | 녹색 | 부품 FMEA |

---

## 5. 단계 정의

| 단계 | 색상 | 설명 |
|------|------|------|
| 1단계 | 회색 | 프로젝트 준비 |
| 2단계 | 파란색 | 구조분석 확정 |
| 3단계 | 청록색 | 기능분석 확정 |
| 4단계 | 황색 | 고장분석 확정 |
| 5단계 | 주황색 | 리스크분석 승인 |
| 6단계 | 녹색 | 최적화 승인 |
| 7단계 | 보라색 | 개정관리 승인 |

---

## 6. 기능 정의

### 6.1 검색
- 프로젝트명, FMEA명, 고객사로 실시간 필터링

### 6.2 새로고침
- DB에서 최신 데이터 다시 로드

### 6.3 저장
- localStorage에 현재 상태 저장 (캐시)

### 6.4 수정
- 선택한 1개 항목 등록화면으로 이동

### 6.5 선택 삭제
- 체크된 항목 일괄 삭제

### 6.6 신규 등록
- `/pfmea/register` 페이지로 이동

### 6.7 미입력 클릭
- 미입력 셀 클릭 시 해당 등록화면으로 이동

---

## 7. API 연동

### 7.1 목록 조회
```
GET /api/fmea/projects
Response: { success: boolean, projects: FMEAProject[] }
```

---

## 8. UI 최적화 사항

### 8.1 글씨 크기
- 테이블 기본: `text-[10px]`
- 셀 내용: `text-[9px]`
- 날짜: `text-[8px]`
- ID/TYPE: `text-[9px]`

### 8.2 행 높이
- 헤더/데이터 행: `28px`

### 8.3 셀 스타일
- `whitespace-nowrap`: 줄바꿈 방지
- `overflow-hidden text-ellipsis`: 긴 텍스트 말줄임
- `title` 속성: 전체 텍스트 툴팁

---

## 9. 데이터 타입

```typescript
interface FMEAProject {
  id: string;                    // pfm26-M001 형식
  project: {
    projectName: string;
    customer: string;
    productName: string;
    partNo: string;
    department: string;
    leader: string;
    startDate: string;
    endDate: string;
  };
  fmeaInfo?: {
    subject?: string;
    fmeaStartDate?: string;
    fmeaRevisionDate?: string;
    modelYear?: string;
    designResponsibility?: string;
    fmeaResponsibleName?: string;
  };
  cftMembers?: CFTMember[];
  createdAt: string;
  status?: string;
  step?: number;                 // 1~7
  revisionNo?: string;
  fmeaType?: string;             // M/F/P
  parentFmeaId?: string;
}
```

---

## 10. 수평전개 대상

| 모듈 | 경로 | 적용 상태 |
|------|------|----------|
| DFMEA | `/dfmea/list` | ✅ 완료 |
| CP | `/control-plan/list` | ✅ 완료 |
| PFD | `/pfd/list` | ✅ 완료 |
| APQP | `/apqp/list` | ✅ 완료 |

---

## 11. 모듈화 구조 (2026-01-24)

> **커밋**: `466f255`  
> **코드 감소**: 2159줄 → 929줄 (57% 감소)

### 11.1 공통 컴포넌트

```
src/components/list/
├── index.ts              # 공통 export
├── StepBadge.tsx         # 단계 배지 (1~7단계)
├── TypeBadge.tsx         # TYPE 배지 (M/F/P)
├── ListActionBar.tsx     # 액션 버튼 바 (검색, 새로고침, 저장, 수정, 삭제, 등록)
├── ListStatusBar.tsx     # 하단 상태바
├── ModuleListTable.tsx   # 테이블 공통 컴포넌트 (미사용)
├── hooks/
│   └── useListSelection.ts   # 행 선택 훅
└── config/
    ├── types.ts          # 공통 타입
    ├── pfmea.config.tsx  # PFMEA 설정
    └── index.ts          # 설정 export
```

### 11.2 사용법

```typescript
import { StepBadge, TypeBadge, extractTypeFromId, ListActionBar, ListStatusBar, useListSelection } from '@/components/list';

// 행 선택 훅
const { selectedRows, toggleRow, toggleAllRows, clearSelection, isAllSelected } = useListSelection();

// 배지 사용
<StepBadge step={1} maxSteps={7} />
<TypeBadge typeCode={extractTypeFromId(id, 'pfm')} />

// 액션 바
<ListActionBar searchQuery={...} onRefresh={...} themeColor="#00587a" ... />

// 상태 바
<ListStatusBar filteredCount={...} totalCount={...} moduleName="PFMEA" />
```
