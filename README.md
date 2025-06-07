# URL Shortener API

REST API сервис для сокращения URL адресов с аналитикой и управлением ссылками.

## Технологии

- **NestJS** - фреймворк для создания серверных приложений
- **TypeScript** - типизированный JavaScript
- **PostgreSQL** - реляционная база данных
- **Prisma** - ORM для работы с базой данных
- **Jest** - фреймворк для тестирования

## Установка и запуск

### Предварительные требования

- Node.js 18+
- PostgreSQL 12+
- npm или yarn

### Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd back-shorter

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл с вашими настройками базы данных

# Применение миграций базы данных
npx prisma migrate dev

# Генерация Prisma Client
npx prisma generate
```

### Запуск приложения

```bash
# Режим разработки
npm run start:dev

# Продакшн режим
npm run start:prod
```

### Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

## API Документация

Базовый URL: `http://localhost:3000`

### Создание короткой ссылки

**POST** `/shorten`

Создает новую короткую ссылку.

#### Тело запроса

```json
{
  "originalUrl": "string (обязательно)",
  "alias": "string (опционально, макс. 20 символов)",
  "expiresAt": "string (опционально, ISO дата)"
}
```

#### Пример запроса

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://www.example.com",
    "alias": "my-link",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }'
```

#### Ответ

```json
{
  "success": true,
  "data": {
    "id": "1",
    "originalUrl": "https://www.example.com",
    "shortUrl": "http://localhost:3000/my-link",
    "shortCode": "my-link",
    "alias": "my-link",
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-06-07T10:00:00.000Z"
  }
}
```

#### Коды ошибок

- `400` - Некорректные данные запроса
- `409` - Алиас уже используется

---

### Переход по короткой ссылке

**GET** `/:shortCode`

Перенаправляет на оригинальный URL и увеличивает счетчик кликов.

#### Параметры

- `shortCode` - короткий код ссылки

#### Пример запроса

```bash
curl -L http://localhost:3000/my-link
```

#### Ответ

- `301` - Перенаправление на оригинальный URL
- `404` - Ссылка не найдена или истекла

---

### Получение информации о ссылке

**GET** `/info/:shortCode`

Возвращает основную информацию о короткой ссылке.

#### Параметры

- `shortCode` - короткий код ссылки

#### Пример запроса

```bash
curl http://localhost:3000/info/my-link
```

#### Ответ

```json
{
  "success": true,
  "data": {
    "originalUrl": "https://www.example.com",
    "createdAt": "2024-06-07T10:00:00.000Z",
    "clickCount": 5
  }
}
```

#### Коды ошибок

- `404` - Ссылка не найдена или истекла

---

### Получение всех ссылок

**GET** `/api/urls`

Возвращает список всех созданных ссылок.

#### Пример запроса

```bash
curl http://localhost:3000/api/urls
```

#### Ответ

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "originalUrl": "https://www.example.com",
      "shortCode": "my-link",
      "alias": "my-link",
      "shortUrl": "http://localhost:3000/my-link",
      "clickCount": 5,
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "createdAt": "2024-06-07T10:00:00.000Z"
    }
  ]
}
```

---

### Удаление ссылки

**DELETE** `/delete/:shortCode`

Удаляет короткую ссылку.

#### Параметры

- `shortCode` - короткий код ссылки

#### Пример запроса

```bash
curl -X DELETE http://localhost:3000/delete/my-link
```

#### Ответ

```json
{
  "success": true,
  "message": "Короткая ссылка успешно удалена"
}
```

#### Коды ошибок

- `404` - Ссылка не найдена

---

### Получение детальной статистики

**GET** `/stats/:shortCode`

Возвращает детальную статистику кликов по ссылке.

#### Параметры

- `shortCode` - короткий код ссылки

#### Пример запроса

```bash
curl http://localhost:3000/stats/my-link
```

#### Ответ

```json
{
  "success": true,
  "data": {
    "url": {
      "originalUrl": "https://www.example.com",
      "shortCode": "my-link",
      "createdAt": "2024-06-07T10:00:00.000Z",
      "clickCount": 5
    },
    "statistics": [
      {
        "clickedAt": "2024-06-07T10:05:00.000Z",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      }
    ]
  }
}
```

#### Коды ошибок

- `404` - Ссылка не найдена или истекла

---

### Получение аналитики

**GET** `/analytics/:shortCode`

Возвращает расширенную аналитику для ссылки.

#### Параметры

- `shortCode` - короткий код ссылки

#### Пример запроса

```bash
curl http://localhost:3000/analytics/my-link
```

#### Ответ

```json
{
  "success": true,
  "data": {
    "shortCode": "my-link",
    "originalUrl": "https://www.example.com",
    "clickCount": 5,
    "lastFiveIPs": ["192.168.1.100", "192.168.1.101", "10.0.0.1"],
    "createdAt": "2024-06-07T10:00:00.000Z"
  }
}
```

#### Коды ошибок

- `404` - Ссылка не найдена или истекла

---

### Получение общей аналитики

**GET** `/analytics/summary`

Возвращает сводную аналитику по всем ссылкам.

#### Пример запроса

```bash
curl http://localhost:3000/analytics/summary
```

#### Ответ

```json
{
  "success": true,
  "data": [
    {
      "shortCode": "my-link",
      "originalUrl": "https://www.example.com",
      "totalClicks": 5,
      "uniqueVisitors": 3,
      "clicksLast24h": 2,
      "createdAt": "2024-06-07T10:00:00.000Z"
    }
  ]
}
```

## Модели данных

### ShortUrl

```typescript
interface ShortUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  alias?: string;
  shortUrl: string;
  clickCount: number;
  expiresAt?: Date;
  createdAt: Date;
}
```

### ClickStatistics

```typescript
interface ClickStatistics {
  id: string;
  shortCode: string;
  ipAddress: string;
  userAgent: string;
  clickedAt: Date;
}
```

## Валидация

### Создание ссылки

- `originalUrl` - обязательное поле, должно быть валидным URL
- `alias` - опциональное поле, максимум 20 символов, только буквы, цифры, дефисы и подчеркивания
- `expiresAt` - опциональное поле, должно быть валидной датой в формате ISO

### Ограничения

- Алиасы должны быть уникальными
- Максимальная длина алиаса: 20 символов
- Истекшие ссылки возвращают 404 ошибку

## Переменные окружения

```env
# База данных
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"

# Сервер
PORT=3000

# CORS настройки (для production)
CORS_ORIGIN=https://yourdomain.com,https://anotherdomain.com
CORS_CREDENTIALS=true
```

### Описание переменных

- `DATABASE_URL` - строка подключения к PostgreSQL базе данных
- `PORT` - порт для запуска сервера (по умолчанию 3000)
- `CORS_ORIGIN` - разрешенные домены для CORS (через запятую). Если не указано, разрешены все домены
- `CORS_CREDENTIALS` - разрешение на отправку cookies и авторизационных данных (true/false)

## Лицензия

MIT
