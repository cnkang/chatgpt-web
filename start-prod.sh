#!/bin/bash

# ChatGPT Web Monorepo Production Start Script
# This script builds and starts the application in production mode

echo "Starting ChatGPT Web in Production Mode..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed. Please install pnpm first."
    echo "Run: npm install -g pnpm"
    exit 1
fi

# Set production environment
export NODE_ENV=production

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install --frozen-lockfile
fi

# Build all packages
echo "Building all packages..."
pnpm build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Error: Build failed. Please check the logs above."
    exit 1
fi

echo "Build completed successfully!"
echo ""
echo "Starting production server..."
echo "API will be available at: http://localhost:3002"
echo "Static files served from: apps/api/public"
echo ""

# Start the production server
cd apps/api
pnpm prod