# Multi-Stage Dockerfile for Dealership Loyalty Program (Fullstack + Production)

# Stage 1: Build React Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Production Backend & Fullstack Service
FROM node:20-alpine
WORKDIR /app

# Install backend production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source code and migrations
COPY . .

# Copy built frontend distribution files from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

# Execute database migrations on container start, then launch Node server
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]