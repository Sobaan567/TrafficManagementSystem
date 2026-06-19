import React, { useState, useEffect } from 'react';
import GoogleMapReact from 'google-map-react';
import api from '../../services/api';
import SlideDownText from '../../components/common/SlideDownText';

const LEVEL_COLORS = {
  Low: '#2ECC40',
  Medium: '#FF851B',
  High: '#FF3B3B',
  Critical: '#85144b'
};

const defaultCenter = { lat: 24.8607, lng: 67.0011 };

const FALLBACK_LOCATION_COORDS = {
  saddar: { lat: 24.8586, lng: 67.0281 },
  'saddar karachi': { lat: 24.8586, lng: 67.0281 },
  'gulberg town': { lat: 24.9239, lng: 67.0644 },
  'gulberg town karachi': { lat: 24.9239, lng: 67.0644 },
  'shahrae faisal': { lat: 24.8607, lng: 67.0011 },
  'shahrah-e-faisal': { lat: 24.8607, lng: 67.0011 },
  'shahrah e faisal': { lat: 24.8607, lng: 67.0011 },
  'shahrae faisal karachi': { lat: 24.8607, lng: 67.0011 },
  'm.a. jinnah road': { lat: 24.8738, lng: 67.0321 },
  'ma jinnah road': { lat: 24.8738, lng: 67.0321 },
  'university road': { lat: 24.9180, lng: 67.0971 },
};

const safeDistanceToMouse = (point, mouse) => {
  if (!point || !mouse) return Number.MAX_SAFE_INTEGER;
  return Math.hypot(point.x - mouse.x, point.y - mouse.y);
};

const normalizeLocationKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getMapCoords = (s) => {
  const lat = Number(s.latitude);
  const lng = Number(s.longitude);
  const isPlaceholder = (lat === 0 && lng === 0) || (lat === -2 && lng === -2);
  const inPakistanArea = lat >= 23 && lat <= 38 && lng >= 60 && lng <= 78;

  if (Number.isFinite(lat) && Number.isFinite(lng) && !isPlaceholder && inPakistanArea) {
    return { lat, lng };
  }

  const nameKey = normalizeLocationKey(s.locationName);
  const cityKey = normalizeLocationKey(`${s.locationName || ''} ${s.cityName || ''}`);
  return FALLBACK_LOCATION_COORDS[cityKey] || FALLBACK_LOCATION_COORDS[nameKey] || null;
};

const normalizeSituation = (s) => ({
  locationName: s.locationName || s.LocationName || '',
  cityName: s.cityName || s.CityName || '',
  description: s.description || s.Description || '',
  trafficLevel: s.trafficLevel || s.TrafficLevel || 'Low',
  latitude: s.latitude ?? s.Latitude,
  longitude: s.longitude ?? s.Longitude,
  reportedAt: s.reportedAt || s.ReportedAt || s.createdAt || s.CreatedAt
});

const TRAFFIC_INTELLIGENCE_SITUATIONS = [
  {
    locationName: 'Shahrah-e-Faisal',
    cityName: 'Karachi',
    description: 'Heavy office-hour congestion near the central corridor. Suggested diversion through Stadium Road.',
    trafficLevel: 'High',
    latitude: 24.8607,
    longitude: 67.0011,
    reportedAt: new Date().toISOString(),
  },
  {
    locationName: 'M.A. Jinnah Road',
    cityName: 'Karachi',
    description: 'Slow movement after signal maintenance. Officers are managing lane flow manually.',
    trafficLevel: 'Medium',
    latitude: 24.8738,
    longitude: 67.0321,
    reportedAt: new Date(Date.now() - 18 * 60000).toISOString(),
  },
  {
    locationName: 'University Road',
    cityName: 'Karachi',
    description: 'Critical bottleneck near intersection due to roadside incident. Avoid the area if possible.',
    trafficLevel: 'Critical',
    latitude: 24.9180,
    longitude: 67.0971,
    reportedAt: new Date(Date.now() - 7 * 60000).toISOString(),
  },
  {
    locationName: 'Saddar',
    cityName: 'Karachi',
    description: 'Normal movement with light public transport pressure.',
    trafficLevel: 'Low',
    latitude: 24.8586,
    longitude: 67.0281,
    reportedAt: new Date(Date.now() - 32 * 60000).toISOString(),
  },
];

const TrafficMarker = ({ situation }) => {
  const color = LEVEL_COLORS[situation.trafficLevel] || LEVEL_COLORS.Low;

  return (
    <div title={`${situation.locationName} - ${situation.trafficLevel}`} style={{
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      backgroundColor: color,
      border: '3px solid #09090B',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      boxShadow: '3px 3px 0 #09090B',
      transform: 'translate(-50%, -50%)'
    }}>
      !
    </div>
  );
};

const HeatPoint = ({ situation }) => {
  const color = LEVEL_COLORS[situation.trafficLevel] || LEVEL_COLORS.Low;
  const isStrong = ['High', 'Critical'].includes(situation.trafficLevel);
  return (
    <div style={{
      width: isStrong ? '176px' : '132px',
      height: isStrong ? '176px' : '132px',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0) 68%)`,
      opacity: isStrong ? 0.46 : 0.34,
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%)'
    }} />
  );
};

const TrafficSituationMap = ({ situations }) => {
  const markers = situations
    .map((s, index) => {
      const coords = getMapCoords(s);
      return coords ? {
        ...s,
        id: `${s.locationName}-${s.reportedAt || index}`,
        ...coords
      } : null;
    })
    .filter(Boolean);

  const firstLocationName = situations.find((s) => s.locationName)?.locationName;

  if (markers.length === 0 && firstLocationName) {
    return (
      <div style={{ height: '430px', border: '2px solid #09090B', borderRadius: '8px', overflow: 'hidden', marginBottom: '30px' }}>
        <iframe
          title="Traffic situation map"
          src={`https://www.google.com/maps?q=${encodeURIComponent(firstLocationName)}&output=embed`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    );
  }

  const center = markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : defaultCenter;

  return (
    <div style={{ height: '430px', border: '2px solid #09090B', borderRadius: '8px', overflow: 'hidden', marginBottom: '30px' }}>
      <GoogleMapReact
        bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY }}
        defaultCenter={center}
        center={center}
        defaultZoom={12}
        distanceToMouse={safeDistanceToMouse}
      >
        {(markers.length ? markers : [{ id: 'default-karachi', ...defaultCenter, trafficLevel: 'Low', locationName: 'Karachi' }]).map((s) => (
          <HeatPoint key={`heat-${s.id}`} lat={s.lat} lng={s.lng} situation={s} />
        ))}
        {(markers.length ? markers : [{ id: 'default-karachi', ...defaultCenter, trafficLevel: 'Low', locationName: 'Karachi' }]).map((s) => (
          <TrafficMarker
            key={`pin-${s.id}`}
            lat={s.lat}
            lng={s.lng}
            situation={s}
          />
        ))}
      </GoogleMapReact>
    </div>
  );
};

export default function TrafficInfo() {
  const [situations, setSituations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intelligenceMode, setIntelligenceMode] = useState(false);

  useEffect(() => { fetchSituations(); }, []);

  const fetchSituations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/traffic/situations');
      if (response.data.success) {
        setSituations((response.data.data || []).map(normalizeSituation));
        setIntelligenceMode(false);
      }
    } catch (err) {
      setError('Traffic server is not reachable right now. Please make sure the backend is running, then retry.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrafficIntelligence = () => {
    setSituations(TRAFFIC_INTELLIGENCE_SITUATIONS);
    setError('');
    setLoading(false);
    setIntelligenceMode(true);
  };

  const severityScore = situations.reduce((total, item) => {
    const weight = { Low: 8, Medium: 18, High: 28, Critical: 40 }[item.trafficLevel] || 8;
    return total + weight;
  }, 0);

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{
        color: '#09090B',
        fontSize: 'clamp(2.35rem, 7vw, 5rem)',
        lineHeight: 0.92,
        marginBottom: '8px',
        maxWidth: '980px'
      }}>
        <SlideDownText text="Real-Time Traffic Information" />
      </h1>
      <p style={{ color: '#555', marginBottom: '30px' }}>Live traffic situations reported by traffic officers.</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 260px',
        gap: '18px',
        marginBottom: '30px'
      }}>
        <div style={{ backgroundColor: '#F8F4E8', padding: '20px', border: '2px solid #09090B', borderRadius: '8px', boxShadow: '5px 5px 0 #09090B' }}>
          <h3 style={{ margin: '0 0 12px' }}>Traffic Level Legend</h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {Object.entries(LEVEL_COLORS).map(([level, color]) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: color, borderRadius: '50%', border: '1px solid #09090B' }} />
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{level}</span>
              </div>
            ))}
          </div>
          {intelligenceMode && (
            <p style={{ margin: '14px 0 0', fontWeight: 'bold' }}>Traffic intelligence is active with city congestion zones.</p>
          )}
        </div>
        <div style={{ backgroundColor: '#D2E823', padding: '20px', border: '2px solid #09090B', borderRadius: '8px', boxShadow: '5px 5px 0 #09090B' }}>
          <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>City Severity</span>
          <h2 style={{ margin: '8px 0', fontSize: '38px' }}>{Math.min(100, severityScore)}</h2>
          <button onClick={loadTrafficIntelligence} style={{ padding: '10px 14px', border: '2px solid #09090B', background: '#09090B', color: '#F8F4E8', fontWeight: 'bold', cursor: 'pointer' }}>
            Traffic Intelligence
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#09090B',
        border: '3px solid #D2E823',
        borderRadius: '8px',
        boxShadow: '5px 5px 0 #D2E823',
        color: '#F8F4E8',
        display: 'grid',
        gap: '10px',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        marginBottom: '30px',
        padding: '18px'
      }}>
        <div>
          <span style={{ color: '#D2E823', fontWeight: 900, textTransform: 'uppercase' }}>Emergency Corridor Advisory</span>
          <h3 style={{ color: '#F8F4E8', margin: '6px 0' }}>Priority route monitoring available</h3>
          <p style={{ color: '#d8d3c4', margin: 0, fontWeight: 800 }}>When a corridor is active, public users can avoid restricted roads and officers can prioritize movement.</p>
        </div>
        <button onClick={loadTrafficIntelligence} style={{ alignSelf: 'center', padding: '10px 14px', border: '2px solid #F8F4E8', background: '#D2E823', color: '#09090B', fontWeight: 'bold', cursor: 'pointer' }}>
          Activate View
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading traffic data...</div>
      ) : error ? (
        <div style={{ padding: '20px', backgroundColor: '#fff0f0', border: '2px solid red', borderRadius: '8px', color: 'red' }}>
          <strong>{error}</strong>
          <br />
          <button onClick={fetchSituations} style={{ marginTop: '12px', padding: '10px 18px', border: '2px solid #09090B', background: '#D2E823', fontWeight: 'bold', cursor: 'pointer' }}>
            Retry
          </button>
          <button onClick={loadTrafficIntelligence} style={{ marginTop: '12px', marginLeft: '10px', padding: '10px 18px', border: '2px solid #09090B', background: '#F8F4E8', fontWeight: 'bold', cursor: 'pointer' }}>
            Open Traffic Intelligence
          </button>
        </div>
      ) : situations.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#D2E823', border: '2px solid #09090B', borderRadius: '8px' }}>
          <h2>No Active Traffic Issues</h2>
          <p>Roads are clear. No traffic situations reported at the moment.</p>
        </div>
      ) : (
        <>
          <TrafficSituationMap situations={situations} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {situations.map((s, i) => (
              <div key={`${s.locationName}-${s.reportedAt || i}`} style={{ backgroundColor: '#F8F4E8', border: '2px solid #09090B', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ height: '6px', backgroundColor: LEVEL_COLORS[s.trafficLevel] || LEVEL_COLORS.Low }} />
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{s.locationName}</h3>
                    <span style={{
                      backgroundColor: LEVEL_COLORS[s.trafficLevel] || LEVEL_COLORS.Low,
                      color: '#fff',
                      padding: '2px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      {s.trafficLevel}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#555' }}>Location: {s.cityName || '-'}</p>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#333' }}>{s.description}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                    Reported: {new Date(s.reportedAt || Date.now()).toLocaleString()}
                  </p>
                  {getMapCoords(s) ? (
                    <a
                      href={`https://www.google.com/maps?q=${getMapCoords(s).lat},${getMapCoords(s).lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', color: '#09090B', fontWeight: 'bold' }}
                    >
                      View on Map
                    </a>
                  ) : (
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(`${s.locationName}, ${s.cityName}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', color: '#09090B', fontWeight: 'bold' }}
                    >
                      View on Map
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
