#!/bin/bash
set -e

echo "🚀 Deploying JB Store POS..."

# Pull latest code
git pull origin main

# Build containers (no cache for clean build)
docker compose -f docker-compose.prod.yml build --no-cache

# Run database migrations inside app container
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

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
