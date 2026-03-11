# 🚀 빠른 배포 가이드 (새 노트북)

## 5분 안에 시작하기

### 1단계: 필수 설치 (최초 1회)
```bash
# Git + Docker Desktop + Node.js 설치
# Windows: https://git-scm.com/, https://www.docker.com/
# Mac: brew install git docker node
```

### 2단계: 프로젝트 클론
```bash
git clone https://github.com/shs3647-lgtm/SDD_FMEA.git fmea-onpremise
cd fmea-onpremise
```

### 3단계: 환경 설정
```bash
# .env 파일 생성
cp .env.production .env

# .env 파일 열어서 비밀번호 설정
# 최소한 이것만 변경:
# - DB_PASSWORD=your_password
# - JWT_SECRET=32자_이상_랜덤_문자열
```

### 4단계: Docker 실행
```bash
# 전체 빌드 및 시작
docker-compose build
docker-compose up -d postgres redis
sleep 10
docker-compose --profile tools run --rm migrate
docker-compose up -d app
```

### 5단계: 확인
```bash
# 브라우저에서 열기
# http://localhost:3001

# 또는 터미널에서 확인
curl http://localhost:3001/api/health
```

---

## 📋 한 줄 명령어 (Windows PowerShell)

```powershell
git clone https://github.com/shs3647-lgtm/SDD_FMEA.git fmea-onpremise; cd fmea-onpremise; cp .env.production .env; Write-Host "⚠️ .env 파일을 수정하세요!" -ForegroundColor Yellow; docker-compose build; docker-compose up -d postgres redis; Start-Sleep 10; docker-compose --profile tools run --rm migrate; docker-compose up -d app; docker-compose ps
```

**⚠️ 중간에 .env 파일 수정 필요!**

---

## 🔄 일상 사용법

### 로컬 개발 (빠름)
```bash
npm install        # 최초 1회
npm run dev        # 매일 사용
# → http://localhost:3000
```

### Docker 확인 (배포 전)
```bash
.\docker-update.ps1    # Windows
./docker-update.sh     # Mac/Linux
# → http://localhost:3001
```

### Git 동기화
```bash
# 변경사항 저장
git add -A
git commit -m "작업 내용"
git push

# 다른 노트북에서 가져오기
git pull
```

---

## ⚡ 자주 사용하는 명령어

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 보기
docker-compose logs -f app

# 재시작
docker-compose restart app

# 전체 중지
docker-compose down

# 전체 재시작
docker-compose up -d
```

---

## 🐛 문제 해결

### Docker Desktop이 안 켜져요
→ 재부팅 또는 Docker Desktop 재설치

### 포트가 이미 사용 중이에요
→ .env에서 `APP_PORT=3002`로 변경

### 빌드가 실패해요
→ `docker builder prune -f` 후 재시도

### 상세 가이드
→ [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)

---

**총 소요 시간**: 5-10분 (빌드 시간 포함)
