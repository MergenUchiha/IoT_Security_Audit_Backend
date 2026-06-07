#!/usr/bin/env bash
# ============================================================
# Demo / smoke-test для IoT Security Audit
# Логинится -> берёт первое устройство -> шлёт всплеск логов
# (имитация брутфорса) -> печатает где смотреть результат.
#
# Все эндпоинты требуют JWT — скрипт получает токен сам.
#
# Использование:
#   ./demo.sh                                  # по умолчанию http://localhost:5050
#   BASE=http://157.173.103.216:5050 ./demo.sh # извне
#   USER=admin PASS=admin123 BURST=20 ./demo.sh
# ============================================================
set -euo pipefail

BASE="${BASE:-http://localhost:5050}"
USER="${USER:-admin}"
PASS="${PASS:-admin123}"
BURST="${BURST:-15}"

echo "==> Логин ($USER) на $BASE"
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "!! Не удалось получить токен. Сначала прогони seed (admin/admin123) или зарегистрируй юзера."
  exit 1
fi
echo "    OK, токен получен"

echo "==> Список устройств"
DEVICE_ID=$(curl -s "$BASE/devices" -H "Authorization: Bearer $TOKEN" \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -n1)

if [ -z "$DEVICE_ID" ]; then
  echo "!! Нет устройств. Прогони seed или создай устройство в UI."
  exit 1
fi
echo "    Используем deviceId = $DEVICE_ID"

echo "==> Шлём $BURST логов (имитация SSH brute-force)"
for i in $(seq 1 "$BURST"); do
  curl -s -o /dev/null -X POST "$BASE/ingest/$DEVICE_ID/logs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"level":"ERROR","message":"Failed password for root from 10.0.0.5 port 22 ssh2","source":"HTTP"}'
  printf "."
done
echo ""

echo "==> Готово. Проверь:"
echo "    Web UI : ${BASE/5050/8090}  (логи и алерты в реальном времени)"
echo "    Logs   : $BASE/devices/$DEVICE_ID/logs"
echo "    Alerts : $BASE/devices/$DEVICE_ID/alerts"
echo ""
echo "    (через curl c токеном, напр.:"
echo "     curl -s '$BASE/devices/$DEVICE_ID/alerts' -H 'Authorization: Bearer $TOKEN')"
