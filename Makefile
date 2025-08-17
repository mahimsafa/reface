
# Reface Development Automation

# Variables
BACKEND_DIR=reface-backend
FRONTEND_DIR=reface-frontend

.PHONY: help venv install-backend backend frontend dev clean

help:
	@echo "Available commands:"
	@echo "  make venv            - Create virtual environment with uv"
	@echo "  make install-backend - Install backend dependencies"
	@echo "  make backend         - Run FastAPI backend"
	@echo "  make frontend        - Run Vite frontend"
	@echo "  make dev             - Run backend + frontend together"
	@echo "  make clean           - Remove virtual environment"

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

clean:
	rm -rf .venv
