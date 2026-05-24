import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  role: null,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        role: action.payload.role,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        role: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return initialState;
    case 'RESTORE_TOKEN':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        role: action.payload.role,
        loading: false,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          dispatch({
            type: 'RESTORE_TOKEN',
            payload: {
              token,
              user: JSON.parse(user),
              role: JSON.parse(user).role,
            },
          });
        } catch (err) {
          dispatch({
            type: 'LOGIN_FAILURE',
            payload: 'Failed to restore session',
          });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    bootstrapAsync();
  }, []);

  const login = useCallback(async (username, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token,
          user,
          role: user.role,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    dispatch({ type: 'LOGOUT' });
  }, []);

  const register = useCallback(async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token,
          user,
          role: user.role,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  const registerPublic = useCallback(async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await api.post('/public/register', userData);
      const { token, user } = response.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token,
          user,
          role: user.role,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Public registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateProfile = useCallback(async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      const updatedUser = response.data.user;

      localStorage.setItem('user', JSON.stringify(updatedUser));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token: state.token,
          user: updatedUser,
          role: updatedUser.role,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  }, [state.token]);

  const value = {
    ...state,
    login,
    logout,
    register,
    registerPublic,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
