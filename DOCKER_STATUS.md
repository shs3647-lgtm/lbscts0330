# 🐳 Docker 배포 현황

## 📅 작업 일자: 2026-01-23

## ✅ 완료된 작업

### 1. Docker 설정 파일 생성 완료
- ✅ `Dockerfile` - 멀티스테이지 빌드 구성
- ✅ `docker-compose.yml` - 서비스 오케스트레이션
- ✅ `.dockerignore` - 불필요 파일 제외
- ✅ `.env.docker` - 환경 변수 템플릿
- ✅ `.env` - 환경 변수 파일 생성

### 2. 데이터베이스 초기화 스크립트
- ✅ PostgreSQL 초기 설정
- ✅ 관리자 계정 자동 생성 스크립트

### 3. 배포 및 백업 스크립트
- ✅ `deploy.sh` - 자동 배포
- ✅ `backup.sh` - 자동 백업
- ✅ `restore.sh` - 백업 복원

### 4. Nginx 설정
- ✅ 리버스 프록시 구성
- ✅ 보안 헤더 설정
- ✅ Rate limiting 설정

### 5. 애플리케이션 설정
- ✅ Next.js standalone 모드 활성화
- ✅ 헬스체크 엔드포인트 구현
- ✅ Docker 관련 npm 스크립트 추가

## 🔄 진행 중

### Docker Desktop 시작 대기 중
- Docker Desktop이 실행되지 않아 빌드 대기 중
- 수동으로 Docker Desktop을 시작해주세요

## 📝 다음 단계

1. **Docker Desktop 실행**
   ```
   Windows 시작 메뉴 → Docker Desktop 실행
   또는
   작업 표시줄에서 Docker 아이콘 확인
   ```

2. **Docker 빌드 실행**
   ```bash
   cd fmea-onpremise
   docker compose build
   ```

3. **컨테이너 실행**
   ```bash
   docker compose up -d
   ```

4. **데이터베이스 마이그레이션**
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```

5. **서비스 확인**
   - http://localhost:3000 접속
   - 관리자 로그인: admin@fmea.local / admin123!@#

## ⚠️ 주의사항

1. **Docker Desktop 상태 확인**
   - 작업 표시줄에 Docker 고래 아이콘이 보이는지 확인
   - 아이콘이 정지 상태가 아닌 실행 중 상태인지 확인

2. **포트 충돌 확인**
   - 3000번 포트: Next.js 앱
   - 5432번 포트: PostgreSQL
   - 6379번 포트: Redis
   - 80번 포트: Nginx

3. **메모리 설정**
   - Docker Desktop Settings → Resources
   - Memory: 최소 4GB, 권장 8GB

## 🛠️ 문제 해결

### Docker Desktop이 시작되지 않을 때
1. Windows 기능에서 WSL2 활성화 확인
2. Hyper-V 활성화 확인
3. Docker Desktop 재설치

### 빌드 실패 시
```bash
# 캐시 정리 후 재빌드
docker system prune -a
docker compose build --no-cache
```

---

**상태**: Docker Desktop 시작 대기 중
**마지막 업데이트**: 2026-01-23 11:16 KST