FROM node:22-alpine AS build

WORKDIR /app

# Manifests first so a dependency-free code change reuses the npm ci layer.
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# node_modules carries the @dragons/shared workspace symlink, so shared/ must be
# copied too for it to resolve at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/shared/package.json ./shared/
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/server/dist ./server/dist
# Static SPA assets served by Fastify in production.
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
