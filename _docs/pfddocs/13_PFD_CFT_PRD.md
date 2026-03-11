# PFD CFT (Cross Functional Team) PRD

> **버전**: v1.0.0  
> **최종 업데이트**: 2026-01-24  
> **코드 프리즈**: `b5ea535`

---

## 1. 개요

### 1.1 목적
PFD(Process Flow Diagram)의 CFT(Cross Functional Team) 관리 화면으로, 공정흐름도 작성에 참여하는 다기능팀 구성원을 관리합니다.

### 1.2 경로
- **URL**: `/pfd/cft?id={pfdId}`
- **파일**: `src/app/pfd/cft/page.tsx`

---

## 2. 화면 구성

### 2.1 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ TopNav: PFD CFT 관리                                     │
├─────────────────────────────────────────────────────────┤
│ Sidebar │ 메인 컨텐츠                                    │
│         │ ┌───────────────────────────────────────────┐ │
│         │ │ PFD 정보 헤더 (ID, 이름, 상태)             │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ CFT 팀원 목록 테이블                       │ │
│         │ │ - 선택 체크박스                            │ │
│         │ │ - NO                                       │ │
│         │ │ - 성명                                     │ │
│         │ │ - 부서                                     │ │
│         │ │ - 직급                                     │ │
│         │ │ - 역할                                     │ │
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
| 역할 | role | string | ✅ | CFT 역할 (팀장/팀원) |
| 연락처 | phone | string | - | 전화번호 |
| 이메일 | email | string | - | 이메일 주소 |

---

## 3. 기능 정의

### 3.1 팀원 추가
- **버튼**: [추가]
- **동작**: 테이블 하단에 빈 행 추가
- **기본값**: NO 자동 증가, 역할 = '팀원'

### 3.2 팀원 삭제
- **버튼**: [삭제]
- **동작**: 선택된 행 삭제
- **확인**: "선택한 N명의 팀원을 삭제하시겠습니까?"

### 3.3 저장
- **버튼**: [저장]
- **동작**: CFT 목록을 DB에 저장
- **API**: `PUT /api/pfd/{pfdId}/cft`

---

## 4. API 연동

### 4.1 CFT 목록 조회
```
GET /api/pfd/{pfdId}/cft
Response: { members: CFTMember[] }
```

### 4.2 CFT 저장
```
PUT /api/pfd/{pfdId}/cft
Body: { members: CFTMember[] }
Response: { success: boolean }
```

---

## 5. 데이터 타입

```typescript
interface PFDCFTMember {
  id: string;
  pfdId: string;
  rowNo: number;
  name: string;
  department: string;
  position?: string;
  role: 'leader' | 'member';
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. 참고

- PFMEA/CP CFT와 동일한 UI/UX 구조
- PFD → PFMEA 연계 시 CFT 공유 가능
