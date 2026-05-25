# Roadmap BUCAN DEY

## Fase 1: Base técnica

- Monorepo.
- Backend FastAPI.
- Health check.
- Configuración MongoDB preparada.
- Frontend React + Vite.
- Tailwind CSS.
- React Router.
- Navegación inferior móvil.
- Manifest PWA básico.

## Fase 2: Autenticación

- Registro.
- Login.
- JWT.
- Ruta `/api/auth/me`.
- Estado de sesión en frontend.

## Fase 3: Feed Global MVP

- Modelo de publicación.
- Crear publicación.
- Visibilidad: `global`, `profile_only`, `private`.
- Tipos: `normal`, `video`, `fiesta`, `cumpleaños`, `evento`, `live`, `bar`, `ambiente`.
- Feed único ordenado por fecha descendente.

## Fase 4: Perfil

- Perfil propio.
- Perfil público.
- Edición básica.
- Publicaciones del usuario.

## Fase 5: Interacción social

- Likes.
- Comentarios.
- Contadores.
- Notificaciones internas iniciales.

## Fase 6: Mapa, eventos y ambiente

- Ubicación aproximada.
- Eventos abiertos.
- Zonas con actividad social.

## Fase 7: Chat y tiempo real

- Conversaciones.
- Mensajes.
- WebSockets.
- Notificaciones en vivo.

## Fase 8: Moderación y admin

- Reportes.
- Panel admin.
- Bloqueo de usuarios y publicaciones.

## Fase 18: Eventos reales

- Eventos como entidad propia (`events`) con asistencia.
- Estados de asistencia: `going` e `interested`.
- Eventos públicos visibles en `/events`, mapa y feed mediante post automático.
- Eventos `followers` visibles para creador y seguidores.
- Recordatorios push:
  - 1 hora antes del evento.
  - 15 minutos antes del evento.
- Scheduler backend compatible con Render, con control de duplicados mediante MongoDB.

## Fase 20: Lives reales

- Proveedor elegido: LiveKit.
- Backend crea salas/tokens y registra lives en MongoDB.
- Frontend emite y reproduce con WebRTC mediante `livekit-client`.
- Lives públicos visibles en Home y mapa.
- Viewers, heartbeat y chat live por WebSocket.
- Notificaciones push/internas cuando alguien seguido inicia live.
