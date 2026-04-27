import axios from "axios";

const API = process.env.REACT_APP_API_URL || "https://localhost:7086/api";

export const extractApiError = (error) => {
  if (error?.response?.data) {
    if (typeof error.response.data === "string") {
      return error.response.data;
    }

    if (error.response.data.message) {
      return error.response.data.message;
    }

    if (error.response.data.title) {
      return error.response.data.title;
    }
  }

  if (error?.code === "ERR_NETWORK") {
    return "Cannot reach API server. Make sure your backend is running and CORS/HTTPS is configured.";
  }

  return error?.message || "Unknown error";
};

export const createSale = (data) => {
  return axios.post(`${API}/sales`, data);
};

export const getSales = () => {
  return axios.get(`${API}/sales`);
};

export const sendEmail = (email) => {
  return axios.post(`${API}/sales/send-email?email=${email}`);
};