.PHONY: up down

up:
	docker compose up -d db
	npm install --omit=dev
	test -f .env || cp .env.example .env
	npm run start

down:
	docker compose down

