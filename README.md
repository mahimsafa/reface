# Reface — AI-Powered Face Swap Application

**Reface** is an AI-powered face swap application built with **FastAPI (backend)** and **Vite + React (frontend)**.
It leverages deep learning models to detect, align, and swap faces between images with high realism, preserving natural expressions, lighting, and orientation.

---

## ✨ Features

* **Face Detection & Alignment** — Automatically detects and aligns faces in source and target images.
* **High-Quality Face Swapping** — Uses the **Inswapper ONNX model** to generate photorealistic swaps.
* **Multi-Face Support** — Handles multiple faces per image, with index-based selection.
* **Simple Web UI** — Upload images and trigger swaps directly in the browser.
* **Process Tracking** — REST endpoints to view past face swap jobs and their details.
* **Static File Hosting** — Outputs at `/output`, uploads at `/images`.
* **Developer-Friendly API** — REST endpoints for programmatic access and easy integration.

---

## 🔧 Prerequisites

* **Python** 3.13+
* **Node.js** 18+ (with npm)
* **uv** (Python package/dependency manager) → [Install guide](https://github.com/astral-sh/uv)
* (Optional) **GNU Make** or **Taskfile** for automated dev workflow

---

## ⚡ Quickstart (One-Liner)

* **Backend (FastAPI)**

  ```bash
  uv run --python 3.13 reface-backend/app.py
  ```

* **Frontend (Vite + React)**

  ```bash
  cd reface-frontend && npm install && npm run dev
  ```

👉 Then open:

* Backend → [http://localhost:8000](http://localhost:8000)
* Frontend → [http://localhost:5173](http://localhost:5173)

---

## 🚀 Backend (FastAPI)

**Path:** `reface-backend/`

### 1. Setup Virtual Environment

* **Windows (PowerShell):**

  ```powershell
  uv venv .venv
  .\.venv\Scripts\Activate.ps1
  ```

* **macOS / Linux (bash/zsh):**

  ```bash
  uv venv .venv
  source .venv/bin/activate
  ```

---

### 2. Install Dependencies

Install dependencies defined in `pyproject.toml`:

```bash
uv sync
```

Or install main packages directly:

```bash
uv pip install fastapi[standard] insightface ipykernel ipython matplotlib numpy onnxruntime opencv-python python-multipart sqlalchemy
```

---

### 3. Model File

Ensure model exists at:

```
reface-backend/models/inswapper_128.onnx
```

* Download the model from [InsWapper ONNX Model](https://drive.google.com/file/d/1O43uSrY10gUI1v4vWjgFoSfxuNhoWh0r/view?usp=sharing)
* Place it in `reface-backend/models/`

*(already included in repo)*

---

### 4. Run the API (default: port **8000**)

```bash
uv run app.py
```

---

### 5. API Overview

* Serves **outputs** at `/output` → `reface-backend/output/`
* Serves **uploads** at `/images` → `reface-backend/images/`

**Key Endpoints:**

* `GET /` — Health/info
* `POST /swap-faces` — Face swap request

  * Fields:

    * `source_image` (file)
    * `target_image` (file)
    * `form_data` (JSON string), e.g.

      ```json
      {
        "target_index": 0,
        "source_index": 0,
        "output_prefix": "result"
      }
      ```
* `GET /processes` — List processes (supports pagination/filter)
* `GET /processes/{id}` — Detailed process info

---

## 💻 Frontend (Vite + React)

**Path:** `reface-frontend/`

### 1. Install & Run

```bash
npm install
npm run dev
```

Default frontend URL:
👉 `http://localhost:5173`

### 2. Backend Connection

* Expects backend at `http://localhost:8000`
* Configured in `src/lib/api.ts`
* CORS already enabled in backend (`app.py`) for Vite defaults

---

## 🔄 Typical Development Flow

1. Start backend:

   ```bash
   uv run app.py
   ```

   → [http://localhost:8000](http://localhost:8000)

2. Start frontend:

   ```bash
   npm run dev
   ```

   → [http://localhost:5173](http://localhost:5173)

3. Use the web UI to:

   * Upload **source** and **target** images
   * Trigger a **swap**

4. Access results at:

   ```
   http://localhost:8000/output/<filename>
   ```

---

## ⚙️ Automated Workflow

To simplify local development, you can use either **Makefile** or **Taskfile**.

### 🔹 Makefile (Linux/macOS + Windows with Git Bash/WSL)

At the repo root, run:

```bash
make venv            # Create virtual environment with uv
make install-backend # Install backend dependencies
make backend         # Run FastAPI backend
make frontend        # Run React frontend
make dev             # Run backend + frontend together
make clean           # Remove virtual environment
```

---

### 🔹 Taskfile (Cross-Platform via [go-task](https://taskfile.dev/))

At the repo root, run:

```bash
task venv            # Create virtual environment with uv
task install-backend # Install backend dependencies
task backend         # Run FastAPI backend
task frontend        # Run React frontend
task dev             # Run backend + frontend together
```

👉 `task dev` requires `concurrently` (`npm install -g concurrently`).

---

## 🤝 Contributing

We welcome contributions! Here’s how you can help:

### 1. Fork & Branch

* Fork the repo
* Create a feature branch:

  ```bash
  git checkout -b feature/my-new-feature
  ```

### 2. Coding Standards

* **Backend:** Follow [PEP8](https://peps.python.org/pep-0008/)
* **Frontend:** Use ESLint & Prettier (`npm run lint` before committing)
* Write clear commit messages (`feat:`, `fix:`, `docs:` prefixes encouraged)

### 3. Testing

* Add unit tests for backend changes (e.g., API endpoints, utils).
* Add frontend tests (Jest/React Testing Library where applicable).

### 4. Pull Requests

* Keep PRs small and focused.
* Ensure **CI passes** before requesting review.
* Add screenshots/gifs if the change affects UI.

---

## 📜 License

This project is licensed under the **MIT License** — feel free to use, modify, and share.