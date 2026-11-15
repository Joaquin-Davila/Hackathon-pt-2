// frontend/src/components/layout/Header.jsx
import { Menu, Search } from 'lucide-react';

const PROFILES = [
  { id: 'student', label: 'STUDENT' },
  { id: 'astronaut', label: 'ASTRONAUT' },
];

export default function Header({ profile, onProfileChange, onMenu, onSearch, onBrandClick }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onMenu} aria-label="Open navigation menu"><Menu size={26} strokeWidth={1.5} /></button>
        <button className="icon-btn" onClick={onSearch} aria-label="Search landing site"><Search size={18} strokeWidth={1.5} /></button>
      </div>

      <div
        className="brand"
        onClick={onBrandClick}
        style={{ cursor: onBrandClick ? 'pointer' : undefined }}
        title="Return to LuNav System Welcome Hub"
      >
        <div className="brand-name"><span>LU</span><b>NAV</b></div>
        <div className="brand-sub">{'// LUNAR LANDING SITE SELECTOR'}</div>
      </div>

      <div className="profile" role="group" aria-label="Mission telemetry profile">
        {PROFILES.map((p, i) => (
          <span key={p.id} className="profile-item">
            {i > 0 && <i aria-hidden="true">|</i>}
            <button className={profile === p.id ? 'is-on' : ''} aria-pressed={profile === p.id} onClick={() => onProfileChange?.(p.id)}>
              {p.label}
            </button>
          </span>
        ))}
      </div>
    </header>
  );
}
