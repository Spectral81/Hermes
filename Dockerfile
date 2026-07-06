FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Instalar todo el monorepo (incluye typescript/@types del workspace web)
ENV NODE_ENV=development
RUN npm ci --include=dev

# Evita que Next intente yarn add en CI si falta algo
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Instalar deps de TypeScript dentro de apps/web (Next resuelve desde este directorio)
RUN cd apps/web && npm install --no-save --ignore-scripts \
    typescript@5.8.3 \
    @types/react@19.1.6 \
    @types/react-dom@19.1.5 \
    @types/node@22.15.21

WORKDIR /app/apps/web
RUN node ../../node_modules/next/dist/bin/next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json .npmrc ./
COPY packages/shared ./packages/shared
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

CMD ["sh", "-c", "exec npm run start --workspace=web"]
