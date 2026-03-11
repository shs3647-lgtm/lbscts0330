# 🖥️ 로컬 노트북 온프레미스 개발 환경 구축 가이드

> **목적**: 로컬 노트북에서 FMEA 온프레미스 개발 환경을 구축하고 개발하기
> **작성일**: 2026-01-11
> **상태**: ✅ 개발 환경 구축 완료

---

## 📋 필수 요구사항

### 1. 소프트웨어 설치

#### Node.js 설치
- **버전**: v18 이상 권장 (v20+ 최적)
- **다운로드**: https://nodejs.org/
- **확인**: 
  ```bash
  node --version
  npm --version
  ```

#### PostgreSQL 설치
**옵션 1: 로컬 설치 (권장)**
- **Windows**: https://www.postgresql.org/download/windows/
- **설치 후 확인**:
  ```bash
  psql --version
  ```

**옵션 2: Docker 사용**
- **Docker Desktop 설치**: https://www.docker.com/products/docker-desktop
- **PostgreSQL 컨테이너 실행**:
  ```bash
  docker run --name fmea-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fmea_db -p 5432:5432 -d postgres:15
  ```

**옵션 3: 원격 DB 연결**
- 기존 온프레미스 서버의 PostgreSQL 연결 정보 필요

#### Git 설치
- **다운로드**: https://git-scm.com/downloads
- **확인**: `git --version`

---

## 🚀 빠른 시작 (Quick Start)

### 1단계: 프로젝트 클론 (이미 있으면 생략)

```bash
# 프로젝트 디렉토리로 이동
cd C:\01_new_sdd\fmea-onpremise
```

### 2단계: 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력:

```bash
# .env 파일 생성
# Windows PowerShell
New-Item -Path .env -ItemType File

# 또는 수동으로 생성
```

`.env` 파일 내용:
```env
# PostgreSQL 데이터베이스 연결
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fmea_db"

# 개발 서버 포트 (선택사항, 기본값: 3000)
PORT=3000

# Node.js 환경
NODE_ENV=development
```

**원격 DB 사용 시**:
```env
DATABASE_URL="postgresql://username:password@remote-server:5432/fmea_db"
```

### 3단계: 의존성 설치

```bash
npm install
```

### 4단계: 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 또는 기존 DB 스키마 적용
npx prisma db push
```

### 5단계: 개발 서버 실행

```bash
# 기본 포트(3000)로 실행
npm run dev

# 또는 다른 포트로 실행
npm run dev:4000

# 또는 환경변수로 포트 지정
# Windows PowerShell
$env:PORT=4000; npm run dev
```

### 6단계: 브라우저에서 접속

```
http://localhost:3000/pfmea/register
```

---

## ⚙️ 고급 설정

### 포트 변경 방법

**방법 1: package.json 스크립트 사용**
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:4000": "next dev -p 4000",
    "dev:5000": "next dev -p 5000"
  }
}
```

**방법 2: 명령줄 옵션**
```bash
npm run dev -- -p 4000
```

**방법 3: 환경변수**
```bash
# Windows PowerShell
$env:PORT=4000; npm run dev

# Windows CMD
set PORT=4000 && npm run dev

# Linux/Mac
PORT=4000 npm run dev
```

### PostgreSQL 로컬 설치 설정

1. **PostgreSQL 설치 후 초기 설정**:
   ```bash
   # Windows에서 psql 접속
   psql -U postgres
   ```

2. **데이터베이스 생성**:
   ```sql
   CREATE DATABASE fmea_db;
   \q
   ```

3. **.env 파일 설정**:
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/fmea_db"
   ```

### Docker로 PostgreSQL 실행

```bash
# PostgreSQL 컨테이너 실행
docker run --name fmea-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fmea_db \
  -p 5432:5432 \
  -d postgres:15

# 컨테이너 상태 확인
docker ps

# 컨테이너 중지
docker stop fmea-postgres

# 컨테이너 재시작
docker start fmea-postgres
```

---

## 🔧 개발 스크립트

### 사용 가능한 명령어

```bash
# 개발 서버 실행 (포트 3000)
npm run dev

# 개발 서버 실행 (포트 4000)
npm run dev:4000

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 코드 린트
npm run lint

# Prisma 스튜디오 (DB 뷰어)
npx prisma studio

# Prisma 마이그레이션
npx prisma migrate dev

# Prisma 클라이언트 재생성
npx prisma generate
```

---

## 📁 프로젝트 구조

```
fmea-onpremise/
├── .env                    # 환경 변수 (로컬에 생성)
├── .env.example           # 환경 변수 템플릿
├── package.json           # 프로젝트 설정
├── prisma/
│   └── schema.prisma      # 데이터베이스 스키마
├── src/
│   ├── app/              # Next.js 앱 라우터
│   ├── components/       # React 컴포넌트
│   ├── lib/              # 공용 라이브러리
│   └── types/            # TypeScript 타입
├── docs/                 # 문서
└── scripts/              # 유틸리티 스크립트
```

---

## 🐛 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# Windows: 포트 사용 프로세스 확인
netstat -ano | findstr :3000

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F

# 또는 다른 포트 사용
npm run dev:4000
```

### 데이터베이스 연결 실패

1. **PostgreSQL 서비스 실행 확인**:
   ```bash
   # Windows 서비스 확인
   services.msc
   # 또는
   sc query postgresql-x64-15
   ```

2. **연결 정보 확인**:
   - `.env` 파일의 `DATABASE_URL` 확인
   - 사용자명, 비밀번호, 호스트, 포트 확인

3. **방화벽 확인**:
   - 로컬 DB: 방화벽 문제 없음
   - 원격 DB: 5432 포트 허용 필요

### Prisma 마이그레이션 오류

```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 마이그레이션 재시도
npx prisma migrate dev --name init

# 또는 DB 스키마 강제 적용 (주의: 데이터 손실 가능)
npx prisma db push
```

### 의존성 설치 오류

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 또는 캐시 클리어
npm cache clean --force
npm install
```

---

## ✅ 개발 환경 체크리스트

- [ ] Node.js v18+ 설치 완료
- [ ] PostgreSQL 설치/설정 완료
- [ ] Git 설치 완료
- [ ] `.env` 파일 생성 및 설정
- [ ] `npm install` 완료
- [ ] `npx prisma generate` 완료
- [ ] `npx prisma migrate dev` 완료
- [ ] `npm run dev` 성공
- [ ] 브라우저에서 `http://localhost:3000` 접속 확인
- [ ] FMEA 등록 화면 접속 확인 (`/pfmea/register`)

---

## 📚 추가 리소스

### 관련 문서
- [FMEA 작성 순서](./중요_ONPREMISE_MASTER_PLAN.md)
- [DB 백업 가이드](./DB_BACKUP_GUIDE.md)
- [모듈화 가이드](./MODULARIZATION_GUIDE.md)

### 유용한 링크
- Next.js 공식 문서: https://nextjs.org/docs
- Prisma 공식 문서: https://www.prisma.io/docs
- PostgreSQL 공식 문서: https://www.postgresql.org/docs/

---

## 🎯 다음 단계

환경 구축 완료 후:

1. **FMEA 새로 작성 시작**:
   - `http://localhost:3000/pfmea/register` 접속
   - FMEA 등록 → 기초정보 → CFT → 리스트 → 작성화면

2. **개발 시작**:
   - 코드 수정 시 자동 리로드 (Hot Reload)
   - 브라우저 콘솔에서 에러 확인 (F12)

3. **DB 확인**:
   - Prisma Studio: `npx prisma studio`
   - DB 뷰어: `http://localhost:3000/admin/db-viewer`

---

## 📅 최종 업데이트
- 날짜: 2026-01-11
- 작성자: AI Assistant
- 상태: ✅ 로컬 개발 환경 구축 가이드 완성









