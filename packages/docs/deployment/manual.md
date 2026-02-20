# Manual Deployment Guide

This guide covers manual deployment of ChatGPT Web on your own server or VPS, providing complete control over the deployment environment.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 22.04+ recommended), macOS, or Windows
- **Node.js**: 24.0.0 or higher (LTS recommended)
- **Memory**: Minimum 1GB RAM, 2GB+ recommended
- **Storage**: Minimum 2GB free space
- **Network**: Stable internet connection for API calls

### Required Software

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y curl git build-essential

# Install Node.js 24 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
corepack enable pnpm

# Verify installations
node --version  # Should be 24.x.x
pnpm --version  # Should be 10.x.x
```

```bash
# CentOS/RHEL/Fedora
sudo dnf update
sudo dnf install -y curl git gcc-c++ make

# Install Node.js 24
curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
sudo dnf install -y nodejs

# Install pnpm
corepack enable pnpm
```

```bash
# macOS (using Homebrew)
brew update
brew install node@24 git

# Install pnpm
corepack enable pnpm
```

## Installation

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/cnkang/chatgpt-web.git
cd chatgpt-web

# Or download and extract release
wget https://github.com/cnkang/chatgpt-web/archive/refs/heads/main.zip
unzip main.zip
cd chatgpt-web-main
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
pnpm bootstrap
```

### 3. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# Edit environment files
nano apps/api/.env  # or vim, code, etc.
```

#### Required Environment Variables

```bash
# apps/api/.env

# AI Provider Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
DEFAULT_MODEL=gpt-5.1

# Security
AUTH_SECRET_KEY=your-secure-secret-key-here
SESSION_SECRET=replace-with-a-long-random-string
MAX_REQUEST_PER_HOUR=1000
ALLOWED_ORIGINS=https://your-app.example.com

# Server Configuration
PORT=3002
NODE_ENV=production

# Performance
TIMEOUT_MS=30000
```

#### Optional Environment Variables

```bash
# Azure OpenAI (if using Azure)
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Advanced Configuration
LOG_LEVEL=info
HOST=0.0.0.0

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=1000

# Proxy Configuration (if needed)
HTTPS_PROXY=http://proxy.company.com:8080
```

### 4. Build Application

```bash
# Build all packages (recommended)
pnpm build

# Or build packages individually
pnpm build:web
pnpm build:api
```

## Deployment Methods

### Method 1: Direct Node.js Execution

#### Start Services

```bash
# Start backend service
cd apps/api
pnpm prod &
BACKEND_PID=$!

# Serve frontend (using a simple HTTP server)
cd ..
npx serve apps/web/dist -p 1002 &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
```

#### Create Startup Script

```bash
#!/bin/bash
# start.sh

set -e

# Configuration
BACKEND_PORT=3002
FRONTEND_PORT=1002
LOG_DIR="./logs"

# Create log directory
mkdir -p $LOG_DIR

# Start backend
echo "Starting backend service..."
cd apps/api
nohup pnpm prod > $LOG_DIR/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > $LOG_DIR/backend.pid
cd ..

# Start frontend
echo "Starting frontend service..."
nohup npx serve apps/web/dist -p $FRONTEND_PORT > $LOG_DIR/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > $LOG_DIR/frontend.pid

echo "Services started:"
echo "Backend: http://localhost:$BACKEND_PORT (PID: $BACKEND_PID)"
echo "Frontend: http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
echo "Logs: $LOG_DIR/"
```

```bash
# Make executable and run
chmod +x start.sh
./start.sh
```

#### Create Stop Script

```bash
#!/bin/bash
# stop.sh

LOG_DIR="./logs"

# Stop backend
if [ -f $LOG_DIR/backend.pid ]; then
    BACKEND_PID=$(cat $LOG_DIR/backend.pid)
    echo "Stopping backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || echo "Backend already stopped"
    rm -f $LOG_DIR/backend.pid
fi

# Stop frontend
if [ -f $LOG_DIR/frontend.pid ]; then
    FRONTEND_PID=$(cat $LOG_DIR/frontend.pid)
    echo "Stopping frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || echo "Frontend already stopped"
    rm -f $LOG_DIR/frontend.pid
fi

echo "Services stopped"
```

### Method 2: PM2 Process Manager

#### Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Or using pnpm
pnpm add -g pm2
```

#### Create PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'chatgpt-web-backend',
      cwd: './apps/api',
      script: 'pnpm',
      args: 'prod',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
    },
    {
      name: 'chatgpt-web-frontend',
      script: 'npx',
      args: 'serve apps/web/dist -p 1002',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
    },
  ],
}
```

#### PM2 Commands

```bash
# Start applications
pm2 start ecosystem.config.js

# Monitor applications
pm2 monit

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Stop applications
pm2 stop all

# Delete applications
pm2 delete all

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command
```

### Method 3: Systemd Service (Linux)

#### Create Backend Service

```bash
# Create service file
sudo nano /etc/systemd/system/chatgpt-web-backend.service
```

```ini
[Unit]
Description=ChatGPT Web Backend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/chatgpt-web/apps/api
Environment=NODE_ENV=production
Environment=PORT=3002
ExecStart=/usr/bin/pnpm prod
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=chatgpt-web-backend

[Install]
WantedBy=multi-user.target
```

#### Create Frontend Service

```bash
# Create service file
sudo nano /etc/systemd/system/chatgpt-web-frontend.service
```

```ini
[Unit]
Description=ChatGPT Web Frontend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/chatgpt-web
ExecStart=/usr/bin/npx serve apps/web/dist -p 1002
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=chatgpt-web-frontend

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable chatgpt-web-backend
sudo systemctl enable chatgpt-web-frontend

# Start services
sudo systemctl start chatgpt-web-backend
sudo systemctl start chatgpt-web-frontend

# Check status
sudo systemctl status chatgpt-web-backend
sudo systemctl status chatgpt-web-frontend

# View logs
sudo journalctl -u chatgpt-web-backend -f
sudo journalctl -u chatgpt-web-frontend -f
```

## Reverse Proxy Configuration

### Nginx Configuration

#### Install Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo dnf install nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Create Nginx Configuration

```bash
# Create site configuration
sudo nano /etc/nginx/sites-available/chatgpt-web
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API Proxy
    location /api {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend Static Files
    location / {
        proxy_pass http://127.0.0.1:1002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Static file caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://127.0.0.1:1002;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:3002/health;
        access_log off;
    }
}
```

#### Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/chatgpt-web /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Apache Configuration

```apache
# /etc/apache2/sites-available/chatgpt-web.conf
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    ServerAlias www.your-domain.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key

    # Security Headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # API Proxy
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:3002/api
    ProxyPassReverse /api http://127.0.0.1:3002/api

    # Frontend Proxy
    ProxyPass / http://127.0.0.1:1002/
    ProxyPassReverse / http://127.0.0.1:1002/
</VirtualHost>
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run

# Setup automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Self-Signed Certificate (Development)

```bash
# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/chatgpt-web.key \
    -out /etc/ssl/certs/chatgpt-web.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

## Monitoring and Maintenance

### Log Management

```bash
# Create log rotation configuration
sudo nano /etc/logrotate.d/chatgpt-web
```

```
/path/to/chatgpt-web/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload chatgpt-web-backend
        systemctl reload chatgpt-web-frontend
    endscript
}
```

### Health Monitoring Script

```bash
#!/bin/bash
# health-check.sh

BACKEND_URL="http://localhost:3002/health"
FRONTEND_URL="http://localhost:1002"
LOG_FILE="/var/log/chatgpt-web-health.log"

check_service() {
    local url=$1
    local name=$2

    if curl -f -s $url > /dev/null; then
        echo "$(date): $name is healthy" >> $LOG_FILE
        return 0
    else
        echo "$(date): $name is unhealthy" >> $LOG_FILE
        return 1
    fi
}

# Check backend
if ! check_service $BACKEND_URL "Backend"; then
    echo "$(date): Restarting backend service" >> $LOG_FILE
    systemctl restart chatgpt-web-backend
fi

# Check frontend
if ! check_service $FRONTEND_URL "Frontend"; then
    echo "$(date): Restarting frontend service" >> $LOG_FILE
    systemctl restart chatgpt-web-frontend
fi
```

```bash
# Make executable
chmod +x health-check.sh

# Add to crontab (check every 5 minutes)
crontab -e
# Add: */5 * * * * /path/to/health-check.sh
```

### Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/chatgpt-web"
SOURCE_DIR="/path/to/chatgpt-web"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/chatgpt-web-$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs \
    $SOURCE_DIR

# Keep only last 7 backups
find $BACKUP_DIR -name "chatgpt-web-*.tar.gz" -mtime +7 -delete

echo "Backup completed: chatgpt-web-$DATE.tar.gz"
```

## Security Hardening

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### User Security

```bash
# Create dedicated user
sudo useradd -r -s /bin/false chatgpt-web

# Set ownership
sudo chown -R chatgpt-web:chatgpt-web /path/to/chatgpt-web

# Set permissions
sudo chmod -R 755 /path/to/chatgpt-web
sudo chmod 600 /path/to/chatgpt-web/apps/api/.env
```

### Environment Security

```bash
# Secure environment file
sudo chmod 600 apps/api/.env
sudo chown chatgpt-web:chatgpt-web apps/api/.env

# Remove sensitive data from shell history
history -c
unset HISTFILE
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3002
sudo netstat -tulpn | grep :3002

# Kill process
sudo kill -9 <PID>
```

#### Permission Denied

```bash
# Fix ownership
sudo chown -R $USER:$USER /path/to/chatgpt-web

# Fix permissions
chmod +x start.sh stop.sh
```

#### Service Won't Start

```bash
# Check logs
sudo journalctl -u chatgpt-web-backend -f
tail -f logs/backend.log

# Check environment
env | grep -E '^(NODE_|OPENAI_|AI_)'

# Test manually
cd apps/api
pnpm prod
```

### Performance Tuning

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize Node.js
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable compression in Nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

This manual deployment guide provides comprehensive instructions for deploying ChatGPT Web on your own infrastructure with full control over the environment and configuration.
