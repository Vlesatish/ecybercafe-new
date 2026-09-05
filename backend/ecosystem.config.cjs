module.exports = {
  apps: [
    {
      name: "ecybercafe-backend",
      script: "dist/server.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        STORAGE_DIR: "/var/lib/ecybercafe",
        ALLOWED_ORIGINS: "https://ecybercafe.in,https://www.ecybercafe.in"
      }
    }
  ]
};
