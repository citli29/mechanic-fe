import axios from "axios";
import { clearAuthToken, getAuthToken } from "./auth";

const apiUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: apiUrl,
    //baseURL: "http://localhost:8000/api",
    headers: {
        "Content-Type": "application/json"
    },
    // Without this, a request can hang indefinitely (flaky wifi on the shop's
    // LAN, a backgrounded tab, a momentarily-busy backend) — anything relying
    // on that request ever settling (e.g. Navbar's notification poll lock)
    // would then get stuck forever instead of just failing and retrying.
    timeout: 10000
});

// Every request carries the shop login token.
api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// A 401 means the token was revoked (logout elsewhere / password changed):
// drop it so the app shows the login screen. The login request itself is
// left alone so a wrong password just shows its error.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
            clearAuthToken();
        }
        return Promise.reject(error);
    }
);

export default api;
