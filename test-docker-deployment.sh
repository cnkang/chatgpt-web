#!/bin/bash

# Docker 部署测试脚本
# 使用 Playwright 测试 Docker 容器中的应用

set -e

echo "=========================================="
echo "Docker 部署测试"
echo "=========================================="
echo ""

# 检查环境变量
if [ -z "$AZURE_OPENAI_API_KEY" ] || [ -z "$AZURE_OPENAI_ENDPOINT" ] || [ -z "$AZURE_OPENAI_DEPLOYMENT" ]; then
    echo "❌ 错误: 请先设置 Azure OpenAI 环境变量"
    echo ""
    echo "示例:"
    echo "  export AZURE_OPENAI_API_KEY='your-key'"
    echo "  export AZURE_OPENAI_ENDPOINT='https://your-resource.openai.azure.com'"
    echo "  export AZURE_OPENAI_DEPLOYMENT='gpt-4o'"
    exit 1
fi

# 停止并删除旧容器
echo "清理旧容器..."
docker stop chatgpt-web-test 2>/dev/null || true
docker rm chatgpt-web-test 2>/dev/null || true

# 启动新容器
echo "启动测试容器..."
docker run -d \
  --name chatgpt-web-test \
  -p 3002:3002 \
  -e AI_PROVIDER=azure \
  -e AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
  -e AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
  -e AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT" \
  -e AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-02-15-preview}" \
  -e SESSION_SECRET="test-session-secret-for-testing-only" \
  -e LOG_LEVEL="debug" \
  chatgpt-web:local

echo "等待容器启动..."
sleep 5

# 检查容器状态
if ! docker ps | grep -q chatgpt-web-test; then
    echo "❌ 容器启动失败"
    docker logs chatgpt-web-test
    exit 1
fi

echo "✅ 容器启动成功"
echo ""

# 等待服务就绪
echo "等待服务就绪..."
for i in {1..30}; do
    if curl -s http://localhost:3002/health > /dev/null 2>&1; then
        echo "✅ 服务就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 服务启动超时"
        docker logs chatgpt-web-test
        exit 1
    fi
    sleep 1
done

echo ""
echo "=========================================="
echo "容器信息"
echo "=========================================="
docker ps | grep chatgpt-web-test
echo ""

echo "=========================================="
echo "容器日志 (最近 50 行)"
echo "=========================================="
docker logs --tail 50 chatgpt-web-test
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "容器正在运行: chatgpt-web-test"
echo "访问地址: http://localhost:3002"
echo ""
echo "查看实时日志: docker logs -f chatgpt-web-test"
echo "停止容器: docker stop chatgpt-web-test"
echo "删除容器: docker rm chatgpt-web-test"
echo ""
