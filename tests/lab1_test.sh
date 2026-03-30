#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
  set +a
fi
APP_PORT="${APP_PORT:-8080}"

echo "--- Starting Lab 1 Grading ---"

# 1. Перевірка чи запущено контейнер з назвою 'app'
if [ $(docker ps -q -f name=app | wc -l) -eq 0 ]; then
  echo "❌ Error: Container named 'app' not found."
  exit 1
fi

# 2. Перевірка Health Check (200)
echo "Step 1: Checking /health (Expect 200)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "localhost:${APP_PORT}/health")
if [ "$STATUS" -ne 200 ]; then
  echo "❌ Error: Expected 200, but got $STATUS"
  exit 1
fi

# 3. Перевірка формату JSON
echo "Step 2: Checking JSON logs..."
if ! docker logs app --tail 5 | jq . > /dev/null 2>&1; then
  echo "❌ Error: Logs are not valid JSON."
  exit 1
fi

# 4. Тест на стійкість (Resilience)
echo "Step 3: Stopping DB to check 503 error..."
# Автоматично знаходимо ім'я контейнера бази даних через docker-compose
DB_CONTAINER=$(docker compose ps -q db)
docker stop $DB_CONTAINER > /dev/null
# Wait longer than health cache TTL (5s in index.js) so /health reflects DB down, not stale 200
sleep 7
STATUS_503=$(curl -s -o /dev/null -w "%{http_code}" "localhost:${APP_PORT}/health")
if [ "$STATUS_503" -ne 503 ]; then
  echo "❌ Error: App must return 503 when DB is offline."
  docker start $DB_CONTAINER
  exit 1
fi

docker start $DB_CONTAINER > /dev/null
echo "✅ SUCCESS: Lab 1 is passed!"
