@echo off
title SiteLens AI - Local Engine (localhost:9876)
color 0B
echo ==============================================================
echo   SiteLens AI (Speed, SEO & 6-Layer Security Engine)
echo   Starting Local Node.js Engine on port 9876...
echo ==============================================================
echo.

cd /d "%~dp0"

if not exist "node_modules\" (
    echo [INFO] Installing dependencies in server/...
    call npm install
    echo.
)

node server.js
pause
