# AWS ECR 部署配置指南

本文档说明如何配置 GitHub Actions 使用 IAM Role 认证推送 Docker 镜像到 AWS ECR。

## 前置要求

1. AWS 账户和适当的权限
2. GitHub 仓库管理员权限
3. 已创建的 ECR 仓库

## AWS 配置步骤

### 1. 创建 ECR 仓库

```bash
# 创建 ECR 仓库
aws ecr create-repository \
    --repository-name chatgpt-web \
    --region us-east-1

# 获取仓库 URI
aws ecr describe-repositories \
    --repository-names chatgpt-web \
    --region us-east-1 \
    --query 'repositories[0].repositoryUri' \
    --output text
```

### 2. 创建 IAM Role 用于 GitHub Actions

#### 2.1 创建信任策略文件 `github-trust-policy.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/chatgpt-web:*"
        }
      }
    }
  ]
}
```

**注意**: 替换 `YOUR_ACCOUNT_ID` 和 `YOUR_GITHUB_USERNAME` 为实际值。

#### 2.2 创建权限策略文件 `ecr-permissions-policy.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "arn:aws:ecr:*:YOUR_ACCOUNT_ID:repository/chatgpt-web"
    }
  ]
}
```

#### 2.3 创建 OIDC 身份提供商（如果尚未创建）

```bash
# 检查是否已存在 GitHub OIDC 提供商
aws iam list-open-id-connect-providers

# 如果不存在，创建 OIDC 提供商
aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

#### 2.4 创建 IAM Role 和策略

```bash
# 创建权限策略
aws iam create-policy \
    --policy-name GitHubActions-ECR-Policy \
    --policy-document file://ecr-permissions-policy.json

# 创建 IAM Role
aws iam create-role \
    --role-name GitHubActions-ECR-Role \
    --assume-role-policy-document file://github-trust-policy.json

# 附加策略到 Role
aws iam attach-role-policy \
    --role-name GitHubActions-ECR-Role \
    --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/GitHubActions-ECR-Policy

# 获取 Role ARN
aws iam get-role \
    --role-name GitHubActions-ECR-Role \
    --query 'Role.Arn' \
    --output text
```

## GitHub 配置步骤

### 1. 配置 Repository Secrets

在 GitHub 仓库设置中，转到 `Settings` > `Secrets and variables` > `Actions` > `Secrets` 标签页，添加以下 secrets：

| Secret 名 | 值 | 描述 |
|-----------|-----|------|
| `AWS_REGION` | `us-east-1` | AWS 区域 |
| `ECR_REPOSITORY` | `chatgpt-web` | ECR 仓库名称 |
| `ECR_REGISTRY` | `123456789012.dkr.ecr.us-east-1.amazonaws.com` | ECR 注册表 URI |
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/GitHubActions-ECR-Role` | IAM Role ARN |

**注意**: 
- 替换 `123456789012` 为你的 AWS 账户 ID
- `ECR_REGISTRY` 格式为: `{account-id}.dkr.ecr.{region}.amazonaws.com`

### 2. 验证配置

推送代码到 `main` 分支或创建 Release 来触发 GitHub Action，检查是否能成功推送到 ECR。

## 工作流程说明

### 环境变量

```yaml
env:
  AWS_REGION: ${{ secrets.AWS_REGION || 'us-east-1' }}
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY || 'chatgpt-web' }}
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}
```

- 支持默认值，如果未设置 `AWS_REGION` 将使用 `us-east-1`
- `ECR_REGISTRY` 必须设置，格式为完整的 ECR 注册表 URI

### 权限配置

```yaml
permissions:
  id-token: write  # 用于 OIDC 认证
  contents: read   # 用于检出代码
```

### 镜像标签策略

工作流程会自动生成以下标签：
- `latest` (仅在 main 分支)
- 分支名称 (如 `main`, `develop`)
- 标签名称 (如 `v1.0.0`)
- Git 引用名称

### 缓存优化

使用 GitHub Actions 缓存来加速构建：
```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

## 安全最佳实践

1. **最小权限原则**: IAM Role 只授予必要的 ECR 权限
2. **条件限制**: 信任策略限制只有特定仓库可以使用该 Role
3. **无长期凭证**: 使用 OIDC 避免存储 AWS 访问密钥
4. **审计日志**: AWS CloudTrail 记录所有 API 调用

## 故障排除

### 常见错误

#### 1. "No basic auth credentials" 错误
```
Error: buildx failed with: error: failed to solve: failed to authorize: rpc error: code = Unknown desc = failed to fetch anonymous token: unexpected status: 401 Unauthorized
```

**解决方案**: 检查 ECR 登录是否成功，确认 IAM Role 有 `ecr:GetAuthorizationToken` 权限。

#### 2. "Repository does not exist" 错误
```
Error: failed to push: failed to do request: Put https://123456789012.dkr.ecr.us-east-1.amazonaws.com/v2/chatgpt-web/manifests/latest: unexpected status: 400 Bad Request
```

**解决方案**: 确认 ECR 仓库已创建，仓库名称正确。

#### 3. OIDC 认证失败
```
Error: Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

**解决方案**: 
- 检查 OIDC 提供商是否正确配置
- 验证信任策略中的仓库路径是否正确
- 确认 GitHub Actions 权限包含 `id-token: write`

### 调试步骤

1. **验证 AWS 配置**:
   ```bash
   # 检查 ECR 仓库
   aws ecr describe-repositories --repository-names chatgpt-web
   
   # 检查 IAM Role
   aws iam get-role --role-name GitHubActions-ECR-Role
   
   # 测试 ECR 登录
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
   ```

2. **检查 GitHub Secrets**: 确保所有必需的 secrets 都已正确设置

3. **查看 Action 日志**: GitHub Actions 页面查看详细的错误信息

## 多环境部署

可以为不同环境配置不同的 secrets：

### Development 环境
- `AWS_REGION`: `us-east-1`
- `ECR_REPOSITORY`: `chatgpt-web-dev`
- `ECR_REGISTRY`: `123456789012.dkr.ecr.us-east-1.amazonaws.com`

### Production 环境
- `AWS_REGION`: `us-west-2`
- `ECR_REPOSITORY`: `chatgpt-web-prod`
- `ECR_REGISTRY`: `123456789012.dkr.ecr.us-west-2.amazonaws.com`

使用 GitHub Environments 功能可以为不同环境设置不同的 secrets 和审批流程。

## 成本优化

1. **镜像生命周期策略**: 配置 ECR 生命周期策略自动删除旧镜像
2. **多架构构建**: 仅构建需要的架构 (amd64/arm64)
3. **构建缓存**: 利用 GitHub Actions 缓存减少构建时间

```bash
# 设置 ECR 生命周期策略示例
aws ecr put-lifecycle-policy \
    --repository-name chatgpt-web \
    --lifecycle-policy-text file://lifecycle-policy.json
```

lifecycle-policy.json:
```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

配置完成后，GitHub Actions 将自动使用 IAM Role 认证推送 Docker 镜像到 AWS ECR，无需管理长期访问密钥。