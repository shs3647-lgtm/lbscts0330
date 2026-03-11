#!/bin/bash
# 데이터베이스 백업 스크립트

set -e

# 환경 변수
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-fmea_db}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# 타임스탬프
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/fmea_backup_${TIMESTAMP}.sql.gz"

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 백업 디렉토리 생성
mkdir -p ${BACKUP_DIR}

# 데이터베이스 백업
log "데이터베이스 백업 시작: ${DB_NAME}"

PGPASSWORD=${POSTGRES_PASSWORD} pg_dump \
    -h ${DB_HOST} \
    -p ${DB_PORT} \
    -U ${DB_USER} \
    -d ${DB_NAME} \
    --verbose \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    log "백업 완료: ${BACKUP_FILE}"

    # 파일 크기 확인
    SIZE=$(ls -lh ${BACKUP_FILE} | awk '{print $5}')
    log "백업 파일 크기: ${SIZE}"

    # 체크섬 생성
    sha256sum ${BACKUP_FILE} > ${BACKUP_FILE}.sha256
    log "체크섬 파일 생성: ${BACKUP_FILE}.sha256"
else
    log "백업 실패!"
    exit 1
fi

# 오래된 백업 삭제
log "오래된 백업 파일 정리 (${RETENTION_DAYS}일 이상)"
find ${BACKUP_DIR} -name "fmea_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -exec rm -f {} \;
find ${BACKUP_DIR} -name "fmea_backup_*.sql.gz.sha256" -type f -mtime +${RETENTION_DAYS} -exec rm -f {} \;

# 백업 목록 출력
log "현재 백업 파일 목록:"
ls -lah ${BACKUP_DIR}/fmea_backup_*.sql.gz 2>/dev/null || echo "백업 파일이 없습니다."

log "백업 작업 완료"