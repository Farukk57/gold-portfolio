const BASE = '/api';

async function apiFetch(url, options = {}) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const getPrices = () => apiFetch(`${BASE}/prices`);
export const getPriceHistory = (metal, limit = 500) => apiFetch(`${BASE}/prices/history/${metal}?limit=${limit}`);
export const refreshPrices = () => apiFetch(`${BASE}/prices/refresh`, { method: 'POST' });

export const getHoldings = () => apiFetch(`${BASE}/holdings`);
export const createHolding = (data) => apiFetch(`${BASE}/holdings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const updateHolding = (id, data) => apiFetch(`${BASE}/holdings/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const deleteHolding = (id) => apiFetch(`${BASE}/holdings/${id}`, { method: 'DELETE' });

export const getSummary = () => apiFetch(`${BASE}/portfolio/summary`);
export const getPortfolioHistory = () => apiFetch(`${BASE}/portfolio/history`);

export const getTemplates = () => apiFetch(`${BASE}/templates`);
export const createTemplate = (data) => apiFetch(`${BASE}/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
export const deleteTemplate = (id) => apiFetch(`${BASE}/templates/${id}`, { method: 'DELETE' });

export const getReceiptsForHolding = (holdingId) => apiFetch(`/api/holdings/${holdingId}/receipts`);

export const uploadHoldingReceipt = (holdingId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetch(`/api/holdings/${holdingId}/receipts`, { method: 'POST', body: fd });
};

export const deleteHoldingReceipt = (receiptId) => apiFetch(`/api/receipts/${receiptId}`, { method: 'DELETE' });

export const getExchangeRates = () =>
  apiFetch(`${BASE}/exchange-rates`).catch(() => ({ USD: 1 }));
