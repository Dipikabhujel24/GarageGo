import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const tokenFromStorage = (() => {
    try {
      const storedSession = localStorage.getItem("authSession");
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        if (parsedSession?.token) {
          return parsedSession.token;
        }
      }
    } catch {
      // Ignore malformed session data and fall back to loose token keys.
    }

    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  })();

  return tokenFromStorage ? { Authorization: `Bearer ${tokenFromStorage}` } : {};
};

const requestConfig = () => ({
  headers: getAuthHeaders()
});

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

export const getSalesCatalog = () => {
  return axios.get(`${API}/sales/catalog`, requestConfig()).then((response) => {
    console.log("[API] GET /sales/catalog", response.data);
    return response;
  });
};

export const createSale = (data) => {
  return axios.post(`${API}/sales`, data, requestConfig()).then((response) => {
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

export const sendEmail = (email, invoice) => {
  return axios.post(`${API}/sales/send-email`, { email, invoice }, requestConfig()).then((response) => {
    console.log("[API] POST /sales/send-email", response.data);
    return response;
  });
};