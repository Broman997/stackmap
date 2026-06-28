@echo off
setlocal
cd /d "%~dp0"

echo.
echo Stopping any running StackMap server...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; Write-Host 'Server stopped.' } else { Write-Host 'No server running.' } } catch { Write-Host 'Note: could not check port 3000.' }"

echo.
echo Clearing old build cache...
if exist ".next" rmdir /s /q ".next"
echo Done.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-StackMap.ps1"
