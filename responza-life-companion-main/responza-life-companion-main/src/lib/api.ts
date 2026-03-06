const envApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

// Render backend default
const defaultApiBase = "https://responza-api.onrender.com";

// Final API base URL
export const API_BASE = (envApiBase || defaultApiBase).replace(/\/+$/, "");

// Common API request helper
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json();
}