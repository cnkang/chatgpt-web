@echo off
REM ChatGPT Web Monorepo Production Start Script
REM This script builds and starts the application in production mode

echo Starting ChatGPT Web in Production Mode...

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo Error: pnpm is not installed. Please install pnpm first.
    echo Run: npm install -g pnpm
    pause
    exit /b 1
)

REM Set production environment
set NODE_ENV=production

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install --frozen-lockfile
)

REM Build all packages
echo Building all packages...
pnpm build

REM Check if build was successful
if errorlevel 1 (
    echo Error: Build failed. Please check the logs above.
    pause
    exit /b 1
)

echo Build completed successfully!
echo.
echo Starting production server...
echo API will be available at: http://localhost:3002
echo Static files served from: apps/api/public
echo.

REM Start the production server
cd apps\api
pnpm prod