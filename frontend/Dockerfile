FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
# Install dependencies from lockfile for deterministic builds.
# --legacy-peer-deps avoids npm peer-resolution failures in container builds.
RUN npm ci --no-audit --no-fund --legacy-peer-deps

COPY . .

# Run as non-root for security hardening
RUN addgroup -S sapm && adduser -S sapm -G sapm
USER sapm

EXPOSE 3000

# Development mode with next dev
CMD ["npm", "run", "dev"]
