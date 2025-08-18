#############################################
# Multi-stage Dockerfile for Next.js (standalone)
# Built for .NET Aspire AddNpmApp PublishAsDockerFile integration
#############################################

# 1. Install dependencies only (uses cached layer when package.json unchanged)
FROM node:20-alpine AS deps
WORKDIR /app
ENV CI=true
COPY package*.json ./
# Use npm ci if lockfile exists, otherwise fallback to npm install
RUN if [ -f package-lock.json ]; then \
			npm ci --no-audit --no-fund; \
		else \
			npm install --no-audit --no-fund; \
		fi

# 2. Build stage
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure standalone output for slimmer runtime (enforced in next.config.mjs)
RUN npm run build

# 3. Runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy only required build artifacts
# (No public directory in project currently)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
# server.js is emitted by Next.js in standalone mode
CMD ["node", "server.js"]
