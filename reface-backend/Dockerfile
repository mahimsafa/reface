FROM python:3.12-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV UV_SYSTEM_PYTHON=1
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY vendor/basicsr /tmp/vendor/basicsr
RUN uv pip install --no-cache-dir /tmp/vendor/basicsr && rm -rf /tmp/vendor

COPY pyproject.toml uv.lock ./
RUN uv sync --no-cache --no-dev

COPY . .

RUN mkdir -p models uploads/images uploads/output

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5000/ || exit 1

CMD ["uv", "run", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]
