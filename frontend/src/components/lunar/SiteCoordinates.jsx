// frontend/src/components/lunar/SiteCoordinates.jsx
import { formatCoords } from '../../lunarHelpers.js';

export default function SiteCoordinates({ site, className = '' }) {
  return <span className={className}>{formatCoords(site)}</span>;
}
