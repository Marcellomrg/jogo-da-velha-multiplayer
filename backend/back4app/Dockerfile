FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node cloud ./cloud
COPY --chown=node:node container ./container
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
USER node
CMD ["node", "container/server.cjs"]
