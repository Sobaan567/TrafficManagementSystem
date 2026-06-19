import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../services/api';
import SlideDownText from '../components/common/SlideDownText';
import AnimatedNumber from '../components/common/AnimatedNumber';
import './AdminDashboard.css';

const emptyForm = {
  userId: '',
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  role: 'Officer',
  isActive: true,
  badgeNumber: '',
  rank: 'Traffic Police Officer',
  department: 'Traffic Management',
  assignedZone: '',
  nicNumber: '',
  vehicleNumber: '',
};

const sum = (rows, key = 'Count') => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
const money = (value) => `Rs.${Number(value || 0).toLocaleString()}`;
const chartColors = ['#D2E823', '#09090B', '#FF851B', '#FF3B3B', '#38bdf8', '#85144b'];
const emptySmartOverview = {
  summary: {},
  congestionPredictions: [],
  deploymentRecommendations: [],
  demeritLeaders: [],
  dailyBriefing: [],
};

export default function AdminDashboard() {
  const [overview, setOverview] = useState({
    users: [],
    challans: [],
    appeals: [],
    traffic: [],
    activity: [],
    challanHistory: [],
    recentChallans: [],
    violationTypes: [],
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [complaints, setComplaints] = useState([]);
  const [complaintNotes, setComplaintNotes] = useState({});
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [smartOverview, setSmartOverview] = useState(emptySmartOverview);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewResult, usersResult, complaintsResult, smartResult] = await Promise.allSettled([
        api.get('/admin/overview'),
        api.get('/admin/users'),
        api.get('/public/officer/complaints'),
        api.get('/smart/overview'),
      ]);
      const overviewResponse = overviewResult.status === 'fulfilled' ? overviewResult.value : null;
      const usersResponse = usersResult.status === 'fulfilled' ? usersResult.value : null;
      const complaintsResponse = complaintsResult.status === 'fulfilled' ? complaintsResult.value : null;
      const smartResponse = smartResult.status === 'fulfilled' ? smartResult.value : null;
      if (overviewResponse?.data?.success) setOverview(overviewResponse.data.data);
      if (usersResponse?.data?.success) setUsers(usersResponse.data.data || []);
      if (complaintsResponse?.data?.success) setComplaints(complaintsResponse.data.data || []);
      if (smartResponse?.data?.success) setSmartOverview({ ...emptySmartOverview, ...smartResponse.data.data });
      if (!overviewResponse || !usersResponse) {
        setError('Could not load all admin management data.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load admin management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const cards = useMemo(() => [
    { label: 'Users', value: users.length || sum(overview.users), detail: 'managed accounts' },
    { label: 'Officers', value: users.filter((user) => user.role === 'Officer').length, detail: 'field operators' },
    { label: 'Citizens', value: users.filter((user) => user.role === 'Public').length, detail: 'public accounts' },
    { label: 'Appeals', value: sum(overview.appeals), detail: 'citizen cases' },
    { label: 'Complaints', value: complaints.filter((item) => ['Open', 'In Review'].includes(item.status)).length, detail: 'open public reports' },
  ], [complaints, overview, users]);

  const roleCounts = useMemo(() => ['Admin', 'Officer', 'Public', 'Supervisor'].map((role) => ({
    role,
    count: users.filter((user) => user.role === role).length,
  })), [users]);

  const inactiveUsers = users.filter((user) => !user.isActive).length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const paidCount = Number(overview.challans.find((item) => item.PaymentStatus === 'Paid')?.Count || 0);
  const unpaidCount = overview.challans
    .filter((item) => item.PaymentStatus !== 'Paid')
    .reduce((total, item) => total + Number(item.Count || 0), 0);
  const collectedAmount = overview.challans
    .filter((item) => item.PaymentStatus === 'Paid')
    .reduce((total, item) => total + Number(item.Amount || 0), 0);
  const pendingAmount = overview.challans
    .filter((item) => item.PaymentStatus !== 'Paid')
    .reduce((total, item) => total + Number(item.Amount || 0), 0);
  const paymentPieData = [
    { name: 'Paid', value: paidCount },
    { name: 'Unpaid / Partial', value: unpaidCount },
  ];
  const historyData = overview.challanHistory.map((item) => ({
    date: new Date(item.ReportDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    total: Number(item.Total || 0),
    paid: Number(item.Paid || 0),
    unpaid: Number(item.Unpaid || 0),
    collected: Number(item.Collected || 0),
  }));
  const violationData = overview.violationTypes.map((item) => ({
    type: item.ViolationType,
    count: Number(item.Count || 0),
    amount: Number(item.Amount || 0),
  }));
  const totalPaymentCases = paidCount + unpaidCount;
  const collectionRate = totalPaymentCases ? Math.round((paidCount / totalPaymentCases) * 100) : 0;
  const citizenShare = users.length ? Math.round((users.filter((user) => user.role === 'Public').length / users.length) * 100) : 0;
  const topViolation = violationData.length
    ? [...violationData].sort((a, b) => b.count - a.count)[0]
    : null;
  const adminInsights = [
    { label: 'Collection Rate', value: `${collectionRate}%`, detail: 'paid challan closure' },
    { label: 'Citizen Share', value: `${citizenShare}%`, detail: 'public account ratio' },
    { label: 'Top Violation', value: topViolation?.type || 'None', detail: topViolation ? `${topViolation.count} records` : 'no records yet' },
    { label: 'System Load', value: loading ? 'Syncing' : 'Stable', detail: `${overview.activity.length || 0} recent events` },
  ];
  const smartSummary = smartOverview.summary || {};
  const topDemeritDriver = smartOverview.demeritLeaders?.[0];
  const topDeploymentZone = smartOverview.deploymentRecommendations?.[0];
  const smartCommandCards = [
    { label: 'Active Incidents', value: smartSummary.activeIncidents ?? 0, detail: 'smart reports open' },
    { label: 'Hot Zones', value: smartSummary.highRiskZones ?? 0, detail: smartSummary.topHotZone || 'no hot zone yet' },
    { label: 'Demerit Limit', value: smartSummary.demeritLimit ?? 100, detail: 'license cancellation cap' },
    {
      label: 'Highest Driver Risk',
      value: topDemeritDriver ? `${topDemeritDriver.TotalPoints}` : 0,
      detail: topDemeritDriver ? topDemeritDriver.RegistrationNumber : 'no ledger entries',
    },
  ];

  const filteredUsers = users.filter((user) => {
    const roleMatch = filter === 'All' || user.role === filter;
    const haystack = [
      user.username, user.email, user.firstName, user.lastName, user.phoneNumber,
      user.badgeNumber, user.nicNumber, user.vehicleNumber,
    ].join(' ').toLowerCase();
    return roleMatch && haystack.includes(search.toLowerCase());
  });

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const startEdit = (user) => {
    setActiveTab('manage');
    setForm({
      ...emptyForm,
      ...user,
      password: '',
      isActive: Boolean(user.isActive),
    });
  };

  const resetForm = () => setForm(emptyForm);

  const saveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (form.userId) {
        await api.put(`/admin/users/${form.userId}`, form);
        setMessage('User updated successfully.');
      } else {
        await api.post('/admin/users', form);
        setMessage('User created successfully.');
      }
      resetForm();
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    setMessage('');
    setError('');
    try {
      await api.put(`/admin/users/${user.userId}/active`, { isActive: !user.isActive });
      await fetchAll();
      setMessage(`${user.username} ${user.isActive ? 'deactivated' : 'activated'}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update user status.');
    }
  };

  const updateComplaintStatus = async (complaint, status) => {
    setComplaintsLoading(true);
    setMessage('');
    setError('');
    try {
      await api.put(`/public/officer/complaints/${complaint.complaintId}`, {
        status,
        priority: complaint.priority || 'Medium',
        officerNote: complaintNotes[complaint.complaintId] || complaint.officerNote || '',
      });
      await fetchAll();
      setMessage(`Complaint ${complaint.complaintId} marked ${status}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update complaint.');
    } finally {
      setComplaintsLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Admin Management</span>
          <h1><SlideDownText text="Control Center" /></h1>
          <p>Separate admin dashboard for accounts, challans, appeals, demerit risk, complaints, and live smart operations.</p>
        </div>
        <div className="admin-hero-actions">
          <Link to="/smart-features">Smart Features</Link>
          <button type="button" onClick={fetchAll} disabled={loading}>{loading ? 'Syncing...' : 'Refresh'}</button>
        </div>
      </section>

      {error && <div className="admin-error">{error}</div>}
      {message && <div className="admin-success">{message}</div>}

      <section className="admin-card-grid">
        {cards.map((card) => (
          <article key={card.label}>
            <span>{card.label}</span>
            <strong><AnimatedNumber value={loading ? '...' : card.value} /></strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <section className="admin-command-strip">
        <div className="admin-command-core">
          <span>Access Control</span>
          <strong><AnimatedNumber value={activeUsers} /></strong>
          <small>active accounts</small>
        </div>
        <div className="admin-role-radar">
          {roleCounts.map((item, index) => (
            <article key={item.role} className={`role-${index}`}>
              <span>{item.role}</span>
              <strong><AnimatedNumber value={item.count} /></strong>
            </article>
          ))}
        </div>
        <div className="admin-command-alert">
          <span>Inactive Watch</span>
          <strong><AnimatedNumber value={inactiveUsers} /></strong>
          <small>disabled or paused accounts</small>
        </div>
      </section>

      <section className="admin-intelligence-strip">
        <div className="admin-intelligence-title">
          <span>System Intelligence</span>
          <h2>Operational health at a glance</h2>
        </div>
        <div className="admin-intelligence-grid">
          {adminInsights.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong title={item.value}><AnimatedNumber value={item.value} /></strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-smart-command">
        <div className="admin-smart-head">
          <span>Smart Command</span>
          <h2>Demerits, hot zones, and response priorities</h2>
          <p>{topDeploymentZone ? `${topDeploymentZone.locationName}: ${topDeploymentZone.reason}` : 'Smart recommendations will appear after challan and incident activity builds up.'}</p>
        </div>
        <div className="admin-smart-cards">
          {smartCommandCards.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong title={String(item.value)}><AnimatedNumber value={loading ? '...' : item.value} /></strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <div className="admin-smart-lists">
          <article>
            <h3>Demerit Watchlist</h3>
            {(smartOverview.demeritLeaders || []).slice(0, 4).length === 0 ? (
              <p>No drivers have demerit points yet.</p>
            ) : (smartOverview.demeritLeaders || []).slice(0, 4).map((driver) => (
              <div key={driver.RegistrationNumber}>
                <strong>{driver.RegistrationNumber}</strong>
                <span>{driver.TotalPoints}/100 pts</span>
              </div>
            ))}
          </article>
          <article>
            <h3>Daily Briefing</h3>
            {(smartOverview.dailyBriefing || []).slice(0, 4).map((line) => <p key={line}>{line}</p>)}
          </article>
        </div>
      </section>

      <nav className="admin-tabs">
        {['overview', 'manage', 'complaints', 'activity'].map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tab === 'manage' ? 'Manage Users' : tab}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <>
          <section className="admin-report-hero">
            <article>
              <span>Collected</span>
              <strong><AnimatedNumber value={money(collectedAmount)} /></strong>
              <small>paid challan value</small>
            </article>
            <article>
              <span>Pending</span>
              <strong><AnimatedNumber value={money(pendingAmount)} /></strong>
              <small>unpaid and partial value</small>
            </article>
            <article>
              <span>Paid Cases</span>
              <strong><AnimatedNumber value={paidCount} /></strong>
              <small>closed payment records</small>
            </article>
            <article>
              <span>Open Cases</span>
              <strong><AnimatedNumber value={unpaidCount} /></strong>
              <small>needs recovery action</small>
            </article>
          </section>

          <section className="admin-chart-grid">
            <article className="admin-panel admin-chart-panel">
              <div className="admin-panel-heading">
                <h2>Paid vs Unpaid</h2>
                <p>Payment distribution across challan records.</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={paymentPieData} dataKey="value" nameKey="name" outerRadius={92} label>
                    {paymentPieData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </article>

            <article className="admin-panel admin-chart-panel">
              <div className="admin-panel-heading">
                <h2>Challan History</h2>
                <p>Daily total, paid, and unpaid challan movement.</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#09090B" strokeWidth={3} />
                  <Line type="monotone" dataKey="paid" stroke="#2ECC40" strokeWidth={3} />
                  <Line type="monotone" dataKey="unpaid" stroke="#FF3B3B" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </article>

            <article className="admin-panel admin-chart-panel">
              <div className="admin-panel-heading">
                <h2>Violation Types</h2>
                <p>Most common violations by challan count.</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={violationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#D2E823" stroke="#09090B" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="admin-panel admin-chart-panel">
              <div className="admin-panel-heading">
                <h2>Collected Trend</h2>
                <p>Daily collected amount from paid challans.</p>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(value)} />
                  <Bar dataKey="collected" fill="#09090B" />
                </BarChart>
              </ResponsiveContainer>
            </article>
          </section>

          <section className="admin-history-grid">
            <article className="admin-panel admin-history-panel">
              <div className="admin-panel-heading">
                <h2>Challan History</h2>
                <p>Recent challan records with payment state.</p>
              </div>
              <div className="admin-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Challan</th>
                      <th>Vehicle</th>
                      <th>Violation</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentChallans.length === 0 ? (
                      <tr><td colSpan="6">No challan history found.</td></tr>
                    ) : overview.recentChallans.map((challan) => (
                      <tr key={challan.ChallanID}>
                        <td>{challan.ChallanNumber}</td>
                        <td>{challan.RegistrationNumber || '-'}</td>
                        <td>{challan.ViolationType || '-'}</td>
                        <td>{money(challan.FineAmount)}</td>
                        <td><span className={`admin-payment-chip ${String(challan.PaymentStatus || '').toLowerCase()}`}>{challan.PaymentStatus}</span></td>
                        <td>{new Date(challan.IssueDateTime || Date.now()).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}

      {activeTab === 'manage' && (
        <section className="admin-manage-grid">
          <article className="admin-panel admin-form-panel">
            <h2>{form.userId ? 'Edit Account' : 'Add Account'}</h2>
            <form onSubmit={saveUser} className="admin-user-form">
              <label>Role
                <select value={form.role} onChange={(event) => updateForm('role', event.target.value)}>
                  <option>Officer</option>
                  <option>Public</option>
                  <option>Admin</option>
                  <option>Supervisor</option>
                </select>
              </label>
              <label>Username
                <input required value={form.username} onChange={(event) => updateForm('username', event.target.value)} />
              </label>
              <label>Email
                <input required type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
              </label>
              <label>Password
                <input type="password" required={!form.userId} value={form.password} onChange={(event) => updateForm('password', event.target.value)} placeholder={form.userId ? 'Leave blank to keep current' : 'At least 6 characters'} />
              </label>
              <label>First Name
                <input value={form.firstName || ''} onChange={(event) => updateForm('firstName', event.target.value)} />
              </label>
              <label>Last Name
                <input value={form.lastName || ''} onChange={(event) => updateForm('lastName', event.target.value)} />
              </label>
              <label>Phone
                <input value={form.phoneNumber || ''} onChange={(event) => updateForm('phoneNumber', event.target.value)} />
              </label>
              <label className="admin-check">
                <input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => updateForm('isActive', event.target.checked)} />
                Active account
              </label>

              {form.role === 'Officer' && (
                <>
                  <label>Badge Number
                    <input required value={form.badgeNumber || ''} onChange={(event) => updateForm('badgeNumber', event.target.value)} />
                  </label>
                  <label>Rank
                    <input value={form.rank || ''} onChange={(event) => updateForm('rank', event.target.value)} />
                  </label>
                  <label>Department
                    <input value={form.department || ''} onChange={(event) => updateForm('department', event.target.value)} />
                  </label>
                  <label>Assigned Zone
                    <input value={form.assignedZone || ''} onChange={(event) => updateForm('assignedZone', event.target.value)} />
                  </label>
                </>
              )}

              {form.role === 'Public' && (
                <>
                  <label>NIC Number
                    <input required value={form.nicNumber || ''} onChange={(event) => updateForm('nicNumber', event.target.value)} />
                  </label>
                  <label>Vehicle Number
                    <input required value={form.vehicleNumber || ''} onChange={(event) => updateForm('vehicleNumber', event.target.value.toUpperCase())} />
                  </label>
                </>
              )}

              <div className="admin-form-actions">
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : form.userId ? 'Save Changes' : 'Create User'}</button>
                <button type="button" onClick={resetForm}>Clear</button>
              </div>
            </form>
          </article>

          <article className="admin-panel admin-users-panel">
            <div className="admin-users-head">
              <h2>Users</h2>
              <div>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." />
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option>All</option>
                  <option>Admin</option>
                  <option>Officer</option>
                  <option>Public</option>
                  <option>Supervisor</option>
                </select>
              </div>
            </div>
            <div className="admin-user-list">
              {filteredUsers.length === 0 ? <p>No users found.</p> : filteredUsers.map((user) => (
                <article key={user.userId} className={user.isActive ? '' : 'inactive'}>
                  <div>
                    <span>{user.role}</span>
                    <strong>{user.username}</strong>
                    <small>{user.email}</small>
                    <small>{user.role === 'Officer' ? `Badge ${user.badgeNumber || '-'}` : user.role === 'Public' ? `NIC ${user.nicNumber || '-'} / ${user.vehicleNumber || '-'}` : 'System account'}</small>
                  </div>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => startEdit(user)}>Edit</button>
                    <button type="button" onClick={() => toggleActive(user)}>{user.isActive ? 'Deactivate' : 'Activate'}</button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      )}

      {activeTab === 'complaints' && (
        <section className="admin-panel admin-complaints-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Public Complaints</h2>
              <p>Review citizen reports and route them to the right action.</p>
            </div>
          </div>
          <div className="admin-complaint-grid">
            {complaints.length === 0 ? <p>No complaints submitted yet.</p> : complaints.map((complaint) => (
              <article key={complaint.complaintId} className={`admin-complaint-card ${String(complaint.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="admin-complaint-top">
                  <span>{complaint.status}</span>
                  <strong>{complaint.category}</strong>
                  <small>{complaint.priority} priority</small>
                </div>
                <p>{complaint.description}</p>
                <dl>
                  <div><dt>Citizen</dt><dd>{complaint.contactName}</dd></div>
                  <div><dt>Vehicle</dt><dd>{complaint.vehicleRegistrationNumber || '-'}</dd></div>
                  <div><dt>Location</dt><dd>{complaint.locationName || '-'}</dd></div>
                  <div><dt>Phone</dt><dd>{complaint.contactPhone || '-'}</dd></div>
                </dl>
                <textarea
                  value={complaintNotes[complaint.complaintId] ?? complaint.officerNote ?? ''}
                  onChange={(event) => setComplaintNotes((current) => ({ ...current, [complaint.complaintId]: event.target.value }))}
                  placeholder="Admin note..."
                />
                <div className="admin-complaint-actions">
                  <button type="button" onClick={() => updateComplaintStatus(complaint, 'In Review')} disabled={complaintsLoading}>Review</button>
                  <button type="button" onClick={() => updateComplaintStatus(complaint, 'Resolved')} disabled={complaintsLoading}>Resolve</button>
                  <button type="button" onClick={() => updateComplaintStatus(complaint, 'Dismissed')} disabled={complaintsLoading}>Dismiss</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'activity' && (
        <section className="admin-panel admin-activity">
          <h2>Latest Activity</h2>
          {overview.activity.length === 0 ? <p>No activity yet.</p> : overview.activity.map((item, index) => (
            <div key={`${item.ActionType}-${index}`}>
              <strong>{item.ActionType}</strong>
              <span>{item.Description}</span>
              <small>{new Date(item.CreatedAt).toLocaleString()}</small>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
