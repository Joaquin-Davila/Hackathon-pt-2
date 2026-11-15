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

Lunar navigation project structured as two independent applications:

- `frontend/`: React + Vite interface.
- `backend/`: Lightweight HTTP API, implemented in Node.js with zero external dependencies.

## Running in Development

Start the API in one terminal:

```bash
cd backend
npm run dev
