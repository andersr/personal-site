# Build context is the repo root (the build needs the pnpm workspace):
#   pnpm admin:deploy
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Fetch from the lockfile alone so this layer survives source-only changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline --frozen-lockfile --filter admin...
RUN pnpm --filter admin build
# @repo/content is bundled into the server build, so runtime only needs the
# admin's own production dependencies
RUN pnpm --filter admin deploy --prod --legacy /out && cp -R apps/admin/build /out/build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /out /app
USER node
EXPOSE 8080
CMD ["node_modules/.bin/react-router-serve", "build/server/index.js"]
