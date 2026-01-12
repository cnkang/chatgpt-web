# Deployment Documentation

This directory contains deployment guides and configurations for the ChatGPT Web monorepo.

## Available Guides

- **[Docker Deployment](./docker.md)** - Containerized deployment with Docker
- **[Kubernetes Deployment](./kubernetes.md)** - Kubernetes cluster deployment
- **[AWS ECR Deployment](./aws-ecr.md)** - AWS container registry deployment
- **[Railway Deployment](./railway.md)** - Railway platform deployment
- **[Manual Deployment](./manual.md)** - Manual server deployment
- **[Environment Configuration](./environment.md)** - Production environment setup

## Deployment Options

### Quick Deployment

For rapid deployment:

1. **Railway** - One-click deployment with environment variables
2. **Docker** - Containerized deployment for any platform
3. **Sealos** - Cloud-native deployment platform

### Production Deployment

For production environments:

1. **Kubernetes** - Scalable container orchestration
2. **AWS ECR** - Enterprise container deployment
3. **Manual** - Custom server deployment

## Prerequisites

All deployment methods require:

- **OpenAI API Key** - Official API access
- **Node.js 24+** - Runtime environment (for manual deployment)
- **Container Runtime** - Docker or compatible (for containerized deployment)

## Security Considerations

- Use environment-specific API keys
- Enable authentication in production
- Configure rate limiting
- Set up proper logging and monitoring
- Use HTTPS in production environments

## Quick Start

Choose your deployment method:

- **New to deployment?** Start with [Railway](./railway.md)
- **Using containers?** See [Docker](./docker.md)
- **Enterprise deployment?** Check [Kubernetes](./kubernetes.md)
- **AWS user?** Review [AWS ECR](./aws-ecr.md)
