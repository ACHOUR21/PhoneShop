# ============================================================
# PhoneShop Pro - Production Dockerfile
# Multi-stage build: Node 22 + Next.js standalone + SQLite
# ============================================================

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Generate Prisma client
FROM base AS prisma
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json ./
RUN npx prisma generate

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
