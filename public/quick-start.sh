#!/bin/bash

# Скрипт для быстрого старта приложения Sampling System

set -e

echo "🚀 Sampling System - Quick Start"
echo "================================"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    echo "Установите Node.js >= 16: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version)"

# Проверка PostgreSQL или Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker найден"
    USE_DOCKER=true
elif command -v psql &> /dev/null; then
    echo "✅ PostgreSQL найден"
    USE_DOCKER=false
else
    echo "❌ PostgreSQL не установлен и Docker не найден"
    echo "Установите PostgreSQL или Docker"
    exit 1
fi

echo ""
echo "📦 Установка зависимостей..."
npm install

if [ "$USE_DOCKER" = true ]; then
    echo ""
    echo "🐳 Запуск с Docker..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo "✅ Создан .env файл (отредактируйте если нужно)"
    fi
    
    docker-compose up --build
else
    echo ""
    echo "🗄️  Локальная PostgreSQL"
    
    if [ ! -f ".env" ]; then
        echo "⚠️  Создайте .env файл из .env.example:"
        echo "   cp .env.example .env"
        echo "   # Отредактируйте DATABASE_URL"
        exit 1
    fi
    
    # Проверка БД
    DB_NAME=$(grep DATABASE_URL .env | cut -d'/' -f4 | cut -d'?' -f1)
    if ! psql -l | grep -q "$DB_NAME"; then
        echo "📝 Создание БД $DB_NAME..."
        createdb "$DB_NAME" 2>/dev/null || true
    fi
    
    echo "🔄 Запуск миграций..."
    psql $(grep DATABASE_URL .env | cut -d'=' -f2) -f migrations/001_init_schema.sql
    
    echo ""
    echo "▶️  Запуск сервера..."
    npm start
fi
