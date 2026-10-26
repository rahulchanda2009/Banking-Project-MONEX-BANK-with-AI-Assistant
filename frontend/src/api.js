import axios from "axios";
// Backend exposed via nginx proxy at /api
const api = axios.create({ baseURL: "" });
export default api;

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
    .format(Number(n || 0));