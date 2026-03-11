#!/bin/bash
# 데이터베이스 복원 스크립트

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

# 환경 변수
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-fmea_db}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR=${BACKUP_DIR:-/backups}

# 백업 파일 선택
select_backup_file() {
    log_info "사용 가능한 백업 파일:"

    # 백업 파일 목록
    BACKUP_FILES=($(ls -1 ${BACKUP_DIR}/fmea_backup_*.sql.gz 2>/dev/null))

    if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
        log_error "백업 파일이 없습니다."
        exit 1
    fi

    # 백업 파일 리스트 출력
    for i in "${!BACKUP_FILES[@]}"; do
        FILE=${BACKUP_FILES[$i]}
        SIZE=$(ls -lh ${FILE} | awk '{print $5}')
        DATE=$(stat -c %y ${FILE} | cut -d' ' -f1,2)
        echo "  $((i+1)). $(basename ${FILE}) (${SIZE}, ${DATE})"
    done

    # 사용자 선택
    echo ""
    read -p "복원할 백업 파일 번호를 선택하세요 (1-${#BACKUP_FILES[@]}): " CHOICE

    if [[ ! "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt ${#BACKUP_FILES[@]} ]; then
        log_error "잘못된 선택입니다."
        exit 1
    fi

    SELECTED_BACKUP=${BACKUP_FILES[$((CHOICE-1))]}
    log_info "선택된 백업 파일: $(basename ${SELECTED_BACKUP})"
}

# 체크섬 검증
verify_checksum() {
    if [ -f "${SELECTED_BACKUP}.sha256" ]; then
        log_info "체크섬 검증 중..."

        if sha256sum -c "${SELECTED_BACKUP}.sha256" > /dev/null 2>&1; then
            log_info "체크섬 검증 성공"
        else
            log_error "체크섬 검증 실패! 백업 파일이 손상되었을 수 있습니다."
            exit 1
        fi
    else
        log_warn "체크섬 파일이 없습니다. 검증을 건너뜁니다."
    fi
}

# 현재 데이터베이스 백업
backup_current() {
    log_info "현재 데이터베이스를 백업 중..."

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    CURRENT_BACKUP="${BACKUP_DIR}/fmea_before_restore_${TIMESTAMP}.sql.gz"

    PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
        -h ${DB_HOST} \
        -p ${DB_PORT} \
        -U ${DB_USER} \
        -d ${DB_NAME} \
        --no-owner \
        --no-acl \
        | gzip > ${CURRENT_BACKUP}

    log_info "현재 상태 백업 완료: $(basename ${CURRENT_BACKUP})"
}

# 데이터베이스 복원
restore_database() {
    log_info "데이터베이스 복원 시작..."

    # 압축 해제 및 복원
    gunzip -c ${SELECTED_BACKUP} | PGPASSWORD=${POSTGRES_PASSWORD} psql \
        -h ${DB_HOST} \
        -p ${DB_PORT} \
        -U ${DB_USER} \
        -d ${DB_NAME} \
        -v ON_ERROR_STOP=1

    if [ $? -eq 0 ]; then
        log_info "데이터베이스 복원 완료"
    else
        log_error "데이터베이스 복원 실패!"

        # 복원 실패 시 롤백 옵션 제공
        read -p "이전 상태로 롤백하시겠습니까? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "롤백 중..."
            gunzip -c ${CURRENT_BACKUP} | PGPASSWORD=${POSTGRES_PASSWORD} psql \
                -h ${DB_HOST} \
                -p ${DB_PORT} \
                -U ${DB_USER} \
                -d ${DB_NAME}
            log_info "롤백 완료"
        fi
        exit 1
    fi
}

# 복원 후 작업
post_restore() {
    log_info "복원 후 작업 실행 중..."

    # Prisma 클라이언트 재생성
    log_info "Prisma 클라이언트 재생성..."
    cd /app && npx prisma generate

    # 캐시 초기화
    log_info "Redis 캐시 초기화..."
    redis-cli -h redis -a ${REDIS_PASSWORD} FLUSHALL

    log_info "복원 후 작업 완료"
}

# 메인 실행
main() {
    echo "================================"
    echo "FMEA 데이터베이스 복원"
    echo "================================"

    # 백업 파일 선택
    select_backup_file

    # 체크섬 검증
    verify_checksum

    # 경고 메시지
    log_warn "주의: 데이터베이스 복원은 현재 데이터를 모두 삭제합니다!"
    read -p "계속하시겠습니까? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        log_info "복원이 취소되었습니다."
        exit 0
    fi

    # 현재 데이터베이스 백업
    backup_current

    # 데이터베이스 복원
    restore_database

    # 복원 후 작업
    post_restore

    log_info "복원이 성공적으로 완료되었습니다!"
    log_warn "애플리케이션을 재시작해주세요: docker-compose restart app"
}

# 스크립트 실행
main "$@"