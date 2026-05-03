// src/utils/api.js
export const API_BASE = 'https://swad-server.onrender.com/api';

const req = async (endpoint, options = {}) => {
  try {
    const res  = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } catch (err) {
    throw new Error(err.message || 'Network error');
  }
};

export const API = {
  getCustomers:   ()            => req('/customers'),
  createCustomer: (d)           => req('/customers',              { method: 'POST', body: JSON.stringify(d) }),
  updateCustomer: (id, d)       => req(`/customers/${id}`,        { method: 'PUT',  body: JSON.stringify(d) }),
  deleteCustomer: (id)          => req(`/customers/${id}`,        { method: 'DELETE' }),
  markPayment:    (id, amt, n, mk) => req(`/customers/${id}/payment`,{ method: 'POST', body: JSON.stringify({ amount: amt, note: n || '', monthKey: mk }) }),
  addDate:        (id, date)    => req(`/customers/${id}/adddate`,{ method: 'POST', body: JSON.stringify({ date }) }),
  getSummary:     ()            => req('/customers/stats/summary'),
  seedDefaults:   ()            => req('/customers/seed/defaults',{ method: 'POST' }),
  getSettings:    ()            => req('/settings'),
  updateSettings: (d)           => req('/settings',               { method: 'PUT',  body: JSON.stringify(d) }),
};

// Parse rawStr → [{date, paid}]
// Supports both "10 paid, 11, 12" (group style) and "10paid, 11, 12paid" (individual style)
export function parseCustomerDates(str) {
  if (!str || !str.trim()) return [];
  const result = [];
  const tokens = str.split(',').map(t => t.trim()).filter(Boolean);
  let standaloneBuffer = [];

  for (const tok of tokens) {
    const lower   = tok.toLowerCase();
    const nums    = tok.match(/\d+/g) || [];
    const hasPaid = lower.includes('paid');

    if (nums.length === 0 && hasPaid) {
      for (const d of standaloneBuffer) result.push({ date: d, paid: true });
      standaloneBuffer = [];
    } else if (nums.length > 0 && hasPaid) {
      for (const d of standaloneBuffer) result.push({ date: d, paid: false });
      standaloneBuffer = [];
      result.push({ date: parseInt(nums[0]), paid: true });
    } else if (nums.length > 0) {
      for (const n of nums) standaloneBuffer.push(parseInt(n));
    }
  }
  for (const d of standaloneBuffer) result.push({ date: d, paid: false });
  return result;
}

// Build rawStr back — each date is written individually so parser is unambiguous
// Format: "1, 15, 17 paid" means only 17 is paid
// We write: "1, 15, 17 paid" — unpaid first, then paid ones each with " paid"
export function buildRawStr(dates) {
  // Sort by date number
  const sorted = [...dates].sort((a, b) => a.date - b.date);
  // Write each date individually: unpaid as "N", paid as "N paid"
  return sorted.map(d => d.paid ? `${d.date} paid` : `${d.date}`).join(', ');
}

export function calcCustomer(c, monthKey) {
  const dates      = parseCustomerDates(c.rawStr);
  const total      = dates.length;
  const paidCount  = dates.filter(d => d.paid).length;
  const totalAmt   = total * (c.rate || 60);
  
  const monthExtra = monthKey && c.paidExtraByMonth?.[monthKey] ? c.paidExtraByMonth[monthKey] : 0;
  // Global paidExtra only applies to the current month view (or when no key provided)
  const isCurrent  = !monthKey || monthKey === `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
  const paidAmt    = (paidCount * (c.rate || 60)) + monthExtra + (isCurrent ? (c.paidExtra || 0) : 0);
  const dueAmt     = Math.max(0, totalAmt - paidAmt);
  const status     = dueAmt === 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'due';
  return { dates, total, paidDates: paidCount, unpaidDates: total - paidCount, totalAmt, paidAmt, dueAmt, status };
}
