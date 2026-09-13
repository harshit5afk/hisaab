@echo off
title Hisaab - Accounting & Billing App
color 0A

:: Ensure we are in the hisaab project root folder
cd /d "%~dp0"

echo ===================================================
echo           Hisaab Billing & Accounting System
echo ===================================================
echo.
echo Starting application on http://localhost:3000 ...
echo.

:: Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js is not installed or not found in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: Automatically launch browser on localhost:3000 after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Start the unified production server (serves frontend + backend on port 3000)
node apps/api/dist/main.js

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo Application stopped unexpectedly.
    pause
)
