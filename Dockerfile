FROM node:18-alpine as build

RUN npm install -g pnpm@10.11.0

WORKDIR /app
COPY package.json pnpm-lock.yaml svelte.config.js ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/build build/
COPY --from=build /app/node_modules node_modules/
COPY package.json .

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "build"]