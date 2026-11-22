# Alternative to render.yaml: run it anywhere that keeps one process alive.
#
#   docker build -t bidlive .
#   docker run -p 3000:3000 --env-file .env.local bidlive
#
# Fly.io, Railway, Koyeb and a plain VPS all accept this image. Do not deploy it
# to a serverless platform — see docs/HOSTING.md for why.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* is inlined at build time, so it must be present here, not only at runtime
ARG NEXT_PUBLIC_NEXCONN_APP_KEY
ARG NEXT_PUBLIC_NEXCONN_AREA_CODE=3
ENV NEXT_PUBLIC_NEXCONN_APP_KEY=$NEXT_PUBLIC_NEXCONN_APP_KEY
ENV NEXT_PUBLIC_NEXCONN_AREA_CODE=$NEXT_PUBLIC_NEXCONN_AREA_CODE
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
# one process, one instance: the auction state lives in memory
CMD ["npm", "start"]
