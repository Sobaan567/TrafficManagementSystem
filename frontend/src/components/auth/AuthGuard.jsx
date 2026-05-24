import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AuthGuard = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader">
          <span className="loader-text">LOADING</span>
          <div className="loader-bar"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : [];

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={user?.role === 'Public' ? '/public/account' : user?.role === 'Admin' ? '/admin-dashboard' : '/'} replace />;
  }

  return children;
};

export default AuthGuard;
