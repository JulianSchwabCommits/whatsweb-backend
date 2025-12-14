FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Your server listens on 8080
EXPOSE 8080

CMD ["node", "dist/main"]
