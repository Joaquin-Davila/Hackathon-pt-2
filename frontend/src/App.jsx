import { useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import ExplorerMode from './pages/ExplorerMode.jsx';
import PlannerMode from './pages/PlannerMode.jsx';
import './styles/dashboard.css';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [profile, setProfile] = useState('astronaut');
  const [selectedSite, setSelectedSite] = useState(null);

  const navigate = (nextView, site) => {
    if (site) setSelectedSite(site);
    setView(nextView);
  };

  return (
    <DashboardLayout
      view={view}
      onNavigate={navigate}
      profile={profile}
      onProfileChange={setProfile}
    >
      {view === 'explorer' || view === 'streetview' ? (
        <ExplorerMode
          site={selectedSite}
          profile={profile}
          initialViewMode="streetview"
          onBack={() => setView('dashboard')}
          onSelectSite={setSelectedSite}
        />
      ) : view === 'planner' ? (
        <PlannerMode onBack={() => setView('dashboard')} />
      ) : null}
    </DashboardLayout>
  );
}
