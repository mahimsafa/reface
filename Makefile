
# Reface Development Automation

# Variables
BACKEND_DIR=reface-backend
FRONTEND_DIR=reface-frontend

.PHONY: help venv install-backend backend frontend dev db-upgrade db-downgrade db-migrate clean

help:
	@echo "Available commands:"
	@echo "  make venv            - Create virtual environment with uv"
	@echo "  make install-backend - Install backend dependencies"
	@echo "  make backend         - Run FastAPI backend"
	@echo "  make frontend        - Run Vite frontend"
	@echo "  make dev             - Run backend + frontend together"
	@echo "  make clean           - Remove virtual environment"
	@echo "  make db-upgrade      - Apply all pending database migrations"
	@echo "  make db-downgrade    - Rollback one database migration"
	@echo "  make db-migrate      - Generate a new migration from model changes"

venv:
	uv venv .venv

install-backend:
	.venv/bin/uv pip install -r $(BACKEND_DIR)/requirements.txt

backend:
	.venv/bin/uv run $(BACKEND_DIR)/app.py

frontend:
	cd $(FRONTEND_DIR) && npm install && npm run dev

dev:
	# Run backend in background and frontend in foreground
	(uv run $(BACKEND_DIR)/app.py &) && cd $(FRONTEND_DIR) && npm install && npm run dev

db-upgrade:  ## Apply all pending database migrations
	uv run --directory reface-backend alembic upgrade head

db-downgrade:  ## Rollback one database migration
	uv run --directory reface-backend alembic downgrade -1

db-migrate:  ## Generate a new migration from model changes (usage: make db-migrate name="description")
	uv run --directory reface-backend alembic revision --autogenerate -m "$(name)"

clean:
	rm -rf .venv
