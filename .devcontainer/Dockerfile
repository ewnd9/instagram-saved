FROM node:22-bookworm

# Install system dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libgconf-2-4 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxshmfence1 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# running as root, otherwise: npm error Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/@anthropic-ai'
RUN npm install -g @anthropic-ai/claude-code
USER node
WORKDIR /workspace

