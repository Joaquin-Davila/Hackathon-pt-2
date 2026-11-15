# LuNav

Proyecto de navegación lunar organizado en dos aplicaciones independientes:

- `frontend/`: interfaz React + Vite.
- `backend/`: API HTTP ligera, implementada con Node.js sin dependencias externas.

## Ejecutar en desarrollo

Inicia la API en una terminal:

```bash
cd backend
npm run dev
```

Inicia la interfaz en otra terminal:

```bash
cd frontend
npm run dev
```

Vite envía las solicitudes `/api/*` a `http://localhost:3001`. La interfaz consulta `/api/sites` primero y conserva `/data/sites.json` como fuente alternativa si la API no está disponible.

## API

- `GET /api/health`: estado del servicio.
- `GET /api/sites`: sitios definidos en `backend/data/sites.json`.

Los datos actuales de sitios y horizontes siguen pendientes; el frontend conserva sus nombres predeterminados mientras no existan coordenadas.

## Producción frontend

```bash
cd frontend
npm run build
npm run preview
```

# LuNav

Lunar navigation project organized as two independent applications:

- `frontend/`: React + Vite interface.
- `backend/`: lightweight HTTP API, implemented with Node.js and no external dependencies.

## Run in development

Start the API in one terminal:

```bash
cd backend
npm run dev
```

Start the interface in another terminal:

```bash
cd frontend
npm run dev
```

Vite proxies `/api/*` requests to `http://localhost:3001`. The interface queries `/api/sites` first and falls back to `/data/sites.json` if the API is unavailable.

## API

- `GET /api/health`: service status.
- `GET /api/sites`: sites defined in `backend/data/sites.json`.

The current site and horizon data are still pending; the frontend keeps its default names while no coordinates exist.

## Frontend production build

```bash
cd frontend
npm run build
npm run preview
```

## Despliegue en Vercel / Deploy on Vercel

Importa el repositorio en Vercel y deja el Root Directory en la raíz (no elijas `frontend`). `vercel.json` declara dos servicios: `frontend` (Vite) y `backend` (`backend/server.js`), y envía `/api/*` al backend y todo lo demás al frontend. No hace falta configurar nada más ni variables de entorno.

Import the repository in Vercel and keep the Root Directory at the repository root (do not pick `frontend`). `vercel.json` declares two services: `frontend` (Vite) and `backend` (`backend/server.js`), routing `/api/*` to the backend and everything else to the frontend. No extra settings or environment variables are needed.
