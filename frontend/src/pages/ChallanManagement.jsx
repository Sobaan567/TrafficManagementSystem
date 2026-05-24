import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { challanAPI } from '../services/api';
import './ChallanManagement.css';

const money = (value) => `Rs.${Number(value || 0).toLocaleString()}`;

const normalizeStatus = (value) => String(value || 'Unknown').replace(/\s+/g, '-').toLowerCase();

export default function ChallanManagement() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await challanAPI.getChallans({ limit: 50 });
      if (response.data.success) {
        setChallans(response.data.data || []);
      }
    } catch (err) {
      setError('Could not load challans from the traffic server.');
      setChallans([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = challans.length;
    const paid = challans.filter((c) => c.PaymentStatus === 'Paid').length;
    const unpaid = challans.filter((c) => c.PaymentStatus === 'Unpaid').length;
    const partial = challans.filter((c) => c.PaymentStatus === 'Partial').length;
    const amount = challans.reduce((sum, c) => sum + Number(c.FineAmount || 0), 0);
    return [
      { label: 'Total Challans', value: total, detail: 'latest records' },
      { label: 'Paid', value: paid, detail: 'closed payments' },
      { label: 'Unpaid', value: unpaid, detail: 'needs action' },
      { label: 'Value', value: money(amount), detail: `${partial} partial cases` },
    ];
  }, [challans]);

  const topChallans = [...challans]
    .sort((a, b) => Number(b.FineAmount || 0) - Number(a.FineAmount || 0))
    .slice(0, 4);

  return (
    <div className="challan-command-page">
      <section className="challan-hero">
        <div>
          <span>Officer Finance Console</span>
          <h1>Challan Command</h1>
          <p>Track payment pressure, appeal impact, and fine value without digging through raw records.</p>
        </div>
        <div className="challan-hero-actions">
          <button type="button" onClick={fetchChallans} disabled={loading}>
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
          <Link to="/officer-dashboard">Officer Dashboard</Link>
        </div>
      </section>

      {error && <div className="challan-error">{error}</div>}

      <section className="challan-stats-grid">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{loading ? '...' : stat.value}</strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </section>

      <section className="challan-ops-grid">
        <div className="challan-table-panel">
          <div className="challan-panel-heading">
            <div>
              <h2>Live Challan Ledger</h2>
              <p>Recent challans pulled from the backend.</p>
            </div>
          </div>

          {loading ? (
            <div className="challan-empty">Loading challans...</div>
          ) : challans.length === 0 ? (
            <div className="challan-empty">No challans found.</div>
          ) : (
            <div className="challan-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Challan #</th>
                    <th>Vehicle</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {challans.map((challan) => (
                    <tr key={challan.ChallanID}>
                      <td>{challan.ChallanNumber}</td>
                      <td>{challan.RegistrationNumber || `Vehicle ${challan.VehicleID || '-'}`}</td>
                      <td>{money(challan.FineAmount)}</td>
                      <td><span className={`challan-pill ${normalizeStatus(challan.ChallanStatus)}`}>{challan.ChallanStatus}</span></td>
                      <td><span className={`payment-pill ${normalizeStatus(challan.PaymentStatus)}`}>{challan.PaymentStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="challan-priority-panel">
          <h2>Priority Stack</h2>
          <p>Largest fines surface first for faster recovery review.</p>
          <div className="priority-list">
            {topChallans.length === 0 ? (
              <div className="priority-empty">No priority records yet.</div>
            ) : topChallans.map((challan, index) => (
              <article key={challan.ChallanID}>
                <span>{index + 1}</span>
                <div>
                  <strong>{challan.ChallanNumber}</strong>
                  <small>{challan.PaymentStatus} - {money(challan.FineAmount)}</small>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
