// src/utils/api.js
// ✅ Your backend is hosted at:
export const API_BASE = 'https://swad-server.onrender.com/api';

const request = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  } catch (err) {
    throw new Error(err.message || 'Network error - check internet connection');
  }
};

export const API = {
  getCustomers:  ()           => request('/customers'),
  getCustomer:   (id)         => request(`/customers/${id}`),
  createCustomer:(data)       => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer:(id, data)   => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer:(id)         => request(`/customers/${id}`, { method: 'DELETE' }),
  markPayment:   (id, amt, note='') => request(`/customers/${id}/payment`, { method: 'POST', body: JSON.stringify({ amount: amt, note }) }),
  addDate:       (id, date)   => request(`/customers/${id}/adddate`, { method: 'POST', body: JSON.stringify({ date }) }),
  getSummary:    ()           => request('/customers/stats/summary'),
  seedDefaults:  ()           => request('/customers/seed/defaults', { method: 'POST' }),
  getSettings:   ()           => request('/settings'),
  updateSettings:(data)       => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

export function parseCustomerDates(str) {
  if (!str || !str.trim()) return [];
  const dates = [];
  const tokens = str.split(',').map(t => t.trim()).filter(Boolean);
  let buffer = [];
  for (const tok of tokens) {
    const hasPaid = tok.toLowerCase().includes('paid');
    const nums = tok.match(/\d+/g) || [];
    for (const n of nums) buffer.push(parseInt(n));
    if (hasPaid) {
      for (const d of buffer) dates.push({ date: d, paid: true });
      buffer = [];
    }
  }
  for (const d of buffer) dates.push({ date: d, paid: false });
  return dates;
}

export function calcCustomer(c) {
  const dates = parseCustomerDates(c.rawStr);
  const total = dates.length;
  const paidCount = dates.filter(d => d.paid).length;
  const totalAmt = total * (c.rate || 60);
  const paidAmt = (paidCount * (c.rate || 60)) + (c.paidExtra || 0);
  const dueAmt = Math.max(0, totalAmt - paidAmt);
  const status = dueAmt === 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'due';
  return { dates, total, paidDates: paidCount, unpaidDates: total - paidCount, totalAmt, paidAmt, dueAmt, status };
}
