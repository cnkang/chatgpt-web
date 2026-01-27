# Kubernetes Deployment Guide

This guide covers deploying ChatGPT Web on Kubernetes clusters with comprehensive configuration examples.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Container registry access
- Basic understanding of Kubernetes concepts

## Quick Start

### 1. Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: chatgpt-web
  labels:
    name: chatgpt-web
```

```bash
kubectl apply -f namespace.yaml
```

### 2. Create Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: chatgpt-secrets
  namespace: chatgpt-web
type: Opaque
data:
  # Base64 encoded values
  OPENAI_API_KEY: <base64-encoded-openai-key>
  AUTH_SECRET_KEY: <base64-encoded-auth-secret>
  # For Azure OpenAI (optional)
  AZURE_OPENAI_API_KEY: <base64-encoded-azure-key>
```

```bash
# Create secrets from command line
kubectl create secret generic chatgpt-secrets \
  --from-literal=OPENAI_API_KEY=sk-your-openai-key \
  --from-literal=AUTH_SECRET_KEY=your-secret-key \
  --namespace=chatgpt-web

# Or apply from file
kubectl apply -f secrets.yaml
```

### 3. Create ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-config
  namespace: chatgpt-web
data:
  NODE_ENV: 'production'
  AI_PROVIDER: 'openai'
  DEFAULT_MODEL: 'gpt-4o'
  MAX_REQUEST_PER_HOUR: '1000'
  TIMEOUT_MS: '30000'
  LOG_LEVEL: 'info'
  PORT: '3002'
```

```bash
kubectl apply -f configmap.yaml
```

### 4. Deploy Application

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
  namespace: chatgpt-web
  labels:
    app: chatgpt-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chatgpt-web
  template:
    metadata:
      labels:
        app: chatgpt-web
    spec:
      containers:
        - name: chatgpt-web
          image: your-registry/chatgpt-web:<git-sha>
          ports:
            - containerPort: 3002
              name: http

          envFrom:
            - configMapRef:
                name: chatgpt-config
            - secretRef:
                name: chatgpt-secrets

          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'

          livenessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          securityContext:
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            runAsUser: 1000
            capabilities:
              drop:
                - ALL
```

```bash
kubectl apply -f deployment.yaml
```

### 5. Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: chatgpt-web-service
  namespace: chatgpt-web
  labels:
    app: chatgpt-web
spec:
  selector:
    app: chatgpt-web
  ports:
    - name: http
      port: 80
      targetPort: 3002
      protocol: TCP
  type: ClusterIP
```

```bash
kubectl apply -f service.yaml
```

### 6. Create Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: chatgpt-web-ingress
  namespace: chatgpt-web
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
spec:
  tls:
    - hosts:
        - chatgpt.yourdomain.com
      secretName: chatgpt-web-tls
  rules:
    - host: chatgpt.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: chatgpt-web-service
                port:
                  number: 80
```

```bash
kubectl apply -f ingress.yaml
```

## Advanced Configurations

### High Availability Setup

```yaml
# ha-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
  namespace: chatgpt-web
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1

  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - chatgpt-web
                topologyKey: kubernetes.io/hostname

      containers:
        - name: chatgpt-web
          image: your-registry/chatgpt-web:<git-sha>

          # Resource limits for production
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'

          # Enhanced health checks
          livenessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 60
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 2
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chatgpt-web-hpa
  namespace: chatgpt-web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chatgpt-web
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

### Pod Disruption Budget

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: chatgpt-web-pdb
  namespace: chatgpt-web
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: chatgpt-web
```

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chatgpt-web-netpol
  namespace: chatgpt-web
spec:
  podSelector:
    matchLabels:
      app: chatgpt-web
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3002
  egress:
    - to: []
      ports:
        - protocol: TCP
          port: 443 # HTTPS for OpenAI API
        - protocol: TCP
          port: 53 # DNS
        - protocol: UDP
          port: 53 # DNS
```

## Multi-Environment Setup

### Development Environment

```yaml
# dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: chatgpt-web-dev

resources:
  - ../base

patchesStrategicMerge:
  - deployment-dev.yaml
  - configmap-dev.yaml

images:
  - name: your-registry/chatgpt-web
    newTag: dev
```

```yaml
# dev/deployment-dev.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: chatgpt-web
          resources:
            requests:
              memory: '128Mi'
              cpu: '100m'
            limits:
              memory: '256Mi'
              cpu: '200m'
```

```yaml
# dev/configmap-dev.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-config
data:
  NODE_ENV: 'development'
  LOG_LEVEL: 'debug'
  MAX_REQUEST_PER_HOUR: '100'
```

### Production Environment

```yaml
# prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: chatgpt-web-prod

resources:
  - ../base

patchesStrategicMerge:
  - deployment-prod.yaml
  - configmap-prod.yaml

images:
  - name: your-registry/chatgpt-web
    newTag: latest
```

```yaml
# prod/deployment-prod.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: chatgpt-web
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
```

## Monitoring and Observability

### ServiceMonitor for Prometheus

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: chatgpt-web-metrics
  namespace: chatgpt-web
  labels:
    app: chatgpt-web
spec:
  selector:
    matchLabels:
      app: chatgpt-web
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

### Grafana Dashboard ConfigMap

```yaml
# grafana-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: chatgpt-web-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: '1'
data:
  chatgpt-web.json: |
    {
      "dashboard": {
        "title": "ChatGPT Web",
        "panels": [
          {
            "title": "Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total{job=\"chatgpt-web\"}[5m])"
              }
            ]
          }
        ]
      }
    }
```

## Security Hardening

### Security Context

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatgpt-web
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: chatgpt-web
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /app/.cache

      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

### RBAC Configuration

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: chatgpt-web
  namespace: chatgpt-web

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: chatgpt-web-role
  namespace: chatgpt-web
rules:
  - apiGroups: ['']
    resources: ['configmaps', 'secrets']
    verbs: ['get', 'list']

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: chatgpt-web-rolebinding
  namespace: chatgpt-web
subjects:
  - kind: ServiceAccount
    name: chatgpt-web
    namespace: chatgpt-web
roleRef:
  kind: Role
  name: chatgpt-web-role
  apiGroup: rbac.authorization.k8s.io
```

## Backup and Disaster Recovery

### Velero Backup

```yaml
# backup.yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: chatgpt-web-backup
  namespace: velero
spec:
  includedNamespaces:
    - chatgpt-web
  storageLocation: default
  ttl: 720h0m0s

---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: chatgpt-web-daily-backup
  namespace: velero
spec:
  schedule: '0 2 * * *'
  template:
    includedNamespaces:
      - chatgpt-web
    storageLocation: default
    ttl: 720h0m0s
```

## Deployment Scripts

### Deploy Script

```bash
#!/bin/bash
# deploy.sh

set -e

NAMESPACE=${NAMESPACE:-chatgpt-web}
IMAGE_TAG=${IMAGE_TAG:-your-tag}

echo "Deploying ChatGPT Web to namespace: $NAMESPACE"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply configurations
kubectl apply -f secrets.yaml -n $NAMESPACE
kubectl apply -f configmap.yaml -n $NAMESPACE
kubectl apply -f deployment.yaml -n $NAMESPACE
kubectl apply -f service.yaml -n $NAMESPACE
kubectl apply -f ingress.yaml -n $NAMESPACE

# Wait for deployment to be ready
kubectl rollout status deployment/chatgpt-web -n $NAMESPACE --timeout=300s

echo "Deployment completed successfully!"
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

NAMESPACE=${NAMESPACE:-chatgpt-web}
SERVICE_NAME=${SERVICE_NAME:-chatgpt-web-service}

# Check if pods are running
echo "Checking pod status..."
kubectl get pods -n $NAMESPACE -l app=chatgpt-web

# Check service endpoints
echo "Checking service endpoints..."
kubectl get endpoints -n $NAMESPACE $SERVICE_NAME

# Test health endpoint
echo "Testing health endpoint..."
kubectl port-forward -n $NAMESPACE svc/$SERVICE_NAME 8080:80 &
PF_PID=$!

sleep 5

if curl -f http://localhost:8080/health; then
    echo "Health check passed!"
else
    echo "Health check failed!"
    exit 1
fi

kill $PF_PID
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n chatgpt-web

# Describe pod for events
kubectl describe pod <pod-name> -n chatgpt-web

# Check logs
kubectl logs <pod-name> -n chatgpt-web
```

#### Service Not Accessible

```bash
# Check service
kubectl get svc -n chatgpt-web

# Check endpoints
kubectl get endpoints -n chatgpt-web

# Test service connectivity
kubectl run test-pod --image=curlimages/curl -it --rm -- sh
curl http://chatgpt-web-service.chatgpt-web.svc.cluster.local
```

#### Ingress Issues

```bash
# Check ingress
kubectl get ingress -n chatgpt-web

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Debugging Commands

```bash
# Get all resources
kubectl get all -n chatgpt-web

# Check resource usage
kubectl top pods -n chatgpt-web

# Check events
kubectl get events -n chatgpt-web --sort-by='.lastTimestamp'

# Execute into pod
kubectl exec -it <pod-name> -n chatgpt-web -- sh
```

This Kubernetes deployment guide provides comprehensive configuration for deploying ChatGPT Web in production environments with high availability, security, and monitoring capabilities.
