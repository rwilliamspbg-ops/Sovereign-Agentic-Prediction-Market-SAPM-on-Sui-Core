FROM node:20-alpine
WORKDIR /app

COPY package.json ./
# Install all dependencies (including dev) for Next.js compilation
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3000

# Development mode with next dev
CMD ["npm", "run", "dev"]
