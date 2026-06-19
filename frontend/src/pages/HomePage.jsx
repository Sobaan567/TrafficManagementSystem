import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Camera,
  Car,
  ClipboardCheck,
  CreditCard,
  FileText,
  Map,
  MessageSquare,
  Mic,
  Network,
  PieChart,
  Shield,
  Sparkles,
  Smartphone,
  UserCheck,
  UsersRound,
  Zap,
} from 'lucide-react';
import GlitchText from '../components/common/GlitchText';
import ScrollNetworkAnimation from '../components/common/ScrollNetworkAnimation';
import AnimatedNumber from '../components/common/AnimatedNumber';
import LightBeamButton from '../components/common/LightBeamButton';
import MagicBento from '../components/common/MagicBento';
import './HomePage.css';

const HomePage = () => {
  const opsSignals = [
    { label: 'City Nodes', value: '42', detail: 'Synced checkpoints' },
    { label: 'AI Watch', value: 'Live', detail: 'Violation pattern scan' },
    { label: 'Response ETA', value: '04m', detail: 'Fastest unit dispatch' },
    { label: 'Public Link', value: '24/7', detail: 'Citizen portal online' },
  ];

  const missionLanes = [
    { step: '01', title: 'Detect', copy: 'Officer reports, public road signals, and challan events are pulled into one live layer.' },
    { step: '02', title: 'Decide', copy: 'AI summaries, severity scoring, and appeal queues push the most urgent work forward.' },
    { step: '03', title: 'Resolve', copy: 'Payments, waived challans, and traffic updates close the loop for citizens and officers.' },
  ];

  const showcasePanels = [
    { title: 'Officer Console', value: 'AI Autofill', copy: 'Create challans faster with guided violation forms and smart explanations.' },
    { title: 'Citizen Portal', value: 'Self Serve', copy: 'Lookup challans, pay, appeal, subscribe to road alerts, and manage profiles.' },
    { title: 'Admin Control', value: 'Full Audit', copy: 'Manage users, reports, dashboards, histories, and city-wide traffic records.' },
  ];

  const featureCards = [
    { title: 'Dashboard', copy: 'Comprehensive overview of traffic violations, challans, appeals, and public road reports.' },
    { title: 'Public Dashboard', copy: 'Citizen-facing traffic status, challan lookup, alerts, and service shortcuts.', accent: true },
    { title: 'Real-Time Mapping', copy: 'Google Maps integration for accurate traffic location tracking and marker views.' },
    { title: '3D Visualization', copy: 'Three.js city visualization with live traffic events and officer command visuals.' },
    { title: 'E-Challan System', copy: 'Digital fine issuance, status tracking, payment processing, and print-ready challans.' },
    { title: 'Analytics', copy: 'Detailed charts and statistics for paid, unpaid, appealed, and resolved records.' },
    { title: 'Mobile Responsive', copy: 'Production-ready layouts for laptop, tablet, and iPhone viewing.' },
    { title: 'Gemini Assistant', copy: 'AI chatbot support for challans, traffic alerts, payments, and workflow guidance.' },
  ];

  const advancedFeatureGroups = [
    {
      title: 'Traffic Ops',
      icon: Activity,
      items: [
        { icon: BarChart3, title: 'Live congestion prediction', copy: 'Forecasts traffic pressure from current flow, historical records, time of day, and active incidents.' },
        { icon: Camera, title: 'Citizen incident reporting', copy: 'Citizens can submit road incidents with photo evidence, exact location, category, and status tracking.' },
        { icon: Zap, title: 'Smart signal timing', copy: 'Recommends adaptive signal timings for crowded intersections and event-heavy zones.' },
        { icon: UserCheck, title: 'Nearest officer dispatch', copy: 'Assigns the closest available officer or unit using live location and incident severity.' },
        { icon: Map, title: 'Road closure manager', copy: 'Creates closures, diversions, public notices, and dashboard warnings from one command panel.' },
        { icon: Car, title: 'Emergency priority routing', copy: 'Highlights priority paths for emergency movement with alert overlays for nearby control teams.' },
      ],
    },
    {
      title: 'E-Challan',
      icon: ClipboardCheck,
      items: [
        { icon: Camera, title: 'License plate recognition', copy: 'Reads number plates from uploaded images to speed up challan creation and evidence review.' },
        { icon: AlertTriangle, title: 'Repeat offender scoring', copy: 'Flags drivers with frequent violations and escalates records for stricter review.' },
        { icon: CreditCard, title: 'Payment plans', copy: 'Supports installment schedules, due dates, overdue status, and payment reminders.' },
        { icon: FileText, title: 'QR challan PDF', copy: 'Generates printable challan PDFs with QR verification and receipt-ready formatting.' },
        { icon: Bell, title: 'SMS and email alerts', copy: 'Sends challan notices, reminders, payment confirmations, and appeal updates automatically.' },
        { icon: Shield, title: 'Appeal evidence upload', copy: 'Lets users upload appeal evidence and follow a review timeline from submitted to resolved.' },
      ],
    },
    {
      title: 'Public Portal',
      icon: Smartphone,
      items: [
        { icon: Bell, title: 'Saved route alerts', copy: 'Citizens receive personalized alerts for favorite routes, closures, congestion, and incidents.' },
        { icon: CreditCard, title: 'Receipt history', copy: 'Keeps paid challans, receipts, appeal decisions, and account records in one profile.' },
        { icon: MessageSquare, title: 'Complaint tracking', copy: 'Turns public complaints into trackable tickets with categories, status, and resolution notes.' },
        { icon: Car, title: 'Parking availability', copy: 'Shows nearby parking zones, availability signals, and access guidance for busy areas.' },
        { icon: Shield, title: 'Safety insights', copy: 'Displays safety tips based on local violation hotspots and recent traffic patterns.' },
        { icon: AlertTriangle, title: 'Anonymous driving reports', copy: 'Allows anonymous reports for dangerous driving with moderation and duplicate detection.' },
      ],
    },
    {
      title: 'Admin Analytics',
      icon: PieChart,
      items: [
        { icon: Map, title: 'Violation heatmaps', copy: 'Maps violation density by area, time, category, payment status, and officer activity.' },
        { icon: BarChart3, title: 'Revenue analytics', copy: 'Tracks paid, unpaid, overdue, appealed, and waived challan revenue by violation type.' },
        { icon: UserCheck, title: 'Officer performance', copy: 'Shows issued challans, response time, resolution rate, and workload distribution.' },
        { icon: ClipboardCheck, title: 'Appeal trends', copy: 'Reports approval and rejection trends with reasons, timelines, and reviewer activity.' },
        { icon: AlertTriangle, title: 'Accident-prone zones', copy: 'Detects risky areas by combining incidents, violations, congestion, and repeat complaints.' },
        { icon: FileText, title: 'Monthly auto reports', copy: 'Creates scheduled PDF summaries for leadership, finance, operations, and public service review.' },
      ],
    },
    {
      title: 'AI / Wow Features',
      icon: Sparkles,
      items: [
        { icon: MessageSquare, title: 'AI traffic assistant', copy: 'Answers public questions about challans, traffic, appeals, payments, and road status.' },
        { icon: FileText, title: 'Daily command briefing', copy: 'Summarizes key incidents, hot zones, revenue, appeals, and recommended actions each day.' },
        { icon: Shield, title: 'Predictive risk zones', copy: 'Identifies areas likely to see accidents or violations before they spike.' },
        { icon: Mic, title: 'Voice challan creation', copy: 'Lets officers dictate violation details and convert them into structured challan fields.' },
        { icon: Network, title: 'Digital twin city map', copy: 'Combines live overlays, 3D city visuals, traffic pressure, and active response status.' },
        { icon: UsersRound, title: 'Deployment recommendations', copy: 'Suggests where to deploy officers today based on predictions, history, and live events.' },
      ],
    },
  ];

  const demeritMilestones = [
    { points: '0-29', status: 'Clear', copy: 'Normal license status with warning history visible.' },
    { points: '30-59', status: 'Watch', copy: 'Driver receives stronger warnings and safety guidance.' },
    { points: '60-89', status: 'Probation', copy: 'License is flagged for close monitoring and review.' },
    { points: '90-99', status: 'Final warning', copy: 'Urgent notice before automatic cancellation threshold.' },
    { points: '100', status: 'License cancelled', copy: 'At 100 demerit points, the license is cancelled.' },
  ];

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <span className="hero-kicker">Smart City Operations</span>
            <h1><GlitchText text="TRAFFIC CONTROL" /></h1>
            <h2>Management System</h2>
            <p className="hero-subtitle">
              Advanced real-time traffic monitoring, e-challan generation, public services, AI assistance, and command dashboards.
            </p>

            <div className="hero-features">
              <div className="feature-item">
                <span className="feature-icon">MAP</span>
                <span>Real-Time GPS Mapping</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">AI</span>
                <span>Live Traffic Analytics</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">OPS</span>
                <span>Violation Detection</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">PAY</span>
                <span>E-Challan & Payment</span>
              </div>
            </div>

            <div className="hero-actions">
              <Link to="/public">
                <LightBeamButton className="beam-wide">
                  Public Dashboard
                </LightBeamButton>
              </Link>
              <Link to="/login">
                <LightBeamButton className="beam-wide beam-accent" gradientColors={['#F8F4E8', '#D2E823', '#F8F4E8']}>
                  Officer Login
                </LightBeamButton>
              </Link>
              <Link to="#features">
                <LightBeamButton className="beam-wide">
                  Learn More
                </LightBeamButton>
              </Link>
            </div>
          </div>

          <div className="hero-image">
            <div className="ops-city-board">
              <div className="city-board-grid" />
              <div className="city-board-glow" />
              <div className="city-scan-line" />

              <div className="city-skyline" aria-hidden="true">
                <span className="tower tower-a" />
                <span className="tower tower-b" />
                <span className="tower tower-c" />
                <span className="tower tower-d" />
                <span className="tower tower-e" />
              </div>

              <div className="city-route route-main">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="city-route route-cross">
                <i />
                <i />
                <i />
              </div>
              <div className="city-route route-diagonal">
                <i />
                <i />
                <i />
              </div>

              <div className="city-command-core">
                <span>CONTROL</span>
                <strong>KHI</strong>
                <small>LIVE MOVEMENT</small>
              </div>

              <div className="city-node node-a"><span />A1</div>
              <div className="city-node node-b"><span />C7</div>
              <div className="city-node node-c"><span />P3</div>
              <div className="city-node node-d"><span />AI</div>

              <div className="city-stat city-stat-a">
                <span>Signals</span>
                <strong><AnimatedNumber value="128" /></strong>
              </div>
              <div className="city-stat city-stat-b">
                <span>Flow</span>
                <strong>Clear</strong>
              </div>
              <div className="city-stat city-stat-c">
                <span>Risk</span>
                <strong>Low</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ops-command-strip">
        {opsSignals.map((signal) => (
          <article key={signal.label}>
            <span>{signal.label}</span>
            <strong><AnimatedNumber value={signal.value} /></strong>
            <small>{signal.detail}</small>
          </article>
        ))}
      </section>

      <section className="showcase-section">
        {showcasePanels.map((panel) => (
          <article key={panel.title}>
            <span>{panel.title}</span>
            <strong>{panel.value}</strong>
            <p>{panel.copy}</p>
          </article>
        ))}
      </section>

      <ScrollNetworkAnimation />

      <section className="advanced-suite-section">
        <div className="section-heading advanced-suite-heading">
          <span>Advanced Feature Suite</span>
          <h2>Everything needed for a smarter traffic command system.</h2>
        </div>

        <div className="advanced-suite-grid">
          {advancedFeatureGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <article className="advanced-suite-panel" key={group.title}>
                <div className="advanced-suite-title">
                  <GroupIcon size={25} strokeWidth={2.6} />
                  <h3>{group.title}</h3>
                </div>
                <div className="advanced-feature-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div className="advanced-feature-item" key={item.title}>
                        <Icon size={20} strokeWidth={2.5} />
                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.copy}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="demerit-section">
        <div className="demerit-card">
          <div className="demerit-copy">
            <span>Demerit Points Engine</span>
            <h2>License status is tracked up to a 100-point cancellation limit.</h2>
            <p>Every violation can add demerit points to the driver profile. The system escalates warnings automatically, and once the total reaches 100 points, the license is marked cancelled.</p>
          </div>
          <div className="demerit-meter" aria-label="Demerit points maximum is 100">
            <div className="demerit-meter-top">
              <span>Current Limit</span>
              <strong>100</strong>
            </div>
            <div className="demerit-track">
              <i style={{ width: '100%' }} />
            </div>
            <small>Maximum demerit points before license cancellation</small>
          </div>
        </div>

        <div className="demerit-milestones">
          {demeritMilestones.map((milestone) => (
            <article key={milestone.status}>
              <strong>{milestone.points}</strong>
              <h3>{milestone.status}</h3>
              <p>{milestone.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mission-control-section">
        <div className="mission-copy">
          <span>Command Flow</span>
          <h2>One system, every road decision.</h2>
          <p>From citizen lookup to officer action, every dashboard feels like a live operations console.</p>
        </div>
        <div className="mission-lanes">
          {missionLanes.map((lane) => (
            <article key={lane.step}>
              <strong>{lane.step}</strong>
              <div>
                <h3>{lane.title}</h3>
                <p>{lane.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="section-heading">
          <span>Built for Live Operations</span>
          <h2>System Features</h2>
        </div>
        <MagicBento
          items={featureCards.map((feature) => ({
            label: feature.accent ? 'Citizen Layer' : 'System Layer',
            title: feature.title,
            description: feature.copy,
          }))}
          particleCount={6}
          spotlightRadius={260}
          glowColor="210, 232, 35"
          enableMagnetism={false}
        />
      </section>

      <section className="ops-flow-section">
        <div className="ops-flow-card">
          <span>Operational Flow</span>
          <h2>Open. Inspect. Act. Resolve.</h2>
          <p>Move from public traffic intelligence to challan lookup, officer action, payment receipt, and admin analytics.</p>
        </div>
        <div className="ops-flow-steps">
          <article><strong>01</strong><span>Public traffic map</span></article>
          <article><strong>02</strong><span>Challan lookup</span></article>
          <article><strong>03</strong><span>Officer action</span></article>
          <article><strong>04</strong><span>Admin analytics</span></article>
        </div>
      </section>

      <section className="tech-section">
        <h2>Technology Stack</h2>
        <div className="tech-grid">
          <div className="tech-item">
            <h4>Frontend</h4>
            <ul>
              <li>React 18</li>
              <li>Three.js 3D</li>
              <li>Google Maps API</li>
              <li>Gemini Assistant</li>
            </ul>
          </div>
          <div className="tech-item">
            <h4>Backend</h4>
            <ul>
              <li>Express.js</li>
              <li>Node.js</li>
              <li>JWT Auth</li>
              <li>RESTful API</li>
            </ul>
          </div>
          <div className="tech-item">
            <h4>Database</h4>
            <ul>
              <li>MSSQL Server</li>
              <li>13+ System Tables</li>
              <li>Appeals & Payments</li>
              <li>Audit History</li>
            </ul>
          </div>
          <div className="tech-item">
            <h4>Design</h4>
            <ul>
              <li>Neo-Brutalist UI</li>
              <li>Analytics Panels</li>
              <li>Responsive Layouts</li>
              <li>Command Visuals</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Manage Traffic?</h2>
        <p>Use the public dashboard for citizen services or login for officer tools.</p>
        <div className="cta-actions">
          <Link to="/public">
            <LightBeamButton className="beam-wide">
              Public Dashboard
            </LightBeamButton>
          </Link>
          <Link to="/login">
            <LightBeamButton className="beam-wide beam-accent" gradientColors={['#F8F4E8', '#D2E823', '#F8F4E8']}>
              Officer Login
            </LightBeamButton>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
