import axios from 'axios';

const getApiBaseUrl = () => {
  const browserHost = window.location.hostname;
  if (browserHost && !['localhost', '127.0.0.1'].includes(browserHost)) {
    return `http://${browserHost}:5000/api`;
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear auth
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = window.location.pathname.startsWith('/public') ? '/public/account' : '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
};

// ============================================================================
// TRAFFIC ENDPOINTS
// ============================================================================

export const trafficAPI = {
  // Real-time traffic data
  getTrafficStatus: (latitude, longitude, radius = 5000) =>
    api.get('/traffic/status', {
      params: { latitude, longitude, radius },
    }),

  getTrafficJams: (filters) =>
    api.get('/traffic/jams', { params: filters }),

  getTrafficHeatmap: (latitude, longitude) =>
    api.get('/traffic/heatmap', {
      params: { latitude, longitude },
    }),

  reportTrafficEvent: (eventData) =>
    api.post('/traffic/events', eventData),

  getTrafficEvents: (filters) =>
    api.get('/traffic/events', { params: filters }),

  updateTrafficEvent: (eventId, data) =>
    api.put(`/traffic/events/${eventId}`, data),

  // Cameras
  getCameras: (filters) =>
    api.get('/traffic/cameras', { params: filters }),

  getCameraFeed: (cameraId) =>
    api.get(`/traffic/cameras/${cameraId}/feed`),

  // Locations
  getLocations: () =>
    api.get('/traffic/locations'),

  getLocationDetails: (locationId) =>
    api.get(`/traffic/locations/${locationId}`),
};

// ============================================================================
// VIOLATION & CHALLAN ENDPOINTS
// ============================================================================

export const challanAPI = {
  // Violations
  getViolations: (filters) =>
    api.get('/violations', { params: filters }),

  getViolationDetails: (violationId) =>
    api.get(`/violations/${violationId}`),

  reportViolation: (violationData) =>
    api.post('/violations', violationData),

  updateViolation: (violationId, data) =>
    api.put(`/violations/${violationId}`, data),

  // Challans (E-Challan)
  getChallans: (filters) =>
    api.get('/challans', { params: filters }),

  getChallanDetails: (challanId) =>
    api.get(`/challans/${challanId}`),

  createChallan: (challanData) =>
    api.post('/challans', challanData),

  updateChallan: (challanId, data) =>
    api.put(`/challans/${challanId}`, data),

  deleteChallan: (challanId) =>
    api.delete(`/challans/${challanId}`),

  paymentChallan: (challanId, paymentData) =>
    api.post(`/challans/${challanId}/payment`, paymentData),

  generateChallanPDF: (challanId) =>
    api.get(`/challans/${challanId}/pdf`, { responseType: 'blob' }),

  sendChallanNotification: (challanId) =>
    api.post(`/challans/${challanId}/notify`),

  appealChallan: (challanId, appealData) =>
    api.post(`/challans/${challanId}/appeal`, appealData),

  getChallanStats: (filters) =>
    api.get('/challans/stats', { params: filters }),
};

// ============================================================================
// OFFICER ENDPOINTS
// ============================================================================

export const officerAPI = {
  getOfficers: (filters) =>
    api.get('/officers', { params: filters }),

  getOfficerDetails: (officerId) =>
    api.get(`/officers/${officerId}`),

  updateOfficerLocation: (officerId, location) =>
    api.put(`/officers/${officerId}/location`, location),

  getOfficerStats: (officerId, period) =>
    api.get(`/officers/${officerId}/stats`, {
      params: { period },
    }),

  getOfficerChallanHistory: (officerId, filters) =>
    api.get(`/officers/${officerId}/challans`, {
      params: filters,
    }),
};

// ============================================================================
// VEHICLE ENDPOINTS
// ============================================================================

export const vehicleAPI = {
  getVehicles: (filters) =>
    api.get('/vehicles', { params: filters }),

  getVehicleDetails: (vehicleId) =>
    api.get(`/vehicles/${vehicleId}`),

  searchByRegistration: (registrationNumber) =>
    api.get(`/vehicles/search/${registrationNumber}`),

  getVehicleViolations: (vehicleId) =>
    api.get(`/vehicles/${vehicleId}/violations`),

  getVehicleChallans: (vehicleId) =>
    api.get(`/vehicles/${vehicleId}/challans`),

  registerVehicle: (vehicleData) =>
    api.post('/vehicles', vehicleData),

  updateVehicle: (vehicleId, data) =>
    api.put(`/vehicles/${vehicleId}`, data),

  blacklistVehicle: (vehicleId, reason) =>
    api.post(`/vehicles/${vehicleId}/blacklist`, { reason }),
};

// ============================================================================
// REPORT & ANALYTICS ENDPOINTS
// ============================================================================

export const reportAPI = {
  getTrafficReport: (filters) =>
    api.get('/reports/traffic', { params: filters }),

  getChallanReport: (filters) =>
    api.get('/reports/challan', { params: filters }),

  getViolationReport: (filters) =>
    api.get('/reports/violations', { params: filters }),

  getOfficerPerformanceReport: (officerId, period) =>
    api.get(`/reports/officer/${officerId}`, {
      params: { period },
    }),

  getZoneAnalytics: (locationId) =>
    api.get(`/reports/zone/${locationId}`),

  exportReport: (reportType, format = 'pdf') =>
    api.get(`/reports/export`, {
      params: { type: reportType, format },
      responseType: format === 'pdf' ? 'blob' : 'json',
    }),

  generateCustomReport: (filters) =>
    api.post('/reports/custom', filters),

  getStatistics: () =>
    api.get('/reports/statistics'),
};

// ============================================================================
// UPLOAD ENDPOINTS
// ============================================================================

export const uploadAPI = {
  uploadViolationImage: (violationId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/uploads/violation/${violationId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/uploads/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
