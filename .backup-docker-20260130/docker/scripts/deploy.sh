#!/bin/bash
# FMEA 시스템 Docker 배포 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 파일 확인
check_env_file() {
    if [ ! -f .env ]; then
        log_warn ".env 파일이 없습니다. .env.docker를 복사합니다."
        cp .env.docker .env
        log_info ".env 파일이 생성되었습니다. 필요한 설정을 수정해주세요."
        exit 1
    fi
}

# Docker 설치 확인
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되어 있지 않습니다."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose가 설치되어 있지 않습니다."
        exit 1
    fi

    log_info "Docker 버전: $(docker --version)"
    log_info "Docker Compose 버전: $(docker-compose --version)"
}

# 기존 컨테이너 정리
cleanup_existing() {
    log_info "기존 컨테이너 정리 중..."
    docker-compose down --volumes --remove-orphans 2>/dev/null || true
}

# 이미지 빌드
build_images() {
    log_info "Docker 이미지 빌드 중..."
    docker-compose build --no-cache
}

# Prisma 마이그레이션 실행
run_migrations() {
    log_info "데이터베이스 마이그레이션 실행 중..."
    docker-compose run --rm app npx prisma migrate deploy
}

# 컨테이너 시작
start_containers() {
    log_info "컨테이너 시작 중..."
    docker-compose up -d

    # 헬스체크 대기
    log_info "서비스 준비 대기 중..."
    sleep 10

    # 서비스 상태 확인
    docker-compose ps
}

# 로그 확인
show_logs() {
    log_info "최근 로그:"
    docker-compose logs --tail=50
}

# 메인 실행
main() {
    echo "================================"
    echo "FMEA 시스템 Docker 배포 시작"
    echo "================================"

    check_env_file
    check_docker

    read -p "기존 데이터를 모두 삭제하고 새로 시작하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup_existing
    fi

    build_images
    start_containers
    run_migrations

    log_info "배포가 완료되었습니다!"
    log_info "애플리케이션 URL: http://localhost:3000"
    log_info "관리자 계정: admin@fmea.local / admin123!@#"

    echo ""
    log_warn "보안 주의사항:"
    log_warn "1. 관리자 비밀번호를 즉시 변경하세요"
    log_warn "2. .env 파일의 시크릿 키들을 변경하세요"
    log_warn "3. 방화벽 설정을 확인하세요"

    echo ""
    read -p "로그를 확인하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        show_logs
    fi
}

# 스크립트 실행
main "$@"