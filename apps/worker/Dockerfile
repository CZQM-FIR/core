# Stage 1: Build
FROM node:24-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy root package files for workspace setup
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy shared packages
COPY packages ./packages

# Copy worker app
COPY apps/worker ./apps/worker

# Install dependencies from root (respects workspace)
RUN pnpm install --frozen-lockfile

# Build the worker
WORKDIR /app/apps/worker
RUN pnpm build

# Stage 2: Run
FROM node:24-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy root package files for workspace setup
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy shared packages (runtime dependencies)
COPY packages ./packages

# Copy worker package.json
COPY apps/worker/package.json ./apps/worker/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built worker code
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

WORKDIR /app/apps/worker

EXPOSE 3000

CMD ["node", "dist/index.js"]
