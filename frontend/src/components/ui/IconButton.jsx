import { Search, ChevronLeft, ChevronRight, ArrowUpRight, Menu, X } from 'lucide-react';

const icons = { search: Search, previous: ChevronLeft, next: ChevronRight, arrow: ArrowUpRight, menu: Menu, close: X };
export default function IconButton({ icon = 'arrow', label, onClick, className = '', type = 'button' }) {
  const Icon = icons[icon] ?? ArrowUpRight;
  return <button className={`icon-button ${className}`} type={type} aria-label={label} title={label} onClick={onClick}><Icon size={17} strokeWidth={1.6} /></button>;
}
