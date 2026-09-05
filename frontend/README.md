# eCyberCafe Frontend

Standalone React + Vite + TypeScript Frontend Application for eCyberCafe.in.

## Structure
- `src/`: React components, hooks, context, utilities, and styles.
- `public/`: Static web assets, manifest, PWA icons, service worker.

## Environment Configuration
Create a `.env` file in `frontend/` directory:
```env
VITE_API_URL=https://api.ecybercafe.in
```

## Setup & Deployment Commands
```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build for production (outputs to frontend/dist)
npm run build
```

## Production Deployment (Nginx Configuration)
```nginx
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

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
