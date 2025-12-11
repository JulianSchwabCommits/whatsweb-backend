FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy everything else
COPY . .

# Your server listens on 8080
EXPOSE 8080

CMD ["node", "index.js"]
