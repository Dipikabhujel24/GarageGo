import axios from "axios";

const API = "https://localhost:7206/api";

export const createSale = async (data) => {
  console.debug("createSale request:", data);
  try {
    const resp = await axios.post(`${API}/sales`, data);
    console.debug("createSale response:", resp?.data);
    return resp;
  } catch (err) {
    console.error("createSale error:", err?.response ?? err);
    throw err;
  }
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