@echo off
REM ChatGPT Web Monorepo Development Start Script
REM This script starts both API and Web services in development mode

echo Starting ChatGPT Web in Development Mode...

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

REM Start API service in background
echo Starting API service...
cd apps\api
start /B cmd /c "pnpm dev > ..\..\api.log 2>&1"
echo API service started
echo API logs: api.log

REM Return to root and start Web service
cd ..\..
echo Starting Web service...
cd apps\web
echo. > ..\..\web.log
start /B cmd /c "pnpm dev > ..\..\web.log 2>&1"
echo Web service started
echo Web logs: web.log

cd ..\..
echo.
echo ==========================================
echo ChatGPT Web Development Server Started
echo ==========================================
echo API:  http://localhost:3002
echo Web:  http://localhost:1002
echo.
echo Logs:
echo   API: api.log
echo   Web: web.log
echo.
echo Press any key to view Web logs...
echo ==========================================
pause >nul
type web.log
