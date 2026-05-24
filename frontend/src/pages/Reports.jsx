import React from 'react';
import { Link } from 'react-router-dom';
import './Reports.css';

const reportCards = [
  { title: 'Violation Heat', value: '234', trend: '+12%', copy: 'Officer-reported violations this month' },
  { title: 'Collection Rate', value: '57%', trend: '+8%', copy: 'Paid challans versus issued challans' },
  { title: 'Appeal Load', value: 'Live', trend: 'Inbox', copy: 'Citizen appeals are reviewed from officer dashboard' },
  { title: 'Road Risk', value: 'Medium', trend: 'Watch', copy: 'Current city traffic pressure layer' },
];

const lanes = [
  { label: 'Morning', width: '74%', tone: 'good' },
  { label: 'Afternoon', width: '52%', tone: 'warn' },
  { label: 'Evening', width: '88%', tone: 'danger' },
  { label: 'Night', width: '31%', tone: 'good' },
];

const reportQueue = [
  'Daily challan collection summary',
  'High priority traffic situation report',
  'Officer response performance',
  'Citizen appeal resolution audit',
];

export default function Reports() {
  return (
    <div className="reports-page">
      <section className="reports-hero">
        <div>
          <span>Analytics Command</span>
          <h1>Reports Center</h1>
          <p>Operational numbers, citizen-service pressure, and road-risk signals in one executive view.</p>
        </div>
        <Link to="/officer-dashboard">Back to Dashboard</Link>
      </section>

      <section className="reports-card-grid">
        {reportCards.map((card) => (
          <article key={card.title}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <small>{card.trend}</small>
            <p>{card.copy}</p>
          </article>
        ))}
      </section>

      <section className="reports-main-grid">
        <div className="reports-panel">
          <div className="reports-panel-heading">
            <h2>Traffic Pressure Timeline</h2>
            <p>Visual severity bands for common city movement windows.</p>
          </div>
          <div className="report-lanes">
            {lanes.map((lane) => (
              <div key={lane.label} className={`report-lane ${lane.tone}`}>
                <span>{lane.label}</span>
                <div><i style={{ width: lane.width }} /></div>
                <strong>{lane.width}</strong>
              </div>
            ))}
          </div>
        </div>

        <aside className="reports-panel report-queue">
          <div className="reports-panel-heading">
            <h2>Export Queue</h2>
            <p>Ready-made report modules for officer review.</p>
          </div>
          {reportQueue.map((item, index) => (
            <article key={item}>
              <span>{index + 1}</span>
              <p>{item}</p>
              <button type="button">Prepare</button>
            </article>
          ))}
        </aside>
      </section>
    </div>
  );
}
