import React from 'react';
import { useLocation } from 'react-router-dom';
import './DashboardSignalRail.css';

const rails = [
  { match: '/officer-dashboard', title: 'Officer Command', metric: 'Patrol Sync', value: 'LIVE', tone: 'lime' },
  { match: '/admin-dashboard', title: 'Admin Control', metric: 'Access Grid', value: 'LOCKED', tone: 'white' },
  { match: '/traffic-dashboard', title: 'Traffic Layer', metric: 'Road Pulse', value: 'ACTIVE', tone: 'lime' },
  { match: '/challan-management', title: 'Challan Command', metric: 'Fine Stream', value: 'READY', tone: 'white' },
  { match: '/reports', title: 'Reports Center', metric: 'Data Flow', value: 'SYNC', tone: 'lime' },
  { match: '/public/account', title: 'Citizen Portal', metric: 'Account Link', value: 'ONLINE', tone: 'white' },
  { match: '/public/challan-tracker', title: 'Challan Lookup', metric: 'Vehicle Scan', value: 'READY', tone: 'lime' },
  { match: '/public/traffic-info', title: 'Traffic Info', metric: 'City Feed', value: 'LIVE', tone: 'white' },
  { match: '/public', title: 'Public Dashboard', metric: 'City Status', value: 'OPEN', tone: 'lime' },
];

function getRail(pathname) {
  return rails.find((rail) => pathname === rail.match) || null;
}

export default function DashboardSignalRail() {
  const { pathname } = useLocation();
  const rail = getRail(pathname);

  if (!rail) return null;

  return (
    <aside className={`dashboard-signal-rail rail-${rail.tone}`} aria-label={`${rail.title} status rail`}>
      <div className="signal-rail-heading">
        <span>System Link</span>
        <strong>{rail.title}</strong>
      </div>
      <div className="signal-rail-stream" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="signal-rail-status">
        <span>{rail.metric}</span>
        <strong>{rail.value}</strong>
      </div>
    </aside>
  );
}
