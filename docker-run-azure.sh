#!/bin/bash

# ChatGPT Web - Docker 启动脚本 (Azure OpenAI)
# 使用本地构建的镜像启动容器

echo "=========================================="
echo "ChatGPT Web - Azure OpenAI 配置"
echo "=========================================="
echo ""

# 检查必要的环境变量
if [ -z "$AZURE_OPENAI_API_KEY" ]; then
    echo "错误: 请设置 AZURE_OPENAI_API_KEY 环境变量"
    echo "示例: export AZURE_OPENAI_API_KEY='your-api-key'"
    exit 1
fi

if [ -z "$AZURE_OPENAI_ENDPOINT" ]; then
    echo "错误: 请设置 AZURE_OPENAI_ENDPOINT 环境变量"
    echo "示例: export AZURE_OPENAI_ENDPOINT='https://your-resource.openai.azure.com'"
    exit 1
fi

if [ -z "$AZURE_OPENAI_DEPLOYMENT" ]; then
    echo "错误: 请设置 AZURE_OPENAI_DEPLOYMENT 环境变量"
    echo "示例: export AZURE_OPENAI_DEPLOYMENT='gpt-4o'"
    exit 1
fi

# 停止并删除旧容器（如果存在）
if [ "$(docker ps -aq -f name=chatgpt-web-azure)" ]; then
    echo "停止并删除旧容器..."
    docker stop chatgpt-web-azure 2>/dev/null
    docker rm chatgpt-web-azure 2>/dev/null
fi

echo "启动 ChatGPT Web 容器..."
echo ""

# 启动容器
docker run -d \
  --name chatgpt-web-azure \
  -p 3002:3002 \
  -e AI_PROVIDER=azure \
  -e AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
  -e AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  -e AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
  -e AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-02-15-preview}" \
  -e AZURE_OPENAI_USE_RESPONSES_API="${AZURE_OPENAI_USE_RESPONSES_API:-true}" \
  -e SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -base64 32)}" \
  -e AUTH_SECRET_KEY="${AUTH_SECRET_KEY:-}" \
  -e MAX_REQUEST_PER_HOUR="${MAX_REQUEST_PER_HOUR:-100}" \
  -e TIMEOUT_MS="${TIMEOUT_MS:-60000}" \
  -e ENABLE_REASONING_MODELS="${ENABLE_REASONING_MODELS:-true}" \
  -e REASONING_MODEL_TIMEOUT_MS="${REASONING_MODEL_TIMEOUT_MS:-120000}" \
  -e LOG_LEVEL="${LOG_LEVEL:-info}" \
  -e NODE_ENV=production \
  --restart unless-stopped \
  chatgpt-web:local

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "✅ 容器启动成功！"
    echo "=========================================="
    echo ""
    echo "访问地址: http://localhost:3002"
    echo "容器名称: chatgpt-web-azure"
    echo ""
    echo "配置信息:"
    echo "  Provider: Azure OpenAI"
    echo "  Endpoint: $AZURE_OPENAI_ENDPOINT"
    echo "  Deployment: $AZURE_OPENAI_DEPLOYMENT"
    echo "  API Version: ${AZURE_OPENAI_API_VERSION:-2024-02-15-preview}"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker logs -f chatgpt-web-azure"
    echo "  停止容器: docker stop chatgpt-web-azure"
    echo "  启动容器: docker start chatgpt-web-azure"
    echo "  删除容器: docker rm -f chatgpt-web-azure"
    echo "=========================================="
    echo ""
    echo "正在查看容器日志 (Ctrl+C 退出)..."
    sleep 2
    docker logs -f chatgpt-web-azure
else
    echo "❌ 容器启动失败，请检查错误信息"
    exit 1
fi
