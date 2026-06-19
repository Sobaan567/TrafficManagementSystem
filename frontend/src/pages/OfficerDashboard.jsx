import React, { useCallback, useState, useEffect } from 'react';
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
  YAxis
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import TrafficMap from '../components/traffic/TrafficMap';
import ViolationStats from '../components/dashboard/ViolationStats';
import ChallanList from '../components/dashboard/ChallanList';
import OfficerPanel from '../components/dashboard/OfficerPanel';
import TrafficScene3D from '../components/3d/TrafficScene3D';
import GlitchText from '../components/common/GlitchText';
import HardShadowButton from '../components/common/HardShadowButton';
import AnimatedNumber from '../components/common/AnimatedNumber';
import api from '../services/api';
import './OfficerDashboard.css';

const VIOLATION_TYPES = [
  'Speeding', 'Red Light Violation', 'Illegal Parking', 'No Helmet',
  'No Seat Belt', 'Wrong Side Driving', 'Overloading', 'Mobile Phone Usage',
  'Dangerous Driving', 'No License Plate', 'Expired Registration',
  'Expired Insurance', 'Expired Fitness Certificate',
  'Pollution Certificate Expired', 'Other'
];

const SEVERITY_OPTIONS = ['Minor', 'Moderate', 'Major', 'Critical'];
const TRAFFIC_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const BASE_FINES = {
  Speeding: 3000,
  'Red Light Violation': 5000,
  'Illegal Parking': 1500,
  'No Helmet': 1000,
  'No Seat Belt': 1000,
  'Wrong Side Driving': 3500,
  Overloading: 4000,
  'Mobile Phone Usage': 2500,
  'Dangerous Driving': 6000,
  'No License Plate': 3000,
  'Expired Registration': 2500,
  'Expired Insurance': 2500,
  'Expired Fitness Certificate': 2500,
  'Pollution Certificate Expired': 2000,
  Other: 1500
};

const SEVERITY_MULTIPLIERS = {
  Minor: 1,
  Moderate: 1.25,
  Major: 1.6,
  Critical: 2
};

const BASE_DEMERIT_POINTS = {
  Speeding: 4,
  'Red Light Violation': 8,
  'Illegal Parking': 2,
  'No Helmet': 3,
  'No Seat Belt': 3,
  'Wrong Side Driving': 8,
  Overloading: 7,
  'Mobile Phone Usage': 6,
  'Dangerous Driving': 18,
  'No License Plate': 4,
  'Expired Registration': 3,
  'Expired Insurance': 3,
  'Expired Fitness Certificate': 3,
  'Pollution Certificate Expired': 2,
  Other: 3
};

const chartColors = ['#D2E823', '#09090B', '#FF851B', '#FF3B3B'];

const calculateFineAmount = (violationType, severity) =>
  Math.round((BASE_FINES[violationType] || BASE_FINES.Other) * (SEVERITY_MULTIPLIERS[severity] || 1));

const calculateDemeritPoints = (violationType, severity) =>
  Math.min(100, Math.max(1, Math.round((BASE_DEMERIT_POINTS[violationType] || BASE_DEMERIT_POINTS.Other) * (SEVERITY_MULTIPLIERS[severity] || 1))));

const extractJsonObject = (text) => {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
};

const initialViolationForm = {
  registrationNumber: '',
  violationType: 'Speeding',
  severity: 'Minor',
  speed: '',
  speedLimit: '',
  locationName: '',
  description: '',
  fineAmount: calculateFineAmount('Speeding', 'Minor'),
  demeritPoints: calculateDemeritPoints('Speeding', 'Minor'),
  ownerName: '',
  ownerPhone: '',
};

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalChallans: 0,
    paidChallans: 0,
    pendingChallans: 0,
    totalViolations: 0,
  });
  const [recentChallans, setRecentChallans] = useState([]);
  const [violations, setViolations] = useState([]);
  const [showMap, setShowMap] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [violationForm, setViolationForm] = useState(initialViolationForm);
  const [violationMsg, setViolationMsg] = useState({ text: '', type: '' });
  const [violationLoading, setViolationLoading] = useState(false);
  const [officerAiPrompt, setOfficerAiPrompt] = useState('');
  const [officerAiLoading, setOfficerAiLoading] = useState(false);
  const [officerAiMessage, setOfficerAiMessage] = useState('');
  const [trafficForm, setTrafficForm] = useState({
    locationName: '',
    cityName: '',
    description: '',
    trafficLevel: 'Low',
    latitude: '',
    longitude: '',
  });
  const [trafficMsg, setTrafficMsg] = useState({ text: '', type: '' });
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [publicAppeals, setPublicAppeals] = useState([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealNotes, setAppealNotes] = useState({});
  const [appealFilter, setAppealFilter] = useState('All');
  const [appealSearch, setAppealSearch] = useState('');
  const [publicComplaints, setPublicComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState('');
  const [complaintNotes, setComplaintNotes] = useState({});
  const [complaintFilter, setComplaintFilter] = useState('All');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchPublicAppeals = useCallback(async () => {
    setAppealsLoading(true);
    setAppealMessage('');
    try {
      const response = await api.get('/public/officer/appeals');
      setPublicAppeals(response.data?.data || []);
    } catch (error) {
      setAppealMessage(error.response?.data?.message || 'Could not load citizen appeals.');
    } finally {
      setAppealsLoading(false);
    }
  }, []);

  const fetchPublicComplaints = useCallback(async () => {
    setComplaintsLoading(true);
    setComplaintMessage('');
    try {
      const response = await api.get('/public/officer/complaints');
      setPublicComplaints(response.data?.data || []);
    } catch (error) {
      setComplaintMessage(error.response?.data?.message || 'Could not load public complaints.');
    } finally {
      setComplaintsLoading(false);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    setActivityLoading(true);
    try {
      const response = await api.get('/activity');
      if (response.data?.success) setActivityLogs(response.data.data || []);
    } catch (error) {
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [challansResponse, statsResponse] = await Promise.all([
        api.get('/challans', { params: { limit: 20 } }),
        api.get('/challans/stats/summary'),
      ]);

      const liveChallans = challansResponse.data?.data || [];
      const liveStats = statsResponse.data?.stats || {};

      setRecentChallans(liveChallans);
      setStats({
        totalChallans: Number(liveStats.TotalChallans || liveChallans.length || 0),
        paidChallans: Number(liveStats.PaidCount || 0),
        pendingChallans: Number(liveStats.UnpaidCount || 0) + Number(liveStats.PartialCount || 0),
        totalViolations: liveChallans.length,
      });
      setViolations(liveChallans.map((challan) => ({
        id: challan.ChallanID,
        vehicleNumber: challan.RegistrationNumber || challan.VehicleID,
        violationType: challan.DisplayViolationType || challan.ViolationType || 'Violation',
        severity: challan.ChallanStatus || challan.PaymentStatus || 'Issued',
        location: challan.LocationName || challan.Location || '-',
        timestamp: challan.IssueDateTime || challan.CreatedAt || new Date().toISOString(),
      })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats({ totalChallans: 0, paidChallans: 0, pendingChallans: 0, totalViolations: 0 });
      setRecentChallans([]);
      setViolations([]);
    }
    fetchPublicAppeals();
    fetchPublicComplaints();
    fetchActivityLogs();
  }, [fetchActivityLogs, fetchPublicAppeals, fetchPublicComplaints]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const updateAppealStatus = async (appeal, status) => {
    setAppealsLoading(true);
    setAppealMessage('');
    try {
      await api.put(`/public/officer/appeals/${appeal.appealId}`, {
        status,
        officerNote: appealNotes[appeal.appealId] || appeal.officerNote || '',
      });
      await fetchPublicAppeals();
      fetchActivityLogs();
      setAppealMessage(`Appeal ${appeal.challanNumber || appeal.appealId} marked ${status}.`);
    } catch (error) {
      setAppealMessage(error.response?.data?.message || 'Could not update appeal.');
    } finally {
      setAppealsLoading(false);
    }
  };

  const updateComplaintStatus = async (complaint, status) => {
    setComplaintsLoading(true);
    setComplaintMessage('');
    try {
      await api.put(`/public/officer/complaints/${complaint.complaintId}`, {
        status,
        priority: complaint.priority || 'Medium',
        officerNote: complaintNotes[complaint.complaintId] || complaint.officerNote || '',
      });
      await fetchPublicComplaints();
      fetchActivityLogs();
      setComplaintMessage(`Complaint ${complaint.complaintId} marked ${status}.`);
    } catch (error) {
      setComplaintMessage(error.response?.data?.message || 'Could not update complaint.');
    } finally {
      setComplaintsLoading(false);
    }
  };

  const officerLocations = [
    {
      id: user?.userId || 1,
      name: `${user?.firstName || 'Shafiq'} ${user?.lastName || 'Rana'}`,
      lat: 24.8607,
      lng: 67.0011,
      assignedZone: 'Karachi Central',
    },
    {
      id: 2,
      name: 'Ayesha Khan',
      lat: 24.8738,
      lng: 67.0321,
      assignedZone: 'Saddar',
    },
    {
      id: 3,
      name: 'Bilal Ahmed',
      lat: 24.9180,
      lng: 67.0971,
      assignedZone: 'Gulshan-e-Iqbal',
    },
  ];

  const paymentChartData = [
    { name: 'Paid', value: stats.paidChallans },
    { name: 'Pending', value: stats.pendingChallans },
  ];

  const violationChartData = [
    { type: 'Speeding', count: 68 },
    { type: 'No Helmet', count: 52 },
    { type: 'Red Light', count: 41 },
    { type: 'Parking', count: 29 },
    { type: 'Other', count: 44 },
  ];

  const revenueChartData = [
    { month: 'Jan', amount: 120000 },
    { month: 'Feb', amount: 145000 },
    { month: 'Mar', amount: 132000 },
    { month: 'Apr', amount: 178000 },
    { month: 'May', amount: 211000 },
  ];

  const pendingAppeals = publicAppeals.filter((appeal) => appeal.status === 'Pending Review').length;
  const openComplaints = publicComplaints.filter((complaint) => ['Open', 'In Review'].includes(complaint.status)).length;

  const commandSignals = [
    { label: 'Collection Pressure', value: `${stats.totalChallans ? Math.round((stats.pendingChallans / stats.totalChallans) * 100) : 0}%`, tone: 'warn' },
    { label: 'Active Units', value: officerLocations.length, tone: 'live' },
    { label: 'Violation Heat', value: stats.totalViolations > 200 ? 'High' : 'Normal', tone: stats.totalViolations > 200 ? 'danger' : 'live' },
    { label: 'Appeals Inbox', value: pendingAppeals, tone: 'accent' },
  ];

  const filteredAppeals = publicAppeals.filter((appeal) => {
    const statusMatch = appealFilter === 'All' || appeal.status === appealFilter;
    const haystack = [
      appeal.challanNumber,
      appeal.vehicleRegistrationNumber,
      appeal.nicNumber,
      appeal.firstName,
      appeal.lastName,
      appeal.username,
      appeal.reason,
    ].join(' ').toLowerCase();
    return statusMatch && haystack.includes(appealSearch.toLowerCase());
  });

  const filteredComplaints = publicComplaints.filter((complaint) => {
    const statusMatch = complaintFilter === 'All' || complaint.status === complaintFilter;
    const haystack = [
      complaint.contactName,
      complaint.contactPhone,
      complaint.contactEmail,
      complaint.vehicleRegistrationNumber,
      complaint.category,
      complaint.priority,
      complaint.locationName,
      complaint.description,
    ].join(' ').toLowerCase();
    return statusMatch && haystack.includes(complaintSearch.toLowerCase());
  });

  const updateViolationForm = (field, value) => {
    setViolationForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'violationType' || field === 'severity') {
        next.fineAmount = calculateFineAmount(next.violationType, next.severity);
        next.demeritPoints = calculateDemeritPoints(next.violationType, next.severity);
      }
      return next;
    });
  };

  const handleOfficerAiFill = async () => {
    const prompt = officerAiPrompt.trim();
    if (!prompt) {
      setOfficerAiMessage('Type a quick violation note first.');
      return;
    }

    setOfficerAiLoading(true);
    setOfficerAiMessage('');
    try {
      const response = await api.post('/chatbot/ask', {
        message: `Extract a traffic challan form from this officer note. Return ONLY JSON with keys: registrationNumber, ownerName, ownerPhone, violationType, severity, speed, speedLimit, locationName, description. Allowed violationType values: ${VIOLATION_TYPES.join(', ')}. Allowed severity values: ${SEVERITY_OPTIONS.join(', ')}. Use empty strings when unknown, except keep violationType and severity valid. Officer note: ${prompt}`,
        history: [],
        context: { path: '/officer-dashboard', role: user?.role || 'Officer' },
      });

      const parsed = extractJsonObject(response.data?.data?.reply);
      if (!parsed) {
        setOfficerAiMessage('AI could not read that note. Try: "ABC123 no helmet at Saddar, owner Ali, 03001234567".');
        return;
      }

      setViolationForm((current) => {
        const violationType = VIOLATION_TYPES.includes(parsed.violationType) ? parsed.violationType : current.violationType;
        const severity = SEVERITY_OPTIONS.includes(parsed.severity) ? parsed.severity : current.severity;
        return {
          ...current,
          registrationNumber: String(parsed.registrationNumber || current.registrationNumber || '').toUpperCase().replace(/\s+/g, ''),
          ownerName: parsed.ownerName || current.ownerName,
          ownerPhone: parsed.ownerPhone || current.ownerPhone,
          violationType,
          severity,
          speed: parsed.speed || current.speed,
          speedLimit: parsed.speedLimit || current.speedLimit,
          locationName: parsed.locationName || current.locationName,
          description: parsed.description || current.description || prompt,
          fineAmount: calculateFineAmount(violationType, severity),
          demeritPoints: calculateDemeritPoints(violationType, severity),
        };
      });
      setOfficerAiMessage('Form filled from AI. Review it, then submit.');
    } catch (error) {
      setOfficerAiMessage(error.response?.data?.message || 'AI auto-fill failed. Check the Gemini backend key.');
    } finally {
      setOfficerAiLoading(false);
    }
  };

  const handleViolationSubmit = async () => {
    const { registrationNumber, violationType, severity, locationName, fineAmount, demeritPoints, ownerName, ownerPhone } = violationForm;
    if (!registrationNumber || !locationName || !fineAmount || !demeritPoints || !ownerName || !ownerPhone) {
      setViolationMsg({ text: 'Please fill all required fields.', type: 'error' });
      return;
    }
    setViolationLoading(true);
    setViolationMsg({ text: '', type: '' });
    try {
      const response = await api.post('/violations/officer-add', {
        registrationNumber: registrationNumber.toUpperCase(),
        violationType,
        severity,
        speed: violationForm.speed || null,
        speedLimit: violationForm.speedLimit || null,
        locationName,
        description: violationForm.description,
        fineAmount: Number(fineAmount),
        demeritPoints: Number(demeritPoints),
        ownerName,
        ownerPhone,
      });
      if (response.data.success) {
        const points = response.data?.demerit?.adjustedPoints ?? demeritPoints;
        setViolationMsg({ text: `Violation and challan created. Challan #${response.data.challanNumber} added ${points} demerit point${Number(points) === 1 ? '' : 's'}.`, type: 'success' });
        setViolationForm(initialViolationForm);
        fetchDashboardData();
      } else {
        setViolationMsg({ text: response.data.message || 'Failed to add violation.', type: 'error' });
      }
    } catch (err) {
      setViolationMsg({ text: err.response?.data?.message || 'Server error. Try again.', type: 'error' });
    } finally {
      setViolationLoading(false);
    }
  };

  const handleTrafficSubmit = async () => {
    const { locationName, cityName, trafficLevel, description } = trafficForm;
    if (!locationName || !cityName || !description) {
      setTrafficMsg({ text: 'Please fill all required fields.', type: 'error' });
      return;
    }
    setTrafficLoading(true);
    setTrafficMsg({ text: '', type: '' });
    try {
      const response = await api.post('/traffic/situations', {
        locationName,
        cityName,
        description,
        trafficLevel,
        latitude: trafficForm.latitude || null,
        longitude: trafficForm.longitude || null,
      });
      if (response.data.success) {
        setTrafficMsg({ text: 'Traffic situation reported successfully.', type: 'success' });
        setTrafficForm({ locationName: '', cityName: '', description: '', trafficLevel: 'Low', latitude: '', longitude: '' });
      } else {
        setTrafficMsg({ text: response.data.message || 'Failed to report.', type: 'error' });
      }
    } catch (err) {
      setTrafficMsg({ text: err.response?.data?.message || 'Server error. Try again.', type: 'error' });
    } finally {
      setTrafficLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #09090B',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    marginTop: '4px',
  };
  const labelStyle = { fontSize: '13px', fontWeight: 'bold', color: '#09090B', display: 'block', marginBottom: '14px' };
  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0 20px' };
  const panelStyle = { backgroundColor: '#F8F4E8', border: '2px solid #09090B', borderRadius: '8px', padding: '18px' };

  return (
    <div className="officer-dashboard">
      <section className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1><GlitchText text="TRAFFIC CONTROL DASHBOARD" /></h1>
            <p className="header-subtitle">Welcome, {user?.firstName} {user?.lastName} ({user?.role})</p>
          </div>
          <div className="header-actions">
            <Link to="/public">
              <HardShadowButton variant="accent">
                Public Dashboard
              </HardShadowButton>
            </Link>
            <HardShadowButton onClick={() => setShowMap(!showMap)} variant="primary">
              {showMap ? 'Hide Map' : 'Show Map'}
            </HardShadowButton>
            <HardShadowButton onClick={() => setShow3D(!show3D)} variant="accent">
              {show3D ? 'Hide 3D' : 'Show 3D'}
            </HardShadowButton>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">ALL</div>
            <h3>Total Challans</h3>
            <p className="stat-number"><AnimatedNumber value={stats.totalChallans} /></p>
            <span className="stat-label">This Month</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon">PAID</div>
            <h3>Paid Challans</h3>
            <p className="stat-number"><AnimatedNumber value={stats.paidChallans} /></p>
            <span className="stat-label">Collection Rate: {stats.totalChallans ? Math.round((stats.paidChallans / stats.totalChallans) * 100) : 0}%</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon">DUE</div>
            <h3>Pending Challans</h3>
            <p className="stat-number"><AnimatedNumber value={stats.pendingChallans} /></p>
            <span className="stat-label">Awaiting Payment</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon">ALRT</div>
            <h3>Total Violations</h3>
            <p className="stat-number"><AnimatedNumber value={stats.totalViolations} /></p>
            <span className="stat-label">Reported This Month</span>
          </div>
        </div>
      </section>

      <section className="officer-command-band">
        <div className="command-radar">
          <div className="command-sweep" />
          <strong>OPS</strong>
        </div>
        <div className="command-copy">
          <span>Officer Tactical Layer</span>
          <h2>Command decisions in one glance</h2>
          <p>Collection pressure, patrol coverage, and violation heat are fused into one live control strip.</p>
        </div>
        <div className="command-signal-grid">
          {commandSignals.map((signal) => (
            <article key={signal.label} className={signal.tone}>
              <span>{signal.label}</span>
              <strong><AnimatedNumber value={signal.value} /></strong>
            </article>
          ))}
        </div>
      </section>

      <section className="officer-quick-grid">
        <article className="officer-quick-card live">
          <span>AI Drafting</span>
          <strong>Auto-Fill</strong>
          <p>Turn rough roadside notes into a ready challan form.</p>
          <button type="button" onClick={() => setActiveTab('add-violation')}>Open Tool</button>
        </article>
        <article className="officer-quick-card alert">
          <span>Citizen Appeals</span>
          <strong className="officer-appeal-count"><AnimatedNumber value={pendingAppeals} /></strong>
          <small className="officer-quick-meta">Pending review</small>
          <p>Every officer sees the same appeal inbox and can resolve cases.</p>
          <button type="button" onClick={() => setActiveTab('appeals')}>Review</button>
        </article>
        <article className="officer-quick-card map">
          <span>3D Ops</span>
          <strong>{show3D ? 'Visible' : 'Ready'}</strong>
          <p>Animated traffic grid with moving units and alert beacons.</p>
          <button type="button" onClick={() => setShow3D(true)}>Launch 3D</button>
        </article>
        <article className="officer-quick-card complaint">
          <span>Complaints</span>
          <strong><AnimatedNumber value={openComplaints} /></strong>
          <small className="officer-quick-meta">Open cases</small>
          <p>Public road and service complaints move into one review queue.</p>
          <button type="button" onClick={() => setActiveTab('complaints')}>Open Inbox</button>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="tabs-navigation">
          {['overview', 'violations', 'challans', 'appeals', 'complaints', 'activity', 'add-violation', 'traffic-situation', 'profile'].map(tab => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'add-violation' ? 'ADD VIOLATION' : tab === 'traffic-situation' ? 'TRAFFIC SITUATION' : tab.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="dashboard-grid">
            <div className="dashboard-col-main">
              {showMap && (
                <div className="map-container">
                  <h2>OFFICER LOCATION TRACKING</h2>
                  <TrafficMap officers={officerLocations} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div style={{ ...panelStyle, height: '280px' }}>
                  <h3 style={{ margin: '0 0 12px' }}>Paid vs Pending</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie data={paymentChartData} dataKey="value" nameKey="name" outerRadius={78} label>
                        {paymentChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ ...panelStyle, height: '280px' }}>
                  <h3 style={{ margin: '0 0 12px' }}>Top Violations</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={violationChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#D2E823" stroke="#09090B" strokeWidth={1} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ ...panelStyle, height: '280px' }}>
                  <h3 style={{ margin: '0 0 12px' }}>Revenue Collected</h3>
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="amount" stroke="#09090B" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {show3D && (
                <div className="scene-3d-container">
                  <h2>3D OFFICER PATROL MAP</h2>
                  <TrafficScene3D officers={officerLocations} />
                </div>
              )}
            </div>
            <div className="dashboard-col-sidebar">
              <ViolationStats violations={violations} />
              <OfficerPanel user={user} stats={stats} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="tab-content"><ViolationStats violations={violations} detailed /></div>
      )}

      {activeTab === 'challans' && (
        <div className="tab-content"><ChallanList challans={recentChallans} /></div>
      )}

      {activeTab === 'appeals' && (
        <div className="tab-content">
          <section className="officer-appeals-panel">
            <div className="officer-appeals-header">
              <div>
                <h2>Citizen Appeals Inbox</h2>
                <p>Every registered officer can see these public challan appeals.</p>
              </div>
              <button type="button" onClick={fetchPublicAppeals} disabled={appealsLoading}>
                {appealsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {appealMessage && <div className="officer-appeal-message">{appealMessage}</div>}

            <div className="appeal-filter-bar">
              <input
                value={appealSearch}
                onChange={(event) => setAppealSearch(event.target.value)}
                placeholder="Search challan, NIC, vehicle, citizen..."
              />
              <select value={appealFilter} onChange={(event) => setAppealFilter(event.target.value)}>
                {['All', 'Pending Review', 'Approved', 'Rejected', 'Need More Info'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="officer-appeals-grid">
              {filteredAppeals.length === 0 ? (
                <div className="officer-empty-appeals">No citizen appeals submitted yet.</div>
              ) : (
                filteredAppeals.map((appeal) => {
                  const citizenName = [appeal.firstName, appeal.lastName].filter(Boolean).join(' ') || appeal.username || 'Citizen';
                  const noteValue = appealNotes[appeal.appealId] ?? appeal.officerNote ?? '';

                  return (
                    <article key={appeal.appealId} className={`officer-appeal-card ${String(appeal.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="officer-appeal-top">
                        <div>
                          <span>{appeal.status}</span>
                          <h3>{appeal.challanNumber || 'General appeal'}</h3>
                        </div>
                        <strong>{appeal.vehicleRegistrationNumber}</strong>
                      </div>
                      <dl>
                        <div><dt>Citizen</dt><dd>{citizenName}</dd></div>
                        <div><dt>NIC</dt><dd>{appeal.nicNumber || '-'}</dd></div>
                        <div><dt>Fine</dt><dd>{appeal.fineAmount ? `Rs. ${Number(appeal.fineAmount).toLocaleString()}` : '-'}</dd></div>
                        <div><dt>Payment</dt><dd>{appeal.paymentStatus || '-'}</dd></div>
                      </dl>
                      <p className="officer-appeal-reason">{appeal.reason}</p>
                      {appeal.evidenceFileName && (
                        <a className="officer-evidence-link" href={appeal.evidenceDataUrl} target="_blank" rel="noreferrer">
                          View Evidence: {appeal.evidenceFileName}
                        </a>
                      )}
                      <textarea
                        value={noteValue}
                        onChange={(event) => setAppealNotes((current) => ({ ...current, [appeal.appealId]: event.target.value }))}
                        placeholder="Officer note for the citizen..."
                      />
                      <div className="officer-appeal-actions">
                        <button type="button" onClick={() => updateAppealStatus(appeal, 'Approved')} disabled={appealsLoading}>Approve</button>
                        <button type="button" onClick={() => updateAppealStatus(appeal, 'Rejected')} disabled={appealsLoading}>Reject</button>
                        <button type="button" onClick={() => updateAppealStatus(appeal, 'Need More Info')} disabled={appealsLoading}>Need Info</button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="tab-content">
          <section className="officer-appeals-panel officer-complaints-panel">
            <div className="officer-appeals-header">
              <div>
                <h2>Public Complaints Inbox</h2>
                <p>Road issues, signal faults, challan concerns, and service complaints submitted by citizens.</p>
              </div>
              <button type="button" onClick={fetchPublicComplaints} disabled={complaintsLoading}>
                {complaintsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {complaintMessage && <div className="officer-appeal-message">{complaintMessage}</div>}

            <div className="appeal-filter-bar">
              <input
                value={complaintSearch}
                onChange={(event) => setComplaintSearch(event.target.value)}
                placeholder="Search contact, vehicle, category, location..."
              />
              <select value={complaintFilter} onChange={(event) => setComplaintFilter(event.target.value)}>
                {['All', 'Open', 'In Review', 'Resolved', 'Dismissed'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="officer-appeals-grid">
              {filteredComplaints.length === 0 ? (
                <div className="officer-empty-appeals">No public complaints submitted yet.</div>
              ) : filteredComplaints.map((complaint) => {
                const noteValue = complaintNotes[complaint.complaintId] ?? complaint.officerNote ?? '';
                return (
                  <article key={complaint.complaintId} className={`officer-appeal-card complaint-${String(complaint.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="officer-appeal-top">
                      <div>
                        <span>{complaint.status}</span>
                        <h3>{complaint.category}</h3>
                      </div>
                      <strong>{complaint.priority}</strong>
                    </div>
                    <dl>
                      <div><dt>Citizen</dt><dd>{complaint.contactName}</dd></div>
                      <div><dt>Vehicle</dt><dd>{complaint.vehicleRegistrationNumber || '-'}</dd></div>
                      <div><dt>Phone</dt><dd>{complaint.contactPhone || '-'}</dd></div>
                      <div><dt>Location</dt><dd>{complaint.locationName || '-'}</dd></div>
                    </dl>
                    <p className="officer-appeal-reason">{complaint.description}</p>
                    <textarea
                      value={noteValue}
                      onChange={(event) => setComplaintNotes((current) => ({ ...current, [complaint.complaintId]: event.target.value }))}
                      placeholder="Staff note for this complaint..."
                    />
                    <div className="officer-appeal-actions">
                      <button type="button" onClick={() => updateComplaintStatus(complaint, 'In Review')} disabled={complaintsLoading}>Review</button>
                      <button type="button" onClick={() => updateComplaintStatus(complaint, 'Resolved')} disabled={complaintsLoading}>Resolve</button>
                      <button type="button" onClick={() => updateComplaintStatus(complaint, 'Dismissed')} disabled={complaintsLoading}>Dismiss</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="tab-content">
          <section className="officer-activity-panel">
            <div className="officer-appeals-header">
              <div>
                <h2>Officer Activity Log</h2>
                <p>Audit trail for appeals, violations, profile edits, and system work.</p>
              </div>
              <button type="button" onClick={fetchActivityLogs} disabled={activityLoading}>
                {activityLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <div className="activity-log-list">
              {activityLogs.length === 0 ? (
                <div className="officer-empty-appeals">No activity logged yet.</div>
              ) : activityLogs.map((item) => (
                <article key={item.activityId}>
                  <span>{item.actionType}</span>
                  <strong>{item.description}</strong>
                  <small>{item.actorName || item.actorRole || 'System'} - {new Date(item.createdAt).toLocaleString()}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="tab-content"><OfficerPanel user={user} stats={stats} /></div>
      )}

      {activeTab === 'add-violation' && (
        <div className="tab-content">
          <div style={{ maxWidth: 800, margin: '0 auto', backgroundColor: '#F8F4E8', border: '2px solid #09090B', padding: '30px', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '24px' }}>Add Vehicle Violation and Generate Challan</h2>

            <div className="officer-ai-fill">
              <div>
                <strong>AI Auto-Fill</strong>
                <p>Type one rough field note and Gemini will prepare the challan form.</p>
              </div>
              <div className="officer-ai-presets">
                {[
                  'ABC123 no helmet at Saddar, owner Ali Khan, 03001234567, minor',
                  'KHI7788 speeding 95 in 60 zone at University Road, owner Sara Ahmed, 03111222333, major',
                ].map((preset) => (
                  <button key={preset} type="button" onClick={() => setOfficerAiPrompt(preset)}>
                    Use Preset
                  </button>
                ))}
              </div>
              <textarea
                value={officerAiPrompt}
                onChange={(event) => setOfficerAiPrompt(event.target.value)}
                placeholder="Example: ABC123 no helmet at Saddar, owner Ali Khan, 03001234567, minor"
              />
              <button type="button" onClick={handleOfficerAiFill} disabled={officerAiLoading}>
                {officerAiLoading ? 'Reading...' : 'Fill With AI'}
              </button>
              {officerAiMessage && <span>{officerAiMessage}</span>}
            </div>

            {violationMsg.text && (
              <div style={{ padding: '12px 16px', marginBottom: '20px', border: '2px solid', borderColor: violationMsg.type === 'success' ? 'green' : 'red', backgroundColor: violationMsg.type === 'success' ? '#f0fff0' : '#fff0f0', color: violationMsg.type === 'success' ? 'green' : 'red', fontWeight: 'bold' }}>
                {violationMsg.text}
              </div>
            )}

            <div style={gridStyle}>
              <label style={labelStyle}>
                Vehicle Registration No. *
                <input style={inputStyle} placeholder="e.g. ABC123" value={violationForm.registrationNumber}
                  onChange={e => updateViolationForm('registrationNumber', e.target.value.toUpperCase())} />
              </label>
              <label style={labelStyle}>
                Owner Name *
                <input style={inputStyle} placeholder="Full name" value={violationForm.ownerName}
                  onChange={e => updateViolationForm('ownerName', e.target.value)} />
              </label>
              <label style={labelStyle}>
                Owner Phone *
                <input style={inputStyle} placeholder="e.g. 03001234567" value={violationForm.ownerPhone}
                  onChange={e => updateViolationForm('ownerPhone', e.target.value)} />
              </label>
              <label style={labelStyle}>
                Violation Type *
                <select style={inputStyle} value={violationForm.violationType}
                  onChange={e => updateViolationForm('violationType', e.target.value)}>
                  {VIOLATION_TYPES.map(v => <option key={v}>{v}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Severity *
                <select style={inputStyle} value={violationForm.severity}
                  onChange={e => updateViolationForm('severity', e.target.value)}>
                  {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Fine Amount (Rs.) *
                <input style={inputStyle} type="number" value={violationForm.fineAmount}
                  onChange={e => updateViolationForm('fineAmount', e.target.value)} />
                <span style={{ display: 'block', marginTop: '4px', color: '#555', fontSize: '11px' }}>Auto-calculated from violation type and severity.</span>
              </label>
              <label style={labelStyle}>
                Demerit Points *
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  max="100"
                  value={violationForm.demeritPoints}
                  onChange={e => updateViolationForm('demeritPoints', e.target.value)}
                />
                <span style={{ display: 'block', marginTop: '4px', color: '#555', fontSize: '11px' }}>Speeding starts at 4 points. License cancels at 100.</span>
              </label>
              <label style={labelStyle}>
                Location *
                <input style={inputStyle} placeholder="e.g. Main Boulevard, Karachi" value={violationForm.locationName}
                  onChange={e => updateViolationForm('locationName', e.target.value)} />
              </label>
              <label style={labelStyle}>
                Speed (km/h)
                <input style={inputStyle} type="number" placeholder="Optional" value={violationForm.speed}
                  onChange={e => updateViolationForm('speed', e.target.value)} />
              </label>
              <label style={labelStyle}>
                Speed Limit (km/h)
                <input style={inputStyle} type="number" placeholder="Optional" value={violationForm.speedLimit}
                  onChange={e => updateViolationForm('speedLimit', e.target.value)} />
              </label>
            </div>

            <label style={labelStyle}>
              Description
              <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} placeholder="Additional notes..."
                value={violationForm.description}
                onChange={e => updateViolationForm('description', e.target.value)} />
            </label>

            <button onClick={handleViolationSubmit} disabled={violationLoading} style={{
              marginTop: '10px', padding: '12px 32px', backgroundColor: '#D2E823',
              color: '#09090B', border: '2px solid #09090B', fontSize: '16px',
              fontWeight: 'bold', cursor: violationLoading ? 'not-allowed' : 'pointer',
              opacity: violationLoading ? 0.6 : 1,
            }}>
              {violationLoading ? 'Submitting...' : 'Submit Violation and Generate Challan'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'traffic-situation' && (
        <div className="tab-content">
          <div style={{ maxWidth: 800, margin: '0 auto', backgroundColor: '#F8F4E8', border: '2px solid #09090B', padding: '30px', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '24px' }}>Report Traffic Situation</h2>
            <p style={{ marginBottom: '20px', color: '#555' }}>This will be visible to the public on the Traffic Information page.</p>

            {trafficMsg.text && (
              <div style={{ padding: '12px 16px', marginBottom: '20px', border: '2px solid', borderColor: trafficMsg.type === 'success' ? 'green' : 'red', backgroundColor: trafficMsg.type === 'success' ? '#f0fff0' : '#fff0f0', color: trafficMsg.type === 'success' ? 'green' : 'red', fontWeight: 'bold' }}>
                {trafficMsg.text}
              </div>
            )}

            <div style={gridStyle}>
              <label style={labelStyle}>
                Location Name *
                <input style={inputStyle} placeholder="e.g. Shahrae Faisal" value={trafficForm.locationName}
                  onChange={e => setTrafficForm(p => ({ ...p, locationName: e.target.value }))} />
              </label>
              <label style={labelStyle}>
                City *
                <input style={inputStyle} placeholder="e.g. Karachi" value={trafficForm.cityName}
                  onChange={e => setTrafficForm(p => ({ ...p, cityName: e.target.value }))} />
              </label>
              <label style={labelStyle}>
                Traffic Level *
                <select style={inputStyle} value={trafficForm.trafficLevel}
                  onChange={e => setTrafficForm(p => ({ ...p, trafficLevel: e.target.value }))}>
                  {TRAFFIC_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Latitude (optional)
                <input style={inputStyle} type="number" placeholder="e.g. 24.8607" value={trafficForm.latitude}
                  onChange={e => setTrafficForm(p => ({ ...p, latitude: e.target.value }))} />
              </label>
              <label style={labelStyle}>
                Longitude (optional)
                <input style={inputStyle} type="number" placeholder="e.g. 67.0011" value={trafficForm.longitude}
                  onChange={e => setTrafficForm(p => ({ ...p, longitude: e.target.value }))} />
              </label>
            </div>

            <label style={labelStyle}>
              Description *
              <textarea style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
                placeholder="Describe the traffic situation, road blocks, accidents, etc."
                value={trafficForm.description}
                onChange={e => setTrafficForm(p => ({ ...p, description: e.target.value }))} />
            </label>

            <button onClick={handleTrafficSubmit} disabled={trafficLoading} style={{
              marginTop: '10px', padding: '12px 32px', backgroundColor: '#D2E823',
              color: '#09090B', border: '2px solid #09090B', fontSize: '16px',
              fontWeight: 'bold', cursor: trafficLoading ? 'not-allowed' : 'pointer',
              opacity: trafficLoading ? 0.6 : 1,
            }}>
              {trafficLoading ? 'Reporting...' : 'Report Traffic Situation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerDashboard;
