# eCyberCafe Backend API Service

Standalone Express + Node.js + TypeScript Backend API for eCyberCafe.in.

## Architecture
- **Framework**: Express.js
- **Runtime**: Node.js with TypeScript
- **Database Storage**: `/var/lib/ecybercafe/database.json`
- **File Uploads Storage**: `/var/lib/ecybercafe/uploads`

## API Endpoints
- `/api/auth/*`
- `/api/admin/*`
- `/api/retailer/*`
- `/api/operator/*`
- `/api/distributor/*`
- `/api/services/*`
- `/api/requests/*`
- `/api/chat/*`
- `/api/notifications/*`
- `/api/wallet/*`
- `/api/upload/*`

## Installation & PM2 Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Build CommonJS executable bundle
npm run build

# Start production daemon using PM2
pm2 start ecosystem.config.cjs
```
