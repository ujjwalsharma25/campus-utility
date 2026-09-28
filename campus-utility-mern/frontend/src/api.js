import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach the signed-in user's token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend says our session is invalid/expired, tell AuthContext to log out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('campus-auth-expired'));
    }
    return Promise.reject(error);
  }
);

// --- Auth ---------------------------------------------------------------
// payload may be a FormData (student signup with ID card photo) or a plain object
export const signupRequest = (payload) =>
  api
    .post('/auth/signup', payload, payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
    .then((r) => r.data);
export const loginRequest = (payload) => api.post('/auth/login', payload).then((r) => r.data);
export const fetchMe = () => api.get('/auth/me').then((r) => r.data);

// --- Users ----------------------------------------------------------------
export const fetchUserById = (id) => api.get(`/users/${id}`).then((r) => r.data);

// --- Canteens & menu --------------------------------------------------------
export const fetchCanteens = () => api.get('/canteens').then((r) => r.data);
export const toggleCanteen = (canteenId) => api.put(`/canteens/${canteenId}/toggle`).then((r) => r.data);

export const fetchMenu = (canteenId) => api.get(`/menu/${canteenId}`).then((r) => r.data);
export const uploadMenuItemImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api
    .post('/menu/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
};
export const createMenuItem = (payload) => api.post('/menu', payload).then((r) => r.data);
export const updateMenuItem = (itemId, payload) => api.put(`/menu/${itemId}`, payload).then((r) => r.data);
export const toggleMenuAvailability = (itemId) => api.put(`/menu/${itemId}/availability`).then((r) => r.data);
export const deleteMenuItem = (itemId) => api.delete(`/menu/${itemId}`).then((r) => r.data);

// --- Orders ----------------------------------------------------------------
export const createOrder = (payload) => api.post('/orders', payload).then((r) => r.data);
export const fetchOrders = (params = {}) => api.get('/orders', { params }).then((r) => r.data);
export const updateOrderStatus = (orderId, status) =>
  api.put(`/orders/${orderId}/status`, { status }).then((r) => r.data);
export const fetchOrderHistory = (userId) => api.get(`/orders/history/${userId}`).then((r) => r.data);

// --- Leaderboard & dashboards -------------------------------------------------
export const fetchLeaderboard = () => api.get('/leaderboard').then((r) => r.data);
export const fetchAnalyticsSummary = () => api.get('/analytics/summary').then((r) => r.data);

export default api;
