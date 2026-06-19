import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CarFront,
  ClipboardList,
  Home,
  Landmark,
  LogIn,
  Map,
  Menu,
  MessageSquareWarning,
  ShieldCheck,
  UserCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import MagnificationDock from './MagnificationDock';
import './QuickDock.css';

const iconSize = 22;

const routeItem = (path, label, icon, navigate, pathname, closeDock) => ({
  icon,
  label,
  onClick: () => {
    navigate(path);
    closeDock();
  },
  className: pathname === path ? 'is-active' : '',
});

const QuickDock = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const items = useMemo(() => {
    const closeDock = () => setOpen(false);
    const publicItems = [
      routeItem('/', 'Home', <Home size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/public', 'Public', <Landmark size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/public/traffic-info', 'Traffic', <Map size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/public/challan-tracker', 'Tracker', <ClipboardList size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/public/complaints', 'Complaint', <MessageSquareWarning size={iconSize} />, navigate, pathname, closeDock),
    ];

    if (!isAuthenticated) {
      return [
        ...publicItems,
        routeItem('/login', 'Login', <LogIn size={iconSize} />, navigate, pathname, closeDock),
      ];
    }

    if (user?.role === 'Public') {
      return [
        ...publicItems,
        routeItem('/public/account', 'Account', <UserCircle size={iconSize} />, navigate, pathname, closeDock),
      ];
    }

    if (user?.role === 'Admin') {
      return [
        routeItem('/', 'Home', <Home size={iconSize} />, navigate, pathname, closeDock),
        routeItem('/admin-dashboard', 'Admin', <ShieldCheck size={iconSize} />, navigate, pathname, closeDock),
        routeItem('/public', 'Public', <Landmark size={iconSize} />, navigate, pathname, closeDock),
      ];
    }

    return [
      routeItem('/', 'Home', <Home size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/officer-dashboard', 'Officer', <ShieldCheck size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/traffic-dashboard', 'Roads', <Map size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/challan-management', 'Challans', <CarFront size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/reports', 'Reports', <BarChart3 size={iconSize} />, navigate, pathname, closeDock),
      routeItem('/public', 'Public', <Landmark size={iconSize} />, navigate, pathname, closeDock),
    ];
  }, [isAuthenticated, navigate, pathname, user?.role]);

  return (
    <div className={`quick-dock-wrap ${open ? 'is-open' : ''}`} aria-label="Floating quick navigation">
      {open && (
        <div className="quick-dock-popover">
          <MagnificationDock
            items={items}
            panelHeight={62}
            baseItemSize={48}
            magnification={60}
            distance={90}
            dockHeight={92}
            spring={{ mass: 0.08, stiffness: 220, damping: 24 }}
          />
        </div>
      )}
      <button
        type="button"
        className="quick-dock-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? 'Close quick navigation' : 'Open quick navigation'}
      >
        {open ? <X size={25} /> : <Menu size={28} />}
      </button>
    </div>
  );
};

export default QuickDock;
