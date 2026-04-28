import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

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
    return "Cannot reach API server at http://localhost:5000. Make sure your backend is running and CORS is configured.";
  }

  return error?.message || "Unknown error";
};

export const createSale = (data) => {
  return axios.post(`${API}/sales`, data).then((response) => {
    console.log("[API] POST /sales", response.data);
    return response;
  });
};

export const getSales = () => {
  return axios.get(`${API}/sales`).then((response) => {
    console.log("[API] GET /sales", response.data);
    return response;
  });
};

export const sendEmail = (email) => {
  return axios.post(`${API}/sales/send-email?email=${email}`).then((response) => {
    console.log("[API] POST /sales/send-email", response.data);
    return response;
  });
};