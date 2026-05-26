#!/bin/bash
set -e

echo "🚀 Deploying JB Store POS..."

# Pull latest code
git pull origin main

# Build containers (no cache for clean build)
docker compose -f docker-compose.prod.yml build --no-cache

# Gracefully stop active app and worker to release SQLite file locks
echo "🛑 Stopping active app and worker containers to release SQLite locks..."
docker compose -f docker-compose.prod.yml stop app worker

# Run database migrations inside app container
docker compose -f docker-compose.prod.yml run --rm app npx -y prisma@6.19.3 migrate deploy



# Enable WAL mode for SQLite inside app container
echo "🔄 Enabling SQLite Write-Ahead Logging (WAL) Mode..."
docker compose -f docker-compose.prod.yml run --rm app node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;").then(res => {
  console.log("✅ SQLite WAL Mode configured successfully:", res);
  return prisma.$disconnect();
}).catch(err => {
  console.error("❌ Failed to enable SQLite WAL Mode:", err);
  process.exit(1);
});
'


# Start/restart all services
docker compose -f docker-compose.prod.yml up -d

# Clean up dangling images
docker image prune -f

echo ""
echo "✅ Deploy complete!"
echo ""
echo "📋 Container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "📝 App logs (last 20 lines):"
docker compose -f docker-compose.prod.yml logs app --tail=20
