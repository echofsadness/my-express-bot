FROM node:20-slim

# ติดตั้ง dependencies ที่จำเป็นสำหรับ playwright
RUN apt-get update && apt-get install -y \
    libnspr4 \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

# ติดตั้ง browser dependencies
RUN npx playwright install --with-deps

COPY . .

# หากคุณมี script เช่น "start", "build" ให้แก้ตาม
CMD ["node", "index.js"]

