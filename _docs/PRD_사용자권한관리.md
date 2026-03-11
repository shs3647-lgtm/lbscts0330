# 사용자 권한 관리 PRD (Product Requirements Document)

**문서 버전**: 1.0  
**작성일**: 2026-01-19  
**작성자**: FMEA On-Premise 개발팀

---

## 1. 개요

### 1.1 목적
FMEA On-Premise 시스템의 사용자 관리 및 권한 제어 기능을 정의합니다.

### 1.2 범위
- 사용자 CRUD (생성/조회/수정/삭제)
- 시스템 권한 관리 (Admin/Editor/Viewer)
- 모듈별 권한 관리 (PFMEA/DFMEA/CP/PFD)
- 엑셀 Import/Export

---

## 2. 사용자 정보

### 2.1 기본 정보 필드

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | UUID | ✓ | 시스템 자동 생성 |
| name | String | ✓ | 사용자 이름 |
| email | String | - | 이메일 (로그인 ID, 고유) |
| factory | String | ✓ | 소속 공장 |
| department | String | ✓ | 소속 부서 |
| position | String | - | 직급/직책 |
| phone | String | - | 연락처 |
| password | String | ✓ | 비밀번호 (SHA-256 해시 저장) |
| isActive | Boolean | ✓ | 활성화 여부 (기본값: true) |
| createdAt | DateTime | ✓ | 생성일시 |
| updatedAt | DateTime | ✓ | 수정일시 |

### 2.2 권한 필드

| 필드명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| role | String | viewer | 시스템 권한 (admin/editor/viewer) |
| permPfmea | String | none | PFMEA 모듈 권한 (none/read/write) |
| permDfmea | String | none | DFMEA 모듈 권한 (none/read/write) |
| permCp | String | none | CP 모듈 권한 (none/read/write) |
| permPfd | String | none | PFD 모듈 권한 (none/read/write) |

---

## 3. 권한 체계

### 3.1 시스템 권한 (role)

전체 시스템에 대한 관리 권한을 정의합니다.

| 권한 | 코드 | 아이콘 | 설명 |
|------|------|--------|------|
| 관리자 | admin | 🔴 | 모든 권한 + 시스템 설정 + 사용자 관리 |
| 편집자 | editor | 🟡 | FMEA 작성/수정 가능 (관리 기능 제외) |
| 열람자 | viewer | 🟢 | 읽기 전용 (모든 수정 불가) |

#### 시스템 권한별 기능 접근

| 기능 | admin | editor | viewer |
|------|-------|--------|--------|
| FMEA 조회 | ✓ | ✓ | ✓ |
| FMEA 작성/수정 | ✓ | ✓ | ✗ |
| FMEA 삭제 | ✓ | △ (본인 담당) | ✗ |
| 결재 승인/반려 | ✓ | ✗ | ✗ |
| 사용자 관리 | ✓ | ✗ | ✗ |
| 시스템 설정 | ✓ | ✗ | ✗ |
| DB 뷰어 | ✓ | ✗ | ✗ |

### 3.2 모듈별 권한 (permXXX)

각 모듈(PFMEA/DFMEA/CP/PFD)에 대한 세부 권한을 정의합니다.

| 권한 | 코드 | 아이콘 | 설명 |
|------|------|--------|------|
| 없음 | none | ⚫ | 접근 불가 (메뉴 숨김) |
| 읽기 | read | 🔵 | 조회만 가능 (수정 불가) |
| 쓰기 | write | 🟢 | 조회 + 수정 가능 |

#### 모듈 권한 적용 예시

```
사용자 A: role=editor, permPfmea=write, permDfmea=none, permCp=read, permPfd=none
→ PFMEA: 작성/수정 가능
→ DFMEA: 메뉴 숨김, 접근 불가
→ CP: 조회만 가능
→ PFD: 메뉴 숨김, 접근 불가
```

### 3.3 권한 우선순위

1. **시스템 권한 우선**: `role=viewer`이면 모듈 권한이 `write`여도 수정 불가
2. **모듈 권한 적용**: 시스템 권한이 허용하는 범위 내에서 모듈 권한 적용
3. **관리자 예외**: `role=admin`은 모든 모듈에 대해 전체 권한

```
권한 계산 = min(시스템 권한, 모듈 권한)

예: role=editor(수정가능) + permPfmea=read(읽기) = PFMEA 읽기만 가능
예: role=viewer(읽기) + permPfmea=write(쓰기) = PFMEA 읽기만 가능
예: role=admin(전체) = 모든 모듈 전체 권한 (모듈 권한 무시)
```

---

## 4. 기능 명세

### 4.1 사용자 목록 조회

**화면 경로**: `/admin/settings/users`

#### UI 구성
- 헤더: 제목, Import/Export/추가 버튼
- 검색/필터: 검색창, 권한 필터, 상태 필터
- 테이블: 사용자 목록 (권한 드롭다운 즉시 변경)
- 권한 설명: 시스템 권한, 모듈 권한 안내

#### 테이블 컬럼
| 컬럼 | 설명 |
|------|------|
| # | 순번 |
| 이름 | 사용자 이름 |
| 이메일 | 로그인 ID |
| 공장 | 소속 공장 |
| 부서 | 소속 부서 |
| 시스템 | 시스템 권한 드롭다운 |
| PFMEA | PFMEA 권한 드롭다운 |
| DFMEA | DFMEA 권한 드롭다운 |
| CP | CP 권한 드롭다운 |
| PFD | PFD 권한 드롭다운 |
| 상태 | 활성/비활성 토글 |
| 작업 | 수정/비밀번호초기화/삭제 |

### 4.2 사용자 추가/수정

**모달 다이얼로그**

#### 기본 정보 섹션
- 이름 (필수)
- 이메일
- 전화번호
- 공장 (필수)
- 부서 (필수)
- 직급

#### 권한 설정 섹션
- 시스템 권한 (필수)
- PFMEA 권한
- DFMEA 권한
- CP 권한
- PFD 권한

#### 비밀번호 섹션
- 비밀번호 (신규 시 필수)
- 비밀번호 확인

### 4.3 엑셀 Import

**파일 형식**: CSV (UTF-8 BOM)

#### 필수 컬럼
- 이름
- 공장
- 부서

#### 선택 컬럼
- 이메일
- 직급
- 시스템권한 (관리자/편집자/열람자)
- PFMEA (없음/읽기/쓰기)
- DFMEA (없음/읽기/쓰기)
- CP (없음/읽기/쓰기)
- PFD (없음/읽기/쓰기)

#### 처리 규칙
- 임시 비밀번호 자동 설정: `temp1234`
- 이메일 중복 시 해당 행 건너뛰기
- 결과 알림: 성공/실패 건수 표시

### 4.4 엑셀 Export

**파일 형식**: CSV (UTF-8 BOM)  
**파일명**: `사용자목록_YYYY-MM-DD.csv`

#### 출력 컬럼
이름, 이메일, 공장, 부서, 직급, 시스템권한, PFMEA, DFMEA, CP, PFD, 상태

---

## 5. API 명세

### 5.1 사용자 목록 조회
```
GET /api/users
Response: { success: true, users: [...] }
```

### 5.2 특정 사용자 조회
```
GET /api/users?id={userId}
Response: { success: true, user: {...} }
```

### 5.3 사용자 생성
```
POST /api/users
Body: { name, email, factory, department, position, phone, role, permPfmea, permDfmea, permCp, permPfd, password }
Response: { success: true, user: {...} }
```

### 5.4 사용자 수정
```
PUT /api/users
Body: { id, name, email, factory, department, position, phone, role, permPfmea, permDfmea, permCp, permPfd, isActive, password? }
Response: { success: true, user: {...} }
```

### 5.5 사용자 삭제
```
DELETE /api/users?id={userId}
Response: { success: true, message: '...' }
```

---

## 6. 데이터베이스 스키마

```prisma
model User {
  id          String    @id @default(uuid())
  factory     String    // 공장
  department  String    // 부서
  name        String    // 성명
  position    String    // 직급
  phone       String?   // 전화번호
  email       String?   // 이메일
  remark      String?   // 비고
  password    String?   // 비밀번호 (SHA-256 해시)
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
  role        String    @default("viewer")  // admin/editor/viewer
  permPfmea   String    @default("none")    // none/read/write
  permDfmea   String    @default("none")    // none/read/write
  permCp      String    @default("none")    // none/read/write
  permPfd     String    @default("none")    // none/read/write
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([email])
  @@index([name])
  @@index([department])
  @@index([factory])
  @@index([isActive])
  @@index([role])
  @@map("users")
}
```

---

## 7. 보안 요구사항

### 7.1 비밀번호
- SHA-256 해시 저장 (평문 저장 금지)
- 최소 8자 이상 권장
- 비밀번호 초기화 기능 제공

### 7.2 접근 제어
- 사용자 관리 페이지: admin만 접근 가능
- 비활성 사용자: 로그인 차단
- 세션 관리: JWT 토큰 기반 (향후)

### 7.3 감사 로그 (향후)
- 로그인/로그아웃 기록
- 권한 변경 기록
- 사용자 생성/삭제 기록

---

## 8. 화면 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin 사이드바 → 바로가기 → 👥 사용자권한                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  사용자 권한 설정 페이지                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 검색: [________] 권한: [전체▼] 상태: [전체▼]    총 8명      ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ # │ 이름 │ 이메일 │ 공장 │ 부서 │시스템│PFMEA│DFMEA│CP│PFD│ ││
│  │───┼──────┼────────┼──────┼──────┼──────┼─────┼─────┼──┼───│ ││
│  │ 1 │ 김철수│admin@ │ 평택 │ 품질 │🔴관리│🟢쓰기│🟢쓰기│🔵│🟢│ ││
│  │ 2 │ 이영희│editor@│ 울산 │ 생기 │🟡편집│🟢쓰기│⚫없음│🔵│⚫│ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 향후 개선 계획

### Phase 2
- [ ] JWT 기반 세션 관리
- [ ] 비밀번호 복잡도 정책
- [ ] 비밀번호 만료 기능
- [ ] 로그인 실패 횟수 제한

### Phase 3
- [ ] SSO (Single Sign-On) 연동
- [ ] LDAP/AD 연동
- [ ] 2FA (Two-Factor Authentication)
- [ ] 감사 로그 UI

### Phase 4
- [ ] 프로젝트별 권한 설정
- [ ] 역할 기반 권한 그룹
- [ ] 권한 템플릿

---

## 10. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-01-19 | 개발팀 | 최초 작성 |

---

**끝.**
