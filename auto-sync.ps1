# Auto-push script for PowerShell
Write-Host "Auto-push watcher aktif untuk RTI 2..." -ForegroundColor Cyan
Write-Host "Setiap perubahan file akan otomatis di-commit & push ke GitHub dalam 3 detik." -ForegroundColor Gray

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
            $status = git status --porcelain
            if ($status) {
                Write-Host "`n[Auto-Sync] Perubahan terdeteksi. Menyimpan & mem-push ke GitHub..." -ForegroundColor Yellow
                git add .
                $dateStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                git commit -m "Auto update: $dateStr"
                git push origin main
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
