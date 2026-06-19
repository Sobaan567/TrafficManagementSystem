import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import HardShadowButton from './HardShadowButton';
import api from '../../services/api';
import './Header.css';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('tmsThemeMode') || 'balanced');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role === 'Public' || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/admin/search', { params: { q: searchTerm.trim() } });
        setSearchResults(response.data?.data || []);
      } catch (error) {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isAuthenticated, searchTerm, user?.role]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLiveNotifications([]);
      return undefined;
    }

    let active = true;
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        if (active && response.data?.success) setLiveNotifications(response.data.data || []);
      } catch (error) {
        if (active) setLiveNotifications([]);
      }
    };

    fetchNotifications();
    const timer = setInterval(fetchNotifications, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    const checkServer = async () => {
      try {
        await api.get('/health');
        if (active) setServerOnline(true);
      } catch (error) {
        if (active) setServerOnline(false);
      }
    };

    checkServer();
    const timer = setInterval(checkServer, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.tmsTheme = themeMode;
    localStorage.setItem('tmsThemeMode', themeMode);
  }, [themeMode]);

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const systemNotifications = [
    {
      title: serverOnline === false ? 'Backend offline' : 'Traffic server connected',
      body: serverOnline === false ? 'Start the backend to load live traffic and challans.' : 'Live traffic, challans, and chatbot routes are reachable.',
      tone: serverOnline === false ? 'danger' : 'good',
    },
    {
      title: user?.role === 'Public' ? 'Citizen account ready' : 'Officer tools ready',
      body: user?.role === 'Public' ? 'Appeals, payments, and area watchlist are available.' : 'AI auto-fill can prepare new violation forms.',
      tone: 'neutral',
    },
    {
      title: 'Gemini assistant',
      body: 'Ask about challans, payments, traffic alerts, or workflows.',
      tone: 'accent',
    },
  ];
  const notifications = [
    ...liveNotifications.map((item) => ({
      title: item.title,
      body: item.body,
      tone: item.type === 'danger' ? 'danger' : item.type === 'success' ? 'good' : item.type === 'appeal' ? 'accent' : 'neutral',
      live: true,
      isRead: item.isRead,
    })),
    ...systemNotifications,
  ];
  const unreadCount = liveNotifications.filter((item) => !item.isRead).length;

  const toggleNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen && unreadCount > 0) {
      try {
        await api.put('/notifications/read');
        setLiveNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      } catch (error) {
        // Keep existing badge if read sync fails.
      }
    }
  };

  const rotateTheme = () => {
    setThemeMode((current) => {
      if (current === 'balanced') return 'night';
      if (current === 'night') return 'clean';
      return 'balanced';
    });
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          TMS
        </Link>

        <nav className="nav-menu">
          <Link to="/public" className="nav-link">Public Portal</Link>
          {isAuthenticated && user?.role === 'Public' && (
            <Link to="/public/account" className="nav-link">My Account</Link>
          )}
          {isAuthenticated && user?.role !== 'Public' && (
            <>
              {user?.role === 'Admin' ? (
                <>
                  <Link to="/admin-dashboard" className="nav-link">Admin Dashboard</Link>
                  <Link to="/smart-features" className="nav-link">Smart Features</Link>
                </>
              ) : (
                <>
                  <Link to="/officer-dashboard" className="nav-link">Dashboard</Link>
                  <Link to="/challan-management" className="nav-link">Challans</Link>
                  <Link to="/smart-features" className="nav-link">Smart Features</Link>
                  <Link to="/reports" className="nav-link">Reports</Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="nav-actions">
          {isAuthenticated && user?.role !== 'Public' && (
            <div className="global-search">
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search TMS..." />
              {searchResults.length > 0 && (
                <div className="global-search-results">
                  {searchResults.map((item, index) => (
                    <div key={`${item.type}-${item.id}-${index}`}>
                      <strong>{item.type}: {item.title}</strong>
                      <span>{item.subtitle || item.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="header-clock" title={now.toLocaleString()}>
            <span>{dateLabel}</span>
            <strong>{timeLabel}</strong>
          </div>
          <button type="button" className={`theme-toggle theme-${themeMode}`} onClick={rotateTheme} aria-label="Change dashboard theme">
            {themeMode === 'balanced' ? 'BAL' : themeMode === 'night' ? 'NIT' : 'CLN'}
          </button>
          <div className="notification-wrap">
            <button
              type="button"
              className={`notification-button ${serverOnline === false ? 'danger' : ''}`}
              onClick={toggleNotifications}
              aria-label="Open notifications"
            >
              !
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            {notificationsOpen && (
              <div className="notification-panel">
                <strong>Smart Alerts</strong>
                {notifications.map((item, index) => (
                  <div key={`${item.title}-${index}`} className={`notification-item ${item.tone} ${item.live && !item.isRead ? 'unread' : ''}`}>
                    <span>{item.title}</span>
                    <p>{item.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isAuthenticated ? (
            <>
              <span className="user-info">{user?.firstName}</span>
              <HardShadowButton
                variant="primary"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </HardShadowButton>
            </>
          ) : (
            <Link to="/login">
              <HardShadowButton variant="primary" size="sm">
                Login
              </HardShadowButton>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Traffic Management</h4>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-section">
          <h4>Resources</h4>
          <a href="#docs">Documentation</a>
          <a href="#api">API Docs</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="footer-section">
          <h4>Follow</h4>
          <a href="#twitter">Twitter</a>
          <a href="#facebook">Facebook</a>
          <a href="#linkedin">LinkedIn</a>
        </div>
      </div>

      <div className="footer-credit">
        © 2024 Traffic Management System | Produced by Sobaan
      </div>
    </footer>
  );
};
