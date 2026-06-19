import React from 'react';
import AnimatedNumber from '../common/AnimatedNumber';
import './ViolationStats.css';

const ViolationStats = ({ violations, detailed = false }) => {
  const violationTypes = {
    'Speeding': 0,
    'Red Light Violation': 0,
    'No Helmet': 0,
    'Illegal Parking': 0,
    'Other': 0,
  };

  violations.forEach((v) => {
    if (violationTypes[v.violationType] !== undefined) {
      violationTypes[v.violationType]++;
    } else {
      violationTypes['Other']++;
    }
  });

  return (
    <div className="violation-stats">
      <h3>VIOLATION STATISTICS</h3>

      {detailed ? (
        <div className="violations-detailed">
          <table className="violations-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, idx) => (
                <tr key={idx}>
                  <td>{v.vehicleNumber}</td>
                  <td>{v.violationType}</td>
                  <td>{v.location}</td>
                  <td><span className={`severity-badge ${v.severity}`}>{v.severity}</span></td>
                  <td>{new Date(v.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="violation-types">
          {Object.entries(violationTypes).map(([type, count]) => (
            <div key={type} className="violation-type-card">
              <div className="type-label">{type}</div>
              <div className="type-count"><AnimatedNumber value={count} /></div>
              <div className="type-bar">
                <div
                  className="type-bar-fill"
                  style={{ width: `${(count / Math.max(...Object.values(violationTypes))) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViolationStats;
