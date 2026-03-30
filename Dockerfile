# --- Stage 1: install production dependencies (isolated, reproducible layer) ---
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Stage 2: minimal runtime image (Alpine + Node) ---
FROM node:22-alpine AS runner
WORKDIR /app

ARG APP_PORT=8080
ENV NODE_ENV=production
ENV APP_PORT=$APP_PORT

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001 -G nodejs

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json package-lock.json ./
COPY --chown=nodejs:nodejs index.js migrate.js db.js ./
COPY --chown=nodejs:nodejs lib ./lib
COPY --chown=nodejs:nodejs migrations ./migrations

USER nodejs
EXPOSE $APP_PORT

CMD ["node", "index.js"]
