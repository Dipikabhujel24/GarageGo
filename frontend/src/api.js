import axios from "axios";

const API = "https://localhost:7206/api";

export const createSale = (data) => {
  return axios.post(`${API}/sales`, data);
};

export const getSales = () => {
  return axios.get(`${API}/sales`);
};

export const sendEmail = (email, sale = null) => {
  return axios.post(`${API}/sales/send-email?email=${email}`, {
    saleId: sale?.saleId ?? null,
    customerId: sale?.customerId ?? null,
    total: sale?.total ?? null,
    loyaltyPoints: sale?.loyaltyPoints ?? null,
    date: sale?.date ?? null,
    items: sale?.items ?? []
  });
};

export const extractApiError = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data ||
    error?.message ||
    "Unknown API error"
  );
};