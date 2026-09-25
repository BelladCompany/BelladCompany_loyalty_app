FROM node:20-alpine

WORKDIR /app

# Install dependencies with layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files
COPY . .

EXPOSE 5000

CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]