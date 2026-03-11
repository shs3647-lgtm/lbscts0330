# 🐳 FMEA 시스템 Docker 빠른 시작 가이드

## 📋 사전 요구사항
- Docker 20.10 이상
- Docker Compose 2.0 이상
- 8GB 이상의 여유 메모리
- 10GB 이상의 여유 디스크 공간

## 🚀 빠른 배포 (5분 소요)

### 1️⃣ 환경 설정 파일 준비
```bash
# .env 파일 생성 (샘플 복사)
cp .env.docker .env

# 필수 설정 수정
nano .env
```

**최소 필수 설정:**
- `DB_PASSWORD`: 데이터베이스 비밀번호 변경
- `REDIS_PASSWORD`: Redis 비밀번호 변경
- `SMTP_*`: 이메일 발송 설정 (선택사항)

### 2️⃣ Docker 이미지 빌드 및 실행
```bash
# 이미지 빌드
docker-compose build

# 컨테이너 시작
docker-compose up -d

# 데이터베이스 마이그레이션
docker-compose exec app npx prisma migrate deploy
```

### 3️⃣ 접속 확인
- 애플리케이션: http://localhost:3000
- 기본 관리자: `admin@fmea.local` / `admin123!@#`

⚠️ **중요**: 첫 로그인 후 즉시 비밀번호를 변경하세요!

## 📝 자주 사용하는 명령어

### 서비스 관리
```bash
# 시작
docker-compose up -d

# 종료
docker-compose down

# 재시작
docker-compose restart

# 로그 확인
docker-compose logs -f app
```

### 데이터베이스 관리
```bash
# 백업
docker-compose exec backup /scripts/backup.sh

# 복원
docker-compose exec backup /scripts/restore.sh

# Prisma Studio 실행 (DB 관리 GUI)
docker-compose exec app npx prisma studio
```

### 문제 해결
```bash
# 전체 재설정 (주의: 데이터 삭제)
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# 헬스체크
curl http://localhost:3000/api/health

# 컨테이너 상태
docker-compose ps
```

## 🔒 프로덕션 체크리스트

### 필수 보안 설정
- [ ] 관리자 비밀번호 변경
- [ ] .env 파일의 모든 시크릿 키 변경
- [ ] HTTPS 설정 (SSL 인증서)
- [ ] 방화벽 규칙 설정

### 권장 설정
- [ ] 자동 백업 스케줄 설정
- [ ] 모니터링 도구 연동
- [ ] 로그 수집 설정
- [ ] 리소스 제한 설정

## 🆘 도움말

### 포트 충돌 시
```bash
# .env 파일에서 포트 변경
APP_PORT=3001
DB_PORT=5433
REDIS_PORT=6380
```

### 메모리 부족 시
Docker Desktop 설정에서 메모리 할당 증가:
- Windows/Mac: Docker Desktop > Settings > Resources
- 최소 4GB, 권장 8GB 이상

### SMTP 설정 예시
```env
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # 앱 비밀번호 사용

# 네이버
SMTP_HOST=smtp.naver.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-id
SMTP_PASS=your-password
```

## 📚 추가 문서
- [상세 배포 가이드](./docs/도커로컬배포.md)
- [환경 설정 참조](./.env.docker)
- [프로덕션 설정](./.env.production)

## 🔧 기술 지원
문제가 발생하면 다음을 확인하세요:
1. `docker-compose logs -f` 로그 확인
2. `/api/health` 엔드포인트 상태
3. 데이터베이스 연결 상태
4. 디스크 공간 및 메모리 여유

---

**Version**: 1.0.0 | **Last Updated**: 2024-01-23