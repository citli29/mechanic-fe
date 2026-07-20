import axios from "axios";

export default axios.create({
    baseURL: "http://192.168.1.73:8000/api",
    //baseURL: "http://localhost:8000/api",
    headers: {
        "Content-Type": "application/json"
    }
});
