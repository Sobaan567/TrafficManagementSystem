import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './TrafficDashboard.css';

const LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const COLORS = { Low: '#2ECC40', Medium: '#FF851B', High: '#FF3B3B', Critical: '#85144b' };
const rank = (level) => ({ Low: 1, Medium: 2, High: 3, Critical: 4 }[level] || 1);

const normalize = (item) => ({
  locationName: item.locationName || item.LocationName || 'Unknown location',
  cityName: item.cityName || item.CityName || 'Karachi',
  trafficLevel: item.trafficLevel || item.TrafficLevel || 'Low',
  description: item.description || item.Description || 'Traffic update available.',
  reportedAt: item.reportedAt || item.ReportedAt || item.CreatedAt,
});

export default function TrafficDashboard() {
  const [situations, setSituations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTraffic = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/traffic/situations');
      if (response.data.success) setSituations((response.data.data || []).map(normalize));
    } catch (err) {
      setError('Traffic feed is offline. Start backend and retry.');
      setSituations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraffic();
  }, []);

  const stats = useMemo(() => {
    const high = situations.filter((item) => ['High', 'Critical'].includes(item.trafficLevel)).length;
    const worst = situations.reduce((current, item) => rank(item.trafficLevel) > rank(current) ? item.trafficLevel : current, 'Low');
    return [
      { label: 'Active Signals', value: loading ? '...' : situations.length },
      { label: 'High Priority', value: loading ? '...' : high },
      { label: 'Worst Level', value: loading ? '...' : worst },
      { label: 'Coverage', value: 'Karachi' },
    ];
  }, [loading, situations]);

  const sorted = [...situations].sort((a, b) => rank(b.trafficLevel) - rank(a.trafficLevel));

  return (
    <div className="traffic-command-page">
      <section className="traffic-command-hero">
        <div>
          <span>Road Situation Room</span>
          <h1>Traffic Dashboard</h1>
          <p>Officer-facing overview of congestion levels, public alerts, and city movement pressure.</p>
        </div>
        <div className="traffic-hero-actions">
          <button type="button" onClick={fetchTraffic} disabled={loading}>{loading ? 'Syncing...' : 'Refresh'}</button>
          <Link to="/officer-dashboard">Officer Dashboard</Link>
        </div>
      </section>

      {error && <div className="traffic-error">{error}</div>}

      <section className="traffic-command-stats">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="traffic-command-grid">
        <div className="traffic-radar-panel">
          <div className="traffic-radar">
            <div className="traffic-radar-sweep" />
            {LEVELS.map((level, index) => (
              <span
                key={level}
                className={`radar-dot dot-${index}`}
                style={{ backgroundColor: COLORS[level] }}
              />
            ))}
            <strong>OPS</strong>
          </div>
          <div>
            <h2>Live Road Radar</h2>
            <p>Severity bands turn raw officer reports into a readable action layer.</p>
            <div className="traffic-level-bars">
              {LEVELS.map((level) => {
                const count = situations.filter((item) => item.trafficLevel === level).length;
                return (
                  <div key={level}>
                    <span>{level}</span>
                    <i style={{ width: `${Math.min(100, count * 22)}%`, backgroundColor: COLORS[level] }} />
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="traffic-feed-panel">
          <h2>Priority Feed</h2>
          {loading ? (
            <div className="traffic-empty">Loading road signals...</div>
          ) : sorted.length === 0 ? (
            <div className="traffic-empty">No active traffic signals.</div>
          ) : sorted.slice(0, 8).map((item, index) => (
            <article key={`${item.locationName}-${index}`}>
              <span style={{ backgroundColor: COLORS[item.trafficLevel] }}>{item.trafficLevel}</span>
              <div>
                <strong>{item.locationName}</strong>
                <small>{item.cityName} - {item.description}</small>
              </div>
            </article>
          ))}
        </aside>
      </section>
    </div>
  );
}
