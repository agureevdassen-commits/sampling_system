# API.md - Справка по API

## 🔐 Аутентификация

Все запросы должны включать API Key в заголовках:

```
X-API-Key: sampling-dev-key-2025
```

Замените значение на ваш ключ из переменной окружения `API_KEY`.

## 📡 Endpoints

### 1. POST /api/scans/bulk

Отправка пакета проб с клиента на сервер.

**Метод:** `POST`
**Content-Type:** `application/json`

**Пример запроса:**
```bash
curl -X POST http://localhost:3000/api/scans/bulk \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sampling-dev-key-2025" \
  -d '[
    {
      "device_id": "device-abc123def",
      "sample": "S001",
      "well_name": "SW-001",
      "block": "B01",
      "type": "520",
      "scanned_at": 1703050800000,
      "scanned_by": "Иван",
      "is_test": false,
      "local_id": 1
    },
    {
      "device_id": "device-abc123def",
      "sample": "S002",
      "well_name": "SW-001",
      "block": "B01",
      "type": "360",
      "scanned_at": 1703050810000,
      "scanned_by": "Иван",
      "is_test": false,
      "local_id": 2
    }
  ]'
```

**Параметры тела запроса:**

| Поле | Тип | Обязательный | Описание |
|------|-----|-------------|---------|
| device_id | string | ✓ | Уникальный ID устройства |
| sample | string | ✓ | Номер/штрихкод пробы |
| well_name | string | ✓ | Номер скважины |
| block | string | ✓ | Номер блока |
| type | string | ✗ | Тип руды (например, 520) |
| scanned_at | number | ✓ | Timestamp (миллисекунды) сканирования на клиенте |
| scanned_by | string | ✓ | Имя оператора |
| is_test | boolean | ✗ | Признак тестовой записи (по умолчанию false) |
| local_id | number | ✗ | Локальный ID для отладки/связки |

**Пример успешного ответа (200 OK):**
```json
{
  "server_ids": [1, 2],
  "total_on_server": 150
}
```

**Описание ответа:**

| Поле | Тип | Описание |
|------|-----|---------|
| server_ids | array | Массив ID записей, созданных на сервере |
| total_on_server | number | Общее количество записей на сервере |

**Коды ошибок:**

| Код | Описание | Решение |
|-----|---------|---------|
| 400 | Недопустимые данные | Проверьте обязательные поля |
| 401 | Неверный API Key | Проверьте заголовок X-API-Key |
| 500 | Ошибка сервера | Проверьте логи сервера |

**Пример обработки в JavaScript:**
```javascript
async function syncScans(scans) {
  try {
    const response = await fetch('/api/scans/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sampling-dev-key-2025'
      },
      body: JSON.stringify(scans)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('Синхронизировано:', result.server_ids);
    console.log('Всего на сервере:', result.total_on_server);
    
    return result;
  } catch (error) {
    console.error('Ошибка синхронизации:', error);
    throw error;
  }
}
```

---

### 2. GET /api/scans/count

Получить общее количество проб на сервере.

**Метод:** `GET`

**Пример запроса:**
```bash
curl -X GET http://localhost:3000/api/scans/count \
  -H "X-API-Key: sampling-dev-key-2025"
```

**Пример ответа (200 OK):**
```json
{
  "total_on_server": 150
}
```

**Коды ошибок:**

| Код | Описание |
|-----|---------|
| 401 | Неверный API Key |
| 500 | Ошибка БД |

---

### 3. GET /api/scans

Получить список проб с опциональной фильтрацией.

**Метод:** `GET`

**Query параметры:**

| Параметр | Тип | Описание | Пример |
|----------|-----|---------|--------|
| device_id | string | Фильтр по ID устройства | ?device_id=device-123 |
| start_date | string | Начальная дата (ISO 8601) | ?start_date=2025-01-01 |
| end_date | string | Конечная дата (ISO 8601) | ?end_date=2025-01-31 |
| limit | number | Максимум записей (по умолчанию 1000) | ?limit=500 |

**Пример запроса:**
```bash
# Все пробы за период
curl -X GET "http://localhost:3000/api/scans?start_date=2025-01-01&end_date=2025-01-31&limit=100" \
  -H "X-API-Key: sampling-dev-key-2025"

# Пробы с конкретного устройства
curl -X GET "http://localhost:3000/api/scans?device_id=device-123" \
  -H "X-API-Key: sampling-dev-key-2025"
```

**Пример ответа (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "device_id": "device-abc123def",
      "sample": "S001",
      "well_name": "SW-001",
      "block": "B01",
      "type": "520",
      "scanned_at": "2025-01-15T10:30:00.000Z",
      "scanned_by": "Иван",
      "is_test": false,
      "created_at": "2025-01-15T10:30:05.000Z",
      "updated_at": "2025-01-15T10:30:05.000Z"
    },
    {
      "id": 2,
      "device_id": "device-abc123def",
      "sample": "S002",
      "well_name": "SW-001",
      "block": "B01",
      "type": "360",
      "scanned_at": "2025-01-15T10:30:10.000Z",
      "scanned_by": "Иван",
      "is_test": false,
      "created_at": "2025-01-15T10:30:15.000Z",
      "updated_at": "2025-01-15T10:30:15.000Z"
    }
  ],
  "count": 2
}
```

---

### 4. GET /api/scans/export/csv

Экспортировать все пробы в CSV формате.

**Метод:** `GET`

**Пример запроса:**
```bash
curl -X GET http://localhost:3000/api/scans/export/csv \
  -H "X-API-Key: sampling-dev-key-2025" \
  > scans_export.csv
```

**Пример ответа:**
```csv
ID,Устройство,Проба,Скважина,Блок,Тип,Время (UTC),Оператор
1,"device-abc123def","S001","SW-001","B01","520","2025-01-15T10:30:00.000Z","Иван"
2,"device-abc123def","S002","SW-001","B01","360","2025-01-15T10:30:10.000Z","Иван"
3,"device-xyz789abc","S003","SW-002","B02","520","2025-01-15T11:00:00.000Z","Мария"
```

**Headers ответа:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename=scans.csv
```

---

### 5. GET /api/health

Проверка статуса сервера и доступности API.

**Метод:** `GET`
**Аутентификация:** Не требуется

**Пример запроса:**
```bash
curl -X GET http://localhost:3000/api/health
```

**Пример ответа (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## 📊 Примеры интеграции

### Python

```python
import requests
import json
from datetime import datetime

API_URL = "http://localhost:3000/api"
API_KEY = "sampling-dev-key-2025"

headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY
}

# Отправка проб
scans = [
    {
        "device_id": "device-python",
        "sample": "S001",
        "well_name": "SW-001",
        "block": "B01",
        "type": "520",
        "scanned_at": int(datetime.now().timestamp() * 1000),
        "scanned_by": "Python Script"
    }
]

response = requests.post(
    f"{API_URL}/scans/bulk",
    headers=headers,
    json=scans
)

if response.status_code == 200:
    result = response.json()
    print(f"Сохранено: {result['server_ids']}")
    print(f"Всего на сервере: {result['total_on_server']}")
else:
    print(f"Ошибка: {response.status_code}")
```

### cURL (Bash)

```bash
#!/bin/bash

API_URL="http://localhost:3000/api"
API_KEY="sampling-dev-key-2025"
TIMESTAMP=$(date +%s)000

# Простое сканирование
curl -X POST "$API_URL/scans/bulk" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "[
    {
      \"device_id\": \"device-$(whoami)\",
      \"sample\": \"S001\",
      \"well_name\": \"SW-001\",
      \"block\": \"B01\",
      \"type\": \"520\",
      \"scanned_at\": $TIMESTAMP,
      \"scanned_by\": \"$(whoami)\"
    }
  ]" | jq .

# Получить статистику
curl -X GET "$API_URL/scans/count" \
  -H "X-API-Key: $API_KEY" | jq .

# Экспорт в CSV
curl -X GET "$API_URL/scans/export/csv" \
  -H "X-API-Key: $API_KEY" > export_$(date +%Y%m%d).csv
```

### Node.js

```javascript
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';
const API_KEY = 'sampling-dev-key-2025';

async function submitScans(scans) {
  const response = await fetch(`${API_URL}/scans/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify(scans)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

async function getCount() {
  const response = await fetch(`${API_URL}/scans/count`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.json();
}

// Использование
(async () => {
  try {
    const scans = [{
      device_id: 'node-device',
      sample: 'S001',
      well_name: 'SW-001',
      block: 'B01',
      type: '520',
      scanned_at: Date.now(),
      scanned_by: 'Node.js'
    }];

    const result = await submitScans(scans);
    console.log('Сохранено:', result.server_ids);

    const count = await getCount();
    console.log('Всего:', count.total_on_server);
  } catch (error) {
    console.error('Ошибка:', error);
  }
})();
```

---

## 🧪 Тестирование API

### Postman Collection

```json
{
  "info": {
    "name": "Sampling API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{url}}/api/health",
          "path": ["api", "health"]
        }
      }
    },
    {
      "name": "Submit Scans",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "X-API-Key",
            "value": "{{api_key}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "[\n  {\n    \"device_id\": \"postman-test\",\n    \"sample\": \"S001\",\n    \"well_name\": \"SW-001\",\n    \"block\": \"B01\",\n    \"type\": \"520\",\n    \"scanned_at\": {{timestamp}},\n    \"scanned_by\": \"Postman\"\n  }\n]"
        },
        "url": {
          "raw": "{{url}}/api/scans/bulk",
          "path": ["api", "scans", "bulk"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "url",
      "value": "http://localhost:3000"
    },
    {
      "key": "api_key",
      "value": "sampling-dev-key-2025"
    }
  ]
}
```

---

## 🔄 Rate Limiting (для продакшена)

Рекомендуется добавить Rate Limiting:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

## 📝 Версионирование API

Для будущих версий используйте:

```
/api/v1/scans/bulk
/api/v2/scans/bulk
```

---

**Версия:** 1.0.0
**Последнее обновление:** 20 декабря 2025
