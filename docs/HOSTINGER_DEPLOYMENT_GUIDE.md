# Hostinger VPS & Production Architecture Guide

This project is organized into two independent production-ready applications:

1. **`frontend/`**: Standalone React + Vite + TypeScript web application (`https://ecybercafe.in`).
2. **`backend/`**: Standalone Express + Node.js + TypeScript REST API backend server (`https://api.ecybercafe.in`).

---

## 📁 Storage Directory Structure
- **Persistent Database File**: `/var/lib/ecybercafe/database.json`
- **File Uploads Storage**: `/var/lib/ecybercafe/uploads`

---

## 🚀 Step-by-Step Production Setup on Hostinger VPS

### 1. Persistent Storage Directory Setup
Run as `root` or `sudo` user on Hostinger VPS:
```bash
sudo mkdir -p /var/lib/ecybercafe/uploads
sudo chmod -R 777 /var/lib/ecybercafe
```

### 2. Deploying the Backend API (`api.ecybercafe.in`)
```bash
cd /var/www/ecybercafe/backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
# Ensure .env contains:
# PORT=3000
# STORAGE_DIR=/var/lib/ecybercafe
# ALLOWED_ORIGINS=https://ecybercafe.in,https://www.ecybercafe.in

# Build production CommonJS executable
npm run build

# Start using PM2
pm2 start ecosystem.config.cjs
pm2 save
```

### 3. Deploying the Frontend (`ecybercafe.in`)
```bash
cd /var/www/ecybercafe/frontend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
# Ensure .env contains:
# VITE_API_URL=https://api.ecybercafe.in

# Build production static bundle
npm run build
```

---

## 🌐 Nginx Reverse Proxy Configuration

Place the following configuration in `/etc/nginx/sites-available/ecybercafe`:

```nginx
# 1. FRONTEND SERVER BLOCK (ecybercafe.in)
server {
    listen 80;
    server_name ecybercafe.in www.ecybercafe.in;

    root /var/www/ecybercafe/frontend/dist;
    index index.html;

    client_max_body_size 50M;

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /uploads/ {
        alias /var/lib/ecybercafe/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 2. BACKEND API SERVER BLOCK (api.ecybercafe.in)
server {
    listen 80;
    server_name api.ecybercafe.in;

    client_max_body_size 50M;

    proxy_connect_timeout 300s;
    proxy_send_timeout    300s;
    proxy_read_timeout    300s;
    send_timeout          300s;

    location /uploads/ {
        alias /var/lib/ecybercafe/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 Safe Future Code Updates (Zero Data Loss)

When pushing new feature updates to GitHub and pulling them on VPS, follow these commands. Because `/var/lib/ecybercafe/database.json` and `/var/lib/ecybercafe/uploads` live outside the repository path, your live users and database will **NEVER** be overwritten or deleted!

```bash
# 1. Go to project folder
cd /var/www/ecybercafe

# 2. Backup database before update (Optional Safety Step)
cp /var/lib/ecybercafe/database.json /var/lib/ecybercafe/database_backup_$(date +%Y%m%d_%H%M%S).json

# 3. Pull latest code from GitHub
git pull origin main

# 4. Build & Restart Backend Service
cd /var/www/ecybercafe/backend
npm install
npm run build
pm2 reload ecosystem.config.cjs || pm2 restart ecosystem.config.cjs

# 5. Build Frontend Static Assets
cd /var/www/ecybercafe/frontend
npm install
npm run build

echo "✅ All features updated successfully without touching production database!"
```

