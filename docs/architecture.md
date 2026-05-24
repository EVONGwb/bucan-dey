# Arquitectura BUCAN DEY

BUCAN DEY se estructura como un monorepo con dos aplicaciones separadas:

- `backend`: API FastAPI preparada para MongoDB Atlas, JWT y rutas modulares.
- `frontend`: PWA React + Vite con Tailwind CSS, React Router y cliente Axios.

## Flujo principal

```txt
React PWA
  -> Axios usando VITE_API_URL
  -> FastAPI bajo /api
  -> Motor/PyMongo
  -> MongoDB Atlas
```

## Backend

La API usa una configuración central en `app/core/config.py`, conexión MongoDB en `app/core/database.py` y seguridad preparada en `app/core/security.py`.

En esta fase solo se expone `GET /api/health`. Las rutas `auth`, `users` y `posts` quedan preparadas como módulos base para la siguiente fase.

## Frontend

El frontend usa rutas móviles principales:

- `/`: Inicio
- `/map`: Mapa
- `/create`: Crear
- `/chat`: Chat
- `/profile`: Perfil
- `/login`: Login
- `/register`: Registro

La navegación inferior mobile-first refleja las cinco acciones principales de la app.

## PWA

La PWA incluye manifest básico con nombre, short name, colores oscuros y modo `standalone`.
