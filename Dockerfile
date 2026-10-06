# -------------------------------------------------------------
# DOCKERFILE MULTI-STAGE PRODUCTION-READY PARA COOLIFY (ZERO N8N)
# Imagem Alpine enxuta, usuário não-root, healthcheck e scheduler nativo
# -------------------------------------------------------------

# 1. Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl wget

# 2. Dependencies Stage
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public
RUN npx prisma generate
RUN npm run build

# 4. Runner Stage (Production Ready)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV ENABLE_INTERNAL_SCHEDULER="true"

# Criar usuário não-root por segurança (SRE Best Practice)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Criar diretórios para dados com permissão do usuário nextjs
RUN mkdir -p /app/data /app/prisma && chown -R nextjs:nodejs /app

# Copiar artefatos do build standalone
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

USER nextjs

EXPOSE 3000

# Healthcheck nativo para Coolify e Traefik/Docker
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Inicialização com sincronização do banco e tratamento de sinais SIGTERM/SIGINT
CMD ["sh", "-c", "npx prisma db push --skip-generate 2>/dev/null || true; node server.js"]
