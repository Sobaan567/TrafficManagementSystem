import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import GoogleMapReact from 'google-map-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../services/api';
import SlideDownText from '../../components/common/SlideDownText';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import './PublicHome.css';

const LEVEL_COLORS = {
  Low: '#2ECC40',
  Medium: '#FF851B',
  High: '#FF3B3B',
  Critical: '#85144b',
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

const normalizeSituation = (s) => ({
  locationName: s.locationName || s.LocationName || 'Unknown location',
  cityName: s.cityName || s.CityName || 'Karachi',
  description: s.description || s.Description || 'Traffic update is available for this area.',
  trafficLevel: s.trafficLevel || s.TrafficLevel || 'Low',
  latitude: s.latitude ?? s.Latitude,
  longitude: s.longitude ?? s.Longitude,
  reportedAt: s.reportedAt || s.ReportedAt || s.createdAt || s.CreatedAt,
});

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

const PublicMapMarker = ({ level = 'Low' }) => (
  <div
    className="public-map-marker"
    style={{ backgroundColor: LEVEL_COLORS[level] || LEVEL_COLORS.Low }}
  >
    !
  </div>
);

const PublicHeatPoint = ({ level = 'Low' }) => (
  <div
    className={`public-heat-point heat-${String(level).toLowerCase()}`}
    style={{ '--heat-color': LEVEL_COLORS[level] || LEVEL_COLORS.Low }}
  />
);

const PublicComplaintPin = ({ complaint }) => (
  <div className={`public-complaint-pin priority-${String(complaint.priority || 'Medium').toLowerCase()}`}>
    <span>C</span>
    <strong>{complaint.trackingCode}</strong>
  </div>
);

const getLevelRank = (level) => ({ Low: 1, Medium: 2, High: 3, Critical: 4 }[level] || 1);
const chartColors = ['#2ECC40', '#FF851B', '#FF3B3B', '#85144b'];

export default function PublicHome() {
  const { pathname } = useLocation();
  const [situations, setSituations] = useState([]);
  const [complaintPins, setComplaintPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [complaintForm, setComplaintForm] = useState({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    vehicleRegistrationNumber: '',
    category: 'Traffic Jam',
    priority: 'Medium',
    locationName: '',
    description: '',
    evidenceFileName: '',
    evidenceDataUrl: '',
  });
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const fetchSituations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/traffic/situations');
      if (response.data.success) {
        setSituations((response.data.data || []).map(normalizeSituation));
      }
    } catch (err) {
      setSituations([]);
      setError('Traffic server is not reachable right now. Please make sure the backend is running, then retry.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaintPins = async () => {
    try {
      const response = await api.get('/public/complaints/map');
      if (response.data?.success) setComplaintPins(response.data.data || []);
    } catch (err) {
      setComplaintPins([]);
    }
  };

  useEffect(() => {
    fetchSituations();
    fetchComplaintPins();
  }, []);

  useEffect(() => {
    if (!pathname.toLowerCase().includes('complaint')) return;

    const timer = window.setTimeout(() => {
      document.getElementById('public-complaints')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  const updateComplaintForm = (field, value) => {
    setComplaintForm((current) => ({ ...current, [field]: value }));
  };

  const handleComplaintEvidence = (file) => {
    if (!file) {
      setComplaintForm((current) => ({ ...current, evidenceFileName: '', evidenceDataUrl: '' }));
      return;
    }

    if (file.size > 300000) {
      setComplaintMessage('Evidence file should be under 300KB for fast upload.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setComplaintForm((current) => ({
        ...current,
        evidenceFileName: file.name,
        evidenceDataUrl: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    setComplaintLoading(true);
    setComplaintMessage('');
    try {
      const response = await api.post('/public/complaints', complaintForm);
      const saved = response.data?.data;
      setTrackedComplaint(saved || null);
      setTrackingCode(saved?.trackingCode || '');
      setComplaintMessage(`Complaint submitted. Tracking ID: ${saved?.trackingCode || 'created'}.`);
      setComplaintForm({
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        vehicleRegistrationNumber: '',
        category: 'Traffic Jam',
        priority: 'Medium',
        locationName: '',
        description: '',
        evidenceFileName: '',
        evidenceDataUrl: '',
      });
      fetchComplaintPins();
    } catch (err) {
      setComplaintMessage(err.response?.data?.message || 'Complaint could not be submitted.');
    } finally {
      setComplaintLoading(false);
    }
  };

  const trackComplaint = async (event) => {
    event.preventDefault();
    const cleanCode = trackingCode.trim();
    if (!cleanCode) return;
    setTrackingLoading(true);
    setTrackedComplaint(null);
    setComplaintMessage('');
    try {
      const response = await api.get(`/public/complaints/track/${encodeURIComponent(cleanCode)}`);
      setTrackedComplaint(response.data?.data || null);
    } catch (err) {
      setComplaintMessage(err.response?.data?.message || 'Complaint tracking code was not found.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const markers = useMemo(() => situations
    .map((s, index) => {
      const coords = getMapCoords(s);
      return coords ? {
        ...s,
        id: `${s.locationName}-${s.reportedAt || index}`,
        ...coords,
      } : null;
    })
    .filter(Boolean), [situations]);
  const complaintMarkers = useMemo(() => complaintPins
    .map((complaint, index) => {
      const coords = FALLBACK_LOCATION_COORDS[normalizeLocationKey(complaint.locationName)];
      return coords ? {
        ...complaint,
        id: complaint.trackingCode || `${complaint.complaintId}-${index}`,
        ...coords,
      } : null;
    })
    .filter(Boolean), [complaintPins]);

  const dashboardStats = useMemo(() => {
    const highPriority = situations.filter((s) => ['High', 'Critical'].includes(s.trafficLevel)).length;
    const urgentComplaints = complaintPins.filter((item) => ['High', 'Critical'].includes(item.priority)).length;
    const worstLevel = situations.reduce((current, item) => (
      getLevelRank(item.trafficLevel) > getLevelRank(current) ? item.trafficLevel : current
    ), 'Low');

    return [
      { label: 'Active Alerts', value: loading ? '...' : error ? 'Offline' : situations.length, detail: error ? 'Backend connection required' : 'Officer reported road updates' },
      { label: 'High Priority', value: loading ? '...' : error ? '-' : highPriority, detail: 'High and critical congestion' },
      { label: 'Smart Risk', value: loading ? '...' : error ? 'Offline' : Math.min(100, (getLevelRank(worstLevel) * 18) + (urgentComplaints * 8)), detail: 'Traffic plus public complaint load' },
      { label: 'Services', value: '24/7', detail: 'Public challan and traffic support' },
    ];
  }, [complaintPins, error, loading, situations]);

  const visibleAlerts = situations.slice(0, 4);
  const severityScore = Math.min(
    100,
    situations.reduce((total, item) => total + (getLevelRank(item.trafficLevel) * 8), 0)
      + complaintPins.reduce((total, item) => total + (item.priority === 'Critical' ? 8 : item.priority === 'High' ? 6 : 2), 0)
  );
  const hotZones = [...situations]
    .sort((a, b) => getLevelRank(b.trafficLevel) - getLevelRank(a.trafficLevel))
    .slice(0, 3);
  const mapCenter = markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : complaintMarkers[0] ? { lat: complaintMarkers[0].lat, lng: complaintMarkers[0].lng } : defaultCenter;
  const commandMetrics = [
    { label: 'Map Pins', value: markers.length + complaintMarkers.length, detail: 'traffic and complaint points' },
    { label: 'Route Risk', value: severityScore > 55 ? 'High' : severityScore > 20 ? 'Watch' : 'Clear', detail: 'city movement index' },
    { label: 'Complaint Feed', value: complaintPins.length, detail: 'open citizen reports' },
  ];
  const trafficLevelData = ['Low', 'Medium', 'High', 'Critical'].map((level) => ({
    name: level,
    value: situations.filter((s) => s.trafficLevel === level).length,
  }));
  const topZoneData = hotZones.length ? hotZones.map((zone) => ({
    name: zone.locationName,
    severity: getLevelRank(zone.trafficLevel) * 25,
    alerts: situations.filter((s) => s.locationName === zone.locationName).length,
  })) : [{ name: 'Clear', severity: 0, alerts: 0 }];

  return (
    <div className="public-dashboard">
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-kicker">Citizen Traffic Portal</span>
          <h1><SlideDownText text="Public Dashboard" /></h1>
          <p>
            Live traffic conditions, challan lookup, route awareness, and public safety updates in one place.
          </p>
          <div className="public-actions">
            <Link to="/public/challan-tracker" className="public-btn public-btn-dark">Check Challans</Link>
            <Link to="/public/traffic-info" className="public-btn public-btn-light">Live Traffic Info</Link>
            <Link to="/public/account" className="public-btn public-btn-light">Citizen Login</Link>
          </div>
        </div>

        <div className="public-status-board">
          <div className="status-board-header">
            <span>Current Network</span>
            <strong><AnimatedNumber value={loading ? 'Syncing' : `${situations.length} alerts`} /></strong>
          </div>
          <div className="signal-list">
            {['Low', 'Medium', 'High', 'Critical'].map((level) => (
              <div key={level} className="signal-row">
                <span className="signal-dot" style={{ backgroundColor: LEVEL_COLORS[level] }} />
                <span>{level}</span>
                <strong><AnimatedNumber value={situations.filter((s) => s.trafficLevel === level).length} /></strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-stats-grid">
        {dashboardStats.map((stat) => (
          <article key={stat.label} className="public-stat-card">
            <span>{stat.label}</span>
            <strong><AnimatedNumber value={stat.value} /></strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </section>

      {error && (
        <section className="public-offline-banner">
          <div>
            <strong>Traffic server offline</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={fetchSituations} disabled={loading}>
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </section>
      )}

      <section className="public-analytics-grid">
        <article className="public-chart-panel">
          <div className="panel-heading compact">
            <h2>Traffic Mix</h2>
            <p>Current public road alerts by severity.</p>
          </div>
          <div className="public-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={trafficLevelData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={4}>
                  {trafficLevelData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="public-chart-panel">
          <div className="panel-heading compact">
            <h2>Hot Zone Graph</h2>
            <p>Priority locations ranked by live severity.</p>
          </div>
          <div className="public-chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topZoneData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5d0c4" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800 }} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="severity" fill="#D2E823" stroke="#09090B" strokeWidth={2} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="public-intel-runway">
        <div className="intel-score">
          <span>City Severity</span>
          <strong><AnimatedNumber value={loading ? '...' : severityScore} /></strong>
          <div className="intel-score-bar"><i style={{ width: `${severityScore}%` }} /></div>
        </div>
        <div className="intel-copy">
          <h2>Public Intel Runway</h2>
          <p>Highest priority road signals are surfaced first so citizens can decide before they move.</p>
        </div>
        <div className="intel-hotzones">
          {hotZones.length === 0 ? (
            <div className="intel-hotzone empty">No hot zones active</div>
          ) : hotZones.map((zone, index) => (
            <article key={`${zone.locationName}-${index}`} className="intel-hotzone">
              <span style={{ backgroundColor: LEVEL_COLORS[zone.trafficLevel] || LEVEL_COLORS.Low }}>{index + 1}</span>
              <div>
                <strong>{zone.locationName}</strong>
                <small>{zone.trafficLevel} - {zone.cityName}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="public-command-ribbon">
        <div className="public-ribbon-orbit">
          <span />
          <strong>LIVE</strong>
        </div>
        <div className="public-ribbon-copy">
          <h2>Citizen Control Layer</h2>
          <p>Public users can inspect traffic, check challans, pay, appeal, or register without losing the open dashboard.</p>
        </div>
        <div className="public-ribbon-metrics">
          {commandMetrics.map((metric) => (
            <article key={metric.label}>
              <span>{metric.label}</span>
              <strong><AnimatedNumber value={metric.value} /></strong>
              <small>{metric.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="public-complaint-desk" id="public-complaints">
        <div className="complaint-desk-copy">
          <span>Complaint Desk</span>
          <h2>Report a road problem fast</h2>
          <p>Send signal faults, road issues, officer conduct concerns, challan problems, or unsafe congestion directly into the staff inbox.</p>
          <form className="complaint-track-form" onSubmit={trackComplaint}>
            <input
              value={trackingCode}
              onChange={(event) => setTrackingCode(event.target.value.toUpperCase())}
              placeholder="CMP-00001"
            />
            <button type="submit" disabled={trackingLoading || !trackingCode.trim()}>
              {trackingLoading ? 'Checking...' : 'Track'}
            </button>
          </form>
          {trackedComplaint && (
            <div className="complaint-track-card">
              <span>{trackedComplaint.trackingCode}</span>
              <strong>{trackedComplaint.status}</strong>
              <p>{trackedComplaint.category} at {trackedComplaint.locationName || 'reported location'}</p>
              {trackedComplaint.officerNote && <em>{trackedComplaint.officerNote}</em>}
            </div>
          )}
        </div>
        <form className="complaint-desk-form" onSubmit={submitComplaint}>
          <div className="complaint-form-grid">
            <input
              value={complaintForm.contactName}
              onChange={(event) => updateComplaintForm('contactName', event.target.value)}
              placeholder="Your name"
              required
            />
            <input
              value={complaintForm.contactPhone}
              onChange={(event) => updateComplaintForm('contactPhone', event.target.value)}
              placeholder="Phone"
            />
            <input
              type="email"
              value={complaintForm.contactEmail}
              onChange={(event) => updateComplaintForm('contactEmail', event.target.value)}
              placeholder="Email"
            />
            <input
              value={complaintForm.vehicleRegistrationNumber}
              onChange={(event) => updateComplaintForm('vehicleRegistrationNumber', event.target.value.toUpperCase())}
              placeholder="Vehicle number"
            />
            <select value={complaintForm.category} onChange={(event) => updateComplaintForm('category', event.target.value)}>
              {['Traffic Jam', 'Signal Issue', 'Road Condition', 'Wrong Challan', 'Officer Conduct', 'Other'].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select value={complaintForm.priority} onChange={(event) => updateComplaintForm('priority', event.target.value)}>
              {['Low', 'Medium', 'High', 'Critical'].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <input
            value={complaintForm.locationName}
            onChange={(event) => updateComplaintForm('locationName', event.target.value)}
            placeholder="Location or road name"
          />
          <textarea
            value={complaintForm.description}
            onChange={(event) => updateComplaintForm('description', event.target.value)}
            placeholder="Describe what happened..."
            rows="4"
            required
          />
          <label className="complaint-evidence-field">
            Evidence photo <span>optional</span>
            <input type="file" accept="image/*" onChange={(event) => handleComplaintEvidence(event.target.files?.[0])} />
          </label>
          {complaintForm.evidenceFileName && <small className="complaint-evidence-name">{complaintForm.evidenceFileName}</small>}
          {complaintMessage && <strong className="complaint-message">{complaintMessage}</strong>}
          <button type="submit" disabled={complaintLoading || !complaintForm.description.trim()}>
            {complaintLoading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </section>

      <section className="public-main-grid">
        <div className="public-map-panel">
          <div className="panel-heading">
            <div>
              <h2>Traffic Map</h2>
              <p>Live public markers for reported congestion and incidents.</p>
            </div>
            <Link to="/public/traffic-info">View all alerts</Link>
          </div>
          <div className="public-map">
            <GoogleMapReact
              bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY }}
              defaultCenter={mapCenter}
              center={mapCenter}
              defaultZoom={12}
              distanceToMouse={safeDistanceToMouse}
            >
              {(markers.length ? markers : [{ id: 'default', ...defaultCenter, trafficLevel: 'Low' }]).map((s) => (
                <PublicHeatPoint key={`heat-${s.id}`} lat={s.lat} lng={s.lng} level={s.trafficLevel} />
              ))}
              {(markers.length ? markers : [{ id: 'default', ...defaultCenter, trafficLevel: 'Low' }]).map((s) => (
                <PublicMapMarker key={`pin-${s.id}`} lat={s.lat} lng={s.lng} level={s.trafficLevel} />
              ))}
              {complaintMarkers.map((complaint) => (
                <PublicComplaintPin
                  key={`complaint-${complaint.id}`}
                  lat={complaint.lat}
                  lng={complaint.lng}
                  complaint={complaint}
                />
              ))}
            </GoogleMapReact>
          </div>
        </div>

        <aside className="public-alert-panel">
          <div className="panel-heading compact">
            <h2>Latest Alerts</h2>
          </div>
          {loading ? (
            <div className="empty-alert">Loading current road alerts...</div>
          ) : error ? (
            <div className="empty-alert error">
              <strong>Traffic server offline</strong>
              <span>Start the backend on port 5000, then retry.</span>
            </div>
          ) : visibleAlerts.length === 0 ? (
            <div className="empty-alert">
              <strong>No active traffic issues</strong>
              <span>Roads are clear based on the latest officer reports.</span>
            </div>
          ) : (
            <div className="alert-list">
              {visibleAlerts.map((alert, index) => (
                <article key={`${alert.locationName}-${index}`} className="alert-card">
                  <div className="alert-topline">
                    <span style={{ backgroundColor: LEVEL_COLORS[alert.trafficLevel] || LEVEL_COLORS.Low }}>
                      {alert.trafficLevel}
                    </span>
                    <small>{alert.cityName}</small>
                  </div>
                  <h3>{alert.locationName}</h3>
                  <p>{alert.description}</p>
                  <small>
                    Updated {new Date(alert.reportedAt || Date.now()).toLocaleString()}
                  </small>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="public-live-timeline">
        <div>
          <span>Live Activity</span>
          <h2>City Pulse Timeline</h2>
        </div>
        {[...complaintPins.slice(0, 3).map((item) => ({
          title: item.trackingCode,
          body: `${item.priority} ${item.category} complaint at ${item.locationName || 'reported area'}`,
          time: item.createdAt,
        })), ...visibleAlerts.slice(0, 3).map((item) => ({
          title: item.trafficLevel,
          body: `${item.locationName} traffic update: ${item.description}`,
          time: item.reportedAt,
        }))].slice(0, 5).map((item, index) => (
          <article key={`${item.title}-${index}`}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <small>{new Date(item.time || Date.now()).toLocaleString()}</small>
          </article>
        ))}
      </section>

      <section className="public-services">
        <article>
          <span>01</span>
          <h3>Challan Lookup</h3>
          <p>Search by vehicle registration and review active or paid challans.</p>
          <Link to="/public/challan-tracker">Open tracker</Link>
        </article>
        <article>
          <span>02</span>
          <h3>Route Awareness</h3>
          <p>Check congestion levels before leaving and plan safer routes.</p>
          <Link to="/public/traffic-info">Check roads</Link>
        </article>
        <article>
          <span>03</span>
          <h3>Public Support</h3>
          <p>Reach the traffic support desk for payment, appeal, or road alert help.</p>
          <a href="mailto:support@traffic.gov">support@traffic.gov</a>
        </article>
      </section>

      <section className="public-guidance">
        <h2>Driver Guidance</h2>
        <div className="guidance-grid">
          <p>Keep emergency lanes clear during high congestion.</p>
          <p>Use the challan tracker before payment to verify the exact vehicle record.</p>
          <p>Follow officer directions near diversions, road work, and incident sites.</p>
          <p>Refresh live traffic information before peak-hour travel.</p>
        </div>
      </section>
    </div>
  );
}
