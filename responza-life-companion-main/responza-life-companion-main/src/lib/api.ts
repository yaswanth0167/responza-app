const envApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

const defaultApiBase = "http://127.0.0.1:8000";

export const API_BASE = (envApiBase || defaultApiBase).replace(/\/+$/, "");
