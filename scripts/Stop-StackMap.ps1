$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:3000"
$logDir = Join-Path $root ".launcher"
$pidFile = Join-Path $logDir "stackmap-dev.pid"

Write-Host ""
Write-Host "Stopping StackMap..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path $pidFile) {
  $serverPid = [int](Get-Content -Raw $pidFile)
  $server = Get-Process -Id $serverPid -ErrorAction SilentlyContinue

  if ($server) {
    Stop-Process -Id $serverPid -Force
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped StackMap server process $serverPid." -ForegroundColor Green
    Start-Sleep -Seconds 2
    exit 0
  }

  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

try {
  $connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if ($connection) {
    Write-Host "No launcher PID was found, but port 3000 is in use." -ForegroundColor Yellow
    $answer = Read-Host "Stop process $($connection.OwningProcess) on port 3000? Type Y to confirm"
    if ($answer -eq "Y" -or $answer -eq "y") {
      Stop-Process -Id $connection.OwningProcess -Force
      Write-Host "Stopped process $($connection.OwningProcess)." -ForegroundColor Green
      Start-Sleep -Seconds 2
      exit 0
    }
  }
} catch {
  Write-Host "Could not inspect port 3000: $_" -ForegroundColor Yellow
}

Write-Host "No StackMap server started by the launcher was found." -ForegroundColor Yellow
Start-Sleep -Seconds 2

