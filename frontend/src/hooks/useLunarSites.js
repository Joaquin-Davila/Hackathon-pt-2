// frontend/src/hooks/useLunarSites.js
import { useEffect, useState } from 'react';
import { normalizeSite } from '../lunarHelpers.js';

const SOURCES = ['/api/sites', '/data/sites.json'];
const FALLBACK_SITES = [
  {
    id: 'shackleton-rim',
    name: 'Shackleton Rim',
    lat: -89.54,
    lon: 0.0,
    elevation: 4218,
    markers: [
      { name: 'Connecting Ridge Path', x: 0.48, y: 0.42 },
      { name: 'Deep Shadow Floor', x: 0.52, y: 0.55 },
    ],
  },
  {
    id: 'connecting-ridge',
    name: 'Connecting Ridge',
    lat: -89.44,
    lon: -137.5,
    elevation: 4350,
    markers: [{ name: 'Ridge Crest', x: 0.51, y: 0.46 }],
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif',
    lat: -85.99,
    lon: 2.93,
    elevation: 5040,
    markers: [{ name: 'Massif Peak', x: 0.54, y: 0.38 }],
  },
  {
    id: 'haworth-rim',
    name: 'Haworth Crater Rim',
    lat: -87.4,
    lon: -5.1,
    elevation: 2150,
    markers: [{ name: 'PSR Ingress', x: 0.46, y: 0.52 }],
  },
  {
    id: 'nobile-rim',
    name: 'Nobile Rim 1',
    lat: -85.2,
    lon: 37.8,
    elevation: 3820,
    markers: [{ name: 'Landing Zone Alpha', x: 0.50, y: 0.48 }],
  },
];

export function useLunarSites() {
  const [state, setState] = useState({ sites: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const url of SOURCES) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = await res.json();
          const list = Array.isArray(json) ? json : json.sites;
          if (list?.length) {
            if (!cancelled) setState({ sites: list.map(normalizeSite), loading: false, error: null });
            return;
          }
        } catch {
          /* try next source */
        }
      }
      if (!cancelled) setState({ sites: FALLBACK_SITES.map(normalizeSite), loading: false, error: null });
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
