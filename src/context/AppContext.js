// src/context/AppContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../utils/api';

const AppContext = createContext();

const DEFAULT_SETTINGS = {
  bizName: 'Swad Tiffins', fullRate: 60, halfRate: 30, ownerPhone: '', darkMode: false,
};

export function AppProvider({ children }) {
  const [customers, setCustomers]   = useState([]);
  const [settings, setSettings]     = useState(DEFAULT_SETTINGS);
  const [summary, setSummary]        = useState({ totalCustomers:0, totalTiffins:0, totalRevenue:0, totalCollected:0, totalDue:0, paidCount:0, dueCount:0 });
  const [loading, setLoading]        = useState(true);
  const [error, setError]            = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true); setError(null);
    try {
      const [custRes, settRes, sumRes] = await Promise.all([
        API.getCustomers(), API.getSettings(), API.getSummary(),
      ]);
      setCustomers(custRes.data || []);
      if (settRes.data) setSettings(settRes.data);
      if (sumRes.data)  setSummary(sumRes.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = useCallback(() => init(), []);

  const addCustomer = useCallback(async (data) => {
    const res = await API.createCustomer(data);
    await Promise.all([init()]);
    return res.data;
  }, []);

  const updateCustomer = useCallback(async (id, data) => {
    await API.updateCustomer(id, data);
    await init();
  }, []);

  const deleteCustomer = useCallback(async (id) => {
    await API.deleteCustomer(id);
    setCustomers(p => p.filter(c => c._id !== id));
    await API.getSummary().then(r => { if (r.data) setSummary(r.data); });
  }, []);

  const markPayment = useCallback(async (id, amount, note = '') => {
    await API.markPayment(id, amount, note);
    await init();
  }, []);

  const addDate = useCallback(async (id, date) => {
    await API.addDate(id, date);
    await init();
  }, []);

  const saveSettings = useCallback(async (data) => {
    const res = await API.updateSettings(data);
    if (res.data) setSettings(res.data);
  }, []);

  const seedData = useCallback(async () => {
    await API.seedDefaults();
    await init();
  }, []);

  return (
    <AppContext.Provider value={{
      customers, settings, summary, loading, error,
      addCustomer, updateCustomer, deleteCustomer,
      markPayment, addDate, saveSettings, seedData, refresh,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }
