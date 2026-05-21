const BASE = '/api';

export const getPrices = () => fetch(`${BASE}/prices`).then(r => r.json());
export const getPriceHistory = (metal, limit = 500) => fetch(`${BASE}/prices/history/${metal}?limit=${limit}`).then(r => r.json());
export const refreshPrices = () => fetch(`${BASE}/prices/refresh`, { method: 'POST' }).then(r => r.json());

export const getHoldings = () => fetch(`${BASE}/holdings`).then(r => r.json());
export const createHolding = (data) => fetch(`${BASE}/holdings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
export const updateHolding = (id, data) => fetch(`${BASE}/holdings/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
export const deleteHolding = (id) => fetch(`${BASE}/holdings/${id}`, { method: 'DELETE' }).then(r => r.json());

export const getSummary = () => fetch(`${BASE}/portfolio/summary`).then(r => r.json());

export const getPortfolioHistory = () => fetch(`${BASE}/portfolio/history`).then(r => r.json());

export const getTemplates = () => fetch(`${BASE}/templates`).then(r => r.json());
export const createTemplate = (data) => fetch(`${BASE}/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
export const deleteTemplate = (id) => fetch(`${BASE}/templates/${id}`, { method: 'DELETE' }).then(r => r.json());

export const getReceiptsForHolding = (holdingId) =>
  fetch(`/api/holdings/${holdingId}/receipts`).then(r => r.json());

export const uploadHoldingReceipt = (holdingId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return fetch(`/api/holdings/${holdingId}/receipts`, { method: 'POST', body: fd }).then(r => r.json());
};

export const deleteHoldingReceipt = (receiptId) =>
  fetch(`/api/receipts/${receiptId}`, { method: 'DELETE' }).then(r => r.json());

export const getExchangeRates = () =>
  fetch(`${BASE}/exchange-rates`)
    .then(r => r.json())
    .catch(() => ({ USD: 1 }));
