# Web/Dockerfile

# 1) Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Run (standalone)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone output + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json
ENV PORT=3000
EXPOSE 3000
# Next.js standalone starts via server.js in standalone
CMD ["node", "server.js"]
