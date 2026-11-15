// frontend/src/components/dashboard/MissionOverview.jsx
// Barra de estado inferior. Reemplaza a MissionStatus / SolarWindow / EarthLinkStatus
// (puedes borrar esos tres archivos o dejarlos sin usar).
import { Info } from 'lucide-react';

export default function MissionOverview({ status = 'NOMINAL', solarWindow = '--', earthLink = '--', delay = '+1.2"' }) {
  return (
    <footer className="overview">
      <div className="overview-bar">
        <div className="overview-pill">MISSION STATUS: <b>{status}</b></div>
        <div className="overview-item">SOLAR WINDOW: <b>{solarWindow}</b></div>
        <div className="overview-item">EARTH LINK: <b>{earthLink}</b><b className="delay">{delay}</b></div>
      </div>
      <div className="legal">
        <span>© LUNAV</span>
        <span className="legal-icons"><Info size={13} /><Info size={13} /></span>
      </div>
    </footer>
  );
}
