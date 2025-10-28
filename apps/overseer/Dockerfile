
# Builder: install pnpm via corepack, install workspace deps and build the overseer app
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY . .
# Install all dependencies including dev deps and optional platform-specific packages
RUN pnpm install --prod=false --reporter=append-only
WORKDIR /repo/apps/overseer
RUN pnpm run build

# Runtime: small production image running Node adapter server
FROM node:20-slim AS runtime
ENV NODE_ENV=production
ENV PORT=5101
# Increase body size limit to 10MB for file uploads (event images)
# Default is 512KB which is too small for image uploads
ENV BODY_SIZE_LIMIT=10485760
RUN groupadd -r app && useradd -r -g app app
WORKDIR /app
# Copy build output and dependencies from builder
COPY --from=builder /repo/apps/overseer/build ./build
COPY --from=builder /repo/apps/overseer/package.json ./package.json
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages ./packages
EXPOSE ${PORT}
USER app
# Start: run the Node adapter server
CMD ["node", "build/index.js"]

