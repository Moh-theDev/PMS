import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5057/api',
  withCredentials: true, // Necessary to send and receive HttpOnly cookies cross-origin
});

// Flag to prevent multiple concurrent token refresh requests
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor to intercept 401 Unauthorized errors and refresh token silently
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If the refresh token request itself fails with 401, session is completely expired
      if (originalRequest.url?.includes('auth/refreshToken')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.get('/auth/refreshToken');
        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Custom event to notify the application store of session expiration
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-session-expired'));
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);