# Despliegue de BUCAN DEY

BUCAN DEY se despliega con frontend en Vercel, backend en Render, MongoDB Atlas como base de datos y Cloudinary para medios.

## Backend en Render

1. Sube el monorepo a GitHub, GitLab o Bitbucket.
2. En Render, crea un nuevo Web Service desde el repositorio.
3. Usa `backend` como Root Directory si configuras el servicio desde el Dashboard.
4. Si usas Blueprint, coloca el contenido de `backend/render.yaml` en el Blueprint que Render lea desde el repositorio. El archivo ya incluye `rootDir: backend`.
5. Configura:
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/api/health`
6. Añade las variables de entorno en Render.
7. Despliega y abre `https://TU-BACKEND-RENDER.onrender.com/api/health`.

Render asigna `PORT` automáticamente. El comando de arranque ya usa `$PORT`.

## Variables Render

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
```

Ejemplo de CORS para producción:

```txt
CORS_ORIGINS=https://bucan-dey.vercel.app,https://bucandey.com,https://www.bucandey.com
CORS_ORIGIN_REGEX=^https://[a-z0-9-]+\.vercel\.app$
```

Para desarrollo local puedes añadir:

```txt
http://localhost:5173,http://127.0.0.1:5173
```

## Frontend en Vercel

1. En Vercel, importa el mismo repositorio.
2. Selecciona `frontend` como Root Directory.
3. Verifica:
   - Framework Preset: Vite
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Añade la variable `VITE_API_URL`.
5. Despliega.

`frontend/vercel.json` redirige todas las rutas a `index.html`, necesario para React Router.

## Variables Vercel

```txt
VITE_API_URL=https://TU-BACKEND-RENDER.onrender.com/api
```

`VITE_API_URL` es pública porque se usa en el navegador. Las claves privadas no deben estar en Vercel para esta arquitectura.

## Pruebas post-despliegue

Backend:

```bash
curl https://TU-BACKEND-RENDER.onrender.com/api/health
```

Debe responder:

```json
{
  "status": "ok",
  "app": "BUCAN DEY",
  "version": "0.1.0"
}
```

Frontend:

1. Abre la URL de Vercel.
2. Prueba `/`, `/login`, `/register`, `/profile`, `/map`, `/chat`, `/notifications`, `/admin` y `/users/:username`.
3. Registra un usuario.
4. Inicia sesión.
5. Crea una publicación global.
6. Comprueba que aparece en Inicio.
7. Sube una imagen o vídeo y confirma que Cloudinary devuelve URL.

## Verificar CORS

1. Abre la app de Vercel.
2. Inicia sesión o registra un usuario.
3. Si el navegador muestra errores CORS, confirma que el dominio exacto de Vercel está en `CORS_ORIGINS`.
4. Para previews de Vercel, usa `CORS_ORIGIN_REGEX` con un patrón limitado a dominios `vercel.app`.
5. Evita `*` en producción porque la API usa credenciales y Authorization Bearer.

## Verificar MongoDB Atlas

1. Confirma que `MONGO_URL` está definido en Render.
2. Confirma que el usuario de Atlas tiene permisos de lectura/escritura sobre `DB_NAME`.
3. Confirma que Network Access en Atlas permite la salida de Render.
4. Revisa `/api/health` y los logs de arranque en Render.
5. Prueba registro/login para validar escritura y lectura.

## Verificar Cloudinary

1. Confirma que las variables Cloudinary están en Render.
2. Inicia sesión en BUCAN DEY.
3. Sube una imagen pequeña desde Crear.
4. Comprueba que el post muestra la imagen desde una URL de Cloudinary.
5. Prueba un archivo no permitido y confirma que la API responde con error claro.

## Seguridad

- No subas `.env` a GitHub.
- No subas claves, tokens ni secretos.
- Usa un `JWT_SECRET_KEY` largo y aleatorio en producción.
- No imprimas claves en logs.
- Mantén Cloudinary solo en backend.
- Mantén endpoints admin protegidos por `role = "admin"`.
- Revisa manualmente qué usuarios tienen rol admin antes de abrir la app al público.

## No subir a GitHub

```txt
.env
.env.local
.vercel/
node_modules/
dist/
__pycache__/
.venv/
```
