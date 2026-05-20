const INVOICE_LIST_KEY = 'garagego.staffInvoices';

function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadStoredInvoices() {
  const invoices = readJsonStorage(INVOICE_LIST_KEY, []);
  return Array.isArray(invoices) ? invoices : [];
}

export function saveStoredInvoice(invoice) {
  if (!invoice?.saleId) {
    return invoice;
  }

  const record = {
    ...invoice,
    id: String(invoice.saleId),
    savedAt: new Date().toISOString(),
  };

  const existing = loadStoredInvoices().filter((item) => String(item.saleId) !== String(record.saleId));
  existing.unshift(record);
  writeJsonStorage(INVOICE_LIST_KEY, existing);
  return record;
}

export function getStoredInvoice(invoiceId) {
  if (!invoiceId) {
    return null;
  }

  return loadStoredInvoices().find((invoice) => String(invoice.saleId) === String(invoiceId)) || null;
}