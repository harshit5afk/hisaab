@echo off
title Ion Shift Engineering - Business Manager
echo ========================================
echo   Ion Shift Engineering - Business Management App
echo   Starting server...
echo ========================================
echo.

cd /d "%~dp0"
cd apps\api

:: Auto-open browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start the NestJS server
node dist\main.js

echo.
echo ========================================
echo   Server stopped. Press any key to exit.
echo ========================================
pause
