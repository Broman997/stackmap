$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:3000"
$port = 3000
$logDir = Join-Path $root ".launcher"
$stdoutLog = Join-Path $logDir "stackmap-dev.log"
$stderrLog = Join-Path $logDir "stackmap-dev.err.log"
$pidFile = Join-Path $logDir "stackmap-dev.pid"
$nextBin = Join-Path $root "node_modules\next\dist\bin\next"

function Test-StackMapReady {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

Write-Host ""
Write-Host "Starting StackMap..." -ForegroundColor Cyan
Write-Host "Folder: $root"
Write-Host ""

if (!(Test-Path $nextBin)) {
  Write-Host "Dependencies are missing. Running npm install first..." -ForegroundColor Yellow
  Push-Location $root
  try {
    npm install
  } finally {
    Pop-Location
  }
}

if (Test-StackMapReady) {
  Write-Host "StackMap is already running at $url" -ForegroundColor Green
  Start-Process $url
  exit 0
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Remove-Item -LiteralPath $stdoutLog, $stderrLog, $pidFile -Force -ErrorAction SilentlyContinue

$arguments = @(
  $nextBin,
  "dev",
  "--hostname",
  "localhost",
  "--port",
  "$port"
)

$server = Start-Process `
  -FilePath "node.exe" `
  -ArgumentList $arguments `
  -WorkingDirectory $root `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden `
  -PassThru

try {
  $ready = $false
  for ($attempt = 1; $attempt -le 30; $attempt += 1) {
    if ($server.HasExited) {
      throw "StackMap server stopped during startup."
    }

    if (Test-StackMapReady) {
      $ready = $true
      break
    }

    Start-Sleep -Seconds 1
  }

  if (!$ready) {
    throw "StackMap did not respond at $url after 30 seconds."
  }

  Set-Content -LiteralPath $pidFile -Value $server.Id
  Write-Host "StackMap is running at $url" -ForegroundColor Green
  Start-Process $url
} catch {
  Write-Host ""
  Write-Host "StackMap failed to start:" -ForegroundColor Red
  Write-Host $_
  Write-Host ""

  if (Test-Path $stdoutLog) {
    Write-Host "Recent output:" -ForegroundColor Yellow
    Get-Content -Tail 40 $stdoutLog
  }

  if (Test-Path $stderrLog) {
    Write-Host ""
    Write-Host "Recent errors:" -ForegroundColor Yellow
    Get-Content -Tail 40 $stderrLog
  }

  Read-Host "Press Enter to close"
}
