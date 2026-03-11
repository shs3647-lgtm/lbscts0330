# 🚀 빠른 시작 가이드 (Quick Start)

다른 컴퓨터에서 이 프로젝트를 클론하고 실행하기 위한 단계별 가이드입니다.

## ⚡ 5분 안에 시작하기

### 1️⃣ 저장소 클론
```bash
git clone <repository-url>
cd fmea-onpremise
```

### 2️⃣ 의존성 설치
```bash
npm install
```

### 3️⃣ 환경 변수 설정
`.env` 파일 생성 (`.env.example` 참고):

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

`.env` 파일 수정:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/fmea_db?schema=public"
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### 4️⃣ 데이터베이스 설정

#### PostgreSQL 설치 확인
```bash
# PostgreSQL 버전 확인
psql --version
```

PostgreSQL이 없다면:
- **Windows**: https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql@14`
- **Linux**: `sudo apt-get install postgresql-14`

#### 데이터베이스 생성
```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE fmea_db;

# 종료
\q
```

#### Prisma 설정
```bash
# Prisma Client 생성
npx prisma generate

# 마이그레이션 실행 (데이터베이스 스키마 생성)
npx prisma migrate dev
```

### 5️⃣ 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 📦 필수 의존성 라이브러리

### 런타임 의존성 (자동 설치됨)
```json
{
  "@prisma/client": "^7.2.0",
  "next": "16.1.1",
  "react": "19.2.3",
  "pg": "^8.16.3",
  "prisma": "^7.2.0",
  "xlsx": "^0.18.5",
  "date-fns": "^4.1.0",
  "bcryptjs": "^3.0.3"
}
```

### 개발 의존성 (자동 설치됨)
```json
{
  "@playwright/test": "^1.57.0",
  "typescript": "^5",
  "tailwindcss": "^4",
  "vitest": "^4.0.17"
}
```

## 🗄️ 데이터베이스 마이그레이션

### 현재 마이그레이션 상태 확인
```bash
npx prisma migrate status
```

### 새 마이그레이션 생성
```bash
npx prisma migrate dev --name your_migration_name
```

### 마이그레이션 초기화 (주의: 데이터 손실)
```bash
npx prisma migrate reset
```

### Prisma Studio로 데이터 확인
```bash
npm run db:studio
```

## 🔧 자주 발생하는 문제 해결

### ❌ "Prisma Client is not generated"
```bash
npx prisma generate
```

### ❌ "Can't reach database server"
1. PostgreSQL 서비스 실행 확인
   ```bash
   # Windows
   services.msc → PostgreSQL 서비스 확인
   
   # Linux/Mac
   sudo service postgresql status
   ```

2. `.env` 파일의 `DATABASE_URL` 확인
3. 방화벽 설정 확인 (5432 포트)

### ❌ "Port 3000 is already in use"
```bash
# 다른 포트로 실행
npm run dev:4000

# 또는 포트 사용 중인 프로세스 종료 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### ❌ "Module not found" 에러
```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### ❌ Playwright 브라우저 없음
```bash
npx playwright install
```

## 📋 사용 가능한 npm 스크립트

### 개발
```bash
npm run dev          # 개발 서버 (포트 3000)
npm run dev:4000     # 개발 서버 (포트 4000)
npm run dev:5000     # 개발 서버 (포트 5000)
```

### 빌드 & 실행
```bash
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run start:4000   # 프로덕션 서버 (포트 4000)
```

### 데이터베이스
```bash
npm run db:studio    # Prisma Studio 실행
npm run db:generate  # Prisma Client 생성
npm run db:migrate   # 마이그레이션 실행
npm run db:push      # 스키마 푸시 (마이그레이션 없이)
```

### 테스트
```bash
npm run test         # Vitest 실행 (watch 모드)
npm run test:run     # Vitest 실행 (단일 실행)
npx playwright test  # E2E 테스트 실행
```

### Docker
```bash
npm run docker:build # Docker 이미지 빌드
npm run docker:up    # Docker 컨테이너 시작
npm run docker:down  # Docker 컨테이너 중지
npm run docker:logs  # Docker 로그 확인
```

## 🔐 보안 체크리스트

- [ ] `.env` 파일을 절대 커밋하지 않기
- [ ] `DATABASE_URL`에 실제 비밀번호 사용하지 않기 (개발 환경)
- [ ] `.gitignore`에 민감한 파일 포함 확인
- [ ] 프로덕션 환경에서 강력한 비밀번호 사용

## 📚 추가 문서

- [상세 설정 가이드](./SETUP_GUIDE.md)
- [테스트 결과 보고서](./tests/WS_TEST_REPORT.md)
- [API 문서](./docs/API.md) (있는 경우)

## 🆘 도움이 필요하신가요?

1. **문서 확인**: `SETUP_GUIDE.md` 참고
2. **이슈 검색**: GitHub Issues에서 유사한 문제 검색
3. **새 이슈 생성**: 문제 재현 단계와 함께 이슈 등록

---

**마지막 업데이트**: 2026-02-01
**프로젝트 버전**: 0.1.0
