# ============================================================
# FMEA 룰 리마인더 스크립트
# 매 1시간마다 실행되어 룰 재확인 알림 표시
# ============================================================

Add-Type -AssemblyName System.Windows.Forms

$hour = (Get-Date).Hour
$time = Get-Date -Format "HH:mm"

# 오전 6시 ~ 오후 10시 사이에만 알림
if ($hour -ge 6 -and $hour -le 22) {
    $result = [System.Windows.Forms.MessageBox]::Show(
        "⏰ [$time] FMEA 룰 재확인 시간!`n`n" +
        "Cursor에서 다음을 요청하세요:`n" +
        "'.cursorrules 읽어'`n`n" +
        "또는 직접 확인:`n" +
        "- docs/.cursorrules`n" +
        "- cursor-global-rules.yaml`n`n" +
        "확인 버튼을 누르면 닫힙니다.",
        "🔔 FMEA 룰 리마인더",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )
}










