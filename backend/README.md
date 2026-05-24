# BUCAN DEY Backend

FastAPI API base for BUCAN DEY.

## Run locally

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Health check:

```bash
curl http://localhost:8000/api/health
```
