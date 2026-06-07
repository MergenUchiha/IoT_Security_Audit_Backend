# Деплой IoT Security Audit на сервер

Всё берётся из GitHub — с локальной машины ничего копировать не нужно.
Стек: NestJS API (SQLite) + React/nginx + Mosquitto (MQTT), всё в Docker.

## 1. Подготовка сервера (Ubuntu/Debian)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# перелогиниться, затем проверить:
docker compose version
```

## 2. Клонирование репозиториев (обязательно рядом друг с другом)

```bash
mkdir -p ~/iot-audit && cd ~/iot-audit
git clone https://github.com/MergenUchiha/IoT_Security_Audit_Backend.git backend
git clone https://github.com/MergenUchiha/IoT_Security_Audit_Frontend.git frontend
```

## 3. JWT-секрет

Конфиг `.env.docker` уже лежит в репозитории и работает из коробки.
Единственное, что стоит сделать — заменить дефолтный JWT-секрет (одной командой):

```bash
cd ~/iot-audit/backend
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env.docker
```

## 4. Сборка и запуск

```bash
cd ~/iot-audit/backend
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps   # все 3 сервиса должны быть Up
```

## 5. Миграции БД (один раз при первом запуске)

```bash
docker compose -f docker-compose.prod.yml exec api bunx prisma@7.2.0 migrate deploy
docker compose -f docker-compose.prod.yml restart api
```

База — SQLite в named volume `api_data`, переживает пересборки и перезапуски.

## 5a. Сид демо-данными (опционально)

Заполняет базу фейковыми устройствами, логами, алертами и создаёт
пользователя **admin / admin123**. Запускается прямо внутри контейнера:

```bash
docker compose -f docker-compose.prod.yml exec api node dist/seed.cjs
```

> Запускается через `node` (не bun — bun пока не умеет нативный
> `better-sqlite3`). Скомпилированный `dist/seed.cjs` уже лежит в образе.
>
> ⚠️ Сид сначала **очищает** таблицы (`deleteMany`), затем наполняет заново —
> не запускай на проде с реальными данными.

## 6. Проверка

- `http://<IP_СЕРВЕРА>:8090` — фронтенд, зарегистрировать пользователя через UI.
- `http://<IP_СЕРВЕРА>:5050` — API напрямую (Swagger включён).
- Логи: `docker compose -f docker-compose.prod.yml logs -f api`

## 7. Тестирование / демонстрация проекта

Принцип тот же, что локально: берём `deviceId`, шлём в него логи,
смотрим на дашборде как появляются записи/алерты.

> 🔐 **Важно:** API защищён JWT — все запросы (`/devices`, `/ingest`, `/logs`,
> `/alerts`) требуют заголовок `Authorization: Bearer <TOKEN>`. Токен берётся
> логином (`/auth/login`, юзер из сида — `admin/admin123`). Публичны только
> `/auth/login` и `/auth/register`. Транспорты **syslog** и **MQTT** идут мимо
> HTTP-guard и токена не требуют.

### 7.1. Способ 0 — через UI (проще всего, рекомендуется для показа)
Фронт сам хранит токен и шлёт его во всех запросах — ничего вручную делать не надо.

1. Открой `http://<IP_СЕРВЕРА>:8090`, войди как **admin / admin123**.
2. **Devices** → выбери устройство из сида (или создай новое кнопкой).
3. Вкладка **Logs**:
   - кнопка **«Отправить лог»** — добавить один лог вручную;
   - кнопка **«Тест корреляции (отправить 15 логов SSH brute-force)»** —
     зальёт всплеск логов и создаст **алерт** (если включено правило с regex
     `Failed password`). Логи появляются в реальном времени (SSE).
4. Вкладка **Audit** — запустить скан (nmap/nuclei) по устройству и увидеть findings.
5. Страницы **Alerts** / **Rules** — посмотреть/подтвердить алерты и правила корреляции.

### 7.2. Способ A — готовый демо-скрипт (рекомендуется)
`for_test/demo.sh` сам логинится, берёт устройство и шлёт всплеск логов
(имитация SSH brute-force → сработает correlation rule). Прямо на сервере:

```bash
cd ~/diploma-works/Mergen/backend
BASE=http://localhost:5050 bash for_test/demo.sh
# или извне:  BASE=http://<IP_СЕРВЕРА>:5050 bash for_test/demo.sh
```

### 7.2b. Способ A вручную — curl с токеном
```bash
BASE=http://<IP_СЕРВЕРА>:5050

# 1) логин -> токен
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# 2) узнать deviceId
curl -s $BASE/devices -H "Authorization: Bearer $TOKEN"

# 3) залить лог
curl -X POST $BASE/ingest/<DEVICE_ID>/logs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level":"ERROR","message":"Failed password for root from 10.0.0.5","source":"HTTP"}'

# 4) посмотреть результат
curl -s $BASE/devices/<DEVICE_ID>/logs   -H "Authorization: Bearer $TOKEN"
curl -s $BASE/devices/<DEVICE_ID>/alerts -H "Authorization: Bearer $TOKEN"
```

### 7.3. Способ B — PowerShell-агент
Скрипт `for_test/iot-log-agent.ps1` шлёт реальные Windows Event Log на бэк.
⚠️ Сейчас агент **не отправляет токен**, а HTTP-ingest защищён JWT — по HTTP он
получит **401**. Чтобы показать через агента, либо демонстрируй через
syslog/MQTT (способ C), либо допиши в агент заголовок
`Authorization: Bearer <TOKEN>` в функции `Send-Log`.

### 7.4. Способ C — syslog / MQTT (живые источники, без токена)
- **Syslog**: UDP на `<IP_СЕРВЕРА>:5514`
- **MQTT**: `mqtt://<IP_СЕРВЕРА>:1883`, топик `device/<DEVICE_ID>/logs`

После любого из способов открой `http://<IP_СЕРВЕРА>:8090` — логи и алерты
появляются в реальном времени (SSE).

## Обновление (после новых пушей в GitHub)

```bash
cd ~/iot-audit
git -C backend pull && git -C frontend pull
cd backend && docker compose -f docker-compose.prod.yml up -d --build
```

## Порты (открыть в firewall)

| Порт | Что |
|------|-----|
| 8090/tcp | Web UI (+ /api/ прокси) |
| 5050/tcp | API напрямую (опционально, можно закрыть) |
| 5514/udp | Syslog от устройств |
| 1883/tcp | MQTT |

Порты публикации можно переопределить переменными окружения
(`WEB_PORT`, `API_PORT`, `SYSLOG_PORT`), например:

```bash
WEB_PORT=9000 docker compose -f docker-compose.prod.yml up -d
```

```bash
sudo ufw allow 22/tcp && sudo ufw allow 8090/tcp && sudo ufw allow 5050/tcp
sudo ufw allow 5514/udp && sudo ufw allow 1883/tcp
sudo ufw enable
```

## Замечания по безопасности

- Mosquitto работает с `allow_anonymous true` — на публичном сервере лучше
  ограничить 1883 и 5514 по IP устройств (`ufw allow from <IP_устройства> to any port 1883`).
- SMTP опционален: если `SMTP_HOST` не задан, email-уведомления просто отключены.
  Для включения добавить в `.env.docker`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Для HTTPS поставить перед `web` reverse-proxy (Caddy/certbot) — опционально для демо.
