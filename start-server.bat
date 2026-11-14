@echo off
title AutoLighthouse Dual Auditor - Local Engine (localhost:9876)
color 0B
echo ==============================================================
echo   AutoLighthouse Dual Auditor (Desktop + Mobile)
echo   Starting Local Node.js Lighthouse Engine on port 9876...
echo ==============================================================
echo.

cd /d "%~dp0server"

if not exist "node_modules\" (
    echo [INFO] Installing dependencies in server/...
    call npm install
    echo.
)

node server.js
pause
