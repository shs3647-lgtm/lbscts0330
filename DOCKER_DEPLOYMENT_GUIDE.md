# Docker를 이용한 다른 환경 배포 가이드

## 📋 목차

1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [새 노트북에 배포하기](#새-노트북에-배포하기)
4. [데이터 마이그레이션](#데이터-마이그레이션)
5. [개발 환경 전환](#개발-환경-전환)

---

## 개요

### 시나리오
- **현재 노트북 A**: 개발 중인 환경
- **새 노트북 B**: 배포하려는 환경

### Docker의 장점
✅ 코드 + 설정만 복사하면 됨
✅ 데이터베이스, Redis 등 자동 설치
✅ 개발 환경 일관성 보장
✅ 간단한 명령어로 실행

---

## 사전 준비

### 노트북 A (현재 환경)

#### 1. Git 커밋 및 푸시
```bash
# 모든 변경사항 커밋
git add -A
git commit -m "feat: 개발 완료, 노트북 B로 이동 준비"
git push origin main  # 또는 feature 브랜치
```

#### 2. 데이터 백업 (선택사항)
**데이터를 옮기려면**:
```bash
# PostgreSQL 데이터 덤프
docker exec fmea-postgres pg_dump -U postgres fmea_db > fmea_backup_$(date +%Y%m%d).sql

# 또는 로컬 PostgreSQL에서
pg_dump -U postgres fmea_db > fmea_backup_$(date +%Y%m%d).sql
```

#### 3. 환경 변수 백업
```bash
# .env 파일 복사 (비밀번호 등 포함)
# 안전하게 보관 (USB, 암호화된 클라우드)
cp .env .env.backup
```

---

## 새 노트북에 배포하기

### 노트북 B (새 환경)

### Step 1: 필수 소프트웨어 설치

#### Windows
```powershell
# 1. Git 설치
winget install Git.Git

# 2. Docker Desktop 설치
winget install Docker.DockerDesktop
# 또는 https://www.docker.com/products/docker-desktop/

# 3. Node.js 설치 (로컬 개발용)
winget install OpenJS.NodeJS.LTS

# 4. 재부팅 (Docker Desktop 설치 후)
Restart-Computer
```

#### Mac
```bash
# 1. Homebrew 설치 (없으면)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Git, Docker, Node.js 설치
brew install git
brew install --cask docker
brew install node

# Docker Desktop 실행
open /Applications/Docker.app
```

#### Linux (Ubuntu)
```bash
# 1. Git 설치
sudo apt update
sudo apt install -y git

# 2. Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Docker Compose 설치
sudo apt install -y docker-compose-plugin

# 4. Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 재로그인
newgrp docker
```

---

### Step 2: 프로젝트 클론

```bash
# 1. 적절한 위치로 이동
cd C:\Projects  # Windows
# cd ~/Projects  # Mac/Linux

# 2. 저장소 클론
git clone https://github.com/shs3647-lgtm/SDD_FMEA.git fmea-onpremise
cd fmea-onpremise

# 3. 브랜치 전환 (필요시)
git checkout feature/pfd-cp-pfmea-linkage
```

---

### Step 3: 환경 설정

```bash
# 1. .env 파일 생성
cp .env.production .env

# 2. .env 파일 수정 (중요!)
# - 노트북 A에서 백업한 .env 내용 복사 (권장)
# - 또는 새로 설정
```

**.env 필수 설정 항목**:
```env
# 데이터베이스
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/fmea_db"
DB_PASSWORD=your_password

# Redis
REDIS_PASSWORD=your_redis_password

# 인증
JWT_SECRET=your_jwt_secret_key_min_32_chars
SESSION_SECRET=your_session_secret_key

# 포트 (다른 서비스와 충돌 시 변경)
APP_PORT=3001
DB_PORT=5432
REDIS_PORT=6379
```

---

### Step 4: Docker 빌드 및 실행

```bash
# 1. Docker Desktop 실행 확인
docker --version
docker-compose --version

# 2. 이미지 빌드
docker-compose build

# 3. 데이터베이스 서비스만 먼저 시작
docker-compose up -d postgres redis

# 4. 10초 대기
# Windows PowerShell
Start-Sleep -Seconds 10
# Mac/Linux
sleep 10

# 5. 마이그레이션 실행 (테이블 생성)
docker-compose --profile tools run --rm migrate

# 6. 앱 시작
docker-compose up -d app

# 7. 상태 확인
docker-compose ps
curl http://localhost:3001/api/health
```

---

### Step 5: 데이터 복원 (선택사항)

**노트북 A에서 백업한 데이터가 있으면**:

```bash
# 1. 백업 파일을 노트북 B로 복사

# 2. Docker PostgreSQL에 복원
cat fmea_backup_20260130.sql | docker exec -i fmea-postgres psql -U postgres -d fmea_db

# Windows PowerShell
Get-Content fmea_backup_20260130.sql | docker exec -i fmea-postgres psql -U postgres -d fmea_db

# 3. 복원 확인
docker exec fmea-postgres psql -U postgres -d fmea_db -c "\dt" | head -20
```

---

### Step 6: 브라우저에서 확인

```
http://localhost:3001
```

✅ 로그인 화면이 보이면 성공!

---

## 개발 환경 전환

### 로컬 개발 환경도 설정하려면

#### 1. 로컬 PostgreSQL 설치 (선택사항)

**Windows**:
```powershell
# PostgreSQL 15 설치
winget install PostgreSQL.PostgreSQL.15

# 또는 Docker 사용 (권장)
# Docker로 PostgreSQL만 실행하고 앱은 로컬에서 npm run dev
```

**이미 Docker로 PostgreSQL 실행 중이면**:
```bash
# 그냥 npm run dev 하면 Docker PostgreSQL 사용 가능
# DATABASE_URL이 localhost:5432를 가리키면 됨
npm run dev
# → http://localhost:3000
```

#### 2. 의존성 설치

```bash
# 1. Node.js 패키지 설치
npm install

# 2. Prisma Client 생성
npx prisma generate

# 3. 로컬 개발 서버 실행
npm run dev
```

#### 3. 로컬 환경 확인

```
http://localhost:3000  # 로컬 개발 서버
http://localhost:3001  # Docker 환경
```

---

## 빠른 참조 가이드

### 새 노트북 초기 설정 (5단계)

```bash
# 1. 저장소 클론
git clone https://github.com/shs3647-lgtm/SDD_FMEA.git fmea-onpremise
cd fmea-onpremise

# 2. 환경 설정
cp .env.production .env
# .env 파일 수정 (비밀번호 등)

# 3. Docker 빌드
docker-compose build

# 4. 순차 실행
docker-compose up -d postgres redis
sleep 10
docker-compose --profile tools run --rm migrate
docker-compose up -d app

# 5. 확인
curl http://localhost:3001/api/health
```

**소요 시간**: 약 5-10분 (빌드 시간 포함)

---

## 일상 개발 워크플로우 (노트북 B)

### 로컬 개발
```bash
npm run dev
# → http://localhost:3000
# Hot Reload, 빠른 개발
```

### Docker 확인 (배포 전)
```powershell
.\docker-update.ps1
# → http://localhost:3001
# 프로덕션 환경 테스트
```

### 커밋 및 푸시
```bash
git add -A
git commit -m "feat: 새 기능 추가"
git push origin feature/pfd-cp-pfmea-linkage
```

### 노트북 A로 다시 돌아갈 때
```bash
# 노트북 A에서
git pull origin feature/pfd-cp-pfmea-linkage

# Docker 업데이트
.\docker-update.ps1

# 또는 로컬 개발
npm run dev
```

---

## 트러블슈팅

### 문제 1: 포트 충돌

**증상**: 3001, 5432, 6379 포트가 이미 사용 중

**해결**:
```bash
# .env 파일에서 포트 변경
APP_PORT=3002
DB_PORT=5433
REDIS_PORT=6380

# docker-compose.yml에서도 확인
```

### 문제 2: Docker Desktop 미실행

**증상**: `Cannot connect to the Docker daemon`

**해결**:
- Docker Desktop 실행
- Windows: 시스템 트레이에서 Docker 아이콘 확인
- 5-10초 대기 후 재시도

### 문제 3: WSL2 오류 (Windows)

**증상**: `WSL 2 installation is incomplete`

**해결**:
```powershell
# 관리자 권한 PowerShell
wsl --install
wsl --set-default-version 2

# 재부팅
Restart-Computer
```

### 문제 4: 빌드 시간이 너무 오래 걸림

**해결**:
```bash
# Docker Desktop 설정
# Settings → Resources → Memory: 4GB 이상 할당
# Settings → Resources → CPUs: 2개 이상 할당
```

### 문제 5: 데이터베이스 연결 실패

**확인**:
```bash
# PostgreSQL 컨테이너 상태
docker-compose ps postgres

# 로그 확인
docker-compose logs postgres

# 연결 테스트
docker exec fmea-postgres pg_isready -U postgres
```

---

## 권장 폴더 구조

### Windows
```
C:\
├── Projects\
│   └── fmea-onpremise\
│       ├── .git\
│       ├── .env
│       ├── docker-compose.yml
│       └── ...
```

### Mac/Linux
```
~/
├── Projects/
│   └── fmea-onpremise/
│       ├── .git/
│       ├── .env
│       ├── docker-compose.yml
│       └── ...
```

---

## 데이터 동기화 전략

### Option A: Git만 사용 (권장)
- 코드만 동기화
- 각 노트북에서 독립적인 데이터베이스
- 테스트 데이터는 seed 스크립트로 생성

**장점**: 간단, 빠름
**단점**: 실제 데이터 없음

### Option B: 주기적 데이터 백업
- 주 1회 노트북 A에서 데이터 백업
- 노트북 B로 복원
- 주요 데이터만 동기화

**장점**: 실제 데이터로 테스트
**단점**: 수동 작업 필요

### Option C: 공유 데이터베이스
- 클라우드 PostgreSQL 사용 (AWS RDS, Supabase 등)
- 모든 노트북이 같은 DB 접근

**장점**: 완전 동기화
**단점**: 비용, 네트워크 필요

---

## 체크리스트

### 노트북 A (출발점)
- [ ] 모든 변경사항 커밋 및 푸시
- [ ] .env 파일 백업
- [ ] 데이터 백업 (필요시)
- [ ] 정상 작동 확인

### 노트북 B (목적지)
- [ ] Docker Desktop 설치
- [ ] Git 설치
- [ ] 저장소 클론
- [ ] .env 파일 설정
- [ ] Docker 빌드 및 실행
- [ ] 마이그레이션 실행
- [ ] 브라우저 확인 (http://localhost:3001)
- [ ] 로컬 개발 환경 설정 (npm install, npm run dev)

---

## 추가 자료

- [DOCKER_README.md](DOCKER_README.md) - Docker 기본 사용법
- [DOCKER_UPDATE_README.md](DOCKER_UPDATE_README.md) - 업데이트 스크립트
- [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - 트러블슈팅

---

## FAQ

### Q1: 노트북 A와 B에서 동시에 개발 가능한가요?
**A**: 네! Git으로 코드만 동기화하면 됩니다. 각각 독립적인 데이터베이스를 사용합니다.

### Q2: Docker 없이 로컬만 사용할 수 있나요?
**A**: 네! PostgreSQL, Redis를 로컬에 설치하고 `npm run dev`만 사용하면 됩니다.

### Q3: 데이터를 양쪽 노트북에서 동일하게 유지하려면?
**A**:
- 방법 1: 주기적으로 pg_dump/restore
- 방법 2: 클라우드 데이터베이스 사용
- 방법 3: seed 스크립트로 테스트 데이터 생성

### Q4: 빌드 시간을 단축할 수 있나요?
**A**:
- Docker 레이어 캐싱 활용 (자동)
- Docker Desktop 리소스 증가
- node_modules 볼륨 캐싱 (고급)

### Q5: 노트북 A를 더 이상 사용하지 않으면?
**A**: 노트북 B가 메인 개발 환경이 됩니다. Git만 계속 사용하면 됩니다.

---

**마지막 업데이트**: 2026-01-30
**버전**: 1.0.0
