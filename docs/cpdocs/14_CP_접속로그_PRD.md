# CP 접속로그 PRD

> **버전**: v1.0.0  
> **최종 업데이트**: 2026-01-24  
> **코드 프리즈**: `b5ea535`

---

## 1. 개요

### 1.1 목적
CP(Control Plan) 문서에 대한 접속 및 수정 이력을 조회하는 화면입니다.

### 1.2 경로
- **URL**: `/control-plan/log?id={cpId}`
- **파일**: `src/app/control-plan/log/page.tsx`

---

## 2. 화면 구성

### 2.1 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ TopNav: CP 접속로그                                      │
├─────────────────────────────────────────────────────────┤
│ Sidebar │ 메인 컨텐츠                                    │
│         │ ┌───────────────────────────────────────────┐ │
│         │ │ CP 정보 헤더 (ID, 이름)                    │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 필터: [기간] [사용자] [액션타입] [검색]    │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 로그 테이블                                │ │
│         │ │ - NO                                       │ │
│         │ │ - 일시                                     │ │
│         │ │ - 사용자                                   │ │
│         │ │ - 액션                                     │ │
│         │ │ - 상세내용                                 │ │
│         │ │ - IP                                       │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 페이지네이션                               │ │
│         │ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 컬럼 정의

| 컬럼 | 필드명 | 타입 | 설명 |
|------|--------|------|------|
| NO | rowNo | number | 순번 |
| 일시 | createdAt | datetime | 접속/수정 일시 |
| 사용자 | userName | string | 사용자명 |
| 액션 | action | string | 수행 액션 |
| 상세내용 | detail | string | 변경 상세 내용 |
| IP | ipAddress | string | 접속 IP |

---

## 3. 액션 타입

| 코드 | 설명 | 색상 |
|------|------|------|
| `VIEW` | 조회 | 회색 |
| `CREATE` | 생성 | 녹색 |
| `UPDATE` | 수정 | 파란색 |
| `DELETE` | 삭제 | 빨간색 |
| `EXPORT` | 내보내기 | 보라색 |
| `APPROVE` | 승인 | 주황색 |

---

## 4. 필터 기능

### 4.1 기간 필터
- 오늘
- 최근 7일
- 최근 30일
- 사용자 지정 (날짜 선택)

### 4.2 사용자 필터
- 전체
- 특정 사용자 선택

### 4.3 액션 필터
- 전체
- VIEW / CREATE / UPDATE / DELETE / EXPORT / APPROVE

---

## 5. API 연동

### 5.1 로그 조회
```
GET /api/control-plan/{cpId}/logs
Query: {
  startDate?: string,
  endDate?: string,
  userId?: string,
  action?: string,
  page: number,
  limit: number
}
Response: {
  logs: LogEntry[],
  total: number,
  page: number,
  totalPages: number
}
```

---

## 6. 데이터 타입

```typescript
interface LogEntry {
  id: string;
  cpId: string;
  userId: string;
  userName: string;
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'APPROVE';
  detail: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: Date;
}
```

---

## 7. 참고

- 로그는 자동 기록 (사용자 액션 시)
- 90일 이후 자동 아카이브
- 관리자만 전체 로그 조회 가능
