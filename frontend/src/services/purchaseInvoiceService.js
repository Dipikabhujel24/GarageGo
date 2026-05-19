import { request } from './api';

export const getPurchaseInvoices = () => request('/purchaseinvoices');

export const getPurchaseInvoice = (id) => request(`/purchaseinvoices/${id}`);

export const createPurchaseInvoice = (data) =>
  request('/purchaseinvoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const deletePurchaseInvoice = (id) =>
  request(`/purchaseinvoices/${id}`, {
    method: 'DELETE',
  });
