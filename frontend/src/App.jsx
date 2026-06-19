import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/neo-brutalist.css';

// Context
import { AuthProvider } from './context/AuthContext';
import { TrafficProvider } from './context/TrafficContext';

// Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import GeminiChatbot from './components/common/GeminiChatbot';
import QuickDock from './components/common/QuickDock';
import DashboardBentoFX from './components/common/DashboardBentoFX';
import DashboardSignalRail from './components/common/DashboardSignalRail';

// Public Pages
import PublicHome from './pages/public/PublicHome';
import ChallanTracker from './pages/public/ChallanTracker';
import TrafficInfo from './pages/public/TrafficInfo';
import PublicAccount from './pages/public/PublicAccount';

// Protected Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OfficerDashboard from './pages/OfficerDashboard';
import TrafficDashboard from './pages/TrafficDashboard';
import ChallanManagement from './pages/ChallanManagement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import SmartFeatures from './pages/SmartFeatures';
import NotFound from './pages/NotFound';

// Auth Guard
import AuthGuard from './components/auth/AuthGuard';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    const noiseCanvas = document.createElement('canvas');
    const ctx = noiseCanvas.getContext('2d');
    noiseCanvas.width = 100;
    noiseCanvas.height = 100;

    for (let i = 0; i < 10000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`;
      ctx.fillRect(Math.random() * 100, Math.random() * 100, 1, 1);
    }

    const style = document.createElement('style');
    style.textContent = `
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url('${noiseCanvas.toDataURL()}');
        pointer-events: none;
        z-index: 1;
        opacity: 0.03;
      }
    `;
    document.head.appendChild(style);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="loader-container">
        <div className="loader">
          <span className="loader-text">LOADING</span>
          <div className="loader-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <TrafficProvider>
        <Router>
          <DashboardBentoFX />
          <div className="app-wrapper">
            <Header />
            <DashboardSignalRail />
            <main className="main-content">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/public" element={<PublicHome />} />
                <Route path="/public/complaints" element={<PublicHome />} />
                <Route path="/complaint" element={<PublicHome />} />
                <Route path="/complaints" element={<PublicHome />} />
                <Route path="/public/challan-tracker" element={<ChallanTracker />} />
                <Route path="/public/traffic-info" element={<TrafficInfo />} />
                <Route path="/public/account" element={<PublicAccount />} />
                {/* Protected Routes */}
                <Route
                  path="/officer-dashboard"
                  element={<AuthGuard requiredRole="Officer"><OfficerDashboard /></AuthGuard>}
                />
                <Route
                  path="/traffic-dashboard"
                  element={<AuthGuard requiredRole="Officer"><TrafficDashboard /></AuthGuard>}
                />
                <Route
                  path="/challan-management"
                  element={<AuthGuard requiredRole="Officer"><ChallanManagement /></AuthGuard>}
                />
                <Route
                  path="/reports"
                  element={<AuthGuard requiredRole="Officer"><Reports /></AuthGuard>}
                />
                <Route
                  path="/smart-features"
                  element={<AuthGuard requiredRole={['Officer', 'Admin', 'Supervisor']}><SmartFeatures /></AuthGuard>}
                />
                <Route
                  path="/admin-dashboard"
                  element={<AuthGuard requiredRole="Admin"><AdminDashboard /></AuthGuard>}
                />
                <Route
                  path="/settings"
                  element={<AuthGuard requiredRole="Officer"><Settings /></AuthGuard>}
                />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <QuickDock />
            <GeminiChatbot />
            <Footer />
          </div>
        </Router>
      </TrafficProvider>
    </AuthProvider>
  );
}

export default App;
