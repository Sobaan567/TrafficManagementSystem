import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .min(3, 'Username must be at least 3 characters')
      .required('Username is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const handleSubmit = async (values) => {
    setIsLoading(true);
    const result = await login(values.username, values.password);
    setIsLoading(false);

    if (result.success) {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (storedUser.role === 'Public') navigate('/public/account');
      else if (storedUser.role === 'Admin') navigate('/admin-dashboard');
      else navigate('/officer-dashboard');
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side - Branding */}
        <div className="login-brand-section">
          <div className="brand-content">
            <h1 className="glitch-text">TRAFFIC</h1>
            <h2>MANAGEMENT</h2>
            <p className="brand-subtitle">
              Advanced Traffic Control & E-Challan System
            </p>
            <div className="brand-features">
              <div className="feature">
                <span className="feature-icon">🚗</span>
                <span>Real-Time Tracking</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📍</span>
                <span>GPS Mapping</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📋</span>
                <span>E-Challan System</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="form-container">
            <h3>System Login</h3>
            <p className="form-subtitle">Access officer or admin traffic management tools</p>

            {authError && (
              <div className="error-alert">
                <span className="error-icon">⚠</span>
                {authError}
              </div>
            )}

            <Formik
              initialValues={{
                username: '',
                password: '',
              }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form className="login-form">
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <Field
                      type="text"
                      id="username"
                      name="username"
                      placeholder="Enter your username"
                      className={touched.username && errors.username ? 'error' : ''}
                    />
                    <ErrorMessage name="username">
                      {(msg) => <div className="field-error">{msg}</div>}
                    </ErrorMessage>
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <Field
                      type="password"
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      className={touched.password && errors.password ? 'error' : ''}
                    />
                    <ErrorMessage name="password">
                      {(msg) => <div className="field-error">{msg}</div>}
                    </ErrorMessage>
                  </div>

                  <div className="form-options">
                    <label className="remember-me">
                      <input type="checkbox" name="remember" />
                      <span>Remember me</span>
                    </label>
                    <Link to="#" className="forgot-password">
                      Forgot Password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-login"
                    disabled={isSubmitting || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner"></span>
                        LOGGING IN...
                      </>
                    ) : (
                      'LOGIN'
                    )}
                  </button>
                </Form>
              )}
            </Formik>

            <div className="form-divider">
              <span>Demo Credentials</span>
            </div>

            <div className="demo-creds">
              <p><strong>Usernames:</strong> officer1, officer2, officer3</p>
              <p><strong>Password:</strong> password123</p>
              <p><strong>Admin:</strong> use an account with Role = Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Background Elements */}
      <div className="login-bg-element element-1"></div>
      <div className="login-bg-element element-2"></div>
      <div className="login-bg-element element-3"></div>
    </div>
  );
};

export default LoginPage;
