# JB Store POS — Deployment Guide

## VPS Directory: `/srv/jb-store`

---

## First Deploy

### 1. On local machinesud
```bash
npm run build   # verify build is clean
git push origin main
```

### 2. SSH into VPS
```bash
ssh deploy@vps-ip
cd /srv
git clone https://github.com/username/jb-store.git
cd jb-store/pos-app
```

### 3. Setup environment
```bash
cp .env.production.example .env.production
nano .env.production
# Fill in all values. Generate secrets:
# openssl rand -hex 32
```

### 4. Add DNS record
At your domain registrar:
| Type | Name  | Value    | TTL  |
|------|-------|----------|------|
| A    | pos   | [VPS IP] | 3600 |

Wait 5–30 minutes for propagation.

### 5. Add Nginx config
```bash
cp nginx-pos.conf /srv/reverse-proxy/nginx/pos.conf
cd /srv/reverse-proxy
docker compose restart
```

### 6. Get SSL certificate
From `/srv/reverse-proxy`:
```bash
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d pos.jamesboogie.com \
  --email your@email.com --agree-tos

# Reload nginx after cert:
docker compose restart
```

### 7. Deploy POS app
```bash
cd /srv/jb-store/pos-app
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```

### 8. Verify
- Visit: https://pos.jamesboogie.com
- Login: `admin` / `changeme123`
- ⚠️ **Change password immediately after first login!**

---

## Update Deploy
```bash
cd /srv/jb-store/pos-app
bash deploy.sh
```

---

## Useful Commands

```bash
# Live logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f worker

# Restart service
docker compose -f docker-compose.prod.yml restart app

# Check all containers
docker compose -f docker-compose.prod.yml ps

# Check Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Access prisma studio (run locally, not on VPS)
npx prisma studio
```

---

## Important Notes

- **NEVER** commit `.env.production` to git
- Regenerate WC API keys if ever exposed
- Change default passwords after first deploy
- `pos.db` is persisted via `./prisma` volume mount
- Old `/srv/pos-app` is completely separate — **do not touch**
- All containers use `jb_` prefix to avoid naming conflicts
- `proxy_net` is external — do not recreate it
