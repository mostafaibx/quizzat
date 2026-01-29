/**
 * Base URL for API requests
 * Uses NEXT_PUBLIC_APP_URL in production, defaults to localhost in development
 */
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }
  // Server-side
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Default fetch options
 */
const defaultOptions: RequestInit = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Type-safe fetch wrapper for API calls
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;

  const res = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;

    try {
      const errorData = await res.json() as ApiResponse<never>;
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // If JSON parsing fails, use status text
      errorMessage = res.statusText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  const json = await res.json() as ApiResponse<T>;

  if (!json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }

  return json.data as T;
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string, query?: Record<string, string>): Promise<T> {
  let url = endpoint;

  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return apiFetch<T>(url, { method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export function apiPatch<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
}
