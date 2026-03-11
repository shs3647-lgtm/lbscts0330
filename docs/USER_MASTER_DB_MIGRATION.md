# 사용자 정보 DB 마이그레이션 가이드

> **목적**: 사용자 정보를 localStorage에서 PostgreSQL DB로 마이그레이션
> **작성일**: 2026-01-11
> **상태**: ✅ DB 스키마 및 API 완성

---

## 📋 변경 사항 요약

### ✅ 완료된 작업

1. **Prisma 스키마에 User 마스터 테이블 추가**
   - 파일: `prisma/schema.prisma`
   - 테이블명: `users` (전체 프로젝트 공유)
   - 필드: id, factory, department, name, position, phone, email, remark, createdAt, updatedAt

2. **사용자 정보 API 생성**
   - 파일: `src/app/api/users/route.ts`
   - 엔드포인트: `/api/users`
   - 메서드: GET, POST, PUT, DELETE

3. **user-db.ts DB 연동으로 변경**
   - 파일: `src/lib/user-db.ts`
   - DB 우선, localStorage 폴백 패턴 적용
   - 모든 함수를 async로 변경

4. **기존 코드 업데이트**
   - `src/app/master/user/page.tsx` - 사용자 정보 관리 페이지
   - `src/components/modals/UserSelectModal.tsx` - 사용자 선택 모달

---

## 🗄️ 데이터베이스 구조

### User 테이블 (마스터 데이터)

```prisma
model User {
  id          String   @id @default(uuid())
  factory     String   // 공장
  department  String   // 부서
  name        String   // 성명
  position    String   // 직급
  phone       String?  // 전화번호
  email       String?  // 이메일 (유니크)
  remark      String?  // 비고
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([email])
  @@index([name])
  @@index([department])
  @@index([factory])
  @@map("users")
}
```

### 특징

- ✅ **전체 프로젝트 공유**: FMEA, APQP, Control Plan, PFD 등 모든 프로젝트에서 사용
- ✅ **이메일 유니크 제약**: 중복 이메일 방지
- ✅ **인덱스 최적화**: 이름, 부서, 공장별 검색 성능 향상

---

## 🔄 저장 우선순위

### 1. PostgreSQL DB (우선)

```typescript
// API 호출
const res = await fetch('/api/users');
const data = await res.json();
// data.users: 전체 프로젝트에서 공유되는 사용자 정보
```

### 2. localStorage (폴백)

```typescript
// DB 연결 실패 시 localStorage 사용
const users = localStorage.getItem('ss-user-info');
// 브라우저별 데이터 (임시)
```

---

## 📊 API 엔드포인트

### GET /api/users

전체 사용자 목록 조회

```bash
GET /api/users
```

응답:
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "factory": "울산공장",
      "department": "품질보증팀",
      "name": "신흥섭",
      "position": "차장",
      "phone": "010-1234-5678",
      "email": "shin.hs@example.com",
      "remark": "FMEA 담당",
      "createdAt": "2026-01-11T...",
      "updatedAt": "2026-01-11T..."
    }
  ]
}
```

### GET /api/users?id=xxx

특정 사용자 조회

```bash
GET /api/users?id={userId}
```

### POST /api/users

사용자 생성

```bash
POST /api/users
Content-Type: application/json

{
  "factory": "울산공장",
  "department": "품질보증팀",
  "name": "신흥섭",
  "position": "차장",
  "phone": "010-1234-5678",
  "email": "shin.hs@example.com",
  "remark": "FMEA 담당"
}
```

### PUT /api/users

사용자 수정

```bash
PUT /api/users
Content-Type: application/json

{
  "id": "uuid",
  "factory": "서울공장",
  "department": "품질보증팀",
  ...
}
```

### DELETE /api/users?id=xxx

사용자 삭제

```bash
DELETE /api/users?id={userId}
```

---

## 🔄 사용 흐름

### 1. 사용자 등록

```
사용자 정보 관리 페이지 (/master/user)
  ↓
사용자 정보 입력 (신흥섭)
  ↓
저장 버튼 클릭
  ↓
POST /api/users → PostgreSQL DB 저장
  ↓
✅ 전체 프로젝트에서 사용 가능
```

### 2. 다른 프로젝트에서 사용

```
FMEA 등록 화면 → CFT 멤버 선택
  ↓
UserSelectModal 열기
  ↓
GET /api/users → DB에서 전체 사용자 조회
  ↓
"신흥섭" 선택 → CFT 멤버로 등록
```

---

## 🔧 마이그레이션 실행

### 1. Prisma 클라이언트 생성

```bash
cd fmea-onpremise
npx prisma generate
```

### 2. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev --name add_user_master_table
```

### 3. 기존 localStorage 데이터 마이그레이션 (선택사항)

기존에 localStorage에 저장된 사용자 정보를 DB로 이전하려면:

```javascript
// 브라우저 콘솔에서 실행 (F12)
const localUsers = JSON.parse(localStorage.getItem('ss-user-info') || '[]');
for (const user of localUsers) {
  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      factory: user.factory,
      department: user.department,
      name: user.name,
      position: user.position,
      phone: user.phone,
      email: user.email,
      remark: user.remark
    })
  });
}
console.log(`✅ ${localUsers.length}명 마이그레이션 완료`);
```

---

## ✅ 검증 방법

### 1. DB 테이블 확인

```bash
# Prisma Studio 실행
npx prisma studio

# 또는 DB 뷰어 접속
http://localhost:3000/admin/db-viewer
```

### 2. API 테스트

```bash
# 전체 사용자 조회
curl http://localhost:3000/api/users

# 사용자 생성
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"factory":"울산공장","department":"품질보증팀","name":"신흥섭","position":"차장"}'
```

### 3. 화면에서 테스트

1. 사용자 정보 관리 페이지 접속: `http://localhost:3000/master/user`
2. 사용자 추가/수정/삭제
3. DB 뷰어에서 확인: `http://localhost:3000/admin/db-viewer`

---

## 🎯 사용자 정보 저장 위치

### 변경 전 (localStorage)
```
localStorage['ss-user-info'] = [...]
- 브라우저별로 분리
- 여러 프로젝트에서 공유 불가
- 서버 재시작 시 데이터 손실 가능
```

### 변경 후 (PostgreSQL DB)
```
PostgreSQL: users 테이블
- 전체 프로젝트에서 공유
- FMEA, APQP, Control Plan 등 모든 프로젝트에서 사용
- 영구 저장
```

---

## 📋 주요 변경 파일

1. `prisma/schema.prisma` - User 테이블 추가
2. `src/app/api/users/route.ts` - 사용자 정보 API
3. `src/lib/user-db.ts` - DB 연동 로직 (localStorage 폴백)
4. `src/app/master/user/page.tsx` - 사용자 정보 관리 페이지
5. `src/components/modals/UserSelectModal.tsx` - 사용자 선택 모달

---

## ✅ 최종 상태

- ✅ 사용자 정보는 PostgreSQL DB에 저장
- ✅ 여러 프로젝트에서 공유 가능
- ✅ DB 연결 실패 시 localStorage 폴백
- ✅ 신흥섭 사용자 등록 후 전체 프로젝트에서 사용 가능

---

## 📅 최종 업데이트
- 날짜: 2026-01-11
- 작성자: AI Assistant
- 상태: ✅ DB 스키마 및 API 완성, 마이그레이션 대기









