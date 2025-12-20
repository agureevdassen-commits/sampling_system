FROM node:18-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем серверный код
COPY server.js ./

# Копируем миграции БД
COPY migrations/ ./migrations/

# Копируем статические файлы фронтенда
COPY public/ ./public/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run server
CMD ["node", "server.js"]
