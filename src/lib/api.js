import axios from "axios";

const getBackendUrl = () => {
  try {
    if (typeof process !== "undefined" && process?.env?.REACT_APP_BACKEND_URL) {
      return process.env.REACT_APP_BACKEND_URL;
    }
  } catch (e) {}
  try {
    if (typeof import.meta !== "undefined" && import.meta?.env?.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL;
    }
  } catch (e) {}
  return "";
};

const BACKEND_URL = getBackendUrl();
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const http = axios.create({ baseURL: API });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const activeUnit = localStorage.getItem("active_unit_id") || "unit_centro";
  if (activeUnit) config.headers["x-unit-id"] = activeUnit;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    if (
      error.response?.status === 403 &&
      (data?.code === "TRIAL_EXPIRED" ||
        data?.message?.includes?.("teste") ||
        data?.detail?.includes?.("teste"))
    ) {
      window.dispatchEvent(new CustomEvent("trial_expired", { detail: data }));
    }
    return Promise.reject(error);
  }
);

export const api = {
  get: (url, params) => http.get(url, { params }).then((r) => r.data),
  post: (url, body) => http.post(url, body).then((r) => r.data),
  put: (url, body) => http.put(url, body).then((r) => r.data),
  del: (url, params) => http.delete(url, { params }).then((r) => r.data),
};
