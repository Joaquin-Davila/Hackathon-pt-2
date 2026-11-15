import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 3001);
const sitesPath = fileURLToPath(new URL('./data/sites.json', import.meta.url));

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (request.method !== 'GET') {
    response.writeHead(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (request.url === '/api/health') {
    response.writeHead(200).end(JSON.stringify({ status: 'ok' }));
    return;
  }

  const requestUrl = new URL(request.url, `http://localhost:${port}`);
  if (requestUrl.pathname.startsWith('/api/horizons/')) {
    let siteId;
    try {
      siteId = decodeURIComponent(requestUrl.pathname.slice('/api/horizons/'.length));
    } catch {
      response.writeHead(400).end(JSON.stringify({ error: 'Invalid site ID' }));
      return;
    }
    if (!/^[a-z0-9-]+$/i.test(siteId)) {
      response.writeHead(400).end(JSON.stringify({ error: 'Invalid site ID' }));
      return;
    }

    try {
      const horizonPath = fileURLToPath(new URL(`./data/${siteId}.json`, import.meta.url));
      const horizon = await readFile(horizonPath, 'utf8');
      response.writeHead(200).end(horizon);
    } catch {
      response.writeHead(404).end(JSON.stringify({ error: `Horizon data not found for ${siteId}` }));
    }
    return;
  }

  if (request.url === '/api/sites') {
    try {
      const sites = await readFile(sitesPath, 'utf8');
      response.writeHead(200).end(sites);
    } catch {
      response.writeHead(500).end(JSON.stringify({ error: 'Could not load sites' }));
    }
    return;
  }

  response.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, () => {
  console.log(`LuNav API listening on http://localhost:${port}`);
});
