import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import ExplorerMode from './pages/ExplorerMode.jsx';
import PlannerMode from './pages/PlannerMode.jsx';
import MissionLanding from './pages/MissionLanding.jsx';
import AcademyDashboard from './pages/AcademyDashboard.jsx';
import './styles/dashboard.css';

export default function App() {
  // Primary view state: 'landing' (default cinematic hub) | 'academy' (LuNav Academy) | 'astronaut' (lunar carousel & site selector) | 'explorer' | 'planner'
  const [currentView, setCurrentView] = useState('landing');
  const [isLandingExiting, setIsLandingExiting] = useState(false);
  const [profile, setProfile] = useState('astronaut');
  const [selectedSite, setSelectedSite] = useState(null);
  const transitionTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Smooth transition from Cinematic Landing to target workspace ('academy' or 'astronaut')
  const transitionFromLanding = useCallback((nextView = 'astronaut', nextProfile = 'astronaut') => {
    setProfile(nextProfile);
    if (currentView === 'landing') {
      setIsLandingExiting(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setCurrentView(nextView);
        setIsLandingExiting(false);
        transitionTimerRef.current = null;
      }, 420);
    } else {
      setCurrentView(nextView);
    }
  }, [currentView]);

  const navigate = useCallback((nextView, site) => {
    if (site) setSelectedSite(site);
    const normalizedView = nextView === 'dashboard' ? 'astronaut' : nextView;
    const nextProfile = normalizedView === 'academy' ? 'student' : profile;
    if (currentView === 'landing' && normalizedView !== 'landing') {
      transitionFromLanding(normalizedView, nextProfile);
    } else {
      setIsLandingExiting(false);
      if (normalizedView === 'academy') setProfile('student');
      setCurrentView(normalizedView);
    }
  }, [currentView, profile, transitionFromLanding]);

  const handleProfileChange = useCallback((nextProfile) => {
    setProfile(nextProfile);
    if (nextProfile === 'student') {
      if (currentView === 'landing') {
        transitionFromLanding('academy', 'student');
      } else {
        setCurrentView('academy');
      }
    } else if (nextProfile === 'astronaut') {
      if (currentView === 'landing' || currentView === 'academy') {
        transitionFromLanding('astronaut', 'astronaut');
      }
    }
  }, [currentView, transitionFromLanding]);

  return (
    <DashboardLayout
      view={currentView}
      onNavigate={navigate}
      profile={profile}
      onProfileChange={handleProfileChange}
    >
      {currentView === 'landing' ? (
        <MissionLanding
          isExiting={isLandingExiting}
          onEnterMissionControl={() => transitionFromLanding('astronaut', 'astronaut')}
          onEnterAcademy={() => transitionFromLanding('academy', 'student')}
          onEnterStudentView={() => transitionFromLanding('academy', 'student')}
        />
      ) : currentView === 'academy' ? (
        <AcademyDashboard
          onReturnLanding={() => setCurrentView('landing')}
          onEnterMissionControl={() => {
            setProfile('astronaut');
            setCurrentView('astronaut');
          }}
        />
      ) : currentView === 'explorer' || currentView === 'streetview' ? (
        <ExplorerMode
          site={selectedSite}
          profile={profile}
          initialViewMode="streetview"
          onBack={() => setCurrentView('astronaut')}
          onSelectSite={setSelectedSite}
        />
      ) : currentView === 'planner' ? (
        <PlannerMode
          site={selectedSite}
          onBack={() => setCurrentView('astronaut')}
          onNavigateToStreetView={(recSite) => navigate('streetview', recSite)}
        />
      ) : null}
    </DashboardLayout>
  );
}
