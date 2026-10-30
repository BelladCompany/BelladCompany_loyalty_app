# Multi-Stage Dockerfile for Dealership Loyalty Program (Fullstack + Production)

# Stage 1: Build React Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci || npm install

COPY client/ ./
ARG VITE_API_URL=""
ARG VITE_TENANT_ID="bellad_and_company"
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID
RUN npm run build

# Stage 2: Production Backend & Fullstack Service
FROM node:22-alpine
WORKDIR /app

# Install backend production dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy backend source code and migrations
COPY . .

# Copy built frontend distribution files from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

# Execute database migrations on container start, then launch Node server
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]