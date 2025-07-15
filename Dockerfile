FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=10000

CMD ["node", "index.js"]
