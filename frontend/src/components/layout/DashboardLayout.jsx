// frontend/src/components/layout/DashboardLayout.jsx
import { useState } from 'react';
import Header from './Header';
import Navigation from './Navigation';
import LunarScene from '../lunar/LunarScene';
import MissionOverview from '../dashboard/MissionOverview';
import { useLunarSites } from '../../hooks/useLunarSites';
import '../../styles/dashboard.css';

const MISSION = { year: 2026, latitude: '84°S - 90°S', data: 'JPL HORIZONS / LOLA' };

export default function DashboardLayout({ profile = 'astronaut', onProfileChange, view, onNavigate, children }) {
  const { sites, loading, error } = useLunarSites();
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="shell">
      <div className="space" aria-hidden="true" />
      <Header profile={profile} onProfileChange={onProfileChange} onMenu={() => setMenuOpen((v) => !v)} />

      {menuOpen && (
        <div className="menu-drawer">
          <Navigation view={view} onNavigate={(v) => { setMenuOpen(false); onNavigate?.(v); }} />
        </div>
      )}

      {view === 'explorer' || view === 'streetview' ? (
        <main className="main mode-main">{children}</main>
      ) : view === 'planner' ? (
        <main className="main mode-main">{children}</main>
      ) : <main className="main">
        <div className="intro">
          <h1>LUNAR SOUTH POLE</h1>
          <p>Select a candidate landing site to explore horizon</p>
          <dl className="meta">
            <div><dt>TARGET YEAR:</dt><dd>{MISSION.year}</dd></div>
            <div><dt>LATITUDE:</dt><dd>{MISSION.latitude}</dd></div>
            <div><dt>DATA:</dt><dd>{MISSION.data}</dd></div>
          </dl>
        </div>

        {loading && <p className="state">Cargando sitios…</p>}
        {error && <p className="state">{error}</p>}
        {!loading && !error && (
          <LunarScene sites={sites} activeIndex={active} onChange={setActive} onExploreHorizon={(site) => onNavigate?.('explorer', site)} />
        )}
      </main>}

      {view === 'dashboard' && <MissionOverview />}
    </div>
  );
}
