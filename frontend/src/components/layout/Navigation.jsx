export default function Navigation({ view, onNavigate, open, onClose }) {
  const items = [
    ['landing', 'MISSION LANDING HUB', '00'],
    ['academy', 'LUNAV ACADEMY // TRAINING', '01'],
    ['astronaut', 'LUNAR SITE SELECTOR', '02'],
    ['explorer', '360° LOLA HORIZON EXPLORER', '03'],
    ['streetview', '360° SURFACE VISOR', '04'],
    ['planner', 'AI MISSION & ROUTE PLANNER', '05'],
  ];
  return (
    <nav className={`nav-panel ${open ? 'is-open' : ''}`} aria-label="Main navigation">
      {items.map(([id, label, num]) => (
        <button
          key={id}
          className={view === id || (id === 'astronaut' && view === 'dashboard') ? 'active' : ''}
          onClick={() => {
            onNavigate(id);
            onClose?.();
          }}
        >
          {label}
          <span>{num}</span>
        </button>
      ))}
    </nav>
  );
}
