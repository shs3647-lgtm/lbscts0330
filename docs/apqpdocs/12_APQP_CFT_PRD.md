# APQP CFT (Cross Functional Team) PRD

> **버전**: v1.0.0  
> **최종 업데이트**: 2026-01-24  
> **코드 프리즈**: `b5ea535`

---

## 1. 개요

### 1.1 목적
APQP(Advanced Product Quality Planning)의 CFT(Cross Functional Team) 관리 화면으로, 프로젝트에 참여하는 다기능팀 구성원을 관리합니다.

### 1.2 경로
- **URL**: `/apqp/cft?id={apqpId}`
- **파일**: `src/app/apqp/cft/page.tsx`

---

## 2. 화면 구성

### 2.1 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ TopNav: APQP CFT 관리                                    │
├─────────────────────────────────────────────────────────┤
│ Sidebar │ 메인 컨텐츠                                    │
│         │ ┌───────────────────────────────────────────┐ │
│         │ │ APQP 정보 헤더 (ID, 프로젝트명, 상태)      │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ CFT 팀원 목록 테이블                       │ │
│         │ │ - 선택 체크박스                            │ │
│         │ │ - NO                                       │ │
│         │ │ - 성명                                     │ │
│         │ │ - 부서                                     │ │
│         │ │ - 직급                                     │ │
│         │ │ - 역할 (PM/엔지니어/QA 등)                 │ │
│         │ │ - 담당영역                                 │ │
│         │ │ - 연락처                                   │ │
│         │ │ - 이메일                                   │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ [추가] [삭제] [저장]                       │ │
│         │ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 컬럼 정의

| 컬럼 | 필드명 | 타입 | 필수 | 설명 |
|------|--------|------|------|------|
| 선택 | - | checkbox | - | 행 선택 |
| NO | rowNo | number | ✅ | 순번 (자동) |
| 성명 | name | string | ✅ | 팀원 이름 |
| 부서 | department | string | ✅ | 소속 부서 |
| 직급 | position | string | - | 직급/직책 |
| 역할 | role | string | ✅ | PM/엔지니어/QA/구매 등 |
| 담당영역 | responsibility | string | - | 담당 업무 영역 |
| 연락처 | phone | string | - | 전화번호 |
| 이메일 | email | string | - | 이메일 주소 |

---

## 3. 역할 유형

| 코드 | 역할명 | 설명 |
|------|--------|------|
| `PM` | 프로젝트 매니저 | 프로젝트 총괄 |
| `PE` | 제품 엔지니어 | 설계/개발 담당 |
| `ME` | 제조 엔지니어 | 제조/생산 담당 |
| `QA` | 품질 담당 | 품질 관리/검사 |
| `PU` | 구매 담당 | 구매/조달 |
| `SU` | 공급업체 | 협력사 담당자 |
| `CU` | 고객사 | 고객사 담당자 |

---

## 4. 기능 정의

### 4.1 팀원 추가
- **버튼**: [추가]
- **동작**: 테이블 하단에 빈 행 추가
- **기본값**: NO 자동 증가

### 4.2 팀원 삭제
- **버튼**: [삭제]
- **동작**: 선택된 행 삭제
- **확인**: "선택한 N명의 팀원을 삭제하시겠습니까?"

### 4.3 저장
- **버튼**: [저장]
- **동작**: CFT 목록을 DB에 저장
- **API**: `PUT /api/apqp/{apqpId}/cft`

---

## 5. API 연동

### 5.1 CFT 목록 조회
```
GET /api/apqp/{apqpId}/cft
Response: { members: CFTMember[] }
```

### 5.2 CFT 저장
```
PUT /api/apqp/{apqpId}/cft
Body: { members: CFTMember[] }
Response: { success: boolean }
```

---

## 6. 데이터 타입

```typescript
interface APQPCFTMember {
  id: string;
  apqpId: string;
  rowNo: number;
  name: string;
  department: string;
  position?: string;
  role: 'PM' | 'PE' | 'ME' | 'QA' | 'PU' | 'SU' | 'CU';
  responsibility?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 7. APQP 특화 기능

### 7.1 하위 문서 연계
- APQP에 연결된 FMEA, CP의 CFT와 연동 가능
- CFT 공유 옵션 제공

### 7.2 이력 관리
- CFT 변경 시 자동 이력 기록
- 프로젝트 단계별 CFT 스냅샷

---

## 8. 참고

- PFMEA/CP CFT와 동일한 UI/UX 구조
- 사용자 마스터 연동으로 자동완성 지원 (향후)
