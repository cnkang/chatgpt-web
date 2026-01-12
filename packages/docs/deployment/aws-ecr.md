# AWS ECR Deployment Guide

This document explains how to configure GitHub Actions to use IAM Role authentication for pushing Docker images to AWS ECR.

## Prerequisites

1. AWS account with appropriate permissions
2. GitHub repository admin permissions
3. Created ECR repository

## AWS Configuration Steps

### 1. Create ECR Repository

```bash
# Create ECR repository
aws ecr create-repository \
    --repository-name chatgpt-web \
    --region us-east-1

# Get repository URI
aws ecr describe-repositories \
    --repository-names chatgpt-web \
    --region us-east-1 \
    --query 'repositories[0].repositoryUri' \
    --output text
```

### 2. Create IAM Role for GitHub Actions

#### 2.1 Create Trust Policy File `github-trust-policy.json`

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

**Note**: Replace `YOUR_ACCOUNT_ID` and `YOUR_GITHUB_USERNAME` with actual values.

#### 2.2 Create Permissions Policy File `ecr-permissions-policy.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
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

#### 2.3 Create OIDC Identity Provider (if not already created)

```bash
# Check if GitHub OIDC provider already exists
aws iam list-open-id-connect-providers

# If not exists, create OIDC provider
aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

#### 2.4 Create IAM Role and Policy

```bash
# Create permissions policy
aws iam create-policy \
    --policy-name GitHubActions-ECR-Policy \
    --policy-document file://ecr-permissions-policy.json

# Create IAM Role
aws iam create-role \
    --role-name GitHubActions-ECR-Role \
    --assume-role-policy-document file://github-trust-policy.json

# Attach policy to Role
aws iam attach-role-policy \
    --role-name GitHubActions-ECR-Role \
    --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/GitHubActions-ECR-Policy

# Get Role ARN
aws iam get-role \
    --role-name GitHubActions-ECR-Role \
    --query 'Role.Arn' \
    --output text
```

## GitHub Configuration Steps

### 1. Configure Repository Secrets

In GitHub repository settings, go to `Settings` > `Secrets and variables` > `Actions` > `Secrets` tab, add the following secrets:

| Secret Name      | Value                                                   | Description         |
| ---------------- | ------------------------------------------------------- | ------------------- |
| `AWS_REGION`     | `us-east-1`                                             | AWS region          |
| `ECR_REPOSITORY` | `chatgpt-web`                                           | ECR repository name |
| `ECR_REGISTRY`   | `123456789012.dkr.ecr.us-east-1.amazonaws.com`          | ECR registry URI    |
| `AWS_ROLE_ARN`   | `arn:aws:iam::123456789012:role/GitHubActions-ECR-Role` | IAM Role ARN        |

**Note**:

- Replace `123456789012` with your AWS account ID
- `ECR_REGISTRY` format: `{account-id}.dkr.ecr.{region}.amazonaws.com`

### 2. Verify Configuration

Push code to `main` branch or create a Release to trigger GitHub Action, check if it can successfully push to ECR.

## Workflow Description

### Environment Variables

```yaml
env:
  AWS_REGION: ${{ secrets.AWS_REGION || 'us-east-1' }}
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY || 'chatgpt-web' }}
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}
```

- Supports default values, if `AWS_REGION` is not set, will use `us-east-1`
- `ECR_REGISTRY` must be set, format is complete ECR registry URI

### Permissions Configuration

```yaml
permissions:
  id-token: write # For OIDC authentication
  contents: read # For checking out code
```

### Image Tag Strategy

The workflow automatically generates the following tags:

- `latest` (only on main branch)
- Branch name (e.g., `main`, `develop`)
- Tag name (e.g., `v1.0.0`)
- Git reference name

### Cache Optimization

Uses GitHub Actions cache to speed up builds:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

## Security Best Practices

1. **Principle of Least Privilege**: IAM Role only grants necessary ECR permissions
2. **Conditional Restrictions**: Trust policy restricts only specific repositories can use the Role
3. **No Long-term Credentials**: Use OIDC to avoid storing AWS access keys
4. **Audit Logs**: AWS CloudTrail records all API calls

## Troubleshooting

### Common Errors

#### 1. "No basic auth credentials" Error

```
Error: buildx failed with: error: failed to solve: failed to authorize: rpc error: code = Unknown desc = failed to fetch anonymous token: unexpected status: 401 Unauthorized
```

**Solution**: Check if ECR login is successful, confirm IAM Role has `ecr:GetAuthorizationToken` permission.

#### 2. "Repository does not exist" Error

```
Error: failed to push: failed to do request: Put https://123456789012.dkr.ecr.us-east-1.amazonaws.com/v2/chatgpt-web/manifests/latest: unexpected status: 400 Bad Request
```

**Solution**: Confirm ECR repository is created, repository name is correct.

#### 3. OIDC Authentication Failed

```
Error: Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

**Solution**:

- Check if OIDC provider is correctly configured
- Verify repository path in trust policy is correct
- Confirm GitHub Actions permissions include `id-token: write`

### Debug Steps

1. **Verify AWS Configuration**:

   ```bash
   # Check ECR repository
   aws ecr describe-repositories --repository-names chatgpt-web

   # Check IAM Role
   aws iam get-role --role-name GitHubActions-ECR-Role

   # Test ECR login
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
   ```

2. **Check GitHub Secrets**: Ensure all required secrets are correctly set

3. **View Action Logs**: Check detailed error information in GitHub Actions page

## Multi-Environment Deployment

You can configure different secrets for different environments:

### Development Environment

- `AWS_REGION`: `us-east-1`
- `ECR_REPOSITORY`: `chatgpt-web-dev`
- `ECR_REGISTRY`: `123456789012.dkr.ecr.us-east-1.amazonaws.com`

### Production Environment

- `AWS_REGION`: `us-west-2`
- `ECR_REPOSITORY`: `chatgpt-web-prod`
- `ECR_REGISTRY`: `123456789012.dkr.ecr.us-west-2.amazonaws.com`

Use GitHub Environments feature to set different secrets and approval processes for different environments.

## Cost Optimization

1. **Image Lifecycle Policy**: Configure ECR lifecycle policy to automatically delete old images
2. **Multi-Architecture Builds**: Only build needed architectures (amd64/arm64)
3. **Build Cache**: Use GitHub Actions cache to reduce build time

```bash
# Set ECR lifecycle policy example
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

After configuration, GitHub Actions will automatically use IAM Role authentication to push Docker images to AWS ECR without managing long-term access keys.
