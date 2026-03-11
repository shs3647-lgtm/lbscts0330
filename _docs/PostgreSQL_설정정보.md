# 🔑 PostgreSQL 데이터베이스 설정 정보 (Quick Reference)

## 📊 데이터베이스 연결 정보

| 항목 | 값 | 설명 |
|------|-----|------|
| **호스트** | `localhost` 또는 `127.0.0.1` | 로컬 개발 환경 |
| **포트** | `5432` | PostgreSQL 기본 포트 |
| **데이터베이스명** | `fmea_db` | FMEA 온프레미스 DB |
| **사용자명** | `postgres` | PostgreSQL 기본 사용자 |
| **비밀번호** | `postgres` (또는 설치 시 설정한 값) | PostgreSQL 설치 시 설정 |

---

## 🔗 연결 문자열 (Connection String)

### Prisma 형식
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public"
```

### 일반 형식
```
Host: localhost
Port: 5432
Database: fmea_db
User: postgres
Password: postgres
Schema: public
```

---

## 📝 .env 파일 필수 항목

```env
# PostgreSQL 데이터베이스
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=fmea_db
DB_PORT=5432
DB_HOST=localhost

# Prisma 연결 URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public"

# 애플리케이션
PORT=3000
NODE_ENV=development
```

---

## ⚡ 빠른 시작 명령어

### 1. 프로젝트 클론 후
```powershell
npm install
```

### 2. .env 파일 생성
```powershell
Copy-Item .env.new_laptop .env
```

### 3. 데이터베이스 초기화
```powershell
npm run db:generate
npm run db:migrate
```

### 4. 개발 서버 실행
```powershell
npm run dev
```

---

## 🔍 데이터베이스 확인 방법

### Prisma Studio (GUI)
```powershell
npm run db:studio
```
브라우저에서 `http://localhost:5555` 자동 열림

### psql (CLI)
```powershell
psql -U postgres -d fmea_db
```

### pgAdmin (GUI)
1. pgAdmin 실행
2. Servers > PostgreSQL > Databases > fmea_db

---

## 🛠️ PostgreSQL 서비스 관리

### 서비스 상태 확인
```powershell
Get-Service postgresql*
```

### 서비스 시작
```powershell
Start-Service postgresql-x64-14
```

### 서비스 중지
```powershell
Stop-Service postgresql-x64-14
```

### 서비스 재시작
```powershell
Restart-Service postgresql-x64-14
```

---

## 🔐 보안 참고사항

### 개발 환경
- 사용자명: `postgres`
- 비밀번호: `postgres` (간단하게 설정 가능)

### 운영 환경
- **반드시 강력한 비밀번호 사용**
- 예: `fmea_db_password_2026` 또는 더 복잡한 비밀번호
- `.env` 파일은 `.gitignore`에 포함되어 있음 (GIT에 올라가지 않음)

---

## 📍 중요 파일 위치

```
fmea-onpremise/
├── .env                          # 환경 변수 (생성 필요)
├── .env.new_laptop               # 환경 변수 템플릿
├── .env.example                  # 환경 변수 예시
├── prisma/
│   └── schema.prisma             # 데이터베이스 스키마
└── docs/
    ├── 새노트북_개발환경_셋팅가이드.md
    └── PostgreSQL_설정정보.md    # 이 파일
```

---

## 🚨 자주 발생하는 문제

### 1. 연결 실패
```
Error: Can't reach database server at localhost:5432
```
**해결:** PostgreSQL 서비스가 실행 중인지 확인

### 2. 인증 실패
```
Error: Authentication failed for user `postgres`
```
**해결:** `.env` 파일의 비밀번호 확인

### 3. 데이터베이스 없음
```
Error: Database "fmea_db" does not exist
```
**해결:** `CREATE DATABASE fmea_db;` 실행

---

## 📞 추가 도움말

상세한 설정 가이드는 다음 문서를 참조하세요:
- [새노트북 개발환경 셋팅가이드](./새노트북_개발환경_셋팅가이드.md)
- [로컬 개발 환경 구축 가이드](./LOCAL_DEVELOPMENT_SETUP.md)

---

**마지막 업데이트:** 2026-01-31
