# build front-end
FROM node:24-alpine AS frontend

RUN corepack enable

WORKDIR /app

COPY ./package.json ./pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

COPY . /app

RUN pnpm run build

# build backend
FROM node:24-alpine AS backend

RUN corepack enable

WORKDIR /app

COPY /service/package.json /service/pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

COPY /service /app

RUN pnpm build

# service
FROM node:24-alpine

RUN corepack enable

WORKDIR /app

COPY /service/package.json /service/pnpm-lock.yaml /app/
RUN pnpm install --prod --frozen-lockfile && rm -rf /root/.npm /root/.pnpm-store /usr/local/share/.cache /tmp/*

COPY /service /app

COPY --from=frontend /app/dist /app/public

COPY --from=backend /app/build /app/build

EXPOSE 3002

CMD ["pnpm", "run", "prod"]
