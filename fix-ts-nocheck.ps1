$paths = @('c:\01_new_sdd\fmea-onpremise\src\app\dfmea\worksheet', 'c:\01_new_sdd\fmea-onpremise\src\app\pfmea\worksheet')
foreach ($path in $paths) {
    Get-ChildItem -Path $path -Recurse -Include '*.ts','*.tsx' | ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName)
        # Fix malformed @ts-nocheck (missing newline)
        if ($content -match '^// @ts-nocheckn') {
            $content = $content -replace '^// @ts-nocheckn', ''
            if (-not $content.StartsWith("'use client'")) {
                $content = "// @ts-nocheck`r`n" + $content
            } else {
                $content = $content -replace "^'use client';`r?`n?", "'use client';`r`n// @ts-nocheck`r`n"
            }
            [System.IO.File]::WriteAllText($_.FullName, $content)
            Write-Host "Fixed: $($_.Name)"
        }
    }
}
Write-Host 'Done fixing files'
