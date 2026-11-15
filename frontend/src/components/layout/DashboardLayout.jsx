// frontend/src/components/layout/DashboardLayout.jsx
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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
  const [liveOverview, setLiveOverview] = useState({
    status: 'NOMINAL',
    solarWindow: '86.9% (292H)',
    earthLink: '91.7% DTE',
  });

  const isCarouselView = view === 'astronaut' || view === 'dashboard';

  return (
    <div className="shell">
      <div className="space" aria-hidden="true" />
      <Header
        profile={profile}
        onProfileChange={onProfileChange}
        onMenu={() => setMenuOpen((v) => !v)}
        onBrandClick={() => onNavigate?.('landing')}
      />

      {menuOpen && (
        <div className="menu-drawer">
          <Navigation view={view} onNavigate={(v) => { setMenuOpen(false); onNavigate?.(v); }} />
        </div>
      )}

      {view === 'landing' ? (
        <main className="main mode-main landing-main">{children}</main>
      ) : view === 'academy' ? (
        <main className="main mode-main academy-main">{children}</main>
      ) : view === 'explorer' || view === 'streetview' ? (
        <main className="main mode-main">{children}</main>
      ) : view === 'planner' ? (
        <main className="main mode-main">{children}</main>
      ) : (
        <main className="main astronaut-carousel-main">
          <div className="carousel-return-bar">
            <button
              className="minimal-back-btn"
              type="button"
              onClick={() => onNavigate?.('landing')}
              title="Return to Cinematic Mission Landing Hub"
            >
              <ArrowLeft size={14} />
              <span>MISSION CONTROL // RETURN</span>
            </button>
          </div>

          <div className="intro">
            <h1>LUNAR SOUTH POLE</h1>
            <p>Select a candidate landing site to explore horizon</p>
            <dl className="meta">
              <div><dt>TARGET YEAR:</dt><dd>{MISSION.year}</dd></div>
              <div><dt>LATITUDE:</dt><dd>{MISSION.latitude}</dd></div>
              <div><dt>DATA:</dt><dd>{MISSION.data}</dd></div>
            </dl>
          </div>

          {loading && <p className="state">INITIALIZING LUNAR LANDING SITES…</p>}
          {error && <p className="state">{error}</p>}
          {!loading && !error && (
            <LunarScene
              sites={sites}
              activeIndex={active}
              onChange={setActive}
              onExploreHorizon={(site) => onNavigate?.('explorer', site)}
              onPlanMission={(site) => onNavigate?.('planner', site)}
              onFeasibilityUpdate={setLiveOverview}
            />
          )}
        </main>
      )}

      {isCarouselView && (
        <MissionOverview
          status={liveOverview.status}
          solarWindow={liveOverview.solarWindow}
          earthLink={liveOverview.earthLink}
        />
      )}
    </div>
  );
}
