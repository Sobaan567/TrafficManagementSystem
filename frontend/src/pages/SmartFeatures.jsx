import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Camera,
  Car,
  ClipboardCheck,
  FileText,
  Map,
  Mic,
  ParkingCircle,
  PieChart,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import AnimatedNumber from '../components/common/AnimatedNumber';
import './SmartFeatures.css';

const emptyForms = {
  incident: { category: 'Accident', priority: 'High', locationName: '', description: '' },
  closure: { roadName: '', reason: '', diversionRoute: '', severity: 'Medium' },
  plate: { registrationHint: '', imageText: '' },
  paymentPlan: { challanId: '', installments: 3 },
  savedRoute: { routeName: '', startArea: '', endArea: '', alertLevel: 'Medium' },
  voice: { transcript: '' },
  demerit: { registrationNumber: '', points: 4, reason: 'Officer demerit adjustment' },
  safetyCourse: { registrationNumber: '', score: 85, courseName: 'Defensive Driving Course' },
  notification: { title: 'Traffic alert', body: 'Drive carefully near current hot zones.', roles: 'Public,Officer' },
  anonymousReport: { locationName: '', category: 'Dangerous Driving', priority: 'High', description: '' },
  licenseReview: '',
  demeritLookup: '',
};

const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

const SmartFeatures = () => {
  const [overview, setOverview] = useState(null);
  const [forms, setForms] = useState(emptyForms);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [plateResult, setPlateResult] = useState(null);
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [demeritProfile, setDemeritProfile] = useState(null);
  const [licenseReview, setLicenseReview] = useState(null);
  const [reductionRequests, setReductionRequests] = useState([]);
  const [featureSuite, setFeatureSuite] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [overviewResponse, reductionResponse, featureResponse] = await Promise.allSettled([
        api.get('/smart/overview'),
        api.get('/smart/demerit-reductions'),
        api.get('/smart/feature-suite'),
      ]);
      if (overviewResponse.status === 'fulfilled') setOverview(overviewResponse.value.data?.data || null);
      if (reductionResponse.status === 'fulfilled') setReductionRequests(reductionResponse.value.data?.data || []);
      if (featureResponse.status === 'fulfilled') setFeatureSuite(featureResponse.value.data?.data || null);
      if (overviewResponse.status === 'rejected') throw overviewResponse.reason;
    } catch (error) {
      setNotice(error.response?.data?.message || 'Smart features are unavailable. Start the backend and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const summaryCards = useMemo(() => {
    const summary = overview?.summary || {};
    return [
      { label: 'Active Incidents', value: summary.activeIncidents ?? 0, icon: AlertTriangle },
      { label: 'High Risk Zones', value: summary.highRiskZones ?? 0, icon: ShieldAlert },
      { label: 'Open Challans', value: summary.openChallans ?? 0, icon: ClipboardCheck },
      { label: 'Demerit Limit', value: summary.demeritLimit ?? 100, icon: Zap },
    ];
  }, [overview]);

  const setField = (formName, field, value) => {
    setForms((current) => ({
      ...current,
      [formName]: { ...current[formName], [field]: value },
    }));
  };

  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    setNotice('');
    try {
      const result = await action();
      setNotice(result?.data?.message || successMessage);
      await loadOverview();
      return result;
    } catch (error) {
      setNotice(error.response?.data?.message || 'Action failed');
      return null;
    } finally {
      setBusy('');
    }
  };

  const submitIncident = () => runAction(
    'incident',
    () => api.post('/smart/incidents', forms.incident),
    'Incident report created and added to smart operations.'
  );

  const submitClosure = () => runAction(
    'closure',
    () => api.post('/smart/closures', forms.closure),
    'Road closure published with diversion details.'
  );

  const submitPaymentPlan = () => runAction(
    'paymentPlan',
    () => api.post('/smart/payment-plans', { ...forms.paymentPlan, challanId: Number(forms.paymentPlan.challanId) }),
    'Payment plan created for challan.'
  );

  const submitSavedRoute = () => runAction(
    'savedRoute',
    () => api.post('/smart/saved-routes', forms.savedRoute),
    'Saved route alert created.'
  );

  const submitPlate = async () => {
    const result = await runAction('plate', () => api.post('/smart/plate-recognition', forms.plate), 'Plate recognition completed.');
    if (result) setPlateResult(result.data?.data || null);
  };

  const submitVoice = async () => {
    const result = await runAction('voice', () => api.post('/smart/voice-challan-drafts', forms.voice), 'Voice challan draft created.');
    if (result) setVoiceDraft(result.data?.data || null);
  };

  const submitDemerit = async (direction = 1) => {
    const result = await runAction(
      direction > 0 ? 'demeritAdd' : 'demeritMinus',
      () => api.post('/smart/demerits', {
        ...forms.demerit,
        points: Math.abs(Number(forms.demerit.points)) * direction,
        reason: direction > 0 ? forms.demerit.reason : `Point reduction: ${forms.demerit.reason}`,
      }),
      direction > 0 ? 'Demerit points added to driver profile.' : 'Demerit points reduced from driver profile.'
    );
    const registration = forms.demerit.registrationNumber.trim();
    if (result && registration) {
      const profile = result.data?.data?.profile || null;
      setForms((current) => ({ ...current, demeritLookup: registration.toUpperCase() }));
      if (profile) {
        setDemeritProfile(profile);
      } else {
        const lookup = await api.get(`/smart/demerits/${encodeURIComponent(registration)}`);
        setDemeritProfile(lookup.data?.data || null);
      }
    }
  };

  const lookupDemerit = async () => {
    if (!forms.demeritLookup.trim()) return;
    const result = await runAction(
      'demeritLookup',
      () => api.get(`/smart/demerits/${encodeURIComponent(forms.demeritLookup.trim())}`),
      'Demerit profile loaded.'
    );
    if (result) setDemeritProfile(result.data?.data || null);
  };

  const reviewLicense = async () => {
    if (!forms.licenseReview.trim()) return;
    const result = await runAction(
      'licenseReview',
      () => api.get(`/smart/license-review/${encodeURIComponent(forms.licenseReview.trim())}`),
      'License review loaded.'
    );
    if (result) setLicenseReview(result.data?.data || null);
  };

  const completeSafetyCourse = async () => {
    const result = await runAction(
      'safetyCourse',
      () => api.post('/smart/safety-courses', {
        ...forms.safetyCourse,
        score: Number(forms.safetyCourse.score),
      }),
      'Safety course recorded.'
    );
    if (result?.data?.data?.profile) {
      setDemeritProfile(result.data.data.profile);
      setForms((current) => ({ ...current, demeritLookup: result.data.data.profile.registrationNumber }));
    }
  };

  const updateReductionRequest = async (request, status) => {
    const result = await runAction(
      `reduction-${request.requestId}-${status}`,
      () => api.put(`/smart/demerit-reductions/${request.requestId}`, {
        status,
        officerNote: status === 'Approved' ? 'Approved after officer review' : 'Reviewed by officer',
      }),
      `Reduction request ${status.toLowerCase()}.`
    );
    if (result?.data?.data?.profile) setDemeritProfile(result.data.data.profile);
  };

  const broadcastNotification = async () => runAction(
    'notification',
    () => api.post('/smart/broadcast-notifications', {
      ...forms.notification,
      roles: forms.notification.roles.split(',').map((role) => role.trim()).filter(Boolean),
    }),
    'Notification queued for SMS, email, and in-app delivery.'
  );

  const submitAnonymousReport = async () => runAction(
    'anonymousReport',
    () => api.post('/smart/anonymous-driving-reports', forms.anonymousReport),
    'Anonymous driving report created and sent for moderation.'
  );

  const generateMonthlyReport = async () => {
    const result = await runAction(
      'monthlyReport',
      () => api.post('/smart/monthly-report'),
      'Monthly smart report generated.'
    );
    if (result?.data?.data) setMonthlyReport(result.data.data);
  };

  const renderFeatureRows = (rows = [], render) => (
    <div className="smart-list feature-suite-list">
      {rows.length === 0 ? <article><p>No live records yet.</p></article> : rows.slice(0, 5).map(render)}
    </div>
  );

  return (
    <div className="smart-features-page">
      <section className="smart-hero">
        <div>
          <span>Real Smart Modules</span>
          <h1>Advanced Traffic Operations</h1>
          <p>Use the AI, analytics, public-service, e-challan, demerit, closure, parking, and deployment tools as working system features.</p>
        </div>
        <button type="button" onClick={loadOverview} disabled={loading}>
          <RefreshCcw size={18} />
          {loading ? 'Syncing' : 'Refresh'}
        </button>
      </section>

      {notice && <div className="smart-notice">{notice}</div>}

      <section className="smart-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label}>
              <Icon size={24} />
              <span>{card.label}</span>
              <strong><AnimatedNumber value={loading ? '...' : card.value} /></strong>
            </article>
          );
        })}
      </section>

      <section className="smart-command-grid">
        <div className="smart-panel smart-wide">
          <div className="smart-panel-title">
            <BarChart3 size={22} />
            <h2>Predictions, Heatmaps, Signals</h2>
          </div>
          <div className="smart-mini-grid">
            {(overview?.congestionPredictions || []).slice(0, 6).map((item) => (
              <article key={item.locationName}>
                <strong>{item.locationName}</strong>
                <span>{item.risk} risk - {item.predictedDelayMinutes} min delay</span>
                <p>{item.recommendation}</p>
              </article>
            ))}
            {!loading && (overview?.congestionPredictions || []).length === 0 && <div className="smart-empty">No prediction data yet.</div>}
          </div>
        </div>

        <div className="smart-panel">
          <div className="smart-panel-title">
            <UserCheck size={22} />
            <h2>Deployment Recommendations</h2>
          </div>
          <div className="smart-list">
            {(overview?.deploymentRecommendations || []).slice(0, 5).map((item) => (
              <article key={item.locationName}>
                <strong>{item.locationName}</strong>
                <span>{item.suggestedUnits} unit(s)</span>
                <p>{item.reason}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="smart-panel">
          <div className="smart-panel-title">
            <Sparkles size={22} />
            <h2>Daily AI Briefing</h2>
          </div>
          <div className="smart-list compact">
            {(overview?.dailyBriefing || []).map((line) => (
              <article key={line}><p>{line}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-suite-section">
        <div className="feature-suite-heading">
          <span>Working Feature Suite</span>
          <h2>All exhibition feature cards are now connected to live tools.</h2>
        </div>

        <div className="feature-suite-grid">
          <article className="smart-panel">
            <div className="smart-panel-title">
              <BarChart3 size={22} />
              <h2>Traffic Ops</h2>
            </div>
            {renderFeatureRows(featureSuite?.trafficOps?.signalTiming || [], (item) => (
              <article key={item.locationName}>
                <strong>{item.locationName}</strong>
                <span>{item.greenSeconds}s green - {item.priority}</span>
                <p>Live congestion prediction and adaptive signal timing.</p>
              </article>
            ))}
            {renderFeatureRows(featureSuite?.trafficOps?.nearestOfficerDispatch || [], (item) => (
              <article key={`${item.locationName}-${item.badgeNumber}`}>
                <strong>{item.officerName}</strong>
                <span>{item.suggestedUnits} unit(s) to {item.locationName}</span>
                <p>{item.reason}</p>
              </article>
            ))}
          </article>

          <article className="smart-panel">
            <div className="smart-panel-title">
              <ClipboardCheck size={22} />
              <h2>E-Challan</h2>
            </div>
            {renderFeatureRows(featureSuite?.eChallan?.repeatOffenders || [], (item) => (
              <article key={item.registrationNumber}>
                <strong>{item.registrationNumber}</strong>
                <span>Risk score {item.score} - {item.challanCount} challans</span>
                <p>{item.ownerName || 'Unknown owner'} - {item.demeritPoints} demerit points.</p>
              </article>
            ))}
            {renderFeatureRows(featureSuite?.eChallan?.receiptHistory || [], (item) => (
              <article key={item.ChallanNumber}>
                <strong>{item.ChallanNumber}</strong>
                <span>{item.RegistrationNumber} - Rs {Number(item.PaidAmount || item.FineAmount || 0).toLocaleString()}</span>
                <p>Receipt history with transaction {item.TransactionID || 'pending sync'}.</p>
              </article>
            ))}
          </article>

          <article className="smart-panel">
            <div className="smart-panel-title">
              <ShieldAlert size={22} />
              <h2>Public Portal</h2>
            </div>
            {renderFeatureRows(featureSuite?.publicPortal?.safetyInsights || [], (item) => (
              <article key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.level}</span>
                <p>{item.advice}</p>
              </article>
            ))}
            <form className="feature-suite-form" onSubmit={(event) => { event.preventDefault(); submitAnonymousReport(); }}>
              <input placeholder="Report location" value={forms.anonymousReport.locationName} onChange={(event) => setField('anonymousReport', 'locationName', event.target.value)} />
              <div className="smart-row">
                <input placeholder="Category" value={forms.anonymousReport.category} onChange={(event) => setField('anonymousReport', 'category', event.target.value)} />
                <select value={forms.anonymousReport.priority} onChange={(event) => setField('anonymousReport', 'priority', event.target.value)}>
                  {priorityOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
              <textarea placeholder="Anonymous driving report details" value={forms.anonymousReport.description} onChange={(event) => setField('anonymousReport', 'description', event.target.value)} />
              <button disabled={busy === 'anonymousReport'}>{busy === 'anonymousReport' ? 'Sending...' : 'Submit Anonymous Report'}</button>
            </form>
          </article>

          <article className="smart-panel">
            <div className="smart-panel-title">
              <PieChart size={22} />
              <h2>Admin Analytics</h2>
            </div>
            {renderFeatureRows(featureSuite?.adminAnalytics?.revenueAnalytics || [], (item) => (
              <article key={item.PaymentStatus}>
                <strong>{item.PaymentStatus || 'Unknown'}</strong>
                <span>{item.Count} cases - Rs {Number(item.PaidAmount || 0).toLocaleString()} collected</span>
                <p>Revenue analytics by payment status.</p>
              </article>
            ))}
            <form className="feature-suite-form" onSubmit={(event) => { event.preventDefault(); broadcastNotification(); }}>
              <input placeholder="Alert title" value={forms.notification.title} onChange={(event) => setField('notification', 'title', event.target.value)} />
              <input placeholder="Roles: Public,Officer,Admin" value={forms.notification.roles} onChange={(event) => setField('notification', 'roles', event.target.value)} />
              <textarea placeholder="SMS/email/in-app message" value={forms.notification.body} onChange={(event) => setField('notification', 'body', event.target.value)} />
              <button disabled={busy === 'notification'}>{busy === 'notification' ? 'Queuing...' : 'Send SMS & Email Alert'}</button>
            </form>
            <button type="button" onClick={generateMonthlyReport} disabled={busy === 'monthlyReport'}>
              {busy === 'monthlyReport' ? 'Generating...' : 'Generate Monthly Auto Report'}
            </button>
            {monthlyReport && <p className="smart-result">{monthlyReport.summary}</p>}
          </article>
        </div>
      </section>

      <section className="smart-tools-grid">
        <form className="smart-tool-card" onSubmit={(event) => { event.preventDefault(); submitIncident(); }}>
          <AlertTriangle size={24} />
          <h3>Citizen Incident Reporting</h3>
          <input placeholder="Location" value={forms.incident.locationName} onChange={(event) => setField('incident', 'locationName', event.target.value)} />
          <div className="smart-row">
            <input placeholder="Category" value={forms.incident.category} onChange={(event) => setField('incident', 'category', event.target.value)} />
            <select value={forms.incident.priority} onChange={(event) => setField('incident', 'priority', event.target.value)}>
              {priorityOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <textarea placeholder="Description" value={forms.incident.description} onChange={(event) => setField('incident', 'description', event.target.value)} />
          <button disabled={busy === 'incident'}>{busy === 'incident' ? 'Saving...' : 'Create Incident'}</button>
        </form>

        <form className="smart-tool-card" onSubmit={(event) => { event.preventDefault(); submitClosure(); }}>
          <Map size={24} />
          <h3>Road Closure & Diversion</h3>
          <input placeholder="Road name" value={forms.closure.roadName} onChange={(event) => setField('closure', 'roadName', event.target.value)} />
          <input placeholder="Reason" value={forms.closure.reason} onChange={(event) => setField('closure', 'reason', event.target.value)} />
          <input placeholder="Diversion route" value={forms.closure.diversionRoute} onChange={(event) => setField('closure', 'diversionRoute', event.target.value)} />
          <select value={forms.closure.severity} onChange={(event) => setField('closure', 'severity', event.target.value)}>
            {priorityOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button disabled={busy === 'closure'}>{busy === 'closure' ? 'Publishing...' : 'Publish Closure'}</button>
        </form>

        <form className="smart-tool-card" onSubmit={(event) => { event.preventDefault(); submitPlate(); }}>
          <Camera size={24} />
          <h3>License Plate Recognition</h3>
          <input placeholder="Registration hint, e.g. ABC-1234" value={forms.plate.registrationHint} onChange={(event) => setField('plate', 'registrationHint', event.target.value)} />
          <textarea placeholder="OCR text or file name" value={forms.plate.imageText} onChange={(event) => setField('plate', 'imageText', event.target.value)} />
          <button disabled={busy === 'plate'}>{busy === 'plate' ? 'Scanning...' : 'Recognize Plate'}</button>
          {plateResult && <p className="smart-result">Plate: {plateResult.registrationNumber} ({Math.round(plateResult.confidence * 100)}%)</p>}
        </form>

        <form className="smart-tool-card" onSubmit={(event) => { event.preventDefault(); submitVoice(); }}>
          <Mic size={24} />
          <h3>Voice Challan Draft</h3>
          <textarea placeholder="Example: Issue speeding challan to ABC-1234 near Shahrah-e-Faisal" value={forms.voice.transcript} onChange={(event) => setField('voice', 'transcript', event.target.value)} />
          <button disabled={busy === 'voice'}>{busy === 'voice' ? 'Drafting...' : 'Create Draft'}</button>
          {voiceDraft && <p className="smart-result">{voiceDraft.VehicleRegistrationNumber || 'No plate'} - {voiceDraft.ViolationType} - Rs {voiceDraft.FineAmount}</p>}
        </form>

        <form className="smart-tool-card" onSubmit={(event) => { event.preventDefault(); submitPaymentPlan(); }}>
          <FileText size={24} />
          <h3>Installment Payment Plan</h3>
          <input type="number" placeholder="Challan ID" value={forms.paymentPlan.challanId} onChange={(event) => setField('paymentPlan', 'challanId', event.target.value)} />
          <input type="number" min="2" max="12" value={forms.paymentPlan.installments} onChange={(event) => setField('paymentPlan', 'installments', event.target.value)} />
          <button disabled={busy === 'paymentPlan'}>{busy === 'paymentPlan' ? 'Creating...' : 'Create Plan'}</button>
        </form>

        <form className="smart-tool-card" onSubmit={(event) => { event.preventDefault(); submitSavedRoute(); }}>
          <Bell size={24} />
          <h3>Saved Route Alerts</h3>
          <input placeholder="Route name" value={forms.savedRoute.routeName} onChange={(event) => setField('savedRoute', 'routeName', event.target.value)} />
          <div className="smart-row">
            <input placeholder="Start area" value={forms.savedRoute.startArea} onChange={(event) => setField('savedRoute', 'startArea', event.target.value)} />
            <input placeholder="End area" value={forms.savedRoute.endArea} onChange={(event) => setField('savedRoute', 'endArea', event.target.value)} />
          </div>
          <select value={forms.savedRoute.alertLevel} onChange={(event) => setField('savedRoute', 'alertLevel', event.target.value)}>
            {priorityOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <button disabled={busy === 'savedRoute'}>{busy === 'savedRoute' ? 'Saving...' : 'Save Route'}</button>
        </form>
      </section>

      <section className="smart-command-grid">
        <div className="smart-panel">
          <div className="smart-panel-title">
            <ParkingCircle size={22} />
            <h2>Parking Availability</h2>
          </div>
          <div className="smart-list">
            {(overview?.parkingZones || []).map((zone) => (
              <article key={zone.ParkingZoneID}>
                <strong>{zone.ZoneName}</strong>
                <span>{zone.AreaName} - {zone.AvailableSpaces}/{zone.TotalSpaces} free</span>
              </article>
            ))}
          </div>
        </div>

        <div className="smart-panel">
          <div className="smart-panel-title">
            <Car size={22} />
            <h2>Active Road Closures</h2>
          </div>
          <div className="smart-list">
            {(overview?.closures || []).slice(0, 6).map((closure) => (
              <article key={closure.ClosureID}>
                <strong>{closure.RoadName}</strong>
                <span>{closure.Severity} - {closure.Reason}</span>
                <p>{closure.DiversionRoute || 'Diversion route pending.'}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="demerit-workspace">
        <div className="demerit-workspace-copy">
          <span>Demerit Engine</span>
          <h2>100 points cancels the license.</h2>
          <p>New challans now write demerit points automatically. Officers can also add adjustments and inspect a driver profile by registration number.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); submitDemerit(1); }}>
          <Zap size={24} />
          <h3>Adjust Demerit Points</h3>
          <input placeholder="Registration number" value={forms.demerit.registrationNumber} onChange={(event) => setField('demerit', 'registrationNumber', event.target.value)} />
          <input type="number" min="1" max="100" value={forms.demerit.points} onChange={(event) => setField('demerit', 'points', event.target.value)} />
          <input placeholder="Reason" value={forms.demerit.reason} onChange={(event) => setField('demerit', 'reason', event.target.value)} />
          <div className="demerit-action-buttons">
            <button type="submit" disabled={busy === 'demeritAdd'}>{busy === 'demeritAdd' ? 'Adding...' : 'Add Points'}</button>
            <button type="button" className="minus" onClick={() => submitDemerit(-1)} disabled={busy === 'demeritMinus'}>
              {busy === 'demeritMinus' ? 'Reducing...' : 'Minus Points'}
            </button>
          </div>
          <small className="demerit-form-hint">Example: speeding adds 4 points. Use minus only for approved corrections.</small>
        </form>
        <div className="demerit-lookup">
          <h3>Demerit Lookup</h3>
          <div className="smart-row">
            <input placeholder="Registration number" value={forms.demeritLookup} onChange={(event) => setForms((current) => ({ ...current, demeritLookup: event.target.value }))} />
            <button type="button" onClick={lookupDemerit} disabled={busy === 'demeritLookup'}>Lookup</button>
          </div>
          {demeritProfile && (
            <div className={`demerit-profile ${demeritProfile.licenseCancelled ? 'cancelled' : ''}`}>
              <strong>{demeritProfile.registrationNumber}</strong>
              <span>{demeritProfile.totalPoints}/{demeritProfile.limit} points</span>
              <p>{demeritProfile.status} - {demeritProfile.remainingUntilCancellation} points remaining</p>
              {demeritProfile.ledger?.slice(0, 3).map((entry) => (
                <small key={entry.DemeritID}>
                  {entry.Points > 0 ? '+' : ''}{entry.Points} - {entry.Reason}
                </small>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="smart-command-grid smart-final-tools">
        <div className="smart-panel">
          <div className="smart-panel-title">
            <ShieldAlert size={22} />
            <h2>License Cancellation Review</h2>
          </div>
          <div className="smart-row">
            <input
              placeholder="Registration number"
              value={forms.licenseReview}
              onChange={(event) => setForms((current) => ({ ...current, licenseReview: event.target.value }))}
            />
            <button type="button" onClick={reviewLicense} disabled={busy === 'licenseReview'}>Review</button>
          </div>
          {licenseReview && (
            <div className={`demerit-profile ${licenseReview.licenseCancelled ? 'cancelled' : ''}`}>
              <strong>{licenseReview.registrationNumber}</strong>
              <span>{licenseReview.totalPoints}/{licenseReview.limit} points</span>
              <p>{licenseReview.licenseAction?.label}: {licenseReview.licenseAction?.requiredAction}</p>
            </div>
          )}
        </div>

        <form className="smart-panel" onSubmit={(event) => { event.preventDefault(); completeSafetyCourse(); }}>
          <div className="smart-panel-title">
            <ClipboardCheck size={22} />
            <h2>Driver Safety Course</h2>
          </div>
          <input placeholder="Registration number" value={forms.safetyCourse.registrationNumber} onChange={(event) => setField('safetyCourse', 'registrationNumber', event.target.value)} />
          <input placeholder="Course name" value={forms.safetyCourse.courseName} onChange={(event) => setField('safetyCourse', 'courseName', event.target.value)} />
          <input type="number" min="0" max="100" value={forms.safetyCourse.score} onChange={(event) => setField('safetyCourse', 'score', event.target.value)} />
          <button disabled={busy === 'safetyCourse'}>{busy === 'safetyCourse' ? 'Recording...' : 'Complete Course'}</button>
          <p className="smart-result">Score 70+ reduces up to 10 existing points.</p>
        </form>

        <div className="smart-panel smart-wide">
          <div className="smart-panel-title">
            <FileText size={22} />
            <h2>Demerit Reduction Requests</h2>
          </div>
          <div className="smart-list reduction-list">
            {reductionRequests.length === 0 ? <article><p>No reduction requests yet.</p></article> : reductionRequests.slice(0, 8).map((request) => (
              <article key={request.requestId}>
                <strong>{request.registrationNumber} - {request.requestedPoints} pts</strong>
                <span>{request.status} {request.citizenName ? `- ${request.citizenName}` : ''}</span>
                <p>{request.reason}</p>
                <div className="reduction-actions">
                  <button type="button" onClick={() => updateReductionRequest(request, 'Approved')} disabled={request.status === 'Approved' || busy.startsWith(`reduction-${request.requestId}`)}>Approve</button>
                  <button type="button" className="minus" onClick={() => updateReductionRequest(request, 'Rejected')} disabled={request.status === 'Rejected' || busy.startsWith(`reduction-${request.requestId}`)}>Reject</button>
                  <button type="button" onClick={() => updateReductionRequest(request, 'Need More Info')} disabled={busy.startsWith(`reduction-${request.requestId}`)}>More Info</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SmartFeatures;
