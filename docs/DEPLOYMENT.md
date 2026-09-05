# 🛡️ Production Deployment & Zero Data Loss System Guide
**Target Operating System:** Hostinger Ubuntu 24.04 / 22.04 LTS VPS  
**Application Stack:** Node.js 20+ (Express + Vite + React + TypeScript), Nginx, PM2, Certbot SSL  
**Domain/Portal:** Citizen Services & eCyberCafe Portal (`ecybercafe`)  

---

## 📐 1. Architecture & Zero Data Loss Strategy

To ensure **100% data safety** during future code updates, all user-generated data, customer uploads, application forms, wallet balances, and database files are **isolated outside the git application directory**:

```
/var/www/ecybercafe/
├── app/                        <-- Application Code (Managed via Git)
│   ├── dist/
│   ├── server.ts
│   ├── package.json
│   ├── ecosystem.config.cjs
│   ├── .env                    <-- Environment variables (Never overwritten)
│   ├── public/uploads -> symlink to /var/www/ecybercafe/storage/uploads
│   └── deploy.sh
│
├── storage/                    <-- PERSISTENT STORAGE (NEVER overwritten)
│   ├── database.json           <-- Main JSON Database
│   └── uploads/                <-- All customer PDFs, images, applicant photos
│
├── backups/                    <-- AUTOMATED BACKUPS (Created before every deploy)
│   ├── db_20260726_120000.json
│   ├── env_20260726_120000
│   └── uploads_20260726_120000.tar.gz
│
└── logs/                       <-- PM2 & System Logs
    ├── app.log
    ├── error.log
    └── out.log
```

---

## 🚀 2. Initial Hostinger Ubuntu VPS Setup (First Time Only)

Connect to your Hostinger VPS via SSH:
```bash
ssh root@YOUR_SERVER_IP
```

### Step 2.1: Update Server & Install System Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx tar unzip
```

### Step 2.2: Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Step 2.3: Create Directory Structure
```bash
sudo mkdir -p /var/www/ecybercafe/app
sudo mkdir -p /var/www/ecybercafe/storage/uploads
sudo mkdir -p /var/www/ecybercafe/backups
sudo mkdir -p /var/www/ecybercafe/logs

# Set directory ownership
sudo chown -R $USER:$USER /var/www/ecybercafe
sudo chmod -R 755 /var/www/ecybercafe
```

---

## 📥 3. Clone Code & Configure Production Environment

### Step 3.1: Clone Application Code
```bash
cd /var/www/ecybercafe/app
git clone YOUR_GIT_REPOSITORY_URL .
```

### Step 3.2: Create `.env` Production Configuration
Create `.env` inside `/var/www/ecybercafe/app/.env`:
```bash
nano /var/www/ecybercafe/app/.env
```

Add your production configuration:
```env
PORT=3000
NODE_ENV=production
STORAGE_DIR=/var/www/ecybercafe/storage
DB_FILE_PATH=/var/www/ecybercafe/storage/database.json
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_production_super_secret_jwt_key_2026
```

---

## ⚙️ 4. Nginx Reverse Proxy & Static Asset Setup

Create the Nginx server configuration:
```bash
sudo nano /etc/nginx/sites-available/ecybercafe
```

Paste the following configuration (replace `yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Client body upload size limit (50MB)
    client_max_body_size 50M;

    # Direct static serving for persistent uploads
    location /uploads/ {
        alias /var/www/ecybercafe/storage/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    # Proxy all application requests to Node.js / Express
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    error_log  /var/www/ecybercafe/logs/nginx_error.log;
    access_log /var/www/ecybercafe/logs/nginx_access.log;
}
```

Enable site & restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ecybercafe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 5. Install Free SSL Certificate (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔄 6. Zero Data Loss Deployment Workflow (`./deploy.sh`)

Whenever you push new code changes or feature updates to GitHub/GitLab, deploy safely on your Hostinger VPS by running:

```bash
cd /var/www/ecybercafe/app
./deploy.sh
```

### What `./deploy.sh` automatically does:
1. 📸 **Instant Pre-Deployment Backups**: Creates timestamped backups of `database.json`, `.env`, and all uploaded files in `/var/www/ecybercafe/backups/`.
2. 🔄 **Git Synchronization**: Pulls only updated source code (`git pull`) without touching persistent storage.
3. 🔗 **Symlink Verification**: Verifies `public/uploads` points directly to `/var/www/ecybercafe/storage/uploads`.
4. 📦 **Dependency Installation**: Runs `npm install` safely.
5. ⚡ **Production Build**: Compiles Vite assets and ESBuild server bundle into `dist/server.cjs`.
6. 🚀 **Zero Downtime Reload**: Reloads PM2 process gracefully (`pm2 reload`).
7. 🩺 **Health Check Verification**: Verifies HTTP 200 response from `/api/health`.

---

## 🆘 7. Emergency 1-Click Rollback Procedure

If a deployed update contains bugs, you can rollback instantly to the previous state in 3 seconds:

### Step 7.1: List Recent Backups
```bash
ls -lt /var/www/ecybercafe/backups/
```

### Step 7.2: Restore Database & Restart PM2
```bash
# Example: Restore database from timestamp 20260726_120000
cp /var/www/ecybercafe/backups/db_20260726_120000.json /var/www/ecybercafe/storage/database.json

# Restart PM2
pm2 reload ecybercafe
```

---

## 🛠️ 8. Useful PM2 & Service Commands

```bash
# Check status of application
pm2 status

# View live application logs
pm2 logs ecybercafe

# Restart application
pm2 restart ecybercafe

# View memory/CPU usage
pm2 monit

# Save PM2 state so it auto-starts on VPS reboot
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

---

## 🎯 Summary Guarantee
- **Database Records**: Preserved in `/var/www/ecybercafe/storage/database.json`.
- **Uploaded Files**: Preserved in `/var/www/ecybercafe/storage/uploads/`.
- **Environment File**: Preserved in `/var/www/ecybercafe/app/.env`.
- **Code Updates**: Handled incrementally using `git pull` and `./deploy.sh`.
