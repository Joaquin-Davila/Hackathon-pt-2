export default function Navigation({ view, onNavigate, open, onClose }) {
  const items = [
    ['dashboard', 'Mission control', '01'],
    ['explorer', 'Explorer mode', '02'],
    ['streetview', 'Lunar street view 3D', '03'],
    ['planner', 'Planner mode', '04'],
  ];
  return (
    <nav className={`nav-panel ${open ? 'is-open' : ''}`} aria-label="Main navigation">
      {items.map(([id, label, num]) => (
        <button
          key={id}
          className={view === id ? 'active' : ''}
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
