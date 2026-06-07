# Reface — Agent Guide

This document describes the **Reface** monorepo: what the project does, how the pieces fit together, and where to look when working on it.

---

## Project context

**Reface** is an AI-powered face manipulation application. Users upload images through a web UI; the backend detects faces, runs deep-learning pipelines, and stores job history.

**Core capabilities:**

- **Face swap** — Detect and align faces, then swap a source face onto a target image using the Inswapper ONNX model (`insightface`).
- **Face restore** — Enhance or restore degraded faces using CodeFormer (with RealESRGAN background upscaling).
- **Async processing** — Heavy work runs on Celery workers backed by Redis; the API returns quickly and clients poll for status.

**Tech stack:**

| Layer | Stack |
|-------|--------|
| Frontend | Vite, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query |
| Backend API | FastAPI, SQLAlchemy, Pydantic Settings |
| Workers | Celery + Redis |
| ML | InsightFace, ONNX Runtime, PyTorch, OpenCV, CodeFormer, GFPGAN/BasicSR (vendored) |
| Infra (local) | Docker Compose — Postgres 17, Redis 8 |

**Default ports:**

- Frontend: `5173`
- Backend API: `5000` (see `reface-backend/core/config.py`; the root `README.md` still mentions `8000` in places — trust the backend config)
- Redis: `6379`
- Postgres: `5432`

---

## ⚠️ Deprecated code — do not use unless explicitly asked

**`reface-backend-old/` is deprecated.** It is a legacy monolithic FastAPI backend kept for reference only.

- **Do not read, search, or modify `reface-backend-old/`** unless the user explicitly asks you to.
- All active backend work lives in **`reface-backend/`**.
- If you see conflicting patterns between the two folders, always follow `reface-backend/`.

---

## Repository layout

```
reface/
├── AGENTS.md              # This file — architecture guide for AI agents
├── README.md              # Human-facing setup docs (partially outdated)
├── compose.yml            # Docker Compose: Postgres + Redis (backend services commented out)
├── Makefile               # Dev shortcuts (backend + frontend)
├── Taskfile.yml           # Cross-platform dev tasks (go-task)
│
├── reface-backend/        # ✅ Active Python backend (FastAPI + Celery)
└── reface-frontend/       # ✅ Active React frontend
```

There is no separate `reface-api/` service in this repo. The API is served directly from `reface-backend/app.py`.

---

## `reface-backend/` — Active backend

Python 3.11+ project managed with **uv** (`pyproject.toml`, `uv.lock`).

### Entry points

| File | Purpose |
|------|---------|
| `app.py` | FastAPI application — mounts routers, CORS |
| `celery_app.py` | Celery app configuration (broker, serializers, SSL opts) |
| `celery_worker.py` | Worker entry script (`uv run celery_worker.py`) |
| `cli.py` | CLI utilities |
| `detect.py` | Standalone face-detection script |
| `restore.py` | Standalone face-restore script |
| `Dockerfile` | Container image for the API (port 5000) |

### `core/` — Shared infrastructure

| File | Purpose |
|------|---------|
| `config.py` | Settings from `.env` (DB, Redis, model paths, upload dirs, host/port) |
| `database.py` | SQLAlchemy engine, session factory, `init_db()` |
| `models.py` | ORM models: `ProcessRecord` (jobs), `StorageRecord`, `JobMetadata`, `JobStorage` |
| `image_utils.py` | Image validation, directory helpers, BGR conversion |

### `modules/` — Feature modules (controller → service → tasks)

Each feature follows the same layout:

```
modules/<feature>/
├── controller.py   # FastAPI routes
├── schemas.py      # Pydantic request/response models
├── service.py      # ML / business logic
└── tasks.py        # Celery task definitions
```

**`modules/face_swap/`**

- `POST /api/image-processes` — Upload source + target images, create a pending record
- `POST /api/queue/process` — Enqueue a face-swap job by `process_id`
- `GET /api/image-processes` — Paginated list with filters
- `GET /api/image-processes/{id}` — Single job detail
- Uses InsightFace (`buffalo_l` detector + `inswapper_128.onnx`)

**`modules/face_restore/`**

- `POST /api/face-restore` — Upload image, auto-queue restore job
- `GET /api/face-restore` — Paginated list
- `GET /api/face-restore/{id}` — Single job detail
- Uses CodeFormer + RealESRGAN (`codeformer_arch.py`, `vqgan_arch.py` in-module)

**`modules/storage/`**

- `POST /api/storage/upload` — Upload a file with MD5 dedup (returns existing StorageRecord if duplicate)
- Uses S3Client (boto3) for S3-compatible object storage
- Storage records deduplicated by MD5 hash of file content

### `models/` — ML weight files (not committed or large binaries)

Expected artifacts (download separately):

- `inswapper_128.onnx` — Face swap model
- `codeformer-v0.1.0.pth` — Face restore checkpoint

### `uploads/` — Runtime file storage (deprecated)

Files are now stored in S3-compatible object storage. The local `uploads/` directory is no longer used.

- `uploads/images/` — Previously uploaded source/target images (legacy)
- `uploads/output/` — Previously processed results (legacy)
- Static file serving at `/uploads` has been removed

### `gfpgan/` — GFPGAN-related weights

Detection/parsing model weights used by face restoration helpers (`detection_Resnet50_Final.pth`, etc.).

### `vendor/basicsr/` — Vendored BasicSR library

Third-party super-resolution / restoration framework (upstream copy). Used by face-restore dependencies. Treat as external vendor code — avoid editing unless necessary.

### Environment

Copy/configure `reface-backend/.env` (see `core/config.py` for keys):

- `DATABASE_URL` — SQLite by default (`sqlite:///./reface.db`); Postgres available via Compose
- `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` — Redis connection
- `MODEL_PATH`, `CODEFORMER_PATH` — Model file locations
- `HOST`, `PORT` — API bind address (default `0.0.0.0:5000`)
- `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — S3 credentials
- `S3_REGION` — S3 region (default `auto` for R2)
- `S3_BUCKET_NAME` — S3 bucket name (default `reface`)
- `S3_PUBLIC_URL` — Public base URL for serving files (optional)
- `DEVICE` — ML device (`cpu`, `mps`, `cuda`; default `cpu`)

### Running locally

```bash
# Terminal 1 — API
cd reface-backend && uv sync && uv run app.py

# Terminal 2 — Celery worker (required for face swap / restore jobs)
cd reface-backend && uv run celery_worker.py

# Terminal 3 — Infrastructure
docker compose up -d   # Postgres + Redis from repo root
```

Or from repo root: `make dev` / `task dev` (API + frontend; you still need Redis + Celery worker separately for async jobs).

---

## `reface-frontend/` — Active frontend

Vite + React + TypeScript SPA. Package manager: **pnpm**.

### Structure

```
reface-frontend/
├── src/
│   ├── main.tsx              # App bootstrap
│   ├── App.tsx               # Router + React Query provider
│   ├── index.css             # Global styles (Tailwind)
│   ├── components/
│   │   ├── Layout.tsx        # Shell layout
│   │   ├── Navbar.tsx        # Navigation
│   │   └── ui/               # shadcn/ui primitives (button, card, tabs, …)
│   ├── pages/
│   │   ├── Dashboard.tsx           # Upload + trigger face swap / restore
│   │   ├── ProcessedImagesList.tsx # Job history list
│   │   ├── ProcessedImageDetails.tsx # Single job view
│   │   └── NotFound.tsx
│   ├── lib/
│   │   ├── api.ts            # Backend HTTP client
│   │   ├── config.ts         # VITE_API_URL (default http://localhost:5000)
│   │   └── utils.ts          # cn() and helpers
│   └── types/
│       └── index.ts          # ProcessRecord, PaginatedResponse types
├── components.json           # shadcn/ui config
├── env.example               # VITE_API_URL template
└── package.json
```

### API integration

`src/lib/api.ts` talks to `reface-backend` under `/api/*`:

- Upload images → create process record
- Queue process → trigger Celery task
- Poll/list processes for status and results
- Image URLs resolved via `config.apiUrl` + stored path

### Running locally

```bash
cd reface-frontend && pnpm install && pnpm dev
# → http://localhost:5173
```

---

## Request flow (face swap)

```
Browser (reface-frontend)
  │
  ├─ POST /api/image-processes     → S3 upload (dedup), creates Job + job_storage (pending)
  ├─ POST /api/queue/process       → FastAPI enqueues Celery task (queued)
  │
  └─ GET  /api/image-processes/:id → Poll until status = completed | failed

Celery worker
  │
  ├─ Downloads source/target from S3 → FaceSwapService → uploads result to S3
  ├─ optional restore → CodeFormerRestorer
  └─ Creates StorageRecord + job_storage(role=result), updates Job status
```

Face restore follows a similar path but queues immediately on `POST /api/face-restore`.

---

## `compose.yml` — Local infrastructure

Currently runs:

- **postgres** — `reface` database, user/password `root`
- **redis** — Celery broker and result backend

Backend and Celery worker service definitions exist but are **commented out**. Local dev typically runs the API and worker directly with `uv run` while using Compose only for Postgres/Redis.

---

## Conventions for agents

1. **Backend changes** → `reface-backend/` only. Never `reface-backend-old/`.
2. **Frontend changes** → `reface-frontend/src/`.
3. **New API routes** → add a module under `modules/` with `controller.py`, `schemas.py`, `service.py`, `tasks.py`; register the router in `app.py`.
4. **Long-running ML work** → always go through Celery tasks, not inline in route handlers.
5. **Model weights** → live in `reface-backend/models/` and `gfpgan/weights/`; do not commit large binaries.
6. **Vendor code** → `vendor/basicsr/` is third-party; prefer wrapping over modifying.
7. **Config** → use `core/config.py` / `.env`, not hardcoded paths or ports.

---

## Quick reference

| What you need | Where to look |
|---------------|---------------|
| API routes | `reface-backend/modules/*/controller.py` |
| ML logic | `reface-backend/modules/*/service.py` |
| Background jobs | `reface-backend/modules/*/tasks.py` |
| DB schema | `reface-backend/core/models.py` (jobs, storage, job_metadata, job_storage) |
| Settings | `reface-backend/core/config.py`, `.env` |
| Frontend pages | `reface-frontend/src/pages/` |
| HTTP client | `reface-frontend/src/lib/api.ts` |
| Dev orchestration | `Makefile`, `Taskfile.yml`, `compose.yml` |

### Database migrations (Alembic)

```bash
# Generate a new migration from model changes
cd reface-backend && uv run alembic revision --autogenerate -m "description"

# Apply pending migrations
cd reface-backend && uv run alembic upgrade head

# Rollback one step
cd reface-backend && uv run alembic downgrade -1

# Check current revision
cd reface-backend && uv run alembic current

# View migration history
cd reface-backend && uv run alembic history
```

- Always review the auto-generated migration before applying
- Migrations run inside `reface-backend/` directory
- The `env.py` imports `core.models` so Alembic auto-detects all models that inherit from `Base`
