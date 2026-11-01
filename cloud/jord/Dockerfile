# @altr/jord-server image (S0041)
#
# Build context MUST be the monorepo root:
#   docker build -f cloud/jord/Dockerfile -t altr/jord-server .
# Compose sets the same context (see docker-compose.yml).
#
# Why here (not repo-root Dockerfile): the server owns the runtime contract;
# why context=root: @altr/jord is a workspace package under elements/.
#
# Packages export TypeScript source; CMD runs via tsx (no emit step yet).
# Never bake .env, data/, or *.db (.dockerignore).

# ---------- deps + sources ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Lockfile importers need every workspace package.json present.
COPY apps/apolyx/package.json apps/apolyx/
COPY apps/jord-studio/package.json apps/jord-studio/
COPY cloud/jord/package.json cloud/jord/
COPY cloud/pocketbase/package.json cloud/pocketbase/
COPY elements/apolyx-cli/package.json elements/apolyx-cli/
COPY elements/base/package.json elements/base/
COPY elements/jord/package.json elements/jord/
COPY elements/jord-client/package.json elements/jord-client/
COPY elements/ui-kit/package.json elements/ui-kit/

# Runtime sources only (tests / Docs / apps stay out via .dockerignore + selective COPY).
COPY elements/jord/src elements/jord/src
COPY elements/jord/migrations elements/jord/migrations
COPY elements/jord/tsconfig.json elements/jord/tsconfig.json
COPY cloud/jord/src cloud/jord/src
COPY cloud/jord/tsconfig.json cloud/jord/tsconfig.json

# --prod: skip server test/devDeps (@altr/jord-client, vitest). tsx is a runtime dep.
RUN pnpm install --frozen-lockfile --filter @altr/jord-server... --prod \
  && mkdir -p /app/cloud/jord/data/blobs

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.27.0 --activate \
  && apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  PORT=8787

COPY --from=build --chown=node:node /app /app

USER node
WORKDIR /app/cloud/jord

EXPOSE 8787

HEALTHCHECK --interval=10s --timeout=3s --start-period=25s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
