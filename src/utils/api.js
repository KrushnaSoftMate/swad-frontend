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
  markPayment:    (id, amt, n)  => req(`/customers/${id}/payment`,{ method: 'POST', body: JSON.stringify({ amount: amt, note: n || '' }) }),
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
  const dates  = [];
  const tokens = str.split(',').map(t => t.trim()).filter(Boolean);
  let   buf    = [];
  for (const tok of tokens) {
    const lower   = tok.toLowerCase();
    const hasPaid = lower.includes('paid');
    const nums    = tok.match(/\d+/g) || [];
    for (const n of nums) buf.push(parseInt(n));
    if (hasPaid) {
      // Only mark the LAST number in buf as paid if token has a number
      // e.g. "17 paid" → only 17 is paid
      // e.g. "paid" alone → all buffered are paid (old group style)
      if (nums.length > 0) {
        // This token itself has a number + paid → only that number is paid
        const paidNum = parseInt(nums[nums.length - 1]);
        // Everything in buf before this number is unpaid
        const beforePaid = buf.slice(0, buf.length - 1);
        for (const d of beforePaid) dates.push({ date: d, paid: false });
        dates.push({ date: paidNum, paid: true });
      } else {
        // "paid" standalone token → all buffered nums are paid
        for (const d of buf) dates.push({ date: d, paid: true });
      }
      buf = [];
    }
  }
  // Remaining buffer = unpaid
  for (const d of buf) dates.push({ date: d, paid: false });
  return dates;
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

export function calcCustomer(c) {
  const dates      = parseCustomerDates(c.rawStr);
  const total      = dates.length;
  const paidCount  = dates.filter(d => d.paid).length;
  const totalAmt   = total * (c.rate || 60);
  const paidAmt    = (paidCount * (c.rate || 60)) + (c.paidExtra || 0);
  const dueAmt     = Math.max(0, totalAmt - paidAmt);
  const status     = dueAmt === 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'due';
  return { dates, total, paidDates: paidCount, unpaidDates: total - paidCount, totalAmt, paidAmt, dueAmt, status };
}
