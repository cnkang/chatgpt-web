#!/bin/bash

# Test Azure OpenAI v1 Responses API Streaming Fix
# This script deploys the fixed Docker image and tests streaming responses

set -e

echo "🚀 Testing Azure OpenAI v1 Responses API Streaming Fix"
echo "=================================================="

# Configuration
CONTAINER_NAME="chatgpt-web-azure-streaming-test"
IMAGE_NAME="chatgpt-web:azure-streaming-fix"
PORT=3002

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "📦 Stopping and removing existing container..."
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} 2>/dev/null || true
fi

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. Please create one with Azure OpenAI credentials."
    echo ""
    echo "Required variables:"
    echo "  AZURE_OPENAI_API_KEY=your-api-key"
    echo "  AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com"
    echo "  AZURE_OPENAI_DEPLOYMENT=your-deployment-name"
    exit 1
fi

# Validate required environment variables
if [ -z "$AZURE_OPENAI_API_KEY" ] || [ -z "$AZURE_OPENAI_ENDPOINT" ] || [ -z "$AZURE_OPENAI_DEPLOYMENT" ]; then
    echo "❌ Missing required environment variables!"
    echo ""
    echo "Please set the following in your .env file:"
    echo "  AZURE_OPENAI_API_KEY=your-api-key"
    echo "  AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com"
    echo "  AZURE_OPENAI_DEPLOYMENT=your-deployment-name"
    exit 1
fi

# Generate session secret if not provided
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -base64 32)
    echo "🔑 Generated SESSION_SECRET"
fi

echo ""
echo "📋 Configuration:"
echo "  Image: ${IMAGE_NAME}"
echo "  Container: ${CONTAINER_NAME}"
echo "  Port: ${PORT}"
echo "  Endpoint: ${AZURE_OPENAI_ENDPOINT}"
echo "  Deployment: ${AZURE_OPENAI_DEPLOYMENT}"
echo "  Use Responses API: true (testing streaming fix)"
echo ""

# Start container
echo "🐳 Starting Docker container..."
docker run -d \
  --name ${CONTAINER_NAME} \
  -p ${PORT}:${PORT} \
  -e NODE_ENV=production \
  -e PORT=${PORT} \
  -e AI_PROVIDER=azure \
  -e AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY}" \
  -e AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT}" \
  -e AZURE_OPENAI_DEPLOYMENT="${AZURE_OPENAI_DEPLOYMENT}" \
  -e AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-02-15-preview}" \
  -e AZURE_OPENAI_USE_RESPONSES_API="true" \
  -e SESSION_SECRET="${SESSION_SECRET}" \
  -e TIMEOUT_MS="${TIMEOUT_MS:-60000}" \
  -e MAX_REQUEST_PER_HOUR="${MAX_REQUEST_PER_HOUR:-100}" \
  ${IMAGE_NAME}

echo "✅ Container started successfully!"
echo ""

# Wait for container to be ready
echo "⏳ Waiting for server to start..."
sleep 3

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container failed to start!"
    echo ""
    echo "📋 Container logs:"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

echo "✅ Server is running!"
echo ""

# Show logs
echo "📋 Container logs (last 20 lines):"
echo "=================================================="
docker logs --tail 20 ${CONTAINER_NAME}
echo "=================================================="
echo ""

# Instructions
echo "🎉 Deployment successful!"
echo ""
echo "📝 Testing Instructions:"
echo ""
echo "1. Open your browser and navigate to:"
echo "   http://localhost:${PORT}"
echo ""
echo "2. Create a new chat session"
echo ""
echo "3. Send a test message (e.g., '你好' or 'Hello')"
echo ""
echo "4. You should see the response streaming character by character"
echo "   (not stuck in '思考中' state)"
echo ""
echo "5. Monitor logs in real-time:"
echo "   docker logs -f ${CONTAINER_NAME}"
echo ""
echo "6. Look for these log entries:"
echo "   - 'Azure v1 event received' with type and delta"
echo "   - 'response.output_text.delta' events with actual content"
echo "   - 'response.done' event when complete"
echo ""
echo "🔍 Debugging:"
echo ""
echo "View logs:     docker logs -f ${CONTAINER_NAME}"
echo "Stop container: docker stop ${CONTAINER_NAME}"
echo "Remove container: docker rm ${CONTAINER_NAME}"
echo "Restart container: docker restart ${CONTAINER_NAME}"
echo ""
echo "📚 Documentation:"
echo "  - AZURE_STREAMING_ISSUE.md - Detailed fix explanation"
echo "  - AZURE_V1_API_FIX.md - API format differences"
echo "  - DOCKER_DEPLOYMENT_SUMMARY.md - General deployment guide"
echo ""
echo "✨ Happy testing!"
