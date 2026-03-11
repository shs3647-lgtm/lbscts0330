# ============================================================
# FMEA 룰 리마인더 - Windows Task Scheduler 자동 등록
# 관리자 권한으로 PowerShell에서 실행하세요
# ============================================================

$scriptPath = "C:\01_new_sdd\fmea-onpremise\scripts\rule-reminder.ps1"
$taskName = "FMEA-Rule-Reminder"

# 기존 작업 삭제 (있으면)
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# 트리거 설정: 매일 06:00부터 1시간마다 반복, 17시간 동안 (06:00~22:00)
$trigger = New-ScheduledTaskTrigger -Daily -At "06:00"
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At "06:00" -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Hours 17)).Repetition

# 동작 설정: PowerShell로 스크립트 실행
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

# 설정: 배터리 상태 무시, 깨어있을 때만 실행
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# 현재 사용자로 등록
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# 작업 등록
Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Settings $settings -Principal $principal -Description "FMEA 프로젝트 룰 재확인 알림 (매 1시간)"

Write-Host ""
Write-Host "✅ Task Scheduler 등록 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "등록된 작업: $taskName" -ForegroundColor Cyan
Write-Host "실행 시간: 매일 06:00 ~ 22:00 (1시간 간격)" -ForegroundColor Cyan
Write-Host "스크립트: $scriptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "확인 명령어: Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow
Write-Host "삭제 명령어: Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow










