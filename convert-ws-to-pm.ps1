# PM 모듈 WS->PM 변환 스크립트
# 모든 파일의 내용에서 WS 관련 명칭을 PM으로 변경

$targetDir = "src\app\pm\worksheet"
$files = Get-ChildItem -Path $targetDir -Recurse -Include *.tsx,*.ts -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # 변경 규칙 (영문만)
    $content = $content -replace 'WsWorksheet', 'PmWorksheet'
    $content = $content -replace 'wsWorksheet', 'pmWorksheet'
    $content = $content -replace 'WsTopMenuBar', 'PmTopMenuBar'
    $content = $content -replace 'WsTabMenu', 'PmTabMenu'
    $content = $content -replace 'WsContextMenu', 'PmContextMenu'
    $content = $content -replace 'WsTableHeader', 'PmTableHeader'
    $content = $content -replace 'WsTableBody', 'PmTableBody'
    $content = $content -replace 'WsMainTab', 'PmMainTab'
    $content = $content -replace 'WsEquipmentModal', 'PmEquipmentModal'
    $content = $content -replace 'WsPartsModal', 'PmPartsModal'
    $content = $content -replace 'WsEquipmentTab', 'PmEquipmentTab'
    $content = $content -replace 'WsPartsTab', 'PmPartsTab'
    $content = $content -replace 'useWsData', 'usePmData'
    $content = $content -replace 'WSMainDocument', 'PMMainDocument'
    $content = $content -replace 'createEmptyWSMainDocument', 'createEmptyPMMainDocument'
    $content = $content -replace 'ws-main-current', 'pm-main-current'
    $content = $content -replace 'ws-main', 'pm-main'
    $content = $content -replace 'ws-worksheet', 'pm-worksheet'
    $content = $content -replace 'ws-equipment', 'pm-equipment'
    $content = $content -replace 'ws-parts', 'pm-parts'
    $content = $content -replace 'wsNo', 'pmNo'
    $content = $content -replace 'WsNo', 'PmNo'
    $content = $content -replace 'wsList', 'pmList'
    $content = $content -replace 'selectedWsId', 'selectedPmId'
    $content = $content -replace 'onWsChange', 'onPmChange'
    $content = $content -replace '/ws/worksheet', '/pm/worksheet'
    $content = $content -replace '@/types/ws-main', '@/types/pm-main'
    $content = $content -replace 'WS Main', 'PM Main'
    $content = $content -replace 'WS Work Sheet', 'PM Work Sheet'
    $content = $content -replace 'WSTopNav', 'PMTopNav'
    
    # 파일 저장
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $($file.FullName)"
}

Write-Host "`nConversion completed!"
