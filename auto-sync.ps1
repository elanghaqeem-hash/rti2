# Auto-push script for PowerShell
Write-Host "RTI sync watcher aktif dalam mode aman." -ForegroundColor Cyan
Write-Host "Auto-push hanya berjalan bila RTI_ALLOW_AUTO_PUSH=YES dan branch bukan main/master." -ForegroundColor Gray

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $PSScriptRoot
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$script:timer = $null
$script:syncing = $false

$action = {
    $path = $Event.SourceEventArgs.FullPath
    if ($path -match '\\\.git\\' -or $path -match '\\node_modules\\' -or $path -match '\\\.next\\' -or $path -match '\.tmp$') {
        return
    }
    
    if ($script:timer) {
        $script:timer.Stop()
        $script:timer.Dispose()
    }
    
    $script:timer = New-Object System.Timers.Timer
    $script:timer.Interval = 3000
    $script:timer.AutoReset = $false
    Register-ObjectEvent -InputObject $script:timer -EventName Elapsed -SourceIdentifier "SyncNow" -Action {
        Unregister-Event -SourceIdentifier "SyncNow" -ErrorAction SilentlyContinue
        if ($script:syncing) { return }
        $script:syncing = $true
        try {
            if ($env:RTI_ALLOW_AUTO_PUSH -ne "YES") {
                Write-Host "[Auto-Sync] Push dilewati: set RTI_ALLOW_AUTO_PUSH=YES untuk opt-in eksplisit." -ForegroundColor Gray
                return
            }

            $branch = (git branch --show-current).Trim()
            if ($branch -eq "main" -or $branch -eq "master") {
                Write-Host "[Auto-Sync] DIBLOKIR: auto-push ke branch production tidak diizinkan." -ForegroundColor Red
                return
            }

            $status = git status --porcelain
            if ($status) {
                Write-Host "`n[Auto-Sync] Perubahan terdeteksi. Menyimpan & mem-push ke GitHub..." -ForegroundColor Yellow
                git add .
                $dateStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                git commit -m "Auto update: $dateStr"
                git push origin $branch
                Write-Host "[Auto-Sync] Berhasil ter-push ke GitHub!`n" -ForegroundColor Green
            }
        } finally {
            $script:syncing = $false
        }
    }
    $script:timer.Start()
}

Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null
Register-ObjectEvent $watcher "Created" -Action $action | Out-Null
Register-ObjectEvent $watcher "Deleted" -Action $action | Out-Null
Register-ObjectEvent $watcher "Renamed" -Action $action | Out-Null

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    $watcher.Dispose()
}
