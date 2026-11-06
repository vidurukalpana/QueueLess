-include .env
export

MIGRATE = migrate -path backend/db/migrations -database "$(DATABASE_URL)"

.PHONY: api web db-up migrate-up migrate-down sqlc test

api:
	cd backend && go run ./cmd/server

web:
	cd frontend && npm run dev

db-up:
	docker compose up -d --wait

migrate-up:
	$(MIGRATE) up

migrate-down:
	$(MIGRATE) down 1

sqlc:
	cd backend && sqlc generate

test:
	cd backend && go test ./...
	cd frontend && npm test
