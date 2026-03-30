.PHONY: up down

up:
	test -f .env || cp .env.example .env
	docker compose up -d --build

down:
	docker compose down
