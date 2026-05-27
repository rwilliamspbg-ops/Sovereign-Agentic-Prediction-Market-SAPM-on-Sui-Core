FROM node:20-bullseye
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY index.js ./
COPY agent_runtime.js ./
COPY fl_client.js ./
COPY model_store.js ./
COPY model.json* ./
CMD ["node","index.js"]
