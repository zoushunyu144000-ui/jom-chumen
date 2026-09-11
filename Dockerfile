FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# JOM currently targets Vercel in vite.config.ts. PocketBay runs a persistent
# Node process, so switch only inside the container build without changing the
# existing Vercel build contract in the repository.
RUN sed -i 's/preset: "vercel"/preset: "node-server"/' vite.config.ts \
  && node scripts/with-app-env.mjs vite build \
  && node scripts/fix-ssr-barrel.mjs \
  && npm prune --omit=dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3000

# PocketBay supplies PORT at runtime. Nitro's node-server preset reads PORT.
# Migrations are idempotent and run before the web process starts.
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
