import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GoogleMapReact from 'google-map-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import './PublicAccount.css';

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

const SUGGESTED_ALERT_AREAS = ['Saddar', 'Gulberg Town', 'Shahrah-e-Faisal', 'M.A. Jinnah Road', 'University Road'];

const normalizeSituation = (s) => ({
  locationName: s.locationName || s.LocationName || 'Unknown location',
  cityName: s.cityName || s.CityName || 'Karachi',
  description: s.description || s.Description || 'Traffic update is available for this area.',
  trafficLevel: s.trafficLevel || s.TrafficLevel || 'Low',
  latitude: s.latitude ?? s.Latitude,
  longitude: s.longitude ?? s.Longitude,
  reportedAt: s.reportedAt || s.ReportedAt || s.createdAt || s.CreatedAt,
});

const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString()}`;
const isSettledPayment = (status) => ['paid', 'waived'].includes(String(status || '').toLowerCase());

const getValidCoords = (item) => {
  const lat = Number(item?.latitude ?? item?.lat);
  const lng = Number(item?.longitude ?? item?.lng);
  const isPlaceholder = (lat === 0 && lng === 0) || (lat === -2 && lng === -2);
  const inPakistanArea = lat >= 23 && lat <= 38 && lng >= 60 && lng <= 78;

  return Number.isFinite(lat) && Number.isFinite(lng) && !isPlaceholder && inPakistanArea
    ? { lat, lng }
    : null;
};

const normalizeLocationKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getMappableCoords = (item) => {
  const exact = getValidCoords(item);
  if (exact) return { ...exact, source: 'exact' };

  const nameKey = normalizeLocationKey(item?.locationName);
  const cityKey = normalizeLocationKey(`${item?.locationName || ''} ${item?.cityName || ''}`);
  const fallback = FALLBACK_LOCATION_COORDS[cityKey] || FALLBACK_LOCATION_COORDS[nameKey];

  return fallback ? { ...fallback, source: 'known' } : null;
};

const getLevelRank = (level) => ({ Critical: 4, High: 3, Medium: 2, Low: 1 }[level] || 0);
const chartColors = ['#D2E823', '#2ECC40', '#FF851B', '#FF3B3B', '#85144b'];

const CityPulseCommand = ({ situations, dashboard, selectedLocation, onSelectAlert }) => {
  const rankedAlerts = useMemo(() => [...situations]
    .sort((a, b) => getLevelRank(b.trafficLevel) - getLevelRank(a.trafficLevel))
    .slice(0, 5), [situations]);

  const counts = useMemo(() => situations.reduce((acc, situation) => {
    acc[situation.trafficLevel] = (acc[situation.trafficLevel] || 0) + 1;
    return acc;
  }, { Low: 0, Medium: 0, High: 0, Critical: 0 }), [situations]);

  const riskScore = Math.min(100, situations.reduce((total, situation) => (
    total + (getLevelRank(situation.trafficLevel) * 9)
  ), 0));
  const pendingCount = (dashboard?.totals?.unpaidCount || 0) + (dashboard?.totals?.partialCount || 0);
  const pulseLabel = riskScore >= 70 ? 'Severe' : riskScore >= 35 ? 'Watch' : 'Calm';

  return (
    <section className="city-pulse">
      <div className="city-pulse-radar">
        <div className="radar-orbit orbit-one" />
        <div className="radar-orbit orbit-two" />
        <div className="radar-sweep" />
        <div className="radar-core">
          <span>{riskScore}</span>
          <small>{pulseLabel}</small>
        </div>
      </div>

      <div className="city-pulse-copy">
        <span className="citizen-kicker">City Pulse</span>
        <h2>Live command snapshot</h2>
        <p>
          {situations.length} road signal{situations.length === 1 ? '' : 's'} active,
          {' '}{pendingCount} pending challan{pendingCount === 1 ? '' : 's'} on your vehicle.
        </p>

        <div className="pulse-meter">
          <span style={{ width: `${riskScore}%` }} />
        </div>

        <div className="pulse-counts">
          {['Critical', 'High', 'Medium', 'Low'].map((level) => (
            <div key={level}>
              <span style={{ backgroundColor: LEVEL_COLORS[level] }} />
              <strong>{counts[level] || 0}</strong>
              <small>{level}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="city-pulse-jumps">
        <h3>Fast Focus</h3>
        {rankedAlerts.length === 0 ? (
          <p className="citizen-muted">No live alerts to focus.</p>
        ) : (
          rankedAlerts.map((alert, index) => {
            const coords = getMappableCoords(alert);
            const isSelected = selectedLocation?.locationName === alert.locationName
              && selectedLocation?.reportedAt === alert.reportedAt;

            return (
              <button
                key={`${alert.locationName}-${alert.reportedAt || index}`}
                type="button"
                className={isSelected ? 'active' : ''}
                disabled={!coords}
                onClick={() => coords && onSelectAlert(alert)}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{alert.locationName}</strong>
                  <small>{alert.trafficLevel} - {coords ? 'map ready' : 'needs coordinates'}</small>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};

const TrafficAndChallanMap = ({ situations, challans, selectedLocation }) => {
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapsApi, setMapsApi] = useState(null);
  const [mapMessage, setMapMessage] = useState('');
  const nativeMarkerRef = useRef(null);

  const trafficMarkers = useMemo(() => situations
    .map((s, index) => ({
      id: `traffic-${s.locationName}-${s.reportedAt || index}`,
      label: '!',
      type: 'Traffic',
      color: LEVEL_COLORS[s.trafficLevel] || LEVEL_COLORS.Low,
      lat: Number(s.latitude),
      lng: Number(s.longitude),
    }))
    .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng) && (m.lat !== 0 || m.lng !== 0)), [situations]);

  const challanMarkers = useMemo(() => challans
    .map((c, index) => ({
      id: `challan-${c.challanId || c.challanNumber || index}`,
      label: index + 1,
      type: 'Challan',
      color: '#D2E823',
      lat: Number(c.location?.latitude),
      lng: Number(c.location?.longitude),
    }))
    .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng) && (m.lat !== 0 || m.lng !== 0)), [challans]);

  const markers = useMemo(() => [...challanMarkers, ...trafficMarkers], [challanMarkers, trafficMarkers]);
  const selectedCoords = getMappableCoords(selectedLocation);

  useEffect(() => {
    if (!selectedLocation && markers[0]) {
      const nextCenter = { lat: markers[0].lat, lng: markers[0].lng };
      setMapCenter(nextCenter);
      setMapZoom(12);
      nativeMarkerRef.current?.setMap(null);
      nativeMarkerRef.current = null;
      mapsApi?.map?.setCenter(nextCenter);
      mapsApi?.map?.setZoom(12);
    }
  }, [mapsApi, selectedLocation, markers]);

  useEffect(() => {
    if (!selectedLocation) return;

    const moveMap = (coords, message = '') => {
      const nextCenter = { lat: coords.lat, lng: coords.lng };
      setMapCenter(nextCenter);
      setMapZoom(16);
      setMapMessage(message);

      if (mapsApi?.map && mapsApi?.maps) {
        mapsApi.map.setCenter(nextCenter);
        mapsApi.map.setZoom(16);

        nativeMarkerRef.current?.setMap(null);
        const marker = new mapsApi.maps.Marker({
          position: nextCenter,
          map: mapsApi.map,
          title: selectedLocation.locationName,
          label: {
            text: '!',
            color: '#09090B',
            fontWeight: '900',
          },
          animation: mapsApi.maps.Animation.DROP,
        });
        nativeMarkerRef.current = marker;
      }
    };

    if (selectedCoords) {
        moveMap(selectedCoords, selectedCoords.source === 'known' ? 'Showing a verified Karachi map point for this named location.' : '');
      return;
    }

    setMapMessage('This road situation has no exact coordinates saved.');
  }, [mapsApi, selectedCoords, selectedLocation]);

  return (
    <div className="citizen-map-wrap">
      <GoogleMapReact
        bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY }}
        defaultCenter={mapCenter}
        center={mapCenter}
        defaultZoom={12}
        zoom={mapZoom}
        yesIWantToUseGoogleMapApiInternals
        onGoogleApiLoaded={(api) => setMapsApi(api)}
      >
        {(trafficMarkers.length ? trafficMarkers : []).map((marker) => (
          <div
            key={`heat-${marker.id}`}
            lat={marker.lat}
            lng={marker.lng}
            className="citizen-heat-point"
            style={{ '--heat-color': marker.color }}
          />
        ))}
        {(markers.length ? markers : [{ id: 'default', ...mapCenter, label: '!', color: LEVEL_COLORS.Low }]).map((marker) => (
          <div
            key={marker.id}
            lat={marker.lat}
            lng={marker.lng}
            className="citizen-map-marker"
            style={{ backgroundColor: marker.color }}
          >
            {marker.label}
          </div>
        ))}
      </GoogleMapReact>
      {mapMessage && <div className="citizen-map-message">{mapMessage}</div>}
    </div>
  );
};

export default function PublicAccount() {
  const { isAuthenticated, user, login, logout, registerPublic, error: authError } = useAuth();
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    nicNumber: '',
    vehicleNumber: '',
  });
  const [dashboard, setDashboard] = useState(null);
  const [situations, setSituations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoadingId, setAiLoadingId] = useState('');
  const [appeals, setAppeals] = useState([]);
  const [appealForm, setAppealForm] = useState({ challanNumber: '', challanId: '', reason: '', evidenceFileName: '', evidenceDataUrl: '' });
  const [appealLoading, setAppealLoading] = useState(false);
  const [featureMessage, setFeatureMessage] = useState('');
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionArea, setSubscriptionArea] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const isPublicUser = isAuthenticated && user?.role === 'Public';

  const fetchDashboard = async () => {
    setLoading(true);
    setPageError('');
    try {
      const [profileResponse, trafficResponse, appealsResponse, subscriptionsResponse] = await Promise.all([
        api.get('/public/me'),
        api.get('/traffic/situations'),
        api.get('/public/appeals'),
        api.get('/public/subscriptions'),
      ]);

      if (profileResponse.data.success) {
        const data = profileResponse.data.data;
        setDashboard(data);
        setProfileForm((current) => ({
          ...current,
          firstName: data.user?.firstName || '',
          lastName: data.user?.lastName || '',
          email: data.user?.email || '',
          phoneNumber: data.user?.phoneNumber || '',
          password: '',
        }));
      }
      if (trafficResponse.data.success) {
        setSituations((trafficResponse.data.data || []).map(normalizeSituation));
      }
      if (appealsResponse.data.success) setAppeals(appealsResponse.data.data || []);
      if (subscriptionsResponse.data.success) setSubscriptions(subscriptionsResponse.data.data || []);
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not load your public dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPublicUser) fetchDashboard();
  }, [isPublicUser]);

  const stats = useMemo(() => {
    const totals = dashboard?.totals || {};
    const pendingCount = (totals.unpaidCount || 0) + (totals.partialCount || 0);
    return [
      { label: 'Total Challans', value: totals.totalChallans ?? 0, tone: 'neutral' },
      { label: 'Pending', value: pendingCount, tone: pendingCount > 0 ? 'danger' : 'good' },
      { label: 'Paid', value: totals.paidCount ?? 0, tone: 'good' },
      { label: 'Payable', value: formatCurrency(totals.remainingAmount), tone: pendingCount > 0 ? 'payable' : 'good' },
    ];
  }, [dashboard]);

  const pendingChallans = (dashboard?.challans || []).filter((challan) => !isSettledPayment(challan.paymentStatus));
  const subscribedAreaNames = subscriptions.map((sub) => String(sub.areaName || '').toLowerCase());
  const subscribedAlerts = situations.filter((alert) =>
    subscribedAreaNames.some((area) => String(alert.locationName || '').toLowerCase().includes(area))
  );
  const priorityAlerts = [...situations]
    .sort((a, b) => getLevelRank(b.trafficLevel) - getLevelRank(a.trafficLevel))
    .slice(0, 6);
  const vehicleLabel = dashboard?.vehicle?.registrationNumber || user?.vehicleNumber || '-';
  const citizenName = [dashboard?.user?.firstName || user?.firstName, dashboard?.user?.lastName || user?.lastName]
    .filter(Boolean)
    .join(' ') || user?.username || 'Citizen';
  const paymentChartData = useMemo(() => {
    const totals = dashboard?.totals || {};
    return [
      { name: 'Paid', value: Number(totals.paidCount || 0) },
      { name: 'Unpaid', value: Number(totals.unpaidCount || 0) },
      { name: 'Partial', value: Number(totals.partialCount || 0) },
    ];
  }, [dashboard]);
  const challanTrendData = useMemo(() => {
    const grouped = (dashboard?.challans || []).reduce((acc, challan) => {
      const label = new Date(challan.issueDateTime || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      acc[label] = acc[label] || { date: label, count: 0, amount: 0 };
      acc[label].count += 1;
      acc[label].amount += Number(challan.fineAmount || 0);
      return acc;
    }, {});
    const values = Object.values(grouped).slice(-7);
    return values.length ? values : [{ date: 'No data', count: 0, amount: 0 }];
  }, [dashboard]);
  const appealChartData = useMemo(() => {
    const grouped = appeals.reduce((acc, appeal) => {
      const status = appeal.status || 'Pending Review';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const values = Object.entries(grouped).map(([name, value]) => ({ name, value }));
    return values.length ? values : [{ name: 'No appeals', value: 0 }];
  }, [appeals]);

  const updateRegister = (field, value) => {
    setRegisterForm((current) => ({ ...current, [field]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setPaymentSuccess('');
    setLoading(true);
    await login(loginForm.username.trim(), loginForm.password);
    setLoading(false);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setPaymentSuccess('');
    setLoading(true);
    const result = await registerPublic({
      ...registerForm,
      username: registerForm.username.trim(),
      email: registerForm.email.trim(),
      nicNumber: registerForm.nicNumber.trim(),
      vehicleNumber: registerForm.vehicleNumber.toUpperCase().replace(/\s+/g, ''),
    });
    setLoading(false);

    if (result.success) setMode('dashboard');
  };

  const payChallans = async () => {
    if (!dashboard?.vehicle?.registrationNumber) return;

    setPaymentLoading(true);
    setPaymentSuccess('');
    setPageError('');
    try {
      const response = await api.post(`/public/vehicle/${dashboard.vehicle.registrationNumber}/payment`, {
        paymentMethod: 'Public Portal',
      });

      await fetchDashboard();
      setPaymentSuccess(`Payment saved. Transaction ${response.data?.data?.transactionId || 'completed'}.`);
    } catch (error) {
      setPageError('Payment could not be saved. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const explainCitizenChallan = async (challan) => {
    setAiLoadingId(challan.challanId || challan.challanNumber);
    setAiExplanation('');
    try {
      const response = await api.post('/chatbot/ask', {
        message: `Explain this registered citizen challan in simple words. Include violation meaning, fine amount, payment status, what to do next, and appeal guidance. Challan data: ${JSON.stringify(challan)}`,
        history: [],
        context: {
          path: '/public/account',
          role: 'Public',
          vehicleNumber: dashboard?.vehicle?.registrationNumber,
        },
      });
      setAiExplanation(response.data?.data?.reply || 'No explanation was generated.');
    } catch (err) {
      setAiExplanation(err.response?.data?.message || 'The AI helper could not respond right now. You can still view the challan details, pay, or submit an appeal.');
    } finally {
      setAiLoadingId('');
    }
  };

  const startAppeal = (challan) => {
    setFeatureMessage('');
    setAppealForm({
      challanNumber: challan.challanNumber || '',
      challanId: challan.challanId || '',
      reason: '',
      evidenceFileName: '',
      evidenceDataUrl: '',
    });
    window.setTimeout(() => {
      document.getElementById('citizen-appeal-center')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const submitAppeal = async (event) => {
    event.preventDefault();
    setAppealLoading(true);
    setFeatureMessage('');
    try {
      const response = await api.post('/public/appeals', {
        ...appealForm,
        vehicleRegistrationNumber: dashboard?.vehicle?.registrationNumber,
      });
      if (response.data.success) {
        setFeatureMessage('Appeal submitted. It is now pending officer review.');
        setAppealForm({ challanNumber: '', challanId: '', reason: '', evidenceFileName: '', evidenceDataUrl: '' });
        const appealsResponse = await api.get('/public/appeals');
        setAppeals(appealsResponse.data?.data || []);
      }
    } catch (error) {
      setFeatureMessage(error.response?.data?.message || 'Appeal could not be submitted.');
    } finally {
      setAppealLoading(false);
    }
  };

  const handleAppealEvidence = (file) => {
    if (!file) {
      setAppealForm((current) => ({ ...current, evidenceFileName: '', evidenceDataUrl: '' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAppealForm((current) => ({
        ...current,
        evidenceFileName: file.name,
        evidenceDataUrl: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const saveSubscription = async (areaName = subscriptionArea) => {
    const cleanArea = String(areaName || '').trim();
    if (!cleanArea) return;
    setSubscriptionLoading(true);
    setFeatureMessage('');
    try {
      await api.post('/public/subscriptions', { areaName: cleanArea });
      const response = await api.get('/public/subscriptions');
      setSubscriptions(response.data?.data || []);
      setSubscriptionArea('');
      setFeatureMessage(`Traffic alerts enabled for ${cleanArea}.`);
    } catch (error) {
      setFeatureMessage(error.response?.data?.message || 'Subscription could not be saved.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const removeSubscription = async (subscriptionId) => {
    setSubscriptionLoading(true);
    setFeatureMessage('');
    try {
      await api.delete(`/public/subscriptions/${subscriptionId}`);
      setSubscriptions((current) => current.filter((sub) => sub.subscriptionId !== subscriptionId));
    } catch (error) {
      setFeatureMessage(error.response?.data?.message || 'Subscription could not be removed.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const submitProfileUpdate = async (event) => {
    event.preventDefault();
    setProfileLoading(true);
    setFeatureMessage('');
    try {
      await api.put('/public/me', profileForm);
      setFeatureMessage('Citizen profile updated successfully.');
      setProfileForm((current) => ({ ...current, password: '' }));
      await fetchDashboard();
    } catch (error) {
      setFeatureMessage(error.response?.data?.message || 'Profile could not be updated.');
    } finally {
      setProfileLoading(false);
    }
  };

  if (isPublicUser) {
    return (
      <div className="citizen-page">
        <section className="citizen-topbar">
          <div>
            <span className="citizen-kicker">Registered Citizen Portal</span>
            <h1>{citizenName}</h1>
            <p>NIC {dashboard?.user?.nicNumber || user?.nicNumber || '-'} · Vehicle {vehicleLabel}</p>
          </div>
          <div className="citizen-actions">
            <Link to="/public/traffic-info" className="citizen-btn citizen-btn-light">Traffic Info</Link>
            <Link to="/public/challan-tracker" className="citizen-btn citizen-btn-light">Public Tracker</Link>
            <button type="button" onClick={logout} className="citizen-btn citizen-btn-dark">Logout</button>
          </div>
        </section>

        {pageError && <div className="citizen-alert citizen-alert-error">{pageError}</div>}
        {paymentSuccess && <div className="citizen-alert citizen-alert-success">{paymentSuccess}</div>}
        {featureMessage && <div className="citizen-alert citizen-alert-success">{featureMessage}</div>}

        {loading && !dashboard ? (
          <div className="citizen-loading">Loading your dashboard...</div>
        ) : (
          <>
            <section className="citizen-stat-grid">
              {stats.map((stat) => (
                <article key={stat.label} className={`citizen-stat-card ${stat.tone}`}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </section>

            <section className="citizen-command-deck">
              <div className="citizen-command-core">
                <span>Citizen Ops</span>
                <strong>{vehicleLabel}</strong>
              </div>
              <article>
                <span>Appeals</span>
                <strong>{appeals.filter((appeal) => appeal.status === 'Pending Review').length}</strong>
                <small>pending review</small>
              </article>
              <article>
                <span>Watchlist</span>
                <strong>{subscriptions.length}</strong>
                <small>saved areas</small>
              </article>
              <article>
                <span>Road Match</span>
                <strong>{subscribedAlerts.length}</strong>
                <small>live alerts</small>
              </article>
            </section>

            <CityPulseCommand
              situations={situations}
              dashboard={dashboard}
              selectedLocation={selectedLocation}
              onSelectAlert={setSelectedLocation}
            />

            <section className="citizen-analytics-grid">
              <article className="citizen-panel citizen-chart-panel">
                <div className="citizen-panel-heading">
                  <div>
                    <h2>Payment Status</h2>
                    <p>Paid, unpaid, and partial challans for your vehicle.</p>
                  </div>
                </div>
                <div className="citizen-chart-box">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={paymentChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={88} paddingAngle={4}>
                        {paymentChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="citizen-panel citizen-chart-panel">
                <div className="citizen-panel-heading">
                  <div>
                    <h2>Challan History</h2>
                    <p>Recent challan count and fine amount trend.</p>
                  </div>
                </div>
                <div className="citizen-chart-box">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={challanTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5d0c4" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 800 }} />
                      <YAxis />
                      <Tooltip formatter={(value, name) => (name === 'amount' ? formatCurrency(value) : value)} />
                      <Line type="monotone" dataKey="count" stroke="#09090B" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="amount" stroke="#FF851B" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="citizen-panel citizen-chart-panel">
                <div className="citizen-panel-heading">
                  <div>
                    <h2>Appeal Status</h2>
                    <p>Review outcomes and pending appeal load.</p>
                  </div>
                </div>
                <div className="citizen-chart-box">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={appealChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d5d0c4" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#D2E823" stroke="#09090B" strokeWidth={2} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>

            <section className="citizen-main-grid">
              <div className="citizen-panel citizen-map-panel">
                <div className="citizen-panel-heading">
                  <div>
                    <h2>Map And Road Situation</h2>
                    <p>Challan locations use numbered markers. Traffic alerts use colored alert markers.</p>
                  </div>
                  <button type="button" onClick={fetchDashboard} disabled={loading} className="citizen-icon-btn">
                    Refresh
                  </button>
                </div>
                {selectedLocation && (
                  <div className="citizen-selected-location">
                    Showing {selectedLocation.locationName} ({selectedLocation.trafficLevel})
                  </div>
                )}
                <TrafficAndChallanMap
                  situations={situations}
                  challans={dashboard?.challans || []}
                  selectedLocation={selectedLocation}
                />
              </div>

              <aside className="citizen-panel citizen-payment-panel">
                <h2>Payment</h2>
                <p className="citizen-muted">
                  {pendingChallans.length > 0
                    ? `${pendingChallans.length} pending challan${pendingChallans.length === 1 ? '' : 's'} for ${vehicleLabel}.`
                    : `No pending payment for ${vehicleLabel}.`}
                </p>
                <button
                  type="button"
                  onClick={payChallans}
                  disabled={paymentLoading || pendingChallans.length === 0}
                  className="citizen-pay-btn"
                >
                  {paymentLoading ? 'Processing...' : pendingChallans.length === 0 ? 'All Clear' : `Pay ${formatCurrency(dashboard?.totals?.remainingAmount)}`}
                </button>

                <div className="citizen-mini-list">
                  <h3>Critical Road Situation</h3>
                  {priorityAlerts.length === 0 ? (
                    <p className="citizen-muted">No active road alerts right now.</p>
                  ) : (
                    priorityAlerts.map((alert, index) => {
                      const coords = getMappableCoords(alert);
                      const hasCoords = Boolean(coords);
                      const isSelected = selectedLocation?.locationName === alert.locationName
                        && selectedLocation?.reportedAt === alert.reportedAt;

                      return (
                      <button
                        type="button"
                        key={`${alert.locationName}-${index}`}
                        className={`citizen-road-alert ${isSelected ? 'active' : ''}`}
                        onClick={() => hasCoords && setSelectedLocation(alert)}
                        disabled={!hasCoords}
                        title={hasCoords ? 'Show exact saved coordinates on the map' : 'No exact coordinates saved'}
                      >
                        <span style={{ backgroundColor: LEVEL_COLORS[alert.trafficLevel] || LEVEL_COLORS.Low }} />
                        <div>
                          <strong>{alert.locationName}</strong>
                          <small>
                            {alert.trafficLevel} - {alert.cityName}
                            {coords?.source === 'exact' ? ' - Exact location' : coords?.source === 'known' ? ' - Known map point' : ' - Needs coordinates'}
                          </small>
                        </div>
                      </button>
                    );
                    })
                  )}
                </div>
              </aside>
            </section>

            <section className="citizen-panel citizen-table-panel">
              <div className="citizen-panel-heading">
                <div>
                  <h2>Your Challans</h2>
                  <p>Latest records linked to your registered vehicle.</p>
                </div>
              </div>
              <div className="citizen-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Challan #</th>
                      <th>Date</th>
                      <th>Violation</th>
                      <th>Location</th>
                      <th>Amount</th>
                  <th>Status</th>
                  <th>AI</th>
                  <th>Appeal</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.challans || []).length === 0 ? (
                      <tr><td colSpan="8" className="citizen-empty-cell">No challans found for your vehicle.</td></tr>
                    ) : (
                      dashboard.challans.map((challan) => (
                        <tr key={challan.challanId}>
                          <td>{challan.challanNumber}</td>
                          <td>{new Date(challan.issueDateTime || Date.now()).toLocaleDateString()}</td>
                          <td>{challan.violation?.violationType || '-'}</td>
                          <td>{challan.location?.locationName || '-'}</td>
                          <td>{formatCurrency(challan.fineAmount)}</td>
                          <td>
                            <span className={`citizen-status ${isSettledPayment(challan.paymentStatus) ? 'paid' : 'due'}`}>
                              {challan.paymentStatus || 'Unpaid'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="citizen-ai-explain"
                              onClick={() => explainCitizenChallan(challan)}
                              disabled={aiLoadingId === (challan.challanId || challan.challanNumber)}
                            >
                              {aiLoadingId === (challan.challanId || challan.challanNumber) ? 'Explaining...' : 'Explain'}
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="citizen-ai-explain citizen-appeal-action"
                              onClick={() => startAppeal(challan)}
                            >
                              Appeal
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {aiExplanation && (
                <div className="citizen-ai-answer">
                  <strong>AI Challan Explanation</strong>
                  <p>{aiExplanation}</p>
                </div>
              )}
            </section>

            <section className="citizen-feature-grid">
              <article className="citizen-panel citizen-subscription-panel">
                <div className="citizen-panel-heading">
                  <div>
                    <h2>Area Watchlist</h2>
                    <p>Subscribe to road alerts for the routes you care about.</p>
                  </div>
                </div>
                <div className="citizen-watch-input">
                  <input
                    value={subscriptionArea}
                    onChange={(event) => setSubscriptionArea(event.target.value)}
                    placeholder="Add area, e.g. Saddar"
                  />
                  <button type="button" onClick={() => saveSubscription()} disabled={subscriptionLoading}>
                    Add
                  </button>
                </div>
                <div className="citizen-suggested-areas">
                  {SUGGESTED_ALERT_AREAS.map((area) => (
                    <button key={area} type="button" onClick={() => saveSubscription(area)} disabled={subscriptionLoading}>
                      {area}
                    </button>
                  ))}
                </div>
                <div className="citizen-subscription-list">
                  {subscriptions.length === 0 ? (
                    <p className="citizen-muted">No saved alert areas yet.</p>
                  ) : (
                    subscriptions.map((subscription) => (
                      <span key={subscription.subscriptionId} className="citizen-subscription-chip">
                        {subscription.areaName}
                        <button type="button" onClick={() => removeSubscription(subscription.subscriptionId)} aria-label={`Remove ${subscription.areaName}`}>
                          x
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="citizen-watch-summary">
                  <strong>{subscribedAlerts.length}</strong>
                  <span>matching live alert{subscribedAlerts.length === 1 ? '' : 's'} right now</span>
                </div>
              </article>

              <article id="citizen-appeal-center" className="citizen-panel citizen-appeal-panel">
                <div className="citizen-panel-heading">
                  <div>
                    <h2>Appeal Center</h2>
                    <p>Challenge a challan and track the review status.</p>
                  </div>
                </div>
                <form onSubmit={submitAppeal} className="citizen-appeal-form">
                  <label>
                    Challan Number
                    <input
                      value={appealForm.challanNumber}
                      onChange={(event) => setAppealForm((current) => ({ ...current, challanNumber: event.target.value.toUpperCase() }))}
                      placeholder="Select from table or type challan #"
                    />
                  </label>
                  <label>
                    Reason
                    <textarea
                      value={appealForm.reason}
                      onChange={(event) => setAppealForm((current) => ({ ...current, reason: event.target.value }))}
                      placeholder="Explain why this challan should be reviewed..."
                      rows="4"
                    />
                  </label>
                  <label>
                    Evidence <span className="citizen-optional-label">Optional</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(event) => handleAppealEvidence(event.target.files?.[0])}
                    />
                  </label>
                  <small className="citizen-evidence-help">You can submit the appeal without uploading evidence.</small>
                  {appealForm.evidenceFileName && <small className="citizen-evidence-name">{appealForm.evidenceFileName}</small>}
                  <button type="submit" disabled={appealLoading || !appealForm.reason.trim()}>
                    {appealLoading ? 'Submitting...' : 'Submit Appeal'}
                  </button>
                </form>
                <div className="citizen-appeal-list">
                  {appeals.length === 0 ? (
                    <p className="citizen-muted">No appeals submitted yet.</p>
                  ) : (
                    appeals.slice(0, 5).map((appeal) => (
                      <div key={appeal.appealId} className="citizen-appeal-item">
                        <strong>{appeal.challanNumber || 'General appeal'}</strong>
                        <span>{appeal.status}</span>
                        <small>{new Date(appeal.createdAt || Date.now()).toLocaleString()}</small>
                        <p>{appeal.reason}</p>
                        {appeal.evidenceFileName && (
                          <a href={appeal.evidenceDataUrl} target="_blank" rel="noreferrer">Evidence: {appeal.evidenceFileName}</a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="citizen-panel citizen-profile-settings">
              <div className="citizen-panel-heading">
                <div>
                  <h2>Profile Settings</h2>
                  <p>Update citizen contact details and password for this account.</p>
                </div>
              </div>
              <form onSubmit={submitProfileUpdate} className="citizen-settings-form">
                <label>
                  First Name
                  <input value={profileForm.firstName} onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))} />
                </label>
                <label>
                  Last Name
                  <input value={profileForm.lastName} onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))} />
                </label>
                <label>
                  Email
                  <input type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} />
                </label>
                <label>
                  Phone
                  <input value={profileForm.phoneNumber} onChange={(event) => setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
                </label>
                <label>
                  New Password
                  <input type="password" value={profileForm.password} onChange={(event) => setProfileForm((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to keep current password" />
                </label>
                <button type="submit" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Profile'}</button>
              </form>
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="citizen-page citizen-auth-page">
      <section className="citizen-auth-hero">
        <div>
          <span className="citizen-kicker">Citizen Access</span>
          <h1>Login or register your vehicle</h1>
          <p>
            Create a public account with your NIC and vehicle number for a private challan summary.
            Traffic updates and challan lookup still work without an account.
          </p>
        </div>
        <div className="citizen-auth-links">
          <Link to="/public" className="citizen-btn citizen-btn-light">Public Dashboard</Link>
          <Link to="/public/challan-tracker" className="citizen-btn citizen-btn-light">Check Without Login</Link>
        </div>
      </section>

      <div className="citizen-tabs">
        <button type="button" onClick={() => setMode('login')} className={mode === 'login' ? 'active' : ''}>Login</button>
        <button type="button" onClick={() => setMode('register')} className={mode === 'register' ? 'active' : ''}>Register</button>
      </div>

      {authError && <div className="citizen-alert citizen-alert-error">{authError}</div>}

      {isAuthenticated && user?.role !== 'Public' && (
        <div className="citizen-alert citizen-alert-error">
          This area is for registered public users. Logout from the officer account first.
        </div>
      )}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="citizen-form compact">
          <label>
            Username
            <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
          </label>
          <button type="submit" disabled={loading} className="citizen-submit">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="citizen-form">
          <div className="citizen-form-grid">
            <label>
              First name
              <input value={registerForm.firstName} onChange={(e) => updateRegister('firstName', e.target.value)} />
            </label>
            <label>
              Last name
              <input value={registerForm.lastName} onChange={(e) => updateRegister('lastName', e.target.value)} />
            </label>
            <label>
              Username
              <input value={registerForm.username} onChange={(e) => updateRegister('username', e.target.value)} required minLength="3" />
            </label>
            <label>
              Email
              <input type="email" value={registerForm.email} onChange={(e) => updateRegister('email', e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={registerForm.password} onChange={(e) => updateRegister('password', e.target.value)} required minLength="6" />
            </label>
            <label>
              Phone number
              <input value={registerForm.phoneNumber} onChange={(e) => updateRegister('phoneNumber', e.target.value)} />
            </label>
            <label>
              NIC number
              <input inputMode="numeric" value={registerForm.nicNumber} onChange={(e) => updateRegister('nicNumber', e.target.value)} required minLength="5" />
            </label>
            <label>
              Vehicle number
              <input value={registerForm.vehicleNumber} onChange={(e) => updateRegister('vehicleNumber', e.target.value.toUpperCase())} required />
            </label>
          </div>
          <button type="submit" disabled={loading} className="citizen-submit">
            {loading ? 'Creating account...' : 'Create Citizen Account'}
          </button>
        </form>
      )}
    </div>
  );
}
