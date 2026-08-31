# Builder: install pnpm via corepack, install workspace deps and build the vector app
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY . .
# Install all dependencies including dev deps and optional platform-specific packages
RUN pnpm install --prod=false --reporter=append-only
WORKDIR /repo/apps/vector
RUN pnpm dotenv -e build.env -- pnpm build

# Runtime: small production image running Node adapter server
FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=5102

ENV BODY_SIZE_LIMIT=100M

RUN groupadd -r app && useradd -r -g app app
WORKDIR /app
# Copy build output and dependencies from builder
COPY --from=builder /repo/apps/vector/build ./build
COPY --from=builder /repo/apps/vector/package.json ./package.json
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages ./packages
EXPOSE ${PORT}
USER app
# Start: run the Node adapter server
CMD ["node", "build/index.js"]
