import React from 'react';
import { Link } from 'react-router-dom';
import GlitchText from '../components/common/GlitchText';
import HardShadowButton from '../components/common/HardShadowButton';
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

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1><GlitchText text="TRAFFIC CONTROL" /></h1>
            <h2>Management System</h2>
            <p className="hero-subtitle">
              Advanced Real-Time Traffic Monitoring & E-Challan Generation
            </p>

            <div className="hero-features">
              <div className="feature-item">
                <span className="feature-icon">🗺️</span>
                <span>Real-Time GPS Mapping</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Live Traffic Analytics</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🚨</span>
                <span>Violation Detection</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💰</span>
                <span>E-Challan & Payment</span>
              </div>
            </div>

            <div className="hero-actions">
              <Link to="/public">
                <HardShadowButton variant="accent" size="lg">
                  Public Dashboard
                </HardShadowButton>
              </Link>
              <Link to="/login">
                <HardShadowButton variant="primary" size="lg">
                  Officer Login
                </HardShadowButton>
              </Link>
              <Link to="#features">
                <HardShadowButton variant="accent" size="lg">
                  Learn More
                </HardShadowButton>
              </Link>
            </div>
          </div>

          <div className="hero-image">
            <div className="ops-radar">
              <div className="ops-grid" />
              <div className="ops-ring ring-a" />
              <div className="ops-ring ring-b" />
              <div className="ops-sweep" />
              <div className="ops-core">
                <strong>TMS</strong>
                <span>LIVE OPS</span>
              </div>
              <div className="ops-pin pin-a">A1</div>
              <div className="ops-pin pin-b">C7</div>
              <div className="ops-pin pin-c">P3</div>
            </div>
          </div>
        </div>
      </section>

      <section className="ops-command-strip">
        {opsSignals.map((signal) => (
          <article key={signal.label}>
            <span>{signal.label}</span>
            <strong>{signal.value}</strong>
            <small>{signal.detail}</small>
          </article>
        ))}
      </section>

      <section className="mission-control-section">
        <div className="mission-copy">
          <span>Command Flow</span>
          <h2>One system, every road decision.</h2>
          <p>From citizen lookup to officer action, every dashboard now feels like a live operations console.</p>
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

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2>System Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Dashboard</h3>
            <p>Comprehensive overview of all traffic violations and challans</p>
          </div>
          <div className="feature-card feature-card-accent">
            <h3>Public Dashboard</h3>
            <p>Citizen-facing traffic status, challan lookup, alerts, and service shortcuts</p>
            <Link to="/public" className="feature-card-link">Open Public Dashboard</Link>
          </div>
          <div className="feature-card">
            <h3>Real-Time Mapping</h3>
            <p>Google Maps integration for accurate traffic location tracking</p>
          </div>
          <div className="feature-card">
            <h3>3D Visualization</h3>
            <p>Advanced Three.js 3D city visualization with traffic events</p>
          </div>
          <div className="feature-card">
            <h3>E-Challan System</h3>
            <p>Digital fine issuance and payment processing</p>
          </div>
          <div className="feature-card">
            <h3>Analytics</h3>
            <p>Detailed reports and statistics for traffic management</p>
          </div>
          <div className="feature-card">
            <h3>Mobile Responsive</h3>
            <p>Access from any device with responsive design</p>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
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
              <li>Modern Civic UI</li>
              <li>Analytics Panels</li>
              <li>Responsive Layouts</li>
              <li>3D Command Visuals</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Manage Traffic?</h2>
        <p>Use the public dashboard for citizen services or login for officer tools</p>
        <div className="cta-actions">
          <Link to="/public">
            <HardShadowButton variant="accent" size="lg">
              Public Dashboard
            </HardShadowButton>
          </Link>
          <Link to="/login">
            <HardShadowButton variant="primary" size="lg">
              Officer Login
            </HardShadowButton>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
