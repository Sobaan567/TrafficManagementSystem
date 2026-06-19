import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { challanAPI } from '../services/api';
import SlideDownText from '../components/common/SlideDownText';
import AnimatedNumber from '../components/common/AnimatedNumber';
import './ChallanManagement.css';

const money = (value) => `Rs.${Number(value || 0).toLocaleString()}`;

const normalizeStatus = (value) => String(value || 'Unknown').replace(/\s+/g, '-').toLowerCase();

const TRAINING_CHALLANS = [
  {
    ChallanID: 'record-1',
    ChallanNumber: 'TMS-record-1001',
    RegistrationNumber: 'KHI-2047',
    FineAmount: 5000,
    DemeritPoints: 8,
    ChallanStatus: 'Issued',
    PaymentStatus: 'Unpaid',
    DisplayViolationType: 'Red Light Violation',
    LocationName: 'Shahrah-e-Faisal',
  },
  {
    ChallanID: 'record-2',
    ChallanNumber: 'TMS-record-1002',
    RegistrationNumber: 'KHI-7788',
    FineAmount: 3000,
    DemeritPoints: 4,
    ChallanStatus: 'Issued',
    PaymentStatus: 'Partial',
    DisplayViolationType: 'Speeding',
    LocationName: 'University Road',
  },
  {
    ChallanID: 'record-3',
    ChallanNumber: 'TMS-record-1003',
    RegistrationNumber: 'KHI-9921',
    FineAmount: 1000,
    DemeritPoints: 3,
    ChallanStatus: 'Paid',
    PaymentStatus: 'Paid',
    DisplayViolationType: 'No Helmet',
    LocationName: 'Saddar',
  },
  {
    ChallanID: 'record-4',
    ChallanNumber: 'TMS-record-1004',
    RegistrationNumber: 'KHI-6610',
    FineAmount: 6000,
    DemeritPoints: 18,
    ChallanStatus: 'Appealed',
    PaymentStatus: 'Unpaid',
    DisplayViolationType: 'Dangerous Driving',
    LocationName: 'M.A. Jinnah Road',
  },
];

const qrCells = Array.from({ length: 25 }, (_, index) => index);

export default function ChallanManagement() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trainingMode, setTrainingMode] = useState(false);

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
        setTrainingMode(false);
      }
    } catch (err) {
      setError('Could not load challans from the traffic server.');
      setChallans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingMode = () => {
    setError('');
    setLoading(false);
    setTrainingMode(true);
    setChallans(TRAINING_CHALLANS);
  };

  const getPublicChallanUrl = (challan) => {
    const vehicle = challan.RegistrationNumber || '';
    const challanNumber = challan.ChallanNumber || '';
    return `${window.location.origin}/public/challan-tracker?vehicle=${encodeURIComponent(vehicle)}&challan=${encodeURIComponent(challanNumber)}`;
  };

  const copyPublicLink = async (challan) => {
    const url = getPublicChallanUrl(challan);
    try {
      await navigator.clipboard.writeText(url);
      alert('Public challan link copied. Open it on iPhone to simulate QR scan.');
    } catch (err) {
      window.prompt('Copy this public challan link:', url);
    }
  };

  const stats = useMemo(() => {
    const total = challans.length;
    const paid = challans.filter((c) => c.PaymentStatus === 'Paid').length;
    const unpaid = challans.filter((c) => c.PaymentStatus === 'Unpaid').length;
    const partial = challans.filter((c) => c.PaymentStatus === 'Partial').length;
    const amount = challans.reduce((sum, c) => sum + Number(c.FineAmount || 0), 0);
    const demerits = challans.reduce((sum, c) => sum + Number(c.DemeritPoints || 0), 0);
    return [
      { label: 'Total Challans', value: total, detail: 'latest records' },
      { label: 'Paid', value: paid, detail: 'closed payments' },
      { label: 'Unpaid', value: unpaid, detail: 'needs action' },
      { label: 'Demerits', value: demerits, detail: `${partial} partial cases` },
      { label: 'Value', value: money(amount), detail: 'total fine load' },
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
          <h1><SlideDownText text="Challan Command" /></h1>
          <p>Track payment pressure, appeal impact, and fine value without digging through raw records.</p>
        </div>
        <div className="challan-hero-actions">
          <button type="button" onClick={fetchChallans} disabled={loading}>
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
          <button type="button" onClick={loadTrainingMode}>
            Load Records
          </button>
          <Link to="/officer-dashboard">Officer Dashboard</Link>
        </div>
      </section>

      {trainingMode && (
        <section className="challan-training-banner">
          <strong>Operational Records Active</strong>
          <span>Records are loaded for QR access, payment status review, and public challan lookup.</span>
        </section>
      )}

      {error && <div className="challan-error">{error}</div>}

      <section className="challan-stats-grid">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong><AnimatedNumber value={loading ? '...' : stat.value} /></strong>
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
                    <th>Demerits</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>QR Link</th>
                  </tr>
                </thead>
                <tbody>
                  {challans.map((challan) => (
                    <tr key={challan.ChallanID}>
                      <td>{challan.ChallanNumber}</td>
                      <td>{challan.RegistrationNumber || `Vehicle ${challan.VehicleID || '-'}`}</td>
                      <td>{money(challan.FineAmount)}</td>
                      <td><span className="challan-demerit-pill">{Number(challan.DemeritPoints || 0)}</span></td>
                      <td><span className={`challan-pill ${normalizeStatus(challan.ChallanStatus)}`}>{challan.ChallanStatus}</span></td>
                      <td><span className={`payment-pill ${normalizeStatus(challan.PaymentStatus)}`}>{challan.PaymentStatus}</span></td>
                      <td>
                        <button type="button" className="qr-link-button" onClick={() => copyPublicLink(challan)}>
                          <span className="mini-qr" aria-hidden="true">
                            {qrCells.map((cell) => <i key={cell} />)}
                          </span>
                          Copy QR Link
                        </button>
                      </td>
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
                  <small>{challan.PaymentStatus} - {money(challan.FineAmount)} - {Number(challan.DemeritPoints || 0)} pts</small>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
