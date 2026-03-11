# FMEA Docker Build PowerShell Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FMEA Docker Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Docker 상태 확인
Write-Host "[1/6] Docker 상태 확인 중..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "[OK] Docker가 실행 중입니다." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker가 실행되지 않습니다." -ForegroundColor Red
    Write-Host "Docker Desktop을 시작한 후 다시 실행해주세요." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# 환경 파일 확인
Write-Host "[2/6] 환경 설정 파일 확인 중..." -ForegroundColor Yellow
if (!(Test-Path .env)) {
    Write-Host ".env 파일이 없습니다. .env.docker를 복사합니다..." -ForegroundColor Yellow
    Copy-Item .env.docker .env
    Write-Host "[INFO] .env 파일이 생성되었습니다." -ForegroundColor Cyan
    Write-Host "필요한 설정을 수정한 후 다시 실행해주세요." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] 환경 설정 파일이 존재합니다." -ForegroundColor Green
Write-Host ""

# 기존 컨테이너 정리 (선택사항)
Write-Host "[3/6] 기존 컨테이너 확인 중..." -ForegroundColor Yellow
$existingContainers = docker compose ps 2>$null
if ($?) {
    $cleanup = Read-Host "기존 컨테이너를 정리하시겠습니까? (y/n)"
    if ($cleanup -eq 'y' -or $cleanup -eq 'Y') {
        Write-Host "기존 컨테이너 정리 중..." -ForegroundColor Yellow
        docker compose down -v
    }
}
Write-Host ""

# Docker 이미지 빌드
Write-Host "[4/6] Docker 이미지 빌드 중..." -ForegroundColor Yellow
Write-Host "이 작업은 5-10분 정도 소요될 수 있습니다..." -ForegroundColor Cyan
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker 이미지 빌드 실패" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Docker 이미지 빌드 완료" -ForegroundColor Green
Write-Host ""

# 컨테이너 시작
Write-Host "[5/6] 컨테이너 시작 중..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] 컨테이너 시작 실패" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] 모든 컨테이너가 시작되었습니다." -ForegroundColor Green
Write-Host ""

# 헬스체크
Write-Host "[6/6] 서비스 상태 확인 중..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
docker compose ps
Write-Host ""

# 데이터베이스 마이그레이션
$migrate = Read-Host "데이터베이스 마이그레이션을 실행하시겠습니까? 첫 실행시 필수입니다 (y/n)"
if ($migrate -eq 'y' -or $migrate -eq 'Y') {
    Write-Host "마이그레이션 실행 중..." -ForegroundColor Yellow
    docker compose exec app npx prisma migrate deploy
    Write-Host "[OK] 마이그레이션 완료" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "배포가 완료되었습니다!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "애플리케이션 URL: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "관리자 계정: " -NoNewline
Write-Host "admin@fmea.local / admin123!@#" -ForegroundColor Cyan
Write-Host ""
Write-Host "로그 확인: " -NoNewline
Write-Host "docker compose logs -f" -ForegroundColor Yellow
Write-Host "종료: " -NoNewline
Write-Host "docker compose down" -ForegroundColor Yellow
Write-Host ""
Write-Host "[주의사항]" -ForegroundColor Red
Write-Host "1. 관리자 비밀번호를 즉시 변경하세요" -ForegroundColor Yellow
Write-Host "2. .env 파일의 시크릿 키들을 변경하세요" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"