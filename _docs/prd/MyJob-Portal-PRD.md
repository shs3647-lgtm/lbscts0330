# PRD: MyJob Portal (내가 할 일)

## 📋 문서 정보
| 항목 | 내용 |
|------|------|
| **작성일** | 2026-01-27 |
| **작성자** | AI Assistant |
| **버전** | 1.0.0 |
| **상태** | ✅ 구현 완료 |
| **코드프리즈** | 🔒 2026-01-27 19:45 KST |

---

## ⚠️ 코드프리즈 선언

```
★★★ 이 기능은 코드프리즈 대상입니다 ★★★
- 삭제 금지
- 주요 기능 변경 시 반드시 이 PRD 참조
- 복구 시 이 문서 기준으로 복원
```

---

## 1. 개요

### 1.1 기능 목적
**MyJob Portal**은 로그인한 사용자가 본인과 관련된 모든 업무를 한 화면에서 조회하고 관리할 수 있는 통합 대시보드입니다.

### 1.2 접근 경로
- **사이드바 메뉴**: MyJob (최상단)
- **URL**: `/approval/approver-portal`

### 1.3 서브메뉴 구성
| 메뉴 | URL | 설명 |
|------|-----|------|
| 내가 결제해야할 현황 | `/approval/approver-portal` | 결재 대기 현황 |
| 프로젝트 진행현황 | `/pfmea/list` | PFMEA 리스트 |
| AP 개선 진행 현황 | `/pfmea/ap-improvement` | AP 개선관리 |

---

## 2. 화면 구성

### 2.1 전체 레이아웃
```
┌─────────────────────────────────────────────────────────────┐
│  💼 MyJob Portal                    [진행 0건] [지연 0건]   │
│  나의 업무 및 프로젝트 결재 현황을 통합 관리합니다.          │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. 결제현황                                            │ │
│  │    대상: 진행-N건, 지연-N건, 완료-N건                   │ │
│  │    ┌────┬────┬────┬────┬────┬────┬────┬────┬────┐    │ │
│  │    │ NO │구분│ ID │이름│책임│고객│시작│종료│상태│    │ │
│  │    └────┴────┴────┴────┴────┴────┴────┴────┴────┘    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 2. 프로젝트 진행현황                                   │ │
│  │    (동일 테이블 구조 + 나의역할 컬럼)                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 3. AP 개선대상 진행현황                                │ │
│  │    (개선대상건수/완료/진행/지연 컬럼)                   │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  © 2026 FMEA Management System MyJob Integrated Dashboard   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 헤더 섹션
```tsx
// 헤더 구성요소
<div className="flex items-center justify-between mb-8 bg-white p-5 rounded-xl shadow-sm">
    <div>
        <h1>💼 MyJob Portal</h1>
        <p>나의 업무 및 프로젝트 결재 현황을 통합 관리합니다.</p>
    </div>
    <div className="flex gap-2">
        // 진행/지연/완료 배지
        <div className="bg-blue-50 text-blue-700">진행 N건</div>
        <div className="bg-red-50 text-red-700">지연 N건</div>
        <div className="bg-green-50 text-green-700">완료 N건</div>
    </div>
</div>
```

### 2.3 상태 배지 색상
| 상태 | 배경색 | 텍스트색 | 클래스 |
|------|--------|----------|--------|
| 진행 | `bg-blue-50` | `text-blue-700` | `animate-pulse` 원형 표시 |
| 지연 | `bg-red-50` | `text-red-700` | 정적 원형 표시 |
| 완료 | `bg-green-50` | `text-green-700` | 정적 원형 표시 |

---

## 3. 섹션별 상세

### 3.1 결제현황 테이블

#### 헤더 그라데이션
```css
bg-gradient-to-r from-[#00587a] to-[#007a9e]
```

#### 컬럼 정의
| 컬럼 | 설명 |
|------|------|
| NO | 순번 |
| 구분 | DFMEA/PFMEA/CP/PFD |
| 프로젝트ID | 프로젝트 고유 ID |
| 프로젝트명 | 클릭 시 해당 워크시트로 이동 |
| 책임자 | 프로젝트 책임자 |
| 고객사 | 고객사명 |
| 시작 | 시작일 (YYYY-MM-DD) |
| 종료 | 종료일 (YYYY-MM-DD) |
| 결제단계 | 작성/검토/승인 |
| 결제상태 | 진행중/지연/완료 |
| 비고 | 추가 정보 |

#### 결제단계 배지
```tsx
// 승인 단계
<span className="bg-purple-100 text-purple-700">승인</span>
// 검토 단계
<span className="bg-blue-100 text-blue-700">검토</span>
// 작성 단계
<span className="bg-slate-100 text-slate-700">작성</span>
```

### 3.2 프로젝트 진행현황 테이블

#### 헤더 그라데이션
```css
bg-gradient-to-r from-[#2c3e50] to-[#4ca1af]
```

#### 컬럼 정의
| 컬럼 | 설명 |
|------|------|
| NO | 순번 |
| 구분 | DFMEA/PFMEA/CP/PFD |
| 프로젝트ID | 프로젝트 고유 ID |
| 프로젝트명 | 클릭 시 해당 워크시트로 이동 |
| 책임자 | 프로젝트 책임자 |
| 나의역할 | CFT/리더/PM 등 |
| 시작 | 시작일 |
| 종료 | 종료일 |
| 진행현황 | 1단계/2단계/3단계... |
| 결제상태 | 진행중/지연/완료 |
| 비고 | 추가 정보 |

### 3.3 AP 개선대상 진행현황 테이블

#### 헤더 그라데이션
```css
bg-gradient-to-r from-[#11998e] to-[#38ef7d]
```

#### 컬럼 정의
| 컬럼 | 설명 | 색상 |
|------|------|------|
| NO | 순번 | - |
| 구분 | DFMEA/PFMEA/CP/PFD | - |
| 프로젝트ID | 프로젝트 고유 ID | - |
| 프로젝트명 | 클릭 시 해당 워크시트로 이동 | - |
| 책임자 | 프로젝트 책임자 | - |
| 나의역할 | CFT/리더/PM 등 | - |
| 개선대상건수 | 전체 AP 건수 | `text-slate-800` |
| 완료건수 | 완료된 AP 건수 | `text-green-600` |
| 진행건수 | 진행 중인 AP 건수 | `text-blue-600` |
| 지연건수 | 지연된 AP 건수 | `text-red-600` |
| 비고 | 추가 정보 | - |

---

## 4. 상호작용

### 4.1 프로젝트명 클릭
```tsx
const handleNavigate = (type: string, id: string) => {
    if (!id || id === '-') return;
    let path = '/';
    switch (type.toUpperCase()) {
        case 'DFMEA': path = '/dfmea/worksheet'; break;
        case 'PFMEA': path = '/pfmea/worksheet'; break;
        case 'CP': path = '/control-plan/worksheet'; break;
        case 'PFD': path = '/pfd/worksheet'; break;
        default: path = '/welcomeboard';
    }
    router.push(`${path}?id=${id}`);
};
```

### 4.2 테이블 행 호버
```tsx
className="hover:bg-slate-50 transition-colors"
```

---

## 5. 사이드바 메뉴 정의

### 5.1 위치
사이드바 최상단 (menuItems 배열 첫 번째)

### 5.2 아이콘
```tsx
// 세련된 프로필 아이콘 (그라데이션)
const Person = ({ className, photoSrc }) => (
    photoSrc ? (
        <img src={photoSrc} className="rounded-full object-cover" />
    ) : (
        <svg viewBox="0 0 24 24">
            <defs>
                <linearGradient id="personGrad">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="11" fill="url(#personGrad)" />
            <circle cx="12" cy="10" r="5" fill="white" />
            <path d="M4 21C4 17 7 14 12 14C17 14 20 17 20 21" fill="white" />
        </svg>
    )
);
```

### 5.3 메뉴 정의 코드
```tsx
// Sidebar.tsx 내 정의
const myJobMenuItem = {
    id: 'approval-portal',
    label: 'MyJob',
    Icon: ColorIcons.Person,
    href: '/approval/approver-portal',
    subItems: [
        { label: '내가 결제해야할 현황', href: '/approval/approver-portal' },
        { label: '프로젝트 진행현황', href: '/pfmea/list' },
        { label: 'AP 개선 진행 현황', href: '/pfmea/ap-improvement' },
    ],
};
```

---

## 6. 스타일 정의

### 6.1 테이블 스타일
```tsx
const tableHeaderStyle = "bg-slate-100 p-2 border border-slate-300 text-[12px] font-bold text-slate-700 text-center";
const tableCellStyle = "p-2 border border-slate-200 text-[12px] text-slate-600 text-center";
```

### 6.2 레이아웃
```tsx
<FixedLayout
    topNav={<PFMEATopNav />}
    showSidebar={true}
    contentPadding="p-6"
    bgColor="#f8fafc"
>
```

### 6.3 섹션 카드
```tsx
<section className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
```

---

## 7. 파일 구조

### 7.1 관련 파일 목록
```
src/app/approval/
├── approver-portal/
│   └── page.tsx          # MyJob 메인 페이지 ⭐
├── complete/
│   └── page.tsx          # 결재 완료 페이지
└── review/
    └── page.tsx          # 결재 검토 페이지

src/components/layout/
└── Sidebar.tsx           # MyJob 메뉴 정의 (162-173행)
```

### 7.2 핵심 파일 경로
```
/src/app/approval/approver-portal/page.tsx
```

---

## 8. 데이터 구조

### 8.1 결제현황 데이터
```typescript
interface ApprovalItem {
    no: number;
    type: 'DFMEA' | 'PFMEA' | 'CP' | 'PFD';
    id: string;
    name: string;
    lead: string;
    client: string;
    start: string;  // YYYY-MM-DD
    end: string;    // YYYY-MM-DD
    step: '작성' | '검토' | '승인';
    status: '진행중' | '지연' | '완료';
}
```

### 8.2 프로젝트 진행현황 데이터
```typescript
interface ProjectItem {
    no: number;
    type: 'DFMEA' | 'PFMEA' | 'CP' | 'PFD';
    id: string;
    name: string;
    lead: string;
    role: string;  // CFT, 리더, PM...
    start: string;
    end: string;
    progress: string;  // 1단계, 2단계...
    status: '진행중' | '지연' | '완료';
}
```

### 8.3 AP 개선현황 데이터
```typescript
interface APItem {
    no: number;
    type: 'DFMEA' | 'PFMEA' | 'CP' | 'PFD';
    id: string;
    name: string;
    lead: string;
    role: string;
    total: number | string;  // 개선대상건수
    done: number | string;   // 완료건수
    ing: number | string;    // 진행건수
    delay: number | string;  // 지연건수
}
```

---

## 9. 향후 개선 사항

### 9.1 API 연동
- [ ] 실제 결재 대기 데이터 조회 API 연동
- [ ] 프로젝트 진행현황 실시간 조회
- [ ] AP 개선현황 실시간 조회

### 9.2 필터링 기능
- [ ] 날짜 범위 필터
- [ ] 구분(DFMEA/PFMEA/CP/PFD) 필터
- [ ] 상태 필터

### 9.3 알림 기능
- [ ] 지연 건에 대한 이메일 알림
- [ ] 결재 요청 알림

---

## 10. 복구 가이드

### 10.1 전체 복구
1. `src/app/approval/approver-portal/page.tsx` 복원
2. `src/components/layout/Sidebar.tsx` 162-173행 myJobMenuItem 복원

### 10.2 사이드바 메뉴만 복구
```tsx
// Sidebar.tsx에 추가
const myJobMenuItem = {
    id: 'approval-portal',
    label: 'MyJob',
    Icon: ColorIcons.Person,
    href: '/approval/approver-portal',
    subItems: [
        { label: '내가 결제해야할 현황', href: '/approval/approver-portal' },
        { label: '프로젝트 진행현황', href: '/pfmea/list' },
        { label: 'AP 개선 진행 현황', href: '/pfmea/ap-improvement' },
    ],
};

// menuItems 배열 첫 번째에 추가
const menuItems = [
    myJobMenuItem,
    // ... 나머지 메뉴들
];
```

---

**🔒 Code Freeze: 2026-01-27 19:45 KST**

> 이 문서는 MyJob 기능의 화면 정의서입니다.
> 기능 삭제 시 이 문서를 기준으로 복원할 수 있습니다.
