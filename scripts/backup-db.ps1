# PostgreSQL DB 백업 스크립트
# 사용법: .\backup-db.ps1 [FMEA_ID]
# FMEA_ID가 지정되면 해당 프로젝트만 백업, 없으면 전체 DB 백업

param(
    [string]$FmeaId = "",
    [string]$BackupDir = ".\backups\db"
)

$ErrorActionPreference = "Stop"

# PostgreSQL 연결 정보
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "fmea_db"
$DB_USER = "postgres"
# $DB_PASSWORD는 환경변수 또는 pgpass 파일 사용

# 타임스탬프 생성
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# 백업 디렉토리 생성
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✅ 백업 디렉토리 생성: $BackupDir" -ForegroundColor Green
}

try {
    if ($FmeaId) {
        # 특정 FMEA 프로젝트만 백업
        Write-Host "`n=== $FmeaId 프로젝트 백업 시작 ===" -ForegroundColor Cyan
        
        $backupFile = Join-Path $BackupDir "fmea_${FmeaId}_${timestamp}.sql"
        
        # pg_dump 실행 (특정 FMEA 데이터만 추출하는 쿼리)
        # 주의: pg_dump는 특정 행만 덤프할 수 없으므로, 전체 덤프 후 필터링 필요
        # 대신 Node.js 스크립트로 특정 FMEA만 백업하는 것이 더 효율적
        
        Write-Host "⚠️  특정 프로젝트 백업은 Node.js 스크립트(backup-db.js) 사용 권장" -ForegroundColor Yellow
        Write-Host "전체 DB 백업을 진행합니다..." -ForegroundColor Yellow
        
        $backupFile = Join-Path $BackupDir "fmea_db_full_${timestamp}.sql"
    } else {
        # 전체 DB 백업
        Write-Host "`n=== 전체 DB 백업 시작 ===" -ForegroundColor Cyan
        
        $backupFile = Join-Path $BackupDir "fmea_db_full_${timestamp}.sql"
    }
    
    Write-Host "백업 파일: $backupFile" -ForegroundColor Gray
    
    # pg_dump 실행 (커스텀 포맷)
    $env:PGPASSWORD = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { "postgres" }
    
    & pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME `
        --format=custom `
        --file="$backupFile" `
        --verbose 2>&1 | Tee-Object -Variable dumpOutput
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "`n✅ 백업 완료!" -ForegroundColor Green
        Write-Host "파일: $backupFile" -ForegroundColor Gray
        Write-Host "크기: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
        
        # 백업 로그 작성
        $logFile = Join-Path $BackupDir "backup.log"
        $logEntry = "$timestamp | $backupFile | $([math]::Round($fileSize, 2)) MB | $FmeaId"
        Add-Content -Path $logFile -Value $logEntry
        
        Write-Host "`n✅ 백업 로그: $logFile" -ForegroundColor Green
    } else {
        Write-Host "`n❌ 백업 실패 (exit code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host $dumpOutput -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n❌ 오류 발생: $_" -ForegroundColor Red
    exit 1
}










