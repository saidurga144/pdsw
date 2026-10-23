import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach auth token to every request
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pds_token') : null;
  const headers = config.headers as any;
  const hasExplicitAuth = Boolean(
    headers?.Authorization ||
    headers?.authorization ||
    (typeof headers?.get === 'function' && headers.get('Authorization'))
  );

  if (token && headers && !hasExplicitAuth) {
    if (typeof headers.set === 'function') {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Translate HTTP/network errors into user-friendly messages
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string; detail?: string | any[] }>) => {
    const data = error.response?.data;
    let serverMessage: string | undefined = data?.error || data?.message;

    if (!serverMessage && data?.detail) {
      if (typeof data.detail === 'string') {
        serverMessage = data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        serverMessage = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
    }

    let finalMessage = serverMessage;

    if (!finalMessage) {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        finalMessage = 'Request timed out. Please check your connection and try again.';
      } else if (!error.response) {
        finalMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        const status = error.response.status;
        if (status === 401) finalMessage = 'Invalid email or password. Please try again.';
        else if (status === 403) finalMessage = 'Access denied. You do not have permission for this action.';
        else if (status === 404) finalMessage = 'The requested resource was not found.';
        else if (status === 409) finalMessage = 'An account with this email address already exists.';
        else if (status >= 500) finalMessage = 'Server error. Please try again in a moment.';
        else finalMessage = error.message || 'Something went wrong. Please try again.';
      }
    }

    const enhancedError = new Error(finalMessage);
    (enhancedError as any).response = error.response;
    (enhancedError as any).status = error.response?.status;
    (enhancedError as any).code = error.code;
    return Promise.reject(enhancedError);
  }
);

export const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));
