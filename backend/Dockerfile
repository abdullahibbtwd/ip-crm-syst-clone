# Production image — multi-stage build (NestJS + Prisma)
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install --ignore-scripts=false --include=dev

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

RUN apk add --no-cache openssl postgresql-client

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3002

# Wait for Postgres, apply migrations, then start the API
CMD ["sh", "-c", "until pg_isready -h postgres -p 5432 -U \"$POSTGRES_USER\"; do sleep 2; done; npx prisma migrate deploy && node dist/src/main.js"]
