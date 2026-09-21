import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

export default axios.create({
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
