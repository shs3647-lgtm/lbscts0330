# Docker 업데이트 스크립트 사용 가이드

## 📌 개요

로컬에서 개발 완료 후 Docker 환경을 업데이트하는 간편 스크립트입니다.

**언제 사용하나요?**
- 로컬 개발(`npm run dev`) 완료 후 배포 전 최종 확인
- 하루 1-2회 또는 주요 기능 개발 완료 시
- Docker 환경에서 실제 프로덕션과 유사한 환경 테스트

---

## 🚀 사용 방법

### Windows (PowerShell)
```powershell
.\docker-update.ps1
```

### Windows (CMD)
```cmd
docker-update.bat
```

### Linux / Mac / Git Bash
```bash
./docker-update.sh
```

---

## 📋 스크립트 동작 과정

### 1단계: 현재 상태 확인
- Docker 컨테이너 상태 출력
- 계속 여부 확인 (y/N)

### 2단계: 앱 이미지 재빌드
- `docker-compose build app` 실행
- 캐시 사용으로 빠른 빌드 (약 5-10초)

### 3단계: 스키마 변경 확인
- Prisma 스키마 변경 여부 질문
- "y" 입력 시 마이그레이션 자동 실행
- "N" 입력 시 건너뜀

### 4단계: 컨테이너 재시작
- `docker-compose up -d --force-recreate app` 실행
- 기존 컨테이너 제거 후 새 컨테이너 시작

### 5단계: Health Check
- 최대 30초 동안 앱 시작 대기
- `/api/health` 엔드포인트 자동 확인
- 실패 시 로그 자동 출력

### 6단계: 결과 리포트
- 소요 시간 출력
- Health check 상세 정보
- 컨테이너 상태 요약

---

## 📊 예제 실행

### 정상 케이스
```
========================================
🐳 FMEA Docker 업데이트
========================================

[1/5] 현재 Docker 상태 확인...
NAME            STATUS
fmea-app        Up (healthy)
fmea-postgres   Up (healthy)
fmea-redis      Up (healthy)

Docker 업데이트를 계속하시겠습니까? (y/N): y

[2/5] 앱 이미지 재빌드 중...
✓ Built in 8s

[3/5] 데이터베이스 스키마 변경 여부 확인...
Prisma 스키마가 변경되었습니까? (y/N): n
✓ 마이그레이션 건너뜀

[4/5] 앱 컨테이너 재시작 중...
✓ Container started

[5/5] 컨테이너 시작 대기 (최대 30초)...
..........
✓ 앱이 정상적으로 시작되었습니다!

========================================
✅ Docker 업데이트 완료!
========================================

📊 업데이트 정보:
  - 소요 시간: 23초
  - 앱 URL: http://localhost:3001

🏥 Health Check:
{
  "status": "healthy",
  "timestamp": "2026-01-30T14:30:00.000Z",
  "checks": {
    "app": "ok",
    "database": "ok",
    "memory": "ok"
  }
}

📋 컨테이너 상태:
NAME            STATUS
fmea-app        Up (healthy)
fmea-postgres   Up (healthy)
fmea-redis      Up (healthy)

💡 Tip: 로그 확인: docker-compose logs -f app
```

### 스키마 변경 케이스
```
[3/5] 데이터베이스 스키마 변경 여부 확인...
Prisma 스키마가 변경되었습니까? (y/N): y
마이그레이션 실행 중...

========================================
FMEA Database Migration Tool
========================================
✅ Database schema pushed successfully
```

---

## ⏱️ 소요 시간

| 상황 | 예상 시간 |
|------|----------|
| **일반 업데이트** (캐시 사용) | 10-15초 |
| **스키마 변경** (마이그레이션 포함) | 20-30초 |
| **대규모 변경** (캐시 무효화) | 40-60초 |

---

## 🔄 워크플로우 비교

### ❌ 이전 (수동)
```bash
# 1. 빌드
docker-compose build app

# 2. 재시작
docker-compose up -d --force-recreate app

# 3. 로그 확인
docker-compose logs app

# 4. Health check
curl http://localhost:3001/api/health

# 5. 상태 확인
docker-compose ps

# 총 소요: 5개 명령어, 수동 확인 필요
```

### ✅ 현재 (자동)
```powershell
.\docker-update.ps1

# 총 소요: 1개 명령어, 자동 확인
```

---

## 🐛 트러블슈팅

### 문제 1: 스크립트 실행 권한 오류 (Linux/Mac)

**증상**:
```
Permission denied: ./docker-update.sh
```

**해결**:
```bash
chmod +x docker-update.sh
./docker-update.sh
```

### 문제 2: PowerShell 실행 정책 오류

**증상**:
```
cannot be loaded because running scripts is disabled on this system
```

**해결**:
```powershell
# 현재 세션에서만 허용
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 또는 관리자 권한으로
Set-ExecutionPolicy RemoteSigned
```

### 문제 3: Health Check 실패

**증상**:
```
✗ Health check 실패
```

**확인 사항**:
1. 로그 출력 확인 (자동 표시됨)
2. PostgreSQL 연결 확인
3. 수동으로 재시작
   ```bash
   docker-compose restart app
   ```

### 문제 4: 빌드 실패

**해결**:
```bash
# 캐시 정리 후 재시도
docker builder prune -f
docker-compose build --no-cache app
```

---

## 💡 추가 팁

### 자동화 단축키 설정 (Windows)

**PowerShell 프로필에 alias 추가**:
```powershell
# $PROFILE 파일 열기
notepad $PROFILE

# 다음 내용 추가
function Update-Docker {
    Set-Location "C:\01_new_sdd\fmea-onpremise"
    .\docker-update.ps1
}
Set-Alias -Name du -Value Update-Docker

# 이제 어디서든 실행 가능
du
```

### Git Bash에서 alias 설정

**~/.bashrc 또는 ~/.bash_profile에 추가**:
```bash
alias docker-update='cd /c/01_new_sdd/fmea-onpremise && ./docker-update.sh'
```

### VS Code Task 등록

**.vscode/tasks.json**:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Docker Update",
      "type": "shell",
      "command": "${workspaceFolder}/docker-update.sh",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

실행: `Ctrl+Shift+P` → `Tasks: Run Task` → `Docker Update`

---

## 📚 관련 문서

- [DOCKER_README.md](DOCKER_README.md) - Docker 기본 사용 가이드
- [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - 트러블슈팅 가이드
- [docs/도커구성.md](docs/도커구성.md) - Docker 상세 구성

---

**마지막 업데이트**: 2026-01-30
**버전**: 1.0.0
