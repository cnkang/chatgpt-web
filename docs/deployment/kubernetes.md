# Kubernetes 部署指南

本指南介绍如何在 Kubernetes 集群中部署 ChatGPT Web 应用。

## 前置要求

- Kubernetes 集群 (1.19+)
- kubectl 已配置
- NGINX Ingress Controller（可选）

## 快速部署

### 1. 创建 Secret

```bash
kubectl create secret generic chatgpt-web-secrets \
  --from-literal=openai-api-key=sk-xxx \
  --from-literal=auth-secret-key=your-secret-key
```

### 2. 部署应用

```bash
kubectl apply -f kubernetes/deploy.yaml
```

### 3. 部署 Ingress（可选）

```bash
kubectl apply -f kubernetes/ingress.yaml
```

## 配置说明

详细的 Kubernetes 配置请参考 `kubernetes/` 目录下的配置文件。

### 环境变量配置

在 `kubernetes/deploy.yaml` 中配置环境变量：

```yaml
env:
  - name: AI_PROVIDER
    value: 'openai'
  - name: OPENAI_API_KEY
    valueFrom:
      secretKeyRef:
        name: chatgpt-web-secrets
        key: openai-api-key
```

### 资源限制

建议的资源配置：

```yaml
resources:
  requests:
    memory: '256Mi'
    cpu: '250m'
  limits:
    memory: '512Mi'
    cpu: '500m'
```

## 健康检查

应用提供以下健康检查端点：

- Liveness Probe: `GET /api/health`
- Readiness Probe: `GET /api/health`

## 扩展和监控

### 水平扩展

```bash
kubectl scale deployment chatgpt-web --replicas=3
```

### 查看日志

```bash
kubectl logs -f deployment/chatgpt-web
```

### 查看状态

```bash
kubectl get pods -l app=chatgpt-web
kubectl describe deployment chatgpt-web
```

## 故障排查

常见问题和解决方案请参考 [部署概览](./overview.md#troubleshooting)。

更多详细信息，请查看 `kubernetes/README.md`。
