import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Compass,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Box,
  Layers,
  Activity,
  Eye,
} from 'lucide-react';
import HorizonProfileChart from '../components/lunar/HorizonProfileChart.jsx';
import TacticalTelemetry from '../components/lunar/TacticalTelemetry.jsx';
import EphemerisTimeline from '../components/lunar/EphemerisTimeline.jsx';
import SiteOverlaySelector from '../components/lunar/SiteOverlaySelector.jsx';
import LunarStreetView from '../components/lunar/LunarStreetView.jsx';
import QuickmapTerrainView from '../components/lunar/QuickmapTerrainView.jsx';
import { getHorizonData, CANDIDATE_SITES_CATALOG } from '../services/horizonsService.js';
import {
  evaluateSiteTelemetry,
  DEFAULT_MISSION_EPOCH,
} from '../services/ephemerisEngine.js';

const DEFAULT_SITE = {
  id: 'shackleton-rim',
  siteId: 'shackleton',
  name: 'Shackleton Rim',
  lat: -89.54,
  lon: 0.0,
  elevation: 4218,
};

export default function ExplorerMode({
  site = DEFAULT_SITE,
  profile = 'astronaut',
  initialViewMode = 'streetview',
  onBack,
  onSelectSite,
}) {
  // Active primary site state (supports rapid switching from 3D Street View or Catalog)
  const [activeSite, setActiveSite] = useState(site || DEFAULT_SITE);

  useEffect(() => {
    if (site) {
      setActiveSite(site);
    }
  }, [site]);

  // View Mode: 'streetview' | 'chart' | 'dual'
  const [viewMode, setViewMode] = useState(initialViewMode);

  // Normalize primary site ID
  const primaryId = activeSite.horizonId ?? activeSite.siteId ?? String(activeSite.id ?? 'shackleton').replace(/-rim$/, '');

  // State: Loading & Data
  const [primaryState, setPrimaryState] = useState({ loading: true, data: null });
  const [overlaySiteId, setOverlaySiteId] = useState(null);
  const [overlayState, setOverlayState] = useState({ loading: false, data: null });

  // State: Temporal offset (in hours from mission epoch)
  const [hoursOffset, setHoursOffset] = useState(0);

  // Fetch Primary Site Horizon Data (or synthesize coherent latitude-based LOLA profile for custom coordinates)
  useEffect(() => {
    let cancelled = false;
    setPrimaryState({ loading: true, data: null });

    getHorizonData(primaryId, activeSite).then((data) => {
      if (!cancelled) {
        setPrimaryState({ loading: false, data });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [primaryId, activeSite]);

  // Fetch Alternative Overlay Site Horizon Data
  useEffect(() => {
    if (!overlaySiteId) {
      setOverlayState({ loading: false, data: null });
      return;
    }

    let cancelled = false;
    setOverlayState({ loading: true, data: null });

    getHorizonData(overlaySiteId).then((data) => {
      if (!cancelled) {
        setOverlayState({ loading: false, data });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [overlaySiteId]);

  const { loading: primaryLoading, data: primaryData } = primaryState;
  const { data: overlayData } = overlayState;

  // Active coordinates
  const latitude = Number.isFinite(activeSite.lat) ? activeSite.lat : (primaryData?.coordinates?.latitude ?? -89.54);
  const longitude = Number.isFinite(activeSite.lon) ? activeSite.lon : (primaryData?.coordinates?.longitude ?? 0.0);
  const elevation = Number.isFinite(activeSite.elevation) ? activeSite.elevation : (primaryData?.coordinates?.elevation ?? 4218);

  const effectivePrimarySite = useMemo(() => ({
    ...activeSite,
    id: activeSite.id ?? primaryId,
    name: primaryData?.name ?? activeSite.name,
    lat: latitude,
    lon: longitude,
    elevation,
  }), [activeSite, primaryId, primaryData, latitude, longitude, elevation]);

  const primaryProfile = primaryData?.horizonProfile ?? [];

  // Find overlay site details
  const overlaySiteObj = useMemo(() => {
    if (!overlaySiteId) return null;
    const catalogItem = CANDIDATE_SITES_CATALOG.find((s) => s.id === overlaySiteId || s.defaultHorizon === overlaySiteId);
    return {
      ...(catalogItem || { id: overlaySiteId, name: overlaySiteId }),
      name: overlayData?.name ?? catalogItem?.name ?? overlaySiteId,
      lat: overlayData?.coordinates?.latitude ?? catalogItem?.lat ?? -89.44,
      lon: overlayData?.coordinates?.longitude ?? catalogItem?.lon ?? 0,
      elevation: overlayData?.coordinates?.elevation ?? catalogItem?.elevation ?? 4200,
    };
  }, [overlaySiteId, overlayData]);

  const overlayProfile = overlayData?.horizonProfile ?? [];

  // Calculate high-precision Ephemeris Telemetry for Primary Site
  const primaryTelemetry = useMemo(() => {
    return evaluateSiteTelemetry(effectivePrimarySite, primaryProfile, hoursOffset);
  }, [effectivePrimarySite, primaryProfile, hoursOffset]);

  // Calculate high-precision Ephemeris Telemetry for Overlay Site
  const overlayTelemetry = useMemo(() => {
    if (!overlaySiteObj || !overlayProfile.length) return null;
    return evaluateSiteTelemetry(overlaySiteObj, overlayProfile, hoursOffset);
  }, [overlaySiteObj, overlayProfile, hoursOffset]);

  const handleSelectSiteInternal = (newSite) => {
    setActiveSite(newSite);
    onSelectSite?.(newSite);
  };

  return (
    <div className="astronaut-explorer-shell" aria-labelledby="explorer-main-title">
      {/* Top Bar with Minimalist Navigation & Mission Heading */}
      <header className="explorer-editorial-header">
        <div className="header-top-nav">
          <button className="minimal-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>MISSION CONTROL // RETURN</span>
          </button>

          {/* Mode Tabs */}
          <div className="explorer-view-modes-group" role="tablist" aria-label="360° Horizon Analysis Mode">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'streetview'}
              className={`mode-tab-btn ${viewMode === 'streetview' ? 'is-active' : ''}`}
              onClick={() => setViewMode('streetview')}
            >
              <Eye size={13} />
              <span>360° SURFACE VISOR</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'chart'}
              className={`mode-tab-btn ${viewMode === 'chart' ? 'is-active' : ''}`}
              onClick={() => setViewMode('chart')}
            >
              <Activity size={13} />
              <span>360° LOLA DEM ELEVATION</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'quickmap'}
              className={`mode-tab-btn ${viewMode === 'quickmap' ? 'is-active' : ''}`}
              onClick={() => setViewMode('quickmap')}
            >
              <Compass size={13} />
              <span>LROC WAC 2D POLAR MAP</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'dual'}
              className={`mode-tab-btn ${viewMode === 'dual' ? 'is-active' : ''}`}
              onClick={() => setViewMode('dual')}
            >
              <Layers size={13} />
              <span>360° SYNCHRONIZED VIEW</span>
            </button>
          </div>

          <div className="profile-indicator-tag">
            <span className="tag-pulse" />
            <span className="tag-text">
              MODE: {profile.toUpperCase()} · LRO LOLA DEM / JPL HORIZONS
            </span>
          </div>
        </div>

        <div className="header-editorial-title-row">
          <div className="editorial-title-col">
            <div className="editorial-kicker">
              <span>LUNAR SOUTH POLE // LROC WAC & LRO LOLA TOPOGRAPHIC TELEMETRY</span>
            </div>
            <h1 id="explorer-main-title" className="editorial-headline">
              {effectivePrimarySite.name}
            </h1>
          </div>

          {viewMode !== 'quickmap' && (
            <div className="editorial-quick-coords">
              <div className="quick-coord-item">
                <span className="coord-label">LAT</span>
                <span className="coord-val">
                  {Math.abs(latitude).toFixed(3)}° {latitude < 0 ? 'S' : 'N'}
                </span>
              </div>
              <div className="quick-coord-item">
                <span className="coord-label">LON</span>
                <span className="coord-val">
                  {Math.abs(longitude).toFixed(3)}° {longitude < 0 ? 'W' : 'E'}
                </span>
              </div>
              <div className="quick-coord-item">
                <span className="coord-label">ELEV</span>
                <span className="coord-val">+{elevation.toLocaleString()} M</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      {primaryLoading ? (
        <div className="explorer-loading-state" role="status">
          <RefreshCw className="spin-icon" size={24} />
          <span>INITIALIZING LOLA TOPOGRAPHY & EPHEMERIS PROPAGATION…</span>
        </div>
      ) : primaryData ? (
        <main className="explorer-editorial-workspace">
          {/* View Mode: 3D Lunar Street View & Horizon Simulator */}
          {(viewMode === 'streetview' || viewMode === 'dual') && (
            <LunarStreetView
              site={effectivePrimarySite}
              horizonProfile={primaryProfile}
              hoursOffset={hoursOffset}
              onChangeHoursOffset={setHoursOffset}
              onSelectSite={handleSelectSiteInternal}
              baseDate={DEFAULT_MISSION_EPOCH}
            />
          )}

          {/* View Mode: 2D Panoramic Chart or Dual View */}
          {(viewMode === 'chart' || viewMode === 'dual') && (
            <>
              {/* Site Overlay Selector Toolbar */}
              <SiteOverlaySelector
                primarySite={effectivePrimarySite}
                overlaySiteId={overlaySiteId}
                onSelectOverlaySite={setOverlaySiteId}
                primaryTelemetry={primaryTelemetry}
                overlayTelemetry={overlayTelemetry}
              />

              {/* 360° Panoramic Horizon & Ephemeris Chart */}
              <HorizonProfileChart
                primarySite={effectivePrimarySite}
                primaryProfile={primaryProfile}
                primaryTelemetry={primaryTelemetry}
                overlaySite={overlaySiteObj}
                overlayProfile={overlayProfile}
                overlayTelemetry={overlayTelemetry}
              />

              {viewMode === 'chart' && (
                <EphemerisTimeline
                  hoursOffset={hoursOffset}
                  onChangeHoursOffset={setHoursOffset}
                  baseDate={DEFAULT_MISSION_EPOCH}
                />
              )}
            </>
          )}

          {/* View Mode: Quickmap Terrain & Vector View (or Synchronized View) */}
          {(viewMode === 'quickmap' || viewMode === 'dual') && (
            <>
              <QuickmapTerrainView
                site={effectivePrimarySite}
                horizonProfile={primaryProfile}
                telemetry={primaryTelemetry}
                onSelectSite={handleSelectSiteInternal}
              />

              {viewMode === 'quickmap' && (
                <EphemerisTimeline
                  hoursOffset={hoursOffset}
                  onChangeHoursOffset={setHoursOffset}
                  baseDate={DEFAULT_MISSION_EPOCH}
                />
              )}
            </>
          )}

          {/* Tactical Telemetry Panel (Astronaut Monospace Channels + Consolidated Alerts) */}
          <TacticalTelemetry
            site={effectivePrimarySite}
            horizonProfile={primaryProfile}
            hoursOffset={hoursOffset}
            telemetry={primaryTelemetry}
            profile={profile}
            hideVectorAngles={viewMode === 'quickmap' || viewMode === 'dual'}
          />
        </main>
      ) : (
        <div className="explorer-error-notice">
          <ShieldAlert size={28} className="error-icon" />
          <div className="error-body">
            <h3>HORIZON TELEMETRY OFFLINE</h3>
            <p>
              No verified LOLA elevation profile was returned for <code>{effectivePrimarySite.name}</code>.
              Check that dataset <code>backend/data/{primaryId}.json</code> is populated.
            </p>
          </div>
        </div>
      )}

      {/* Minimal Editorial Footer */}
      <footer className="explorer-editorial-footer">
        <div className="footer-meta-item">
          <span>DATA REF:</span>
          <b>NASA JPL HORIZONS #301 · TARGET 10 (SUN) · TARGET 399 (EARTH)</b>
        </div>
        <div className="footer-meta-item">
          <span>TOPOGRAPHY:</span>
          <b>LRO LOLA GDR 128 PPD POLAR STEREOGRAPHIC DEM</b>
        </div>
        <div className="footer-meta-item">
          <span>TEAM:</span>
          <b>isiPisi // NASA SPACE APPS CHALLENGE</b>
        </div>
      </footer>
    </div>
  );
}
