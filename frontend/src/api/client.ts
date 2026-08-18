import axios from 'axios';

const baseURL = ((import.meta as any).env && (import.meta as any).env.VITE_API_URL)
  ? (import.meta as any).env.VITE_API_URL
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
});

export default api;
