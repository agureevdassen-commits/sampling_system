-- Миграция 001: Создание основных таблиц для системы учёта геологических проб

-- Таблица для хранения информации об устройствах
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для хранения проб
CREATE TABLE IF NOT EXISTS samples (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL REFERENCES devices(device_id) ON DELETE SET NULL,
  local_id INTEGER,
  sample VARCHAR(255) NOT NULL,
  well_name VARCHAR(255) NOT NULL,
  block VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  scanned_at TIMESTAMP NOT NULL,
  scanned_by VARCHAR(255),
  is_test BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для логирования синхронизаций
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255),
  action VARCHAR(50),
  samples_count INTEGER,
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_samples_device_id ON samples(device_id);
CREATE INDEX IF NOT EXISTS idx_samples_sample ON samples(sample);
CREATE INDEX IF NOT EXISTS idx_samples_scanned_at ON samples(scanned_at);
CREATE INDEX IF NOT EXISTS idx_samples_is_test ON samples(is_test);
CREATE INDEX IF NOT EXISTS idx_samples_block ON samples(block);
CREATE INDEX IF NOT EXISTS idx_sync_logs_device_id ON sync_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);

-- Вставка записи для неизвестного устройства (для внешних ключей)
INSERT INTO devices (device_id, description) 
VALUES ('unknown', 'Устройство по умолчанию для миграции')
ON CONFLICT (device_id) DO NOTHING;
