#!/bin/bash

# ChatGPT Web Monorepo Development Start Script
# This script starts both API and Web services in development mode

echo "Starting ChatGPT Web in Development Mode..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed. Please install pnpm first."
    echo "Run: npm install -g pnpm"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Start API service in background
echo "Starting API service..."
cd apps/api
nohup pnpm dev > ../../api.log 2>&1 &
API_PID=$!
echo "API service started (PID: $API_PID)"
echo "API logs: api.log"

# Return to root and start Web service
cd ../..
echo "Starting Web service..."
cd apps/web
echo "" > ../../web.log
nohup pnpm dev > ../../web.log 2>&1 &
WEB_PID=$!
echo "Web service started (PID: $WEB_PID)"
echo "Web logs: web.log"

cd ../..
echo ""
echo "=========================================="
echo "ChatGPT Web Development Server Started"
echo "=========================================="
echo "API:  http://localhost:3002"
echo "Web:  http://localhost:1002"
echo ""
echo "Logs:"
echo "  API: api.log"
echo "  Web: web.log"
echo ""
echo "To stop services:"
echo "  kill $API_PID $WEB_PID"
echo "=========================================="
echo ""
echo "Following Web logs (Ctrl+C to exit)..."
tail -f web.log
