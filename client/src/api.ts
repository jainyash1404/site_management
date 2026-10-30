import axios from 'axios';
import type { Listed } from './types';

export const TOKEN_KEY = 'cm_token';

export const http = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    'http://localhost:5000/api/v1',
});

// All endpoint paths
export const E = {
  login: '/auth/login',
  me: '/auth/me',
  signup: '/auth/signup',
  forgot: '/auth/forgot-password',
  reset: '/auth/reset-password',

  workers: '/workers',
  sites: '/sites',
  funds: '/funds',

  expenses: '/expenses',
  myExpenses: '/expenses/my',
  categories: '/expense-categories',

  // Admin Management
  admins: '/admins',
  adminPermissions: (id: string) =>
    `/admins/${id}/permissions`,
  adminStatus: (id: string) =>
    `/admins/${id}/status`,

  status: (base: string, id: string) =>
    `${base}/${id}/status`,

  review: (id: string) =>
    `/expenses/${id}/review`,
};

// Attach authentication token
http.interceptors.request.use(c => {
  const t = sessionStorage.getItem(TOKEN_KEY);

  if (t) {
    c.headers.Authorization = `Bearer ${t}`;
  }

  return c;
});

let onUnauthorized: () => void = () => {};

export const setUnauthorizedHandler = (f: () => void) => {
  onUnauthorized = f;
};

// Handle unauthorized requests
http.interceptors.response.use(
  r => r,
  e => {
    if (
      e.response?.status === 401 &&
      !String(e.config?.url).includes(E.login)
    ) {
      onUnauthorized();
    }

    return Promise.reject(e);
  }
);

// Error message helper
export const errMsg = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    return e.response
      ? (
          e.response.data?.message ??
          `Request failed (${e.response.status})`
        )
      : 'Cannot reach the server. Please check that the backend is running.';
  }

  return 'Something went wrong';
};

// List helper
export async function list<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<Listed<T>> {
  const b = (await http.get(url, { params })).data;

  return {
    items: Array.isArray(b)
      ? b
      : (b.data ?? b.items ?? []),

    summary: b.summary ?? {},
  };
}

// Request helper
export const send = (
  method: 'post' | 'patch' | 'delete',
  url: string,
  data?: unknown
) =>
  http.request({
    method,
    url,
    data,
  });