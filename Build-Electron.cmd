@echo off
setlocal
cd /d "%~dp0"

echo.
echo Building StackMap desktop installer...
echo This will take a few minutes.
echo.

call npm run electron:build

if %errorlevel% neq 0 (
  echo.
  echo Build failed. See output above.
  pause
  exit /b 1
)

echo.
echo Done! Installer is in the dist\ folder.
echo.
pause
