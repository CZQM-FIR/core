# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (including dev for build)
RUN pnpm install --frozen-lockfile

# Copy source and tsconfig
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm build

# Stage 2: Run
FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy only built code + package.json
COPY --from=builder /app/dist ./dist
COPY package.json pnpm-lock.yaml* ./

# Install only prod deps
RUN pnpm install --prod --frozen-lockfile

CMD ["node", "dist/index.js"]
