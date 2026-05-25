# BUCAN DEY

BUCAN DEY es una PWA social local pensada para ver qué está pasando ahora mismo: fiestas, cumpleaños, eventos, lives, videos y publicaciones públicas de la comunidad.

Eslogan:

```txt
Tu mundo. Tu gente. Tu momento.
```

## Estructura

```txt
backend/   FastAPI API, MongoDB Atlas, JWT, Cloudinary
frontend/  React + Vite PWA, Tailwind, React Router
docs/      Arquitectura, roadmap y despliegue
```

## Backend

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

Build/validación:

```bash
PYTHONPYCACHEPREFIX=/private/tmp/bucan-dey-pycache python3.11 -m compileall app
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open:

```txt
http://localhost:5173
```

Build:

```bash
npm run build
npm run preview
```

## Variables de entorno

Backend (`backend/.env` local o Render):

```txt
MONGO_URL=
DB_NAME=bucan_dey
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=
CORS_ORIGIN_REGEX=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=bucan-dey
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:evongorecords@gmail.com
LIVE_PROVIDER=livekit
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Frontend (`frontend/.env` local o Vercel):

```txt
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=
```

En producción:

```txt
VITE_API_URL=https://TU-BACKEND-RENDER.onrender.com/api
VITE_GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID
```

## Despliegue

- Backend: Render, usando `backend/render.yaml` o un Web Service con Root Directory `backend`.
- Frontend: Vercel, usando Root Directory `frontend`.
- MongoDB: MongoDB Atlas.
- Medios: Cloudinary.
- OAuth: Google Identity Services con verificación de ID Token en backend.

Guía completa: [docs/deployment.md](docs/deployment.md).

## Seguridad

- No subir `.env`, claves ni tokens.
- `.env` y `.env.local` están ignorados por git.
- `JWT_SECRET_KEY` debe ser largo y aleatorio en producción.
- Cloudinary credentials solo deben vivir en backend.
- `VITE_API_URL` es pública y puede configurarse en Vercel.
- Admin está protegido por `role = "admin"`.
