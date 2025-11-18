FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package*.json ./

RUN yarn install

COPY . .

RUN yarn build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

CMD ["yarn", "start"]