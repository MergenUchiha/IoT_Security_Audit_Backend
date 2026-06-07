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

## 6. Проверка

- `http://<IP_СЕРВЕРА>:8090` — фронтенд, зарегистрировать пользователя через UI.
- `http://<IP_СЕРВЕРА>:5050` — API напрямую (Swagger включён).
- Логи: `docker compose -f docker-compose.prod.yml logs -f api`

## 7. Подключение IoT-агентов

Агенты из `for_test/` шлют логи на сервер:
- **Syslog**: UDP на `<IP_СЕРВЕРА>:5514`
- **MQTT**: `mqtt://<IP_СЕРВЕРА>:1883`, топик `device/+/logs`

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
