import React from 'react';
import './OfficerPanel.css';

const OfficerPanel = ({ user, stats }) => {
  return (
    <div className="officer-panel">
      <div className="officer-header">
        <div className="officer-avatar">
          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
        </div>
        <div className="officer-info">
          <h4>{user?.firstName} {user?.lastName}</h4>
          <p className="officer-badge">{user?.role}</p>
        </div>
      </div>

      <div className="officer-stats">
        <div className="stat-item">
          <span className="stat-label">Performance Rating</span>
          <div className="rating">★★★★★</div>
        </div>

        <div className="stat-item">
          <span className="stat-label">Challans This Month</span>
          <div className="stat-value">{stats?.totalChallans || 0}</div>
        </div>

        <div className="stat-item">
          <span className="stat-label">Collection Rate</span>
          <div className="stat-value">
            {stats?.totalChallans > 0
              ? Math.round((stats?.paidChallans / stats?.totalChallans) * 100)
              : 0}%
          </div>
        </div>
      </div>

      <div className="officer-actions">
        <button className="btn-officer">Update Location</button>
        <button className="btn-officer secondary">Settings</button>
      </div>
    </div>
  );
};

export default OfficerPanel;
