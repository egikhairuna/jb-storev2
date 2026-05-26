# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# Stage 2: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy env vars for build (real values injected at runtime)
ENV NEXTAUTH_SECRET=build-placeholder
ENV NEXTAUTH_URL=http://localhost:3000
ENV WC_BASE_URL=http://placeholder.com
ENV WC_CONSUMER_KEY=placeholder
ENV WC_CONSUMER_SECRET=placeholder
ENV DATABASE_URL=file:./prisma/pos.db
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy prisma for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma



RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
