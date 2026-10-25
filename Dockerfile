# syntax=docker/dockerfile:1
#
# Clipnest: one container runs both apps, as the Easypanel service always has:
# the Elysia API (bundled by `bun build`, run by Bun) and the Next.js site (run
# by Node), started together by `bun run start` (concurrently).
#
# Easypanel: source GitHub, Build Path `/`, build type Dockerfile, file
# `Dockerfile`, no build or start command. Locally: docker build .
#
# API and WEBSITE_URL are inlined into the site at build time (next.config.js
# `env`): Easypanel passes the service's env to the build as build args, and only
# the ARGs below are read, so changing one takes a redeploy. Everything else
# (DATABASE_URL, SECRET, R2_*, ...) is runtime-only and never reaches the image.

# ---------------------------------------------------------------------------
# Only the files `bun install` reads, so the install layer stays cached across
# code changes. Every workspace manifest is needed: --frozen-lockfile compares
# bun.lock with all of them.
FROM oven/bun:1.4.4-slim AS manifests
WORKDIR /src
COPY . .
RUN mkdir -p /out \
	&& cp package.json bun.lock /out/ \
	&& if [ -f bunfig.toml ]; then cp bunfig.toml /out/; fi \
	&& find apps packages -mindepth 2 -maxdepth 2 -name package.json -exec cp --parents {} /out/ \;

FROM oven/bun:1.4.4-slim AS deps
WORKDIR /app
COPY --from=manifests /out/ ./
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Only here to hand its node binary to the build stage: `next build` runs on the
# same Node as the runtime image below.
FROM node:26.12.1-trixie-slim AS node

# ---------------------------------------------------------------------------
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
# The oven/bun image's `node` is a symlink to bun at the end of PATH; the real
# Node comes first. Node 25+ links libatomic, which the oven/bun slim image lacks.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends libatomic1 \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN node -v
COPY . .
ARG API=
ARG WEBSITE_URL=
# An empty build arg is unset first, so the site's own fallback applies instead of "".
RUN for v in API WEBSITE_URL; do \
		eval "[ -n \"\${$v}\" ] || unset $v"; \
	done \
	&& bun backend:build \
	&& bun frontend:build

# ---------------------------------------------------------------------------
# Node for the site (and concurrently), Bun for the API. The API reads its SQL
# migrations from apps/backend/db at boot, so the whole workspace comes along.
FROM node:26.12.1-trixie-slim AS runtime
COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s bun /usr/local/bin/bunx && bun --version
WORKDIR /app
# Owned by the runtime user: Next writes its cache under apps/frontend/.next at run time.
COPY --from=build --chown=node:node /app ./
ENV NODE_ENV=production \
	NEXT_TELEMETRY_DISABLED=1
USER node
# Site on PORT (3000 unless set), API on API_PORT (5600 unless set).
EXPOSE 3000 5600
STOPSIGNAL SIGTERM
CMD ["bun", "run", "start"]
