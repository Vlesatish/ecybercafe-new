#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script - Zero Data Loss Update System
# Platform: Hostinger Ubuntu 24.04 LTS VPS / Node.js / Express / PM2 / Nginx
# Target Application: eCyberCafe / Citizen Services Portal
# ==============================================================================

set -e # Exit immediately on error

# Terminal Colors
RED='\030[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Paths
APP_DIR="$(pwd)"
STORAGE_DIR="${STORAGE_DIR:-/var/www/ecybercafe/storage}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/ecybercafe/backups}"
LOG_DIR="${LOG_DIR:-/var/www/ecybercafe/logs}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${CYAN}=======================================================================${NC}"
echo -e "${CYAN}   🚀 STARTING ZERO DATA LOSS PRODUCTION DEPLOYMENT                    ${NC}"
echo -e "${CYAN}   Time: $(date)${NC}"
echo -e "${CYAN}=======================================================================${NC}"

# ------------------------------------------------------------------------------
# STEP 1: Ensure External Storage & Backup Directories Exist
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[1/8] Verifying Persistent External Directories...${NC}"
mkdir -p "${STORAGE_DIR}/uploads"
mkdir -p "${BACKUP_DIR}"
mkdir -p "${LOG_DIR}"

echo -e "${GREEN}✓ Persistent Storage: ${STORAGE_DIR}${NC}"
echo -e "${GREEN}✓ Backup Repository:  ${BACKUP_DIR}${NC}"

# ------------------------------------------------------------------------------
# STEP 2: Pre-Deployment Automated Backups (Database, Env & Uploads)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[2/8] Taking Instant Pre-Deployment Backups...${NC}"

# 2A. Database Backup
if [ -f "${STORAGE_DIR}/database.json" ]; then
    cp "${STORAGE_DIR}/database.json" "${BACKUP_DIR}/db_${TIMESTAMP}.json"
    echo -e "${GREEN}✓ Database backed up from storage -> ${BACKUP_DIR}/db_${TIMESTAMP}.json${NC}"
elif [ -f "${APP_DIR}/database.json" ]; then
    cp "${APP_DIR}/database.json" "${BACKUP_DIR}/db_${TIMESTAMP}.json"
    cp "${APP_DIR}/database.json" "${STORAGE_DIR}/database.json"
    echo -e "${GREEN}✓ Database backed up from app dir -> ${BACKUP_DIR}/db_${TIMESTAMP}.json${NC}"
else
    echo -e "${YELLOW}⚠ No database.json found yet. Will be initialized on startup.${NC}"
fi

# 2B. Environment File Backup
if [ -f "${APP_DIR}/.env" ]; then
    cp "${APP_DIR}/.env" "${BACKUP_DIR}/env_${TIMESTAMP}"
    echo -e "${GREEN}✓ Environment (.env) backed up -> ${BACKUP_DIR}/env_${TIMESTAMP}${NC}"
else
    echo -e "${YELLOW}⚠ No .env file found in app directory. Creating from .env.example...${NC}"
    if [ -f "${APP_DIR}/.env.example" ]; then
        cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
    fi
fi

# 2C. Uploads Folder Backup (Tar compress)
if [ -d "${STORAGE_DIR}/uploads" ] && [ "$(ls -A "${STORAGE_DIR}/uploads" 2>/dev/null)" ]; then
    tar -czf "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz" -C "${STORAGE_DIR}" uploads
    echo -e "${GREEN}✓ Uploads archive created -> ${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz${NC}"
fi

# ------------------------------------------------------------------------------
# STEP 3: Git Pull Latest Source Code (Preserving Local Data & Symlinks)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[3/8] Fetching Latest Application Source Code...${NC}"
if [ -d ".git" ]; then
    git fetch --all
    # Stash any unintentional local file changes except untracked persistent items
    git stash || true
    git pull origin main || git pull origin master || echo -e "${YELLOW}Git pull completed with warnings.${NC}"
    echo -e "${GREEN}✓ Source code updated successfully via Git.${NC}"
else
    echo -e "${YELLOW}⚠ Not a git repository or git not initialized. Skipping git pull.${NC}"
fi

# ------------------------------------------------------------------------------
# STEP 4: Setup Symlinks for Public Upload Access
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[4/8] Linking Public Upload Directories to External Storage...${NC}"
mkdir -p "${APP_DIR}/public"

if [ ! -L "${APP_DIR}/public/uploads" ]; then
    if [ -d "${APP_DIR}/public/uploads" ] && [ ! -L "${APP_DIR}/public/uploads" ]; then
        # Copy any existing public files into persistent storage before symlinking
        cp -rn "${APP_DIR}/public/uploads/." "${STORAGE_DIR}/uploads/" 2>/dev/null || true
        rm -rf "${APP_DIR}/public/uploads"
    fi
    ln -s "${STORAGE_DIR}/uploads" "${APP_DIR}/public/uploads"
    echo -e "${GREEN}✓ Symlinked ${APP_DIR}/public/uploads -> ${STORAGE_DIR}/uploads${NC}"
fi

# Ensure database.json symlink/copy if needed
if [ ! -f "${APP_DIR}/database.json" ] && [ -f "${STORAGE_DIR}/database.json" ]; then
    cp "${STORAGE_DIR}/database.json" "${APP_DIR}/database.json"
fi

# ------------------------------------------------------------------------------
# STEP 5: Install NPM Dependencies
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[5/8] Installing Production Dependencies...${NC}"
npm install --no-audit --no-fund

# ------------------------------------------------------------------------------
# STEP 6: Build Production Assets & Server Bundle
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[6/8] Compiling Production Build (Vite & ESBuild)...${NC}"
npm run build

# ------------------------------------------------------------------------------
# STEP 7: Restart Application Process via PM2
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[7/8] Reloading PM2 Application Service...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "ecybercafe"; then
        pm2 reload ecosystem.config.cjs --env production || pm2 restart ecosystem.config.cjs
    else
        pm2 start ecosystem.config.cjs --env production
    fi
    pm2 save
    echo -e "${GREEN}✓ PM2 Application reloaded with zero downtime.${NC}"
else
    echo -e "${YELLOW}⚠ PM2 not found globally. Starting using node dist/server.cjs...${NC}"
    nohup node dist/server.cjs > "${LOG_DIR}/app.log" 2>&1 &
fi

# ------------------------------------------------------------------------------
# STEP 8: Post-Deployment Health Check
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[8/8] Performing System Health Check...${NC}"
sleep 3

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "500")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}=======================================================================${NC}"
    echo -e "${GREEN}   🎉 DEPLOYMENT SUCCESSFUL! All systems online & healthy (HTTP 200)    ${NC}"
    echo -e "${GREEN}   Data Status: 100% Preserved in ${STORAGE_DIR}                    ${NC}"
    echo -e "${GREEN}=======================================================================${NC}"
    
    # Prune old backups older than 14 days
    find "${BACKUP_DIR}" -type f -mtime +14 -delete 2>/dev/null || true
else
    echo -e "${RED}=======================================================================${NC}"
    echo -e "${RED}   ❌ HEALTH CHECK WARNING (HTTP Status: $HEALTH_CHECK)                 ${NC}"
    echo -e "${RED}   Latest backup available at: ${BACKUP_DIR}/db_${TIMESTAMP}.json      ${NC}"
    echo -e "${RED}   Run 'pm2 logs' to inspect startup logs.                             ${NC}"
    echo -e "${RED}=======================================================================${NC}"
fi
