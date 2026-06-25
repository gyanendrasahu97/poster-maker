FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5177
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY index.html styles.css app.js server.js ./
COPY scripts ./scripts
EXPOSE 5177
CMD ["pnpm", "start"]
