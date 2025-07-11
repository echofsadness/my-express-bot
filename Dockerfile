# ใช้ image ที่มี Chromium/Playwright
FROM mcr.microsoft.com/playwright:v1.43.1-jammy

# ตั้ง working dir
WORKDIR /app

# คัดลอกไฟล์ทั้งหมด
COPY . .

# ติดตั้ง dependency
RUN npm install

# ติดตั้ง Chromium
RUN npx playwright install --with-deps

# เริ่มรันบอท
CMD ["node", "index.js"]
