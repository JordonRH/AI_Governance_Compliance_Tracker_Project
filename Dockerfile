FROM node:26-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    PORT=5173 \
    AITRACE_BIND_HOST=0.0.0.0

USER node
EXPOSE 5173

CMD ["npm", "start"]
