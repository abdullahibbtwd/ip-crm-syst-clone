# Production image - Vite build served by nginx (proxies /api + /socket.io to backend)
#
# Rolldown/Vite native binaries are OS-specific. This stage always installs Linux
# copies. Host node_modules (macOS) are excluded via .dockerignore so local
# `npm run dev` and Coolify deploys do not share binaries.
FROM node:20-alpine AS builder
WORKDIR /app

# Coolify injects ARG NODE_ENV=production into every stage. That would skip
# vite/rolldown (they are devDependencies). Force a full install for the builder.
ENV NODE_ENV=development

COPY package.json package-lock.json ./
# npm install (not npm ci): lockfiles generated on macOS/npm 11 can mark other
# OS optional packages in a way that Linux `npm ci` rejects (EBADPLATFORM).
# --include=dev keeps vite even if Coolify later sets NODE_ENV=production.
RUN npm install --include=dev --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
