// frontend/src/components/layout/Header.jsx
import { Menu, Search } from 'lucide-react';

const PROFILES = [
  { id: 'student', label: 'STUDENT' },
  { id: 'astronaut', label: 'ASTRONAUT' },
];

export default function Header({ profile, onProfileChange, onMenu, onSearch }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onMenu} aria-label="Abrir menú"><Menu size={26} strokeWidth={1.5} /></button>
        <button className="icon-btn" onClick={onSearch} aria-label="Buscar sitio"><Search size={18} strokeWidth={1.5} /></button>
      </div>

      <div className="brand">
        <div className="brand-name"><span>LU</span><b>NAV</b></div>
        <div className="brand-sub">{'// LUNAR LANDING Site selector'}</div>
      </div>

      <div className="profile" role="group" aria-label="Perfil">
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
