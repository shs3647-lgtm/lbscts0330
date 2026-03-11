##############################################################################
# Docker 업데이트 스크립트 (PowerShell)
#
# 용도: 로컬 개발 완료 후 Docker 환경 업데이트 (배포 전 최종 확인)
# 실행: .\docker-update.ps1
##############################################################################

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🐳 FMEA Docker 업데이트" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 시작 시간 기록
$StartTime = Get-Date

# 1. 현재 상태 확인
Write-Host "[1/5] 현재 Docker 상태 확인..." -ForegroundColor Blue
docker-compose ps
Write-Host ""

$Continue = Read-Host "Docker 업데이트를 계속하시겠습니까? (y/N)"
if ($Continue -ne "y" -and $Continue -ne "Y") {
    Write-Host "취소되었습니다." -ForegroundColor Yellow
    exit 0
}

# 2. 앱 이미지 재빌드
Write-Host ""
Write-Host "[2/5] 앱 이미지 재빌드 중..." -ForegroundColor Blue
docker-compose build app
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 빌드 실패" -ForegroundColor Red
    exit 1
}

# 3. 스키마 변경 확인
Write-Host ""
Write-Host "[3/5] 데이터베이스 스키마 변경 여부 확인..." -ForegroundColor Blue
$Migrate = Read-Host "Prisma 스키마가 변경되었습니까? (y/N)"
if ($Migrate -eq "y" -or $Migrate -eq "Y") {
    Write-Host "마이그레이션 실행 중..." -ForegroundColor Yellow
    docker-compose --profile tools run --rm migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 마이그레이션 실패" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ 마이그레이션 건너뜀" -ForegroundColor Green
}

# 4. 컨테이너 재시작
Write-Host ""
Write-Host "[4/5] 앱 컨테이너 재시작 중..." -ForegroundColor Blue
docker-compose up -d --no-deps --force-recreate app
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 컨테이너 시작 실패" -ForegroundColor Red
    exit 1
}

# 5. Health Check 대기
Write-Host ""
Write-Host "[5/5] 컨테이너 시작 대기 (최대 30초)..." -ForegroundColor Blue
$RetryCount = 0
$MaxRetries = 15
$HealthCheckPassed = $false

while ($RetryCount -lt $MaxRetries) {
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($Response.StatusCode -eq 200) {
            Write-Host ""
            Write-Host "✓ 앱이 정상적으로 시작되었습니다!" -ForegroundColor Green
            $HealthCheckPassed = $true
            break
        }
    } catch {
        # Health check 실패, 재시도
    }

    $RetryCount++
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
}

Write-Host ""

if (-not $HealthCheckPassed) {
    Write-Host "✗ Health check 실패" -ForegroundColor Red
    Write-Host ""
    Write-Host "로그 확인:" -ForegroundColor Yellow
    docker-compose logs app --tail 50
    exit 1
}

# 6. 최종 상태 확인
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Docker 업데이트 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 종료 시간 계산
$EndTime = Get-Date
$Elapsed = ($EndTime - $StartTime).TotalSeconds

Write-Host "📊 업데이트 정보:"
Write-Host "  - 소요 시간: $([math]::Round($Elapsed, 1))초"
Write-Host "  - 앱 URL: http://localhost:3001"
Write-Host ""

# Health check 상세 정보
Write-Host "🏥 Health Check:"
try {
    $HealthData = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -UseBasicParsing
    $HealthData | ConvertTo-Json
} catch {
    Write-Host "Health check 데이터를 가져올 수 없습니다."
}

Write-Host ""
Write-Host "📋 컨테이너 상태:"
docker-compose ps

Write-Host ""
Write-Host "💡 Tip: 로그 확인: " -NoNewline
Write-Host "docker-compose logs -f app" -ForegroundColor Blue
Write-Host ""
