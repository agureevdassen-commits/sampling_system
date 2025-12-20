# DEPLOYMENT.md - Инструкции по развёртыванию

## 🚀 Быстрый старт (Docker - рекомендуется)

```bash
# 1. Клонируйте репозиторий
git clone <repo-url>
cd sampling-system

# 2. Запустите одной командой
docker-compose up --build

# Приложение будет доступно на http://localhost:3000
```

## 📋 Локальное развёртывание (без Docker)

### Требования
- Node.js >= 16
- PostgreSQL >= 12
- npm или yarn

### Шаги

```bash
# 1. Установка зависимостей
npm install

# 2. Подготовка переменных окружения
cp .env.example .env

# Отредактируйте .env:
# - DATABASE_URL должен указывать на вашу PostgreSQL
# - API_KEY - установите свой ключ доступа

# 3. Создание БД
createdb sampling_db

# 4. Применение миграций
psql sampling_db -f migrations/001_init_schema.sql

# 5. Запуск в режиме разработки
npm run dev

# Или в продакшене:
npm start
```

## ☁️ Развёртывание на облачных сервисах

### Heroku

```bash
# 1. Создать приложение
heroku create <app-name>

# 2. Добавить PostgreSQL аддон
heroku addons:create heroku-postgresql:hobby-dev

# 3. Установить переменные окружения
heroku config:set NODE_ENV=production
heroku config:set API_KEY=<ваш-защищённый-ключ>

# 4. Отправить код
git push heroku main

# 5. Запустить миграции (выполняется автоматически при первом запуске)
# Но если нужно вручную:
heroku run "psql \$DATABASE_URL -f migrations/001_init_schema.sql"

# 6. Проверка
heroku open
```

### AWS Elastic Beanstalk

```bash
# 1. Установить EB CLI
pip install awsebcli --upgrade --user

# 2. Инициализировать приложение
eb init -p node.js-18 sampling-system

# 3. Создать окружение
eb create sampling-prod

# 4. Установить переменные окружения
eb setenv NODE_ENV=production
eb setenv DATABASE_URL=postgresql://...
eb setenv API_KEY=<ваш-ключ>

# 5. Развернуть
eb deploy

# 6. Открыть в браузере
eb open
```

### DigitalOcean App Platform

```bash
# 1. Войти в DigitalOcean CLI
doctl auth init

# 2. Создать приложение из app.yaml (см. ниже)
doctl apps create --spec app.yaml

# 3. Проверить статус
doctl apps list
```

**app.yaml для DigitalOcean:**
```yaml
name: sampling-system
services:
  - name: api
    github:
      repo: <ваш-репо>
      branch: main
    build_command: npm install
    run_command: npm start
    envs:
      - key: NODE_ENV
        value: production
      - key: API_KEY
        scope: RUN_AND_BUILD_TIME
        value: ${API_KEY}
databases:
  - name: postgres
    engine: PG
    version: 15
```

### Google App Engine

```bash
# 1. Установить Google Cloud SDK
curl https://sdk.cloud.google.com | bash

# 2. Инициализировать проект
gcloud init

# 3. Создать app.yaml в корне проекта:
runtime: nodejs18
env: standard

env_variables:
  NODE_ENV: production

env:
  cloud.google.com/project_id: <ваш-проект>

# 4. Развернуть
gcloud app deploy

# 5. Просмотреть логи
gcloud app logs read -f
```

### Render.com

```bash
# 1. Создать PostgreSQL сервис
# 2. Создать Web Service, указав:
#    - Git репозиторий
#    - Build command: npm install
#    - Start command: npm start
#    - Environment variables из .env
# 3. Deploy!
```

## 🔐 Безопасность для продакшена

### Обязательные шаги

1. **Измените API Key:**
```bash
# Генерируйте длинный случайный ключ
openssl rand -hex 32
# Установите значение в переменной окружения API_KEY
```

2. **Включите HTTPS:**
```javascript
// Добавьте в server.js для Heroku/облака:
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://"],
    }
  }
}));
```

3. **Ограничьте CORS:**
```javascript
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  optionsSuccessStatus: 200
}));
```

4. **Используйте переменные окружения:**
```bash
# Никогда не коммитьте .env в git!
echo ".env" >> .gitignore
git rm --cached .env
git commit -m "Remove .env from tracking"
```

5. **Бэкапируйте БД:**
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# AWS RDS backup
aws rds create-db-snapshot --db-instance-identifier prod-db

# Heroku backup
heroku pg:backups:capture
```

## 🚨 Мониторинг и логирование

### Lokiweb logs (на Heroku)
```bash
# Просмотр логов
heroku logs --tail

# Сохранение логов
heroku logs > logs.txt
```

### CloudWatch (AWS)
```bash
# Просмотр логов через AWS CLI
aws logs tail /aws/elasticbeanstalk/sampling-system/var/log/eb-docker.log
```

### Sentry для отслеживания ошибок
```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

## 📊 Масштабирование

### Горизонтальное масштабирование (несколько инстансов)
```bash
# Heroku: увеличить процессы
heroku ps:scale web=3

# AWS EB: изменить количество инстансов
eb scale 3
```

### Кэширование (Redis)
```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

// Кэш для COUNT запросов
app.get('/api/scans/count', async (req, res) => {
  const cached = await client.get('scans_count');
  if (cached) {
    return res.json({ total_on_server: parseInt(cached) });
  }
  // ... запрос в БД и сохранение в кэш
});
```

## 🔧 Тестирование перед продакшеном

```bash
# 1. Проверить здоровье сервера
curl http://localhost:3000/api/health

# 2. Тест синхронизации
curl -X POST http://localhost:3000/api/scans/bulk \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sampling-dev-key-2025" \
  -d '[{"device_id":"test","sample":"TEST001","well_name":"W1","block":"B1","type":"520","scanned_at":'$(date +%s)'000,"scanned_by":"test"}]'

# 3. Проверить экспорт
curl http://localhost:3000/api/scans/export/csv \
  -H "X-API-Key: sampling-dev-key-2025"
```

## 📝 Чеклист перед продакшеном

- [ ] DATABASE_URL корректный
- [ ] API_KEY изменён на безопасный ключ
- [ ] HTTPS включён
- [ ] CORS ограничен
- [ ] NODE_ENV = production
- [ ] Логирование настроено
- [ ] Бэкапы БД настроены
- [ ] Мониторинг включен
- [ ] Все миграции БД применены
- [ ] Тестирование завершено

## 🆘 Решение проблем

### Ошибка подключения к БД
```bash
# Проверить строку подключения
echo $DATABASE_URL

# Проверить доступность сервера БД
psql $DATABASE_URL -c "SELECT 1"
```

### Service Worker не обновляется
```javascript
// В браузере откройте DevTools → Application → Service Workers
// Нажмите "Unregister" и перезагрузите страницу
```

### Синхронизация не работает
1. Проверить сетевое соединение
2. Проверить API_KEY в заголовках
3. Проверить логи сервера: `heroku logs --tail`
4. Убедиться, что БД доступна

---

**Дата обновления:** 20 декабря 2025
**Версия:** 1.0.0
