# Kubernetes Deployment

This directory contains a baseline deployment for `chatgpt-web`.

## 1) Set your image

Edit `kubernetes/deploy.yaml` and replace:

- `ghcr.io/your-org/chatgpt-web:latest`

with your published image.

## 2) Create required Secret

Create a secret named `chatgpt-web-secrets` in the target namespace.

Example:

```bash
kubectl create secret generic chatgpt-web-secrets \
  --from-literal=OPENAI_API_KEY='sk-xxx' \
  --from-literal=AUTH_SECRET_KEY='replace-with-strong-secret'
```

If you use access-token mode, add `OPENAI_ACCESS_TOKEN` to the same secret.

## 3) Apply manifests

```bash
kubectl apply -f kubernetes/deploy.yaml
```

## 4) Optional ingress

Edit host/TLS values in `kubernetes/ingress.yaml`, then apply:

```bash
kubectl apply -f kubernetes/ingress.yaml
```

## 5) Verify

```bash
kubectl get pods -l app=chatgpt-web
kubectl get svc chatgpt-web
```

## Runtime Hardening Notes

- The deployment template enables `TRUST_PROXY=1`, which matches a common "single ingress hop" topology.
- If your cluster has multiple trusted proxy hops, set `TRUST_PROXY` to the correct hop count.
- If the service is directly exposed without ingress/proxy, set `TRUST_PROXY=false`.
- Optional boundary controls you can tune in `kubernetes/deploy.yaml`:
  - `JSON_BODY_LIMIT`
  - `MAX_PROMPT_CHARS`
  - `MAX_SYSTEM_MESSAGE_CHARS`
  - `MAX_VERIFY_TOKEN_CHARS`
  - `USAGE_REQUEST_TIMEOUT_MS`
