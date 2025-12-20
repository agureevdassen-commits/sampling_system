const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'sampling-dev-key-2025';

// Инициализация пула подключений PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Статические файлы (фронтенд)
app.use(express.static(path.join(__dirname, '../public')));

// Middleware для проверки API ключа
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Маршруты

/**
 * GET /api/health
 * Проверка состояния сервера
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/scans/bulk
 * Приём пакета проб с клиента и сохранение в БД
 * 
 * Тело запроса:
 * [
 *   {
 *     "device_id": "...",
 *     "sample": "...",
 *     "well_name": "...",
 *     "block": "...",
 *     "type": "...",
 *     "scanned_at": 1234567890000,
 *     "scanned_by": "Иван",
 *     "is_test": false,
 *     "local_id": 1
 *   }
 * ]
 */
app.post('/api/scans/bulk', validateApiKey, async (req, res) => {
  try {
    const scans = req.body;

    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({ error: 'Требуется массив проб' });
    }

    const serverIds = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const scan of scans) {
        // Валидация обязательных полей
        if (!scan.sample || !scan.well_name || !scan.block || !scan.type) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
        }

        // Вставка записи в БД
        const result = await client.query(
          `INSERT INTO samples (device_id, local_id, sample, well_name, block, type, scanned_at, scanned_by, is_test)
           VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0), $8, $9)
           RETURNING id`,
          [
            scan.device_id || 'unknown',
            scan.local_id || null,
            scan.sample.trim(),
            scan.well_name.trim(),
            scan.block.trim(),
            scan.type.trim(),
            scan.scanned_at,
            scan.scanned_by || 'unknown',
            scan.is_test || false
          ]
        );

        serverIds.push(result.rows[0].id);
      }

      await client.query('COMMIT');

      // Получить общее количество записей на сервере
      const countResult = await client.query('SELECT COUNT(*) FROM samples WHERE is_test = false');
      const totalOnServer = parseInt(countResult.rows[0].count, 10);

      res.json({
        server_ids: serverIds,
        total_on_server: totalOnServer
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in POST /api/scans/bulk:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/scans/count
 * Получить общее количество записей на сервере
 */
app.get('/api/scans/count', validateApiKey, async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM samples WHERE is_test = false');
    const totalOnServer = parseInt(result.rows[0].count, 10);
    res.json({ total_on_server: totalOnServer });
  } catch (error) {
    console.error('Error in GET /api/scans/count:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/scans
 * Получить пробы с фильтрацией (опционально)
 */
app.get('/api/scans', validateApiKey, async (req, res) => {
  try {
    const { device_id, start_date, end_date, limit = 1000 } = req.query;
    let query = 'SELECT * FROM samples WHERE is_test = false';
    const params = [];

    if (device_id) {
      params.push(device_id);
      query += ` AND device_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND scanned_at >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND scanned_at <= $${params.length}`;
    }

    params.push(parseInt(limit, 10));
    query += ` ORDER BY scanned_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error in GET /api/scans:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/scans/export/csv
 * Экспорт всех проб в CSV формате
 */
app.get('/api/scans/export/csv', validateApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, device_id, sample, well_name, block, type, scanned_at, scanned_by, is_test
       FROM samples WHERE is_test = false
       ORDER BY scanned_at DESC`
    );

    let csv = 'ID,Устройство,Проба,Скважина,Блок,Тип,Время (UTC),Оператор\n';
    result.rows.forEach((row) => {
      const scannedAt = new Date(row.scanned_at).toISOString();
      csv += `${row.id},"${row.device_id}","${row.sample}","${row.well_name}","${row.block}","${row.type}","${scannedAt}","${row.scanned_by}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=scans.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error in GET /api/scans/export/csv:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Fallback для SPA (все остальные маршруты указывают на index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Обработка ошибок
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`База данных: ${process.env.DATABASE_URL ? 'подключена' : 'не подключена'}`);
});

module.exports = app;
