# Base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm install && npx playwright install chromium

# Expose port for Render
EXPOSE 10000

# Run the app
CMD ["node", "index.js"]
