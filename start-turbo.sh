#!/bin/bash

# ChatGPT Web Monorepo Development Start Script (Turbo)
# This script uses Turbo to start both services in parallel

echo "Starting ChatGPT Web with Turbo..."

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

echo ""
echo "=========================================="
echo "ChatGPT Web Development Server"
echo "=========================================="
echo "API:  http://localhost:3002"
echo "Web:  http://localhost:1002"
echo "=========================================="
echo ""

# Start both services using turbo
pnpm dev:core
