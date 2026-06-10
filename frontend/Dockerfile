FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# Install dependencies from lockfile for deterministic builds.
# --legacy-peer-deps avoids npm peer-resolution failures in container builds.
RUN npm ci --no-audit --no-fund --legacy-peer-deps

COPY . .

EXPOSE 3000

# Development mode with next dev
CMD ["npm", "run", "dev"]
