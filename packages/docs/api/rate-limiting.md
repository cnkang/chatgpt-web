# Rate Limiting

The API implements two-tier rate limiting to prevent abuse and ensure fair usage across all clients.

## Rate Limiting Tiers

### General Rate Limit

Applied to most endpoints for normal operations:

- **Limit**: 100 requests per hour (configurable)
- **Window**: 60 minutes (3600000 milliseconds)
- **Applies to**:
  - `GET /health`
  - `POST /chat-process`
  - `POST /config`
  - `POST /session`

### Strict Rate Limit

Applied to authentication endpoint for enhanced security:

- **Limit**: 10 requests per 15 minutes (hardcoded)
- **Window**: 15 minutes (900000 milliseconds)
- **Applies to**:
  - `POST /verify`

## Configuration

### General Rate Limit

Configure via environment variable:

```bash
# Set maximum requests per hour (default: 100)
MAX_REQUEST_PER_HOUR=200
```

### Strict Rate Limit

The strict rate limit for `/verify` is hardcoded to 10 requests per 15 minutes for security and cannot be changed via environment variables.

## Rate Limit Headers

All responses include rate limit information in headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640998800
```

### Header Descriptions

- `X-RateLimit-Limit`: Maximum requests allowed in the current window
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp (seconds) when the rate limit resets

## Rate Limit Exceeded Response

When a client exceeds the rate limit, the API returns HTTP 429 (Too Many Requests):

### General Rate Limit Exceeded

```json
{
  "status": "Fail",
  "message": "Too many requests from this IP, please try again after 60 minutes",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "type": "RateLimitError",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

### Strict Rate Limit Exceeded

```json
{
  "status": "Fail",
  "message": "Too many authentication attempts, please try again after 15 minutes",
  "data": null,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "type": "RateLimitError",
    "timestamp": "2026-01-27T12:00:00.000Z"
  }
}
```

## Implementation Details

Rate limiting is implemented using in-memory tracking per client IP address:

- **Storage**: In-memory Map (per-process)
- **Key**: Client IP address from request
- **Tracking**: Request count and reset timestamp per IP
- **Cleanup**: Expired entries removed every 60 seconds

### Key Files

- `apps/api/src/middleware-native/rate-limiter.ts` - Rate limiter implementation
- `apps/api/src/middleware-native/index.ts` - Middleware factory functions
- `apps/api/src/index.ts` - Rate limiter registration

## Client IP Detection

The rate limiter uses the client IP address from:

1. `X-Forwarded-For` header (if behind proxy)
2. `X-Real-IP` header (if behind proxy)
3. Direct connection IP address

## Distributed Deployments

**Important**: The current rate limiter uses in-memory storage, which means:

- Rate limits are per-process, not global
- Multiple server instances have independent rate limits
- A client can make 100 req/hour to each instance

For distributed deployments, consider:

- Using Redis for shared rate limit storage
- Implementing a distributed rate limiter
- Using a reverse proxy with rate limiting (nginx, CloudFlare)

## Recommended Production Settings

### Low-Traffic Applications

```bash
MAX_REQUEST_PER_HOUR=100
```

### Medium-Traffic Applications

```bash
MAX_REQUEST_PER_HOUR=200
```

### High-Traffic Applications

```bash
MAX_REQUEST_PER_HOUR=500
```

### Behind CDN/Reverse Proxy

If using CloudFlare, nginx, or AWS ALB with rate limiting:

```bash
# Disable or increase backend rate limit
MAX_REQUEST_PER_HOUR=1000
```

Let the CDN/proxy handle rate limiting at the edge.

## Monitoring Rate Limits

Monitor rate limit effectiveness by:

1. **Logging 429 responses** - Track how often clients hit limits
2. **Analyzing X-RateLimit-\* headers** - Monitor usage patterns
3. **Tracking unique IPs** - Identify potential abuse
4. **Adjusting limits** - Based on legitimate usage patterns

## Best Practices

### For API Consumers

- **Monitor headers**: Check `X-RateLimit-Remaining` before making requests
- **Implement backoff**: Wait for `X-RateLimit-Reset` when limit exceeded
- **Cache responses**: Reduce unnecessary API calls
- **Batch requests**: Combine multiple operations when possible

### For API Operators

- **Set appropriate limits**: Balance security and usability
- **Monitor abuse patterns**: Identify and block malicious IPs
- **Use reverse proxy**: Offload rate limiting to edge when possible
- **Consider Redis**: For distributed deployments
- **Log rate limit hits**: Track and analyze 429 responses
