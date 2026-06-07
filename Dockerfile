# syntax=docker/dockerfile:1

# Stage 1: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner
RUN apk add --no-cache python3 make g++
WORKDIR /app

RUN mkdir -p /app/data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/resolute-society.sqlite

EXPOSE 3000

CMD ["node", "build"]
