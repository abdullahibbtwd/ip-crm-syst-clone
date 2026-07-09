# Production image - multi-stage build (NestJS + Prisma + Puppeteer/Chromium)
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./

# Runtime uses Alpine's system Chromium — never download a browser in CI/Docker builds.
# postinstall also checks PUPPETEER_SKIP_CHROMIUM_DOWNLOAD, but --ignore-scripts keeps
# the builder stage from running lifecycle hooks at all (compile + prisma generate only).
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --ignore-scripts --include=dev

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

# Chromium and fonts required by Puppeteer in Docker (Alpine).
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl \
    postgresql-client

# Alpine package path varies by version — resolve at build time and fail fast if missing.
RUN set -eux; \
    if command -v chromium >/dev/null 2>&1; then \
      CHROMIUM_BIN="$(command -v chromium)"; \
    elif command -v chromium-browser >/dev/null 2>&1; then \
      CHROMIUM_BIN="$(command -v chromium-browser)"; \
    else \
      echo "ERROR: Chromium not found after apk install" >&2; \
      exit 1; \
    fi; \
    ln -sf "$CHROMIUM_BIN" /usr/local/bin/puppeteer-chromium; \
    echo "Chromium linked: $CHROMIUM_BIN -> /usr/local/bin/puppeteer-chromium"

ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/puppeteer-chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3002

# Wait for Postgres, apply migrations, then start the API
CMD ["sh", "-c", "until pg_isready -h postgres -p 5432 -U \"$POSTGRES_USER\"; do sleep 2; done; npx prisma migrate deploy && node dist/src/main.js"]
