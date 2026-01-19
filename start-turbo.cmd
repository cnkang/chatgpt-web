@echo off
REM ChatGPT Web Monorepo Development Start Script (Turbo)
REM This script uses Turbo to start both services in parallel

echo Starting ChatGPT Web with Turbo...

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo Error: pnpm is not installed. Please install pnpm first.
    echo Run: npm install -g pnpm
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
)

echo.
echo ==========================================
echo ChatGPT Web Development Server
echo ==========================================
echo API:  http://localhost:3002
echo Web:  http://localhost:1002
echo ==========================================
echo.

REM Start both services using turbo
pnpm dev:core
