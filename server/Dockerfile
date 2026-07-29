FROM node:20-alpine AS base

RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json* ./
COPY --from=base /app/tsconfig.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/src ./src

EXPOSE 3003

CMD ["sh", "-c", "npx prisma migrate deploy && npx ts-node prisma/seed.docker.ts && node dist/server.js"]
