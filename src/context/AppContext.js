// src/context/AppContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../utils/api';

const Ctx = createContext();

const DEF_SETTINGS = { bizName: 'Swad Tiffins', fullRate: 60, halfRate: 30, ownerPhone: '', darkMode: false };
const DEF_SUMMARY  = { totalCustomers: 0, totalTiffins: 0, totalRevenue: 0, totalCollected: 0, totalDue: 0, paidCount: 0, dueCount: 0 };

export function AppProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [settings,  setSettings]  = useState(DEF_SETTINGS);
  const [summary,   setSummary]   = useState(DEF_SUMMARY);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true); setError(null);
    try {
      const [c, s, sm] = await Promise.all([API.getCustomers(), API.getSettings(), API.getSummary()]);
      setCustomers(c.data  || []);
      if (s.data)  setSettings(s.data);
      if (sm.data) setSummary(sm.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const refresh = useCallback(() => init(), []);

  const addCustomer = useCallback(async (data) => {
    const r = await API.createCustomer(data);
    await init();
    return r.data;
  }, []);

  const updateCustomer = useCallback(async (id, data) => {
    await API.updateCustomer(id, data);
    await init();
  }, []);

  const deleteCustomer = useCallback(async (id) => {
    await API.deleteCustomer(id);
    await init();
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
    const r = await API.updateSettings(data);
    if (r.data) setSettings(r.data);
  }, []);

  const seedData = useCallback(async () => {
    await API.seedDefaults();
    await init();
  }, []);

  return (
    <Ctx.Provider value={{
      customers, settings, summary, loading, error,
      addCustomer, updateCustomer, deleteCustomer,
      markPayment, addDate, saveSettings, seedData, refresh,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() { return useContext(Ctx); }
