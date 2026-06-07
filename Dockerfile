# -------- builder --------
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install bun
RUN npm i -g bun

COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN bun install --frozen-lockfile \
 && DATABASE_URL="file:/tmp/fake.db" bunx prisma generate

COPY . .
RUN bun run build

# -------- runtime --------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# System deps: nmap + tools for downloading nuclei + build tools for native modules
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates curl unzip nmap python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# ---- install nuclei (pin version via build-arg) ----
ARG NUCLEI_VERSION=3.2.9
RUN curl -fsSL -o /tmp/nuclei.zip \
    "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_amd64.zip" \
  && unzip /tmp/nuclei.zip -d /usr/local/bin \
  && rm -f /tmp/nuclei.zip \
  && chmod +x /usr/local/bin/nuclei

# Install bun
RUN npm i -g bun

# Install only prod deps + generate prisma client
COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN bun install --frozen-lockfile --production \
 && DATABASE_URL="file:/tmp/fake.db" bunx prisma generate

# Copy dist from builder
COPY --from=builder /app/dist ./dist

# Ensure SQLite data directory exists
RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/main.js"]
